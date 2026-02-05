from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.http import StreamingHttpResponse, FileResponse
import requests
import json
import os
import re
from .pdf_generator import create_pdf

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5-coder:7b")


# ---------- SIMPLE CODE DETECTOR (FAST) ----------
def is_likely_code(text: str) -> bool:
    indicators = [
        "def ", "class ", "import ", "from ", "{", "}", ";",
        "print(", "console.log", "function ", "#include"
    ]
    text = text.lower()
    return any(i in text for i in indicators)


# ---------- MAIN STREAMING ENDPOINT ----------
@api_view(["POST"])
def generate_documentation(request):
    user_input = request.data.get("code", "").strip()

    if not user_input:
        return Response("Empty input", status=400)

    is_code = is_likely_code(user_input)

    prompt = (
        f"""You are a professional software documentation writer.
Explain the following code in clear structured Markdown.
Use headings and fenced code blocks.

Code:
{user_input}
"""
        if is_code
        else
        f"""You are a helpful programming tutor.
Answer clearly in Markdown with examples.

Question:
{user_input}
"""
    )

    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "stream": True,
    }

    import time

    def stream():
        last_sent = time.time()

        try:
            # 🚀 force headers flush
            yield " "

            r = requests.post(
                OLLAMA_URL,
                json=payload,
                stream=True,
                timeout=None
            )

            if r.status_code != 200:
                yield f"\nModel error: {r.text}"
                return

            code_block_open = False

            for line in r.iter_lines(decode_unicode=True):
                now = time.time()

                # 🫀 KEEP-ALIVE every 1 second
                if now - last_sent > 1:
                    yield "\n"
                    last_sent = now

                if not line:
                    continue

                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue

                chunk = data.get("response")
                if not chunk:
                    continue

                if "\npython\n" in chunk:
                    chunk = chunk.replace("\npython\n", "\n```python\n")
                    code_block_open = True

                yield chunk
                last_sent = time.time()

                if data.get("done") and code_block_open:
                    yield "\n```"

        except Exception as e:
            yield f"\nError: {str(e)}"


    response = StreamingHttpResponse(
        stream(),
        content_type="text/markdown; charset=utf-8"
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


# ---------- PDF DOWNLOAD ----------
@api_view(["POST"])
def download_pdf(request):
    docs = request.data.get("docs", "")

    if not docs.strip():
        return Response({"error": "No documentation provided."})

    filename = create_pdf(docs)
    response = FileResponse(open(filename, "rb"), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response

