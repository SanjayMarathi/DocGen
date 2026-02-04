from django.shortcuts import render
import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import FileResponse

from .pdf_generator import create_pdf

# Create your views here.

OLLAMA_URL = "http://localhost:11434/api/generate"


@api_view(["POST"])
def generate_documentation(request):
    code = request.data.get("code")

    prompt = f"""
    You are an AI documentation generator.

    Generate complete project documentation for the following code:

    {code}

    Include:

    1. Project Overview
    2. Features
    3. Modules & Functions Explanation
    4. Execution Flow
    5. Setup Instructions
    6. Conclusion
    """

    payload = {
        "model": "qwen2.5-coder:7b",
        "prompt": prompt,
        "stream": False
    }

    res = requests.post(OLLAMA_URL, json=payload)

    return Response({
        "documentation": res.json()["response"]
    })


@api_view(["POST"])
def download_pdf(request):
    docs = request.data.get("docs")

    filename = create_pdf(docs)

    return FileResponse(open(filename, "rb"), as_attachment=True)
