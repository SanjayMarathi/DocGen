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

# copy backend app
COPY backend/ /app/backend

# copy frontend build into Django static locations
# Place index.html under backend/static and the built JS/CSS under STATIC_ROOT
COPY --from=frontend-build /app/frontend/build/index.html /app/backend/static/index.html
COPY --from=frontend-build /app/frontend/build/static /app/backend/staticfiles

WORKDIR /app/backend
# run collectstatic to pick up any additional static files
RUN python manage.py collectstatic --noinput

EXPOSE 8000
CMD ["gunicorn","backend.wsgi:application","--bind","0.0.0.0:8000","--workers","2","--threads","8","--worker-class","gthread","--timeout","0","--keep-alive","75","--access-logfile","-","--error-logfile","-"]
