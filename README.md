---
title: DocGen
emoji: 📝
colorFrom: yellow
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# 📝 DocGen - AI Documentation Generator

DocGen turns source code, algorithm problems and plain topics into structured, professional
documentation, streamed back in seconds and exportable as **PDF** or **DOCX**.

It pairs a React frontend and a Django REST backend with **Ollama** running the
**Qwen2.5-Coder** model locally, so there is no OpenAI / Gemini / paid-API dependency and your
code never leaves the machine that runs it.

**Live demo:** [huggingface.co/spaces/docgen/DocGen](https://huggingface.co/spaces/docgen/DocGen)
(use **Try demo account** on the login page)

---

## ✨ Features

- **Paste or upload** code (`.py .js .ts .java .c .cpp .go .rs .sql ...`) or just type a topic
- **Quick / Detailed modes** - the yellow ⚡ button trades depth for speed (see [Performance](#-performance))
- **Live streaming** output rendered as Markdown with syntax-highlighted code blocks
- **Voice dictation** (mic button, in browsers that support the Web Speech API)
- **Export** any document as PDF or DOCX, or copy it as Markdown
- **History** per user, with open / delete
- **JWT authentication** (SimpleJWT) plus a one-click demo account
- **Light & dark themes** with a soft aurora gradient and frosted-glass UI, fully responsive
- **Local LLM** - generation runs on Ollama next to the app

> Short factual topics (e.g. "who is the president of India") are optionally grounded with a
> Wikipedia lookup when the server is online, so the model doesn't invent facts. Code and
> algorithm problems never trigger a lookup. If Wikipedia is slow or unreachable, DocGen simply
> generates without it.

---

## ⚡ Performance

Generation speed was the focus of the latest update. What changed:

| Area | Before | Now |
| --- | --- | --- |
| Model loading | Unloaded after 5 idle minutes, so the next request paid a cold start | `keep_alive` = 24h **and** the model is pre-loaded at container start |
| Request start-up | A 2 s network probe on every request and `/status` poll | Probe cached for 30 s |
| Wikipedia | Looked up for any short input, including code; no time limit | Only for short factual/concept topics; waits at most 2.5 s; results cached |
| Prompt size | Full Wikipedia article (6000 chars) | 3000-char summary; user input capped at 6000 chars |
| Output length | Unbounded | **Quick mode** caps output and asks for a concise doc; Detailed allows up to 2048 tokens |
| Stop button | Closed the browser stream only - Ollama kept generating and slowed the next request | Closes the upstream connection so Ollama stops immediately |
| Browser start of request | Waited on a Firestore write before calling the API | API call starts immediately; history is saved after the stream |
| Rendering | Re-parsed the whole Markdown on every token | Batched to ~11 renders/s and memoised |
| JS bundle | 566 kB gzip (all Prism languages) | 383 kB gzip (only the languages DocGen registers) |
| Container start | Fixed `sleep 5`, sequential pull -> migrate | Waits for Ollama to be ready, pulls only if missing, warms the model **in parallel** with Django setup |

Two details worth knowing if you tune this yourself:

- `num_ctx` is deliberately identical for Quick and Detailed (and for the warm-up call).
  Ollama **reloads the model whenever `num_ctx` changes** between requests, which would erase the benefit of warming.
- `OLLAMA_NUM_PARALLEL=1` is set because on CPU, parallel generations just split the same cores
  and make every request slower.

Actual tokens/second depend on your hardware. On a small CPU-only host the 3B model is the main
cost; Quick mode keeps responses short enough to feel fast there.

---

## 🏗 Architecture

```text
Browser (React + Tailwind)
   │  fetch /api/...  (JWT)
   ▼
Django REST API (gunicorn, gthread)
   ├── auth, history, status
   ├── POST /api/generate/ ──► Ollama (qwen2.5-coder:3b, kept warm) ──► streamed Markdown
   │        └─ optional Wikipedia grounding (short factual topics only)
   └── POST /api/pdf/ | /api/docx/ ──► ReportLab / python-docx ──► file download
```

The Django server also serves the compiled React app from `frontend/build`, so one container
exposes everything on port 7860.

## 🧰 Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Tailwind CSS 3, Framer Motion, react-markdown, react-syntax-highlighter (Prism light) |
| Backend | Django, Django REST Framework, SimpleJWT, WhiteNoise, gunicorn |
| AI | Ollama + Qwen2.5-Coder (3B by default) |
| Exports | ReportLab (PDF), python-docx (DOCX) |
| History | Firestore (per-user document history) and a Django `DocHistory` table |

## 📂 Project structure

```text
DocGen/
├── backend/
│   ├── backend/                # Django project (settings, urls, wsgi/asgi)
│   ├── generator/
│   │   ├── views.py            # auth, history, streaming generation, downloads
│   │   ├── pdf_generator.py    # Markdown -> PDF (ReportLab)
│   │   ├── docx_generator.py   # Markdown -> DOCX (python-docx)
│   │   ├── models.py           # DocHistory
│   │   ├── urls.py
│   │   └── tests.py            # backend test suite
│   ├── users/
│   └── manage.py
├── frontend/
│   ├── public/                 # index.html, favicon.svg, manifest.json
│   ├── src/
│   │   ├── App.js              # state, streaming, routing, layout
│   │   ├── index.css           # theme tokens, aurora, glass components
│   │   ├── firebase.js
│   │   └── components/
│   │       ├── PromptCard.js   # the glass prompt: upload, quick mode, mic, submit
│   │       ├── DocView.js      # Markdown rendering + code blocks + exports
│   │       ├── Sidebar.js      # history, user, connection status
│   │       ├── AuthPage.js     # login / register
│   │       └── InfoPages.js    # About and Contact
│   ├── build/                  # production build (committed; served by Django)
│   ├── tailwind.config.js
│   └── package.json
├── Dockerfile
├── entrypoint.sh               # starts Ollama, warms the model, runs migrations + gunicorn
├── requirements.txt
└── README.md
```

---

## 🚀 Run locally

**Prerequisites:** Python 3.10+, Node.js 18+, and [Ollama](https://ollama.com).

### 1. Get the code and the model

```bash
git clone https://github.com/SanjayMarathi/DocGen.git
cd DocGen

ollama pull qwen2.5-coder:3b
ollama serve                      # http://localhost:11434
```

### 2. Backend

```bash
python -m venv venv
source venv/bin/activate          # Windows: .\venv\Scripts\activate
pip install -r requirements.txt

cd backend
python manage.py migrate
python manage.py runserver 8000   # http://127.0.0.1:8000
```

### 3. Frontend

Development server with hot reload (API calls are proxied to Django on port 8000):

```bash
cd frontend
npm install
npm start                         # http://localhost:3000
```

Or build once and let Django serve the app on port 8000:

```bash
npm run build
```

### 4. Try it

Create an account (or register `demo` / `demouser`), paste some code, press **Ctrl + Enter** or the arrow button.

### Tests

```bash
cd backend
python manage.py test generator
```

The suite mocks Ollama and covers input detection, Quick/Detailed options, the cached internet
check, Wikipedia gating and timeouts, streaming, history saving, error handling and stop-generation cleanup.

---

## 🐳 Docker / Hugging Face Spaces

The Space is built from the `Dockerfile` (SDK: `docker`, port `7860`). On start, `entrypoint.sh`:

1. starts Ollama,
2. in the background, waits for it, pulls the model **only if it is missing**, then warms it into memory,
3. meanwhile runs migrations, `collectstatic` and creates the `demo` user,
4. waits for the model to be ready, then starts gunicorn (2 workers x 4 threads).

```bash
docker build -t docgen .
docker run -p 7860:7860 docgen    # http://localhost:7860
```

### Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `OLLAMA_MODEL` | `qwen2.5-coder:3b` | Default model for generation (a request may only override it with a model listed in `ALLOWED_MODELS` in `views.py`) |
| `OLLAMA_URL` | `http://localhost:11434/api/generate` | Ollama generate endpoint |
| `OLLAMA_KEEP_ALIVE` | `24h` | How long Ollama keeps the model in memory |
| `OLLAMA_NUM_CTX` | `6144` | Context window; keep it the same everywhere (see Performance) |

---

## 🔌 API

All `/api/` endpoints except register, login and status need `Authorization: Bearer <access token>`.

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/register/` | Create an account `{username, password}` |
| POST | `/api/login/` | Returns `{access, refresh}` JWTs |
| GET | `/api/user/` | Current user |
| GET | `/api/status/` | Server reachability |
| POST | `/api/generate/` | Stream documentation. Body: `{code, mode?: "quick" \| "detailed", model?}` |
| GET | `/api/history/` | Server-side history |
| DELETE | `/api/history/<id>/delete/` | Delete a history entry |
| POST | `/api/pdf/` | `{docs}` -> PDF file |
| POST | `/api/docx/` | `{docs}` -> DOCX file |

`/api/generate/` responds with a `text/plain` stream of Markdown. Headers: `X-Doc-Id` (history row)
and `X-AI-Warning` (`online` when Wikipedia grounding was used). If the model fails mid-stream, the
stream ends with the marker `[[DOCGEN_ERROR]] <message>`, which the frontend turns into an error banner.

---

## 🎨 Theme

The UI uses a soft aurora gradient (peach, teal, sage, taupe), frosted-glass surfaces, small
rounded icon buttons and a single yellow accent. All colours are tokens at the top of
[`frontend/src/index.css`](frontend/src/index.css) (`--a0..--a4` for the aurora, `--accent`, `--ink`,
glass and chip tokens) with a dark variant under `html.dark`, so re-theming is a matter of editing
those values. Animations respect `prefers-reduced-motion`.

---

## 🛠 Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Model not responding" | Is Ollama running? `ollama list` should show `qwen2.5-coder:3b`; if not, `ollama pull qwen2.5-coder:3b` |
| First request is slow | The model is loading. Keep Ollama running and don't lower `OLLAMA_KEEP_ALIVE`; the container warms it at start |
| Every request seems to reload the model | `OLLAMA_NUM_CTX` must be identical for the backend and any warm-up call, otherwise Ollama reloads the model |
| Frontend can't reach the API in dev | Run Django on port 8000 (the dev proxy points there) |
| Mic button disabled | The browser doesn't support the Web Speech API; use Chrome/Edge/Safari |
| Documents get cut off | That's Quick mode's length cap - toggle the ⚡ button to Detailed |

## 🗺 Roadmap

- Multiple output templates (README, API reference, docstrings)
- Choice of model size per request
- Role-based access control
- Persisting generated documents server-side as the single source of truth

---

Made by [Sanjay Marathi](https://github.com/SanjayMarathi). Contact: docgenindia@gmail.com
