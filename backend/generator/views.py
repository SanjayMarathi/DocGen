from django.shortcuts import render
import requests
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import FileResponse
from .pdf_generator import create_pdf
from django.http import StreamingHttpResponse
import json
import requests

OLLAMA_URL = "http://localhost:11434/api/generate"


def classify_input(text):
    check_prompt = f"""
You are a strict classifier for a programming assistant.

Your task:
Decide if the input is related to software, programming, coding, frameworks, tools, or computer science.

Treat these as PROGRAMMING:
languages (python, java, c++, js)
frameworks (react, django, node, spring, flask)
concepts (api, database, array, algorithm, recursion, oops)
errors, debugging, coding doubts

Categories (return ONLY ONE word):

CODE
PROGRAMMING_QUESTION
NON_TECH

Examples:
"What is React?" -> PROGRAMMING_QUESTION
"Explain Python list" -> PROGRAMMING_QUESTION
"print('hello')" -> CODE
"who is prime minister" -> NON_TECH
"weather today" -> NON_TECH

Input:
{text}
"""


    payload = {
        "model": "qwen2.5-coder:7b",
        "prompt": check_prompt,
        "stream": False
    }

    try:
        res = requests.post(OLLAMA_URL, json=payload, timeout=120)
        return res.json()["response"].strip().upper()
    except:
        return "NON_TECH"


@api_view(["POST"])
def generate_documentation(request):

    user_input = request.data.get("code", "")

    if not user_input.strip():
        return Response({"documentation": "Empty input provided."})

    category = classify_input(user_input)

    # CODE → documentation
    if "CODE" in category:
        prompt = f"""
You are a professional software documentation writer.
Explain the code in clear structured markdown format.

Code:
{user_input}
"""

    # PROGRAMMING QUESTION → answer
    elif "PROGRAMMING_QUESTION" in category:
        prompt = f"""
You are a helpful programming tutor.
Answer clearly with examples.

Question:
{user_input}
"""

    # NON TECH → reject
    else:
        return Response({
            "documentation": "I only answer programming related queries."
        })

    payload = {
        "model": "qwen2.5-coder:7b",
        "prompt": prompt,
        "stream": True
    }

    def stream():
        try:
            response = requests.post(OLLAMA_URL, json=payload, stream=True, timeout=600)

            for line in response.iter_lines():
                if line:
                    data = json.loads(line.decode("utf-8"))
                    if "response" in data:
                        yield data["response"]

        except:
            yield "\nModel not responding. Check Ollama."

    return StreamingHttpResponse(stream(), content_type="text/plain")


@api_view(["POST"])
def download_pdf(request):
    docs = request.data.get("docs", "")

    if not docs.strip():
        return Response({"error": "No documentation provided."})

    filename = create_pdf(docs)
    return FileResponse(open(filename, "rb"), as_attachment=True)
