from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.http import StreamingHttpResponse, FileResponse
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
import requests
import json
import socket
import wikipedia # Uses the library as you requested

from .models import DocHistory
from .pdf_generator import create_pdf
from .docx_generator import create_docx

OLLAMA_URL = "http://localhost:11434/api/generate"

# =========================================================
# HELPER: INTERNET CHECK
# =========================================================
def internet_available():
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=2)
        return True
    except:
        return False

# =========================================================
# HELPER: DECIDE IF REAL DATA REQUIRED
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
# HELPER: RELIABLE WIKIPEDIA FETCH (User's Logic)
# =========================================================
def fetch_wikipedia(query):
    try:
        wikipedia.set_lang("en")

        # Step 1: search closest matching article
        results = wikipedia.search(query)
        if not results: return ""

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
            return f"Verified Topic: {page.title}\n\n{page.content[:6000]}"
        except: return ""
    except Exception as e:
        print(f"Wiki Error: {e}")
        return ""

# =========================================================
# AUTHENTICATION & USER MANAGEMENT (Restored)
# =========================================================
@api_view(["POST"])
@permission_classes([AllowAny])
def register_user(request):
    username = request.data.get("username")
    password = request.data.get("password")
    if not username or not password: return Response({"error": "Missing fields"}, 400)
    if User.objects.filter(username=username).exists(): return Response({"error": "User exists"}, 400)
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
# MAIN GENERATION LOGIC
# =========================================================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_documentation(request):
    user_input = request.data.get("code", "").strip()

    if not user_input:
        return StreamingHttpResponse("Please enter a topic.", content_type="text/plain")
    
    # 1. Create DB Entry (Required for Frontend)
    title = " ".join(user_input.split()[:5])[:30] or "New Doc"
    doc_entry = DocHistory.objects.create(user=request.user, topic=title, content="")

    online = internet_available()
    web_context = ""

    # 2. Smart Context Fetching
    # Logic: If strict keywords present OR input is short (Topic lookup), fetch Wiki
    if online and (needs_real_data(user_input) or len(user_input) < 150):
        web_context = fetch_wikipedia(user_input)

    # 3. Prompt Engineering (User's Exact Prompts)
    if web_context:
        prompt = f"""
        You are a documentation formatter AI.

        IMPORTANT RULE:
        You are NOT allowed to change ANY factual values.
        Do NOT calculate. Do NOT estimate. Do NOT rephrase numbers.
        Your job is ONLY to organize the given verified data into clean documentation.
        You must copy all numbers EXACTLY as provided.

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
        - Do not hallucinate statistics
        Topic: {user_input}
        """
        warning = "offline"

    payload = {"model": "qwen2.5-coder:7b", "prompt": prompt, "stream": True}

    def stream():
        # 4. Critical: Yield ID first
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
            
            # 5. Save final content
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
    if not docs.strip(): return Response({"error": "No documentation provided."})
    try:
        filename = create_pdf(docs)
        return FileResponse(open(filename, "rb"), as_attachment=True, filename="Doc.pdf")
    except Exception as e: return Response({"error": str(e)}, status=500)

@api_view(["POST"])
def download_docx(request):
    docs = request.data.get("docs", "")
    try: 
        return FileResponse(create_docx(docs), as_attachment=True, filename="Doc.docx")
    except Exception as e: return Response({"error": str(e)}, status=500)