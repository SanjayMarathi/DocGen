## AI POWERED DOCUMET GENERATION
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
DocGen/
│
├── backend/
│   ├── backend/               # Django main project
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── asgi.py
│   │   └── wsgi.py
│   │
│   ├── generator/             # AI Documentation App
│   │   ├── migrations/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── utils.py           # Ollama + PDF Logic
│   │
│   ├── manage.py
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── services/
│   │   ├── App.js
│   │   └── index.js
│   │
│   ├── package.json
│   └── tailwind.config.js
│
├── .gitignore
└── README.md
---

## ⚙️ Installation & Setup Guide
# 🔹 Prerequisites

Python 3.10+

Node.js + npm

Ollama installed locally

## 1️⃣ Clone Repository
git clone https://github.com/SanjayMarathi/DocGen.git
cd DocGen

## 2️⃣ Setup Ollama (Local LLM)

Pull the model and start Ollama:

ollama pull qwen2.5-coder:7b
ollama serve


Ollama runs at:

http://localhost:11434

## 3️⃣ Backend Setup (Django)
cd backend
python -m venv venv

## ▶ Activate Virtual Environment

Windows (PowerShell)

.\venv\Scripts\activate


Mac/Linux (Bash)

source venv/bin/activate

## ▶ Install Dependencies
pip install -r requirements.txt


If requirements.txt is not available:

pip install django djangorestframework djangorestframework-simplejwt django-cors-headers requests reportlab python-docx wikipedia

## ▶ Apply Migrations
python manage.py migrate

## ▶ Run Backend Server
python manage.py runserver 8000


## Backend URL:

http://127.0.0.1:8000

## 4️⃣ Frontend Setup (React)
cd frontend
npm install
npm start


## Frontend URL:

http://localhost:3000

## 🔌 API Endpoints
Method	Endpoint	Description
POST	/api/generate/	Generate streaming documentation
POST	/api/pdf/	Export generated documentation as PDF
POST	/api/docx/	Export generated documentation as DOCX
## 🔐 Authentication

JWT-based authentication (SimpleJWT)

Token-based API communication

Document history linked to user account

## 📄 PDF & DOCX Generation

PDF export uses ReportLab Platypus Engine
DOCX export uses python-docx

## Provides:

Structured headings

Code block formatting

Professional layout

Instant download

## 🧪 Quick Test

Start Ollama

Start Backend

Start Frontend

Paste or upload code

Click Generate Documentation

Click Export PDF / DOCX

## ⚠️ Troubleshooting
# Model not responding
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

## 🚀 Future Improvements

Markdown live preview panel

Multi-language documentation templates

Docker containerization

Role-based access control

Cloud deployment versiong