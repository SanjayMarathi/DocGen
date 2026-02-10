from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.http import StreamingHttpResponse, FileResponse
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
import os
import requests
import json
import socket
import wikipedia

from .models import DocHistory
from .pdf_generator import create_pdf
from .docx_generator import create_docx

OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434/api/generate')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'qwen2.5-coder:3b')


# =========================================================
# INTERNET CHECK
# =========================================================
def internet_available():
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=2)
        return True
    except:
        return False


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

    if any(sym in text for sym in code_symbols) or "\n" in text:
        return "code"

    if any(w in text_lower for w in algorithm_words):
        return "problem"

    if needs_real_data(text):
        return "factual"

    return "concept"


# =========================================================
# WIKIPEDIA FETCH
# =========================================================
def fetch_wikipedia(query):
    try:
        wikipedia.set_lang("en")
        results = wikipedia.search(query)
        if not results:
            return ""

        page = wikipedia.page(results[0], auto_suggest=False)
        return page.content[:6000]

    except wikipedia.exceptions.DisambiguationError as e:
        try:
            page = wikipedia.page(e.options[0])
            return page.content[:6000]
        except:
            return ""
    except:
        return ""


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
    user_input = request.data.get("code", "").strip()

    if not user_input:
        return StreamingHttpResponse("Please enter a topic.", content_type="text/plain")
    
    # Create DB Entry
    title = " ".join(user_input.split()[:5])[:30] or "New Doc"
    doc_entry = DocHistory.objects.create(user=request.user, topic=title, content="")

    online = internet_available()
    web_context = ""

    if online and (needs_real_data(user_input) or len(user_input) < 150):
        web_context = fetch_wikipedia(user_input)

    # ================= PROMPT =================
    if web_context:
        prompt = f"""
You are a documentation formatter AI.

IMPORTANT RULE:
You are NOT allowed to change ANY factual values.
Do NOT calculate. Do NOT estimate. Do NOT rephrase numbers.
You must copy all numbers EXACTLY.

VERIFIED DATA:
{web_context}

TASK:
Convert into structured documentation using headings and bullet points.
"""
        warning = "online"
    else:
        prompt = f"""
You are a professional documentation writer.

Explain the topic in structured documentation style.
Use headings, sections, examples and detailed explanation.

Topic: {user_input}
"""
        warning = "offline"

<<<<<<< HEAD
    payload = {"model": OLLAMA_MODEL, "prompt": prompt, "stream": True}
=======
    # ================= MODEL SELECTION =================
    user_model = request.data.get("model", "qwen2.5-coder:3b")
>>>>>>> 74b3854bfdc5d08565a4f73d857b9611ac5968fc

    ALLOWED_MODELS = [
        "phi3:mini",
        "qwen2.5-coder:3b",
        "qwen2.5-coder:7b"
    ]

    if user_model not in ALLOWED_MODELS:
        user_model = "qwen2.5-coder:3b"

    payload = {
        "model": user_model,
        "prompt": prompt,
        "stream": True
    }

    # ================= STREAM =================
    def stream():
        yield json.dumps({"id": doc_entry.id}) + "\n"

        full_text = ""
        try:
            response = requests.post(OLLAMA_URL, json=payload, stream=True, timeout=600)

            for line in response.iter_lines():
                if not line:
                    continue

                data = json.loads(line.decode("utf-8"))

                if "response" in data:
                    chunk = data["response"]
                    full_text += chunk
                    yield chunk
            
            if full_text:
                doc_entry.content = full_text
                doc_entry.save()

        except Exception as e:
            yield "\nModel not responding. Ensure Ollama is running."

    resp = StreamingHttpResponse(stream(), content_type="text/plain")
    resp["X-AI-Warning"] = warning
    resp["Cache-Control"] = "no-cache"
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
