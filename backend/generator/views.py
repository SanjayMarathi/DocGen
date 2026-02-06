from rest_framework.decorators import api_view
from django.http import StreamingHttpResponse, FileResponse
from rest_framework.response import Response
import requests
import json
import socket
import wikipedia

from .pdf_generator import create_pdf

OLLAMA_URL = "http://localhost:11434/api/generate"


# =========================================================
# REAL INTERNET CHECK (NOT LOCAL NETWORK)
# =========================================================
def internet_available():
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=2)
        return True
    except:
        return False


# =========================================================
# CONNECTION STATUS API (used by frontend badge)
# =========================================================
@api_view(["GET"])
def connection_status(request):
    return Response({"online": internet_available()})


# =========================================================
# DECIDE IF FACTUAL DATA REQUIRED
# =========================================================
def needs_real_data(text):
    keywords = [
        "who", "when", "where", "age", "born",
        "stats", "record", "population", "president",
        "prime minister", "version", "release",
        "latest", "data", "information"
    ]
    text = text.lower()
    return any(k in text for k in keywords)


# =========================================================
# RELIABLE WIKIPEDIA FETCH
# =========================================================
def fetch_wikipedia(query):
    try:
        wikipedia.set_lang("en")

        # Step 1: search closest matching article
        results = wikipedia.search(query)

        if not results:
            return ""

        # Step 2: best match
        title = results[0]

        # Step 3: fetch page
        page = wikipedia.page(title, auto_suggest=False)

        # Step 4: trim content for LLM
        content = page.content[:6000]

        return f"Verified Topic: {page.title}\n\n{content}"

    except wikipedia.exceptions.DisambiguationError as e:
        try:
            page = wikipedia.page(e.options[0])
            return page.content[:6000]
        except:
            return ""

    except Exception:
        return ""


# =========================================================
# MAIN DOCUMENTATION GENERATION
# =========================================================
@api_view(["POST"])
def generate_documentation(request):

    user_input = request.data.get("code", "").strip()

    if not user_input:
        return StreamingHttpResponse(
            "Please enter a topic to generate documentation.",
            content_type="text/plain"
        )

    online = internet_available()
    web_context = ""

    # fetch real data only when needed
    if online and needs_real_data(user_input):
        web_context = fetch_wikipedia(user_input)

    # ---------------- PROMPT ----------------
    if web_context:

        prompt = f"""
You are a documentation formatter AI.

IMPORTANT RULE:
You are NOT allowed to change ANY factual values.
Do NOT calculate.
Do NOT estimate.
Do NOT rephrase numbers.
Do NOT summarize statistics.

Your job is ONLY to organize the given verified data into clean documentation.

You must copy all numbers EXACTLY as provided.

If you change even one number → the answer is incorrect.

-------------------------------------
VERIFIED DATA (IMMUTABLE SOURCE)
-------------------------------------
{web_context}
-------------------------------------

TASK:
Convert the above information into structured documentation using:

- Clear headings
- Bullet points
- Sections
- Proper readability

You are formatting — NOT rewriting.
"""
        warning = "online"


    else:

        prompt = f"""
You are a professional documentation writer.

Explain the topic in a structured documentation style.

Rules:
- Use headings and sections
- Use bullet points where useful
- If real-world numbers are unknown, explain conceptually
- Do not hallucinate statistics

Topic:
{user_input}
"""
        warning = "offline"

    payload = {
        "model": "qwen2.5-coder:7b",
        "prompt": prompt,
        "stream": True
    }

    # ---------------- STREAM RESPONSE ----------------
    def stream():
        try:
            response = requests.post(OLLAMA_URL, json=payload, stream=True, timeout=600)

            for line in response.iter_lines():
                if line:
                    data = json.loads(line.decode("utf-8"))
                    if "response" in data:
                        yield data["response"]

        except Exception:
            yield "\nModel not responding. Ensure Ollama is running."

    resp = StreamingHttpResponse(stream(), content_type="text/plain")
    resp["X-AI-Warning"] = warning
    resp["Cache-Control"] = "no-cache"
    return resp


# =========================================================
# PDF DOWNLOAD
# =========================================================
@api_view(["POST"])
def download_pdf(request):

    docs = request.data.get("docs", "")

    if not docs.strip():
        return Response({"error": "No documentation provided."})

    filename = create_pdf(docs)
    return FileResponse(open(filename, "rb"), as_attachment=True)
