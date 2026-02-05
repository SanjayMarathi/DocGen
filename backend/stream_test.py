import requests
import sys

url = "http://localhost:8000/api/generate/"
json = {
    "code": "print(\"hello world\")",
    "max_output_tokens": 256
}

try:
    r = requests.post(url, json=json, stream=True, timeout=60)
    print("STATUS", r.status_code)
    r.raise_for_status()
    for chunk in r.iter_content(chunk_size=None):
        if chunk:
            try:
                s = chunk.decode()
            except Exception:
                s = str(chunk)
            print(s, end='', flush=True)
except Exception as e:
    print("ERROR", e)
