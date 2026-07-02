## AI POWERED DOCUMENT GENERATION
DocGen is a fully offline AI-powered documentation generator that transforms programming code into structured, professional documentation using a locally running Large Language Model (LLM).

The system integrates a modern React frontend, Django REST backend, and Ollama with the Qwen2.5-Coder model — eliminating dependency on external APIs like OpenAI or Gemini.

## 🧠 Why DocGen?

Most AI documentation tools rely on paid cloud APIs.
DocGen runs completely offline using a local LLM.

✔ No API cost
✔ No internet dependency
✔ Secure local execution
✔ Full-stack architecture
✔ Production-ready implementation

## ✨ Features

✅ Paste code and generate documentation instantly

✅ Upload .py, .cpp, .java, .js files

✅ AI-generated structured Markdown documentation

✅ Export documentation as PDF

✅ Export documentation as DOCX

✅ JWT-based authentication

✅ Document history tracking

✅ Clean split-screen UI

✅ Dark mode with animated background

✅ Fully Offline (No OpenAI / Gemini required)

## 🏗 System Architecture

User  
↓  
React Frontend (UI + API Calls)  
↓  
Django REST API  
↓  
Ollama Local Model (Qwen2.5-Coder:7B)  
↓  
Documentation Generator Engine  
↓  
Generated Output  
├── Markdown Docs  
├── PDF Export  
└── DOCX Export  
↓  
Download to User
---

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

## 📂 Project Structure

```text
DocGen/
│
├── backend/
│   ├── backend/
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   │
│   ├── generator/
│   │   ├── migrations/
│   │   ├── admin.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── utils.py
│   │
│   ├── manage.py
│   └── requirements.txt
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
│   │   │   └── api.js
│   │   │
│   │   ├── App.js
│   │   ├── index.js
│   │   └── App.css
│   │
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── .gitignore
└── README.md
```


## ⚙️ Installation & Setup Guide
# 🔹 Prerequisites
```text
Python 3.10+

Node.js + npm

Ollama installed locally
```
## 1️⃣ Clone Repository
```text
git clone https://github.com/SanjayMarathi/DocGen.git
cd DocGen
```
## 2️⃣ Setup Ollama (Local LLM)
```text
Pull the model and start Ollama:

ollama pull qwen2.5-coder:7b
ollama serve


Ollama runs at:

http://localhost:11434
```
## 3️⃣ Backend Setup (Django)
```text
cd backend
python -m venv venv
```

## ▶ Activate Virtual Environment
```text
Windows (PowerShell)

.\venv\Scripts\activate


Mac/Linux (Bash)

source venv/bin/activate
```

## ▶ Install Dependencies
```text
pip install -r requirements.txt


If requirements.txt is not available:

pip install django djangorestframework djangorestframework-simplejwt django-cors-headers requests reportlab python-docx wikipedia
```

## ▶ Apply Migrations
```text
python manage.py migrate
```

## ▶ Run Backend Server
```text
python manage.py runserver 8000
```

## Backend URL:
```text
http://127.0.0.1:8000
```
## 4️⃣ Frontend Setup (React)
```text
cd frontend
npm install
npm start
```

## Frontend URL:
```text
http://localhost:3000
```
## 🔌 API Endpoints
```text
Method	Endpoint	Description
POST	/api/generate/	Generate streaming documentation
POST	/api/pdf/	Export generated documentation as PDF
POST	/api/docx/	Export generated documentation as DOCX
```
## 🔐 Authentication
```text
JWT-based authentication (SimpleJWT)

Token-based API communication

Document history linked to user account
```
## 📄 PDF & DOCX Generation
```text
PDF export uses ReportLab Platypus Engine
DOCX export uses python-docx
```
## Provides:
```text
Structured headings

Code block formatting

Professional layout

Instant download
```
## 🧪 Quick Test
```text
Start Ollama

Start Backend

Start Frontend

Paste or upload code

Click Generate Documentation

Click Export PDF / DOCX
```
## ⚠️ Troubleshooting
# Model not responding
```text
ollama list


If model missing:

ollama pull qwen2.5-coder:7b

## CORS Issues

Already enabled in settings.py:

CORS_ALLOW_ALL_ORIGINS = True

## Port Conflict

Update ports in:

frontend/src/App.js

backend/generator/views.py
```
## 🚀 Future Improvements
```text
Markdown live preview panel

Multi-language documentation templates

Docker containerization

Role-based access control

Cloud deployment version.
