# Stage 1: Build the React Frontend
FROM node:18 AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup Python and backend
FROM python:3.10-slim AS backend
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    zstd \
    && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Setup Python environment
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt
# Ensure whitenoise is installed for static file serving
RUN pip install --no-cache-dir whitenoise

# Configure Ollama models directory with write permissions for user 1000
RUN mkdir -p /.ollama/models && chmod -R 777 /.ollama
ENV OLLAMA_MODELS=/.ollama/models

# Copy backend code
COPY backend/ ./backend/

# Copy React build to backend so Django can serve it
COPY --from=frontend-build /app/frontend/build /app/frontend/build

# Copy and setup start script
COPY start.sh /app/
RUN chmod +x /app/start.sh

# Make the app directory writable for Hugging Face user 1000
RUN chmod -R 777 /app

# Expose the Hugging Face space port
EXPOSE 7860

# Start everything
CMD ["/app/start.sh"]
