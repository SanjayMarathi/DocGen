from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.http import StreamingHttpResponse, FileResponse
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
import requests
import json
import socket
import wikipedia

from .models import DocHistory
from .pdf_generator import create_pdf
from .docx_generator import create_docx

OLLAMA_URL = "http://localhost:11434/api/generate"


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

    title = " ".join(user_input.split()[:5])[:30] or "New Doc"
    doc_entry = DocHistory.objects.create(user=request.user, topic=title, content="")

    input_type = detect_input_type(user_input)

    web_context = ""
    if input_type == "factual" and internet_available():
        web_context = fetch_wikipedia(user_input)


    # ================= PROMPT ENGINE =================
    # ================= STRICT MARKDOWN PROMPTS =================

    if input_type == "code":
        prompt = f"""
    You are a senior software engineer.

    Generate COMPLETE technical documentation in STRICT MARKDOWN.

    FORMAT RULES:
    - Use Markdown headings (#, ##, ###)
    - Use bullet points
    - Use tables where useful
    - Use fenced code blocks ```language
    - Never write plain paragraphs only
    - Never write story/history
    - Always structured documentation

    DOCUMENT STRUCTURE:

    # Overview
    # Code Explanation
    ## Line-by-line explanation
    # Execution Flow
    # Edge Cases
    # Time Complexity
    # Space Complexity
    # Example Execution
    # Improvements

    CODE:
    {user_input}
    """

    elif input_type == "problem":
        prompt = f"""
    You are a competitive programming expert.

    Solve and document the problem in STRICT MARKDOWN.

    REQUIRED FORMAT:

    # Problem Understanding
    # Optimal Approach
    # Algorithm
    # Dry Run
    # Test Cases
    # Complexity Analysis
    # Reference Implementation

    Rules:
    - Include at least 4 test cases
    - Include step-by-step dry run
    - Include final clean code block

    PROBLEM:
    {user_input}
    """

    elif input_type == "factual":
        prompt = f"""
    Convert the VERIFIED DATA into structured markdown documentation.

    Rules:
    - DO NOT modify numbers
    - DO NOT hallucinate
    - Only format
    - Use headings and bullet points

    DATA:
    {web_context}
    """

    else:
        prompt = f"""
    Create deep technical documentation in STRICT MARKDOWN format.

    STRUCTURE:

    # Definition
    # How It Works
    # Internal Mechanism
    # Real World Use
    # Advantages
    # Disadvantages
    # Example
    # Summary

    TOPIC:
    {user_input}
    """



    payload = {
        "model": "qwen2.5-coder:7b",
        "prompt": prompt,
        "stream": True
    }


    def stream():
        yield json.dumps({"id": doc_entry.id}) + "\n"
        full_text = ""

        try:
            response = requests.post(OLLAMA_URL, json=payload, stream=True, timeout=600)

            for line in response.iter_lines():
                if line:
                    data = json.loads(line.decode("utf-8"))
                    if "response" in data:
                        chunk = data["response"]
                        full_text += chunk
                        yield chunk

            if full_text:
                doc_entry.content = full_text
                doc_entry.save()

        except Exception:
            yield "\nModel not responding. Ensure Ollama is running."


    resp = StreamingHttpResponse(stream(), content_type="text/plain")
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
