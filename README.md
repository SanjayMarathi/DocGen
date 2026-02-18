# 🚀 DocGen – Code Documentation Generator

DocGen is a **AI Project** that generates complete professional documentation for any programming code or project file.

DocGen is a fully offline AI-powered documentation generator that automatically converts source code into structured professional documentation using a locally running LLM.

It integrates a modern React frontend, a Django REST backend, and Ollama with the Qwen2.5-Coder model to generate high-quality documentation without relying on any external API services.

It works completely **offline** using:

- **Ollama**
- **Qwen2.5-Coder Model**
- **Django REST Backend**
- **React + Tailwind Frontend**
- **PDF Export Support**
- **Doc Export Support**

---

## ✨ Features

✅ Paste code and generate documentation instantly

✅ Upload .py, .cpp, .java, .js files

✅ AI-generated structured Markdown documentation

✅ Export documentation as PDF

✅ Export documentation as DOCX

✅ Document history tracking

✅ JWT-based authentication

✅ Clean split-screen UI with blue theme

✅ Dark mode with animated background

✅ Fully Offline (No OpenAI / No Gemini API required)
---

## 🏗️ Tech Stack

| Layer          | Technology                         |
| -------------- | ---------------------------------- |
| Frontend       | React, Tailwind CSS, Framer Motion |
| Backend        | Django, Django REST Framework      |
| Authentication | SimpleJWT (JWT-based Auth)         |
| AI Model       | Ollama + Qwen2.5-Coder:7B          |
| PDF Engine     | ReportLab (Platypus)               |
| DOCX Export    | python-docx                        |

---

# DocGen Project Structure

DocGen/
│
├── backend/
│   ├── backend/                 # Django main project folder
│   │   ├── __init__.py
│   │   ├── asgi.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   │
│   ├── generator/               # Main app for AI generation
│   │   ├── migrations/
│   │   ├── __init__.py
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── utils.py             # Ollama + PDF logic
│   │
│   ├── manage.py
│   ├── requirements.txt
│   └── venv/ (ignored in .gitignore)
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── favicon.ico
│   │   └── manifest.json
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Editor.jsx
│   │   │   └── History.jsx
│   │   │
│   │   ├── services/
│   │   │   └── api.js           # API calls to Django
│   │   │
│   │   ├── App.js
│   │   ├── index.js
│   │   └── App.css
│   │
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── .gitignore
│
├── .gitignore
├── README.md
└── package.json (optional root script for frontend start)

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
.\venv\Scripts\activate
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers requests reportlab python-docx wikipedia
python manage.py migrate
python manage.py runserver 8000
```

The venv activation above for powershell needs to be changed to venv/bin/activate if using bash.

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