from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.http import StreamingHttpResponse, FileResponse
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
import requests, json, socket
from .models import DocHistory
from .pdf_generator import create_pdf 
from .docx_generator import create_docx

OLLAMA_URL = "http://localhost:11434/api/generate"

# --- AUTHENTICATION ---
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

# --- HISTORY ---
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

# --- SYSTEM ---
@api_view(["GET"])
@permission_classes([AllowAny])
def connection_status(request):
    try: socket.create_connection(("8.8.8.8", 53), timeout=2); return Response({"online": True})
    except: return Response({"online": False})

# --- GENERATION (ROBUST STREAMING) ---
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_documentation(request):
    user_input = request.data.get("code", "").strip()
    title = " ".join(user_input.split()[:5])[:30] or "New Doc"

    # 1. Create History Entry
    doc_entry = DocHistory.objects.create(user=request.user, topic=title, content="")

    prompt = f"""
    System: Technical Writer.
    Task: Document the code below.
    RULES:
    1. Use '# Title' and '## Section'
    2. Use bullet points
    3. Wrap variables in backticks (`var`)
    4. Use code blocks (```)
    Input: {user_input}
    """
    
    payload = {"model": "qwen2.5-coder:7b", "prompt": prompt, "stream": True}

    def stream():
        # 2. Yield ID first with explicit newline
        yield json.dumps({"id": doc_entry.id}) + "\n"
        
        full_text = ""
        try:
            with requests.post(OLLAMA_URL, json=payload, stream=True) as r:
                for line in r.iter_lines():
                    if line:
                        try:
                            chunk = json.loads(line).get("response", "")
                            full_text += chunk
                            yield chunk
                        except: pass
            
            # 3. Save final content
            if full_text:
                doc_entry.content = full_text
                doc_entry.save()
        except: 
            yield "\n[Error: AI Service Offline or Unreachable]"

    return StreamingHttpResponse(stream(), content_type="text/plain")

# --- DOWNLOADS ---
@api_view(["POST"])
def download_pdf(request):
    try: return FileResponse(create_pdf(request.data.get("docs", "")), as_attachment=True, filename="Doc.pdf")
    except Exception as e: return Response({"error": str(e)}, status=500)

@api_view(["POST"])
def download_docx(request):
    try: return FileResponse(create_docx(request.data.get("docs", "")), as_attachment=True, filename="Doc.docx")
    except Exception as e: return Response({"error": str(e)}, status=500)