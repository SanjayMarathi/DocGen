FROM python:3.10

# Install system dependencies
RUN apt-get update && apt-get install -y curl zstd && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies (gunicorn + whitenoise are listed in requirements.txt)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

RUN chmod +x entrypoint.sh

# Keep the model in memory between requests and serve one request at a time
# (parallel requests would split the CPU and slow every one of them down).
ENV OLLAMA_KEEP_ALIVE=24h \
    OLLAMA_NUM_PARALLEL=1 \
    OLLAMA_MAX_LOADED_MODELS=1 \
    PYTHONUNBUFFERED=1

EXPOSE 7860

CMD ["/bin/bash", "entrypoint.sh"]
