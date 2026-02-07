from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.http import StreamingHttpResponse, FileResponse
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
import requests, json, socket
from .models import DocHistory
# Ensure you have the generator files from the previous step
from .pdf_generator import create_pdf 
from .docx_generator import create_docx

OLLAMA_URL = "http://localhost:11434/api/generate"

# --- 1. AUTHENTICATION (RESTORED) ---
@api_view(["POST"])
@permission_classes([AllowAny])
def register_user(request):
    username = request.data.get("username")
    password = request.data.get("password")
    if not username or not password:
        return Response({"error": "Username and Password required"}, 400)
    if User.objects.filter(username=username).exists():
        return Response({"error": "Username already taken"}, 400)
    User.objects.create_user(username=username, password=password)
    return Response({"message": "User created successfully"})

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_info(request):
    return Response({"username": request.user.username})

# --- 2. HISTORY (RESTORED) ---
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

# --- 3. SYSTEM ---
@api_view(["GET"])
@permission_classes([AllowAny])
def connection_status(request):
    try:
        socket.create_connection(("8.8.8.8", 53), timeout=2)
        return Response({"online": True})
    except:
        return Response({"online": False})

# --- 4. GENERATION (FIXED STREAM) ---
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_documentation(request):
    user_input = request.data.get("code", "").strip()
    # Auto-title
    title = " ".join(user_input.split()[:5])[:30]
    if not title: title = "New Doc"

    # Create History Entry IMMEDIATELY so it appears in sidebar
    doc_entry = DocHistory.objects.create(user=request.user, topic=title, content="")

    prompt = f"""
    System: Technical Writer.
    Task: Document the code below.
    RULES:
    1. Use '# Title' and '## Section'
    2. Use bullet points
    3. Wrap ALL variables in backticks (`var`)
    4. Use code blocks (```)
    Input: {user_input}
    """
    
    payload = {"model": "qwen2.5-coder:7b", "prompt": prompt, "stream": True}

    def stream():
        # Send ID first
        yield json.dumps({"id": doc_entry.id}) + "\n"
        
        full_text = ""
        try:
            with requests.post(OLLAMA_URL, json=payload, stream=True) as r:
                for line in r.iter_lines():
                    if line:
                        chunk = json.loads(line).get("response", "")
                        full_text += chunk
                        yield chunk
            
            # Save final content
            doc_entry.content = full_text
            doc_entry.save()
        except: yield "Error: AI not responding."

    return StreamingHttpResponse(stream(), content_type="text/plain")

# --- 5. DOWNLOADS ---
@api_view(["POST"])
def download_pdf(request):
    try:
        buffer = create_pdf(request.data.get("docs", ""))
        return FileResponse(buffer, as_attachment=True, filename="Documentation.pdf")
    except Exception as e: return Response({"error": str(e)}, status=500)

@api_view(["POST"])
def download_docx(request):
    try:
        buffer = create_docx(request.data.get("docs", ""))
        return FileResponse(buffer, as_attachment=True, filename="Documentation.docx")
    except Exception as e: return Response({"error": str(e)}, status=500)