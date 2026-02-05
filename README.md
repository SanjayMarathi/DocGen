# 🚀 DocGen – Code Documentation Generator

DocGen is a **AI Project** that generates complete professional documentation for any programming code or project file.

It works completely **offline** using:

- **Ollama**
- **Qwen2.5-Coder Model**
- **Django REST Backend**
- **React + Tailwind Frontend**
- **PDF Export Support**

---

## ✨ Features

✅ Paste code and generate documentation instantly  
✅ Upload code files (.py, .cpp, .java, .js)  
✅ AI-generated structured Markdown documentation  
✅ Export documentation as a perfectly aligned PDF  
✅ Modern SaaS-grade UI (Gemini-level design)  
✅ Fully Offline (No OpenAI / No Gemini API needed)

---

## 🏗️ Tech Stack

| Layer | Technology |
|------|------------|
| Frontend | React, Tailwind CSS, Framer Motion |
| Backend | Django, Django REST Framework |
| AI Model | Ollama + Qwen2.5-Coder:7B |
| PDF Generator | ReportLab (Platypus Engine) |

---

# ⚙️ Setup Instructions (Run on Any PC)

---

## ✅ 1. Clone Repository

```powershell
# Clone and enter repo
git clone https://github.com/SanjayMarathi/DocGen.git
cd DocGen
```
# Start Ollama (pull model if needed)
```
ollama pull qwen2.5-coder:7b
ollama serve
```
# Start backend (in another terminal)
```
cd backend
python -m venv venv
.\venv\Scripts\activate (Powershell) or venv/bin/activate(bash)
pip install django djangorestframework django-cors-headers requests reportlab
python manage.py migrate
python manage.py runserver 8000
```
# Start frontend (in a new terminal)
```
cd frontend
npm install
npm start
```

### Prerequisites
- **Node.js + npm** (for frontend)
- **Python 3.10+** (for backend)
- **Ollama** installed and running locally (project uses `qwen2.5-coder:7b`)

- API endpoints:
  - POST `http://127.0.0.1:8000/api/generate/`  (streaming documentation)
  - POST `http://127.0.0.1:8000/api/pdf/`       (returns generated PDF)

### Ollama (Local LLM)
The backend calls Ollama at `http://localhost:11434`.

### Quick test
- Paste or upload code in the UI → Click **Generate Documentation**.
- Click **EXPORT PDF** to download the generated PDF.

### Troubleshooting ⚠️
- `Model not responding. Check Ollama.` → Ensure Ollama is running and the model is available.
- If the frontend or backend use different host/ports, update `frontend/src/App.js` and `backend/generator/views.py` accordingly.
- CORS is already enabled in `backend/settings.py` (`CORS_ALLOW_ALL_ORIGINS = True`).

### Convenience tip
If you want `npm start` to start the frontend from the repo root, add this script to the root `package.json` under `scripts`:

```json
"scripts": {
  "start": "npm --prefix frontend start"
}
```

---