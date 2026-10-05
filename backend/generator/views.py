from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.http import StreamingHttpResponse, FileResponse
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from concurrent.futures import ThreadPoolExecutor
from functools import lru_cache
import logging
import os
import requests
import json
import socket
import time
import wikipedia

from .models import DocHistory
from .pdf_generator import create_pdf
from .docx_generator import create_docx

logger = logging.getLogger(__name__)

# =========================================================
# CONFIG
# =========================================================
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
DEFAULT_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5-coder:3b")
ALLOWED_MODELS = {"phi3:mini", "qwen2.5-coder:3b", "qwen2.5-coder:7b"}

# Keep the model resident in RAM between requests (Ollama's default of 5 minutes means
# a cold reload, often 10s+, for anyone who pauses).
KEEP_ALIVE = os.environ.get("OLLAMA_KEEP_ALIVE", "24h")

# IMPORTANT: num_ctx must be identical for every request (and for the warm-up call in
# entrypoint.sh). Ollama reloads the model whenever num_ctx changes between requests.
NUM_CTX = int(os.environ.get("OLLAMA_NUM_CTX", "6144"))

# Quick mode caps the output length and asks for a concise document; detailed mode doesn't.
GEN_OPTIONS = {
    "quick": {"num_ctx": NUM_CTX, "num_predict": 900, "temperature": 0.2, "top_p": 0.9},
    "detailed": {"num_ctx": NUM_CTX, "num_predict": 2048, "temperature": 0.3, "top_p": 0.9},
}

MAX_INPUT_CHARS = 6000   # ~1.5-2k tokens; keeps prompt evaluation fast and inside num_ctx
WIKI_TIMEOUT = 2.5       # seconds we are willing to wait for Wikipedia before generating
WIKI_CHARS = 3000        # smaller context -> faster prompt evaluation
ERROR_TAG = "[[DOCGEN_ERROR]]"  # the frontend splits the stream on this marker

_session = requests.Session()  # reuses the connection to Ollama
_wiki_pool = ThreadPoolExecutor(max_workers=4)


# =========================================================
# INTERNET CHECK (cached: this used to block ~2s on every request)
# =========================================================
_NET_TTL = 30
_net_state = {"checked": float("-inf"), "ok": False}


def internet_available():
    now = time.monotonic()
    if now - _net_state["checked"] < _NET_TTL:
        return _net_state["ok"]
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=1.5).close()
        ok = True
    except OSError:
        ok = False
    _net_state.update(checked=now, ok=ok)
    return ok


# =========================================================
# REAL DATA DETECTOR
# =========================================================
def needs_real_data(text):
    keywords = [
        "who", "when", "where", "age", "born",
        "stats", "record", "population", "president",
        "prime minister", "version", "release",
        "latest", "data", "information", "history", "summary"
    ]
    text = text.lower()
    return any(k in text for k in keywords)


# =========================================================
# INPUT TYPE DETECTOR  ⭐ IMPORTANT
# =========================================================
def detect_input_type(text: str):
    text_lower = text.lower().strip()

    code_symbols = [
        "{", "}", ";", "()", "[]", "=>", "::", "#include",
        "def ", "class ", "public ", "private ", "</", "/>",
        "printf", "cout", "cin"
    ]

    algorithm_words = [
        "problem", "leetcode", "codeforces", "find", "return",
        "array", "integer", "sum", "subarray", "graph", "tree"
    ]

    if any(sym in text for sym in code_symbols) or "\n" in text.strip():
        return "code"

    if any(w in text_lower for w in algorithm_words):
        return "problem"

    if needs_real_data(text):
        return "factual"

    return "concept"


# =========================================================
# WIKIPEDIA FETCH (bounded wait + cached)
# =========================================================
@lru_cache(maxsize=128)
def _wikipedia_lookup(query):
    """Raises on network errors so failures are never cached; "" means 'no article'."""
    wikipedia.set_lang("en")
    results = wikipedia.search(query, results=1)
    if not results:
        return ""
    try:
        return wikipedia.summary(results[0], chars=WIKI_CHARS, auto_suggest=False)
    except wikipedia.exceptions.DisambiguationError as e:
        return wikipedia.summary(e.options[0], chars=WIKI_CHARS, auto_suggest=False)
    except wikipedia.exceptions.PageError:
        return ""


def fetch_wikipedia(query, timeout=WIKI_TIMEOUT):
    """Never blocks generation for more than `timeout` seconds. If the lookup is slow it
    keeps running in the background and its result is cached for the next request."""
    try:
        return _wiki_pool.submit(_wikipedia_lookup, query).result(timeout=timeout)
    except Exception:
        return ""


# =========================================================
# PROMPTS
# =========================================================
def build_prompt(user_input, kind, web_context, quick):
    length = (
        "Be concise: short sections, bullet points, at most one short example."
        if quick else
        "Be thorough: cover details, edge cases and examples."
    )

    if web_context:
        return f"""You are a documentation formatter AI.

IMPORTANT RULE:
You are NOT allowed to change ANY factual values.
Do NOT calculate. Do NOT estimate. Do NOT rephrase numbers.
You must copy all numbers EXACTLY.

VERIFIED DATA:
{web_context}

TASK:
Convert into structured Markdown documentation using headings and bullet points. {length}
"""

    if kind == "code":
        return f"""You are a senior engineer writing documentation.
Document the code below in Markdown with these sections: Overview, Parameters / Inputs, Returns / Outputs, Usage Example, Complexity & Edge Cases (only where relevant).
Do not rewrite the code. {length}

CODE:
```
{user_input}
```
"""

    if kind == "problem":
        return f"""You are a professional technical writer.
Explain the problem below in Markdown: Problem Statement, Approach, Algorithm Steps, Complexity, Example. {length}

PROBLEM:
{user_input}
"""

    return f"""You are a professional documentation writer.
Explain the topic below in structured Markdown using headings, sections and examples. {length}

Topic: {user_input}
"""


# =========================================================
# AUTH
# =========================================================
@api_view(["POST"])
@permission_classes([AllowAny])
def register_user(request):
    username = request.data.get("username")
    password = request.data.get("password")
    if not username or not password:
        return Response({"error": "Missing fields"}, 400)
    if User.objects.filter(username=username).exists():
        return Response({"error": "User exists"}, 400)
    User.objects.create_user(username=username, password=password)
    return Response({"message": "User created"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_info(request):
    return Response({"username": request.user.username})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_history(request):
    data = DocHistory.objects.filter(user=request.user).order_by('-created_at').values()
    return Response(list(data))


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_history(request, pk):
    get_object_or_404(DocHistory, pk=pk, user=request.user).delete()
    return Response({"message": "Deleted"})


@api_view(["GET"])
@permission_classes([AllowAny])
def connection_status(request):
    return Response({"online": internet_available()})


# =========================================================
# MAIN GENERATION
# =========================================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_documentation(request):
    user_input = (request.data.get("code") or "").strip()[:MAX_INPUT_CHARS]

    if not user_input:
        return Response({"error": "Please enter some code or a topic."}, status=400)

    quick = request.data.get("mode", "quick") != "detailed"
    user_model = request.data.get("model", DEFAULT_MODEL)
    if user_model not in ALLOWED_MODELS:
        user_model = DEFAULT_MODEL

    kind = detect_input_type(user_input)

    # Wikipedia only helps short factual/concept topics - never code or algorithm problems.
    web_context = ""
    if kind == "factual" or (kind == "concept" and len(user_input) < 150):
        if internet_available():
            web_context = fetch_wikipedia(user_input)

    prompt = build_prompt(user_input, kind, web_context, quick)

    title = " ".join(user_input.split()[:5])[:30] or "New Doc"
    doc_entry = DocHistory.objects.create(user=request.user, topic=title, content="")

    payload = {
        "model": user_model,
        "prompt": prompt,
        "stream": True,
        "keep_alive": KEEP_ALIVE,
        "options": GEN_OPTIONS["quick" if quick else "detailed"],
    }

    # ================= STREAM =================
    def stream():
        parts = []
        upstream = None
        try:
            upstream = _session.post(OLLAMA_URL, json=payload, stream=True, timeout=(5, 300))
            upstream.raise_for_status()

            for line in upstream.iter_lines():
                if not line:
                    continue
                data = json.loads(line)

                if data.get("error"):
                    raise RuntimeError(data["error"])

                chunk = data.get("response", "")
                if chunk:
                    parts.append(chunk)
                    yield chunk

                if data.get("done"):
                    if quick and data.get("done_reason") == "length":
                        note = "\n\n*Output trimmed in Quick mode - switch Quick off for the full document.*"
                        parts.append(note)
                        yield note
                    break

        except GeneratorExit:
            raise  # client pressed Stop / disconnected; the finally block cleans up
        except Exception:
            logger.exception("Generation failed")
            yield f"\n{ERROR_TAG} Model not responding. Ensure Ollama is running."
        finally:
            # Closing the upstream connection makes Ollama stop generating immediately,
            # freeing the CPU for the next request instead of finishing a doc nobody reads.
            if upstream is not None:
                upstream.close()
            text = "".join(parts)
            if text:
                try:
                    doc_entry.content = text
                    doc_entry.save(update_fields=["content", "updated_at"])
                except Exception:
                    logger.exception("Could not save history entry")

    resp = StreamingHttpResponse(stream(), content_type="text/plain; charset=utf-8")
    resp["X-AI-Warning"] = "online" if web_context else "offline"
    resp["X-Doc-Id"] = str(doc_entry.id)
    resp["Cache-Control"] = "no-cache"
    resp["X-Accel-Buffering"] = "no"  # stop reverse proxies from buffering the stream
    return resp


# =========================================================
# DOWNLOADS
# =========================================================
@api_view(["POST"])
def download_pdf(request):
    docs = request.data.get("docs", "")
    if not docs.strip():
        return Response({"error": "No documentation provided."})

    pdf_buffer = create_pdf(docs)
    pdf_buffer.seek(0)

    return FileResponse(pdf_buffer, as_attachment=True, filename="Doc.pdf", content_type="application/pdf")


@api_view(["POST"])
def download_docx(request):
    docs = request.data.get("docs", "")
    return FileResponse(create_docx(docs), as_attachment=True, filename="Doc.docx")
