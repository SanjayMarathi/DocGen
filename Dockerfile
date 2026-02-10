# Stage 1: build frontend
FROM node:18 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
# Use npm install to avoid CI lockfile/peer-deps failures during image build
RUN npm install --legacy-peer-deps
COPY frontend/ .
RUN npm run build

# Stage 2: build python image
FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app

# system deps if needed
RUN apt-get update && apt-get install -y build-essential curl && rm -rf /var/lib/apt/lists/*

# copy requirements and install
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# lightweight ASGI server + async HTTP client for streaming
RUN pip install --no-cache-dir "uvicorn[standard]" httpx

# copy backend app
COPY backend/ /app/backend

# copy frontend build into Django static locations
# Place index.html under backend/static and the built JS/CSS under STATIC_ROOT
COPY --from=frontend-build /app/frontend/build/index.html /app/backend/static/index.html
COPY --from=frontend-build /app/frontend/build/static /app/backend/staticfiles

WORKDIR /app/backend
# run collectstatic to pick up any additional static files
ENV DJANGO_SETTINGS_MODULE=backend.settings
RUN mkdir -p /app/backend/staticfiles
RUN python manage.py collectstatic --noinput

EXPOSE 8000
# Run as ASGI server for non-blocking streaming (uvicorn + uvloop + httptools from uvicorn[standard])
CMD ["uvicorn", "backend.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--loop", "uvloop", "--http", "httptools"]
