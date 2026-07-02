FROM python:3.10

# Install system dependencies
RUN apt-get update && apt-get install -y curl zstd && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn whitenoise

# Copy project files
COPY . .

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

RUN chmod +x entrypoint.sh

EXPOSE 7860

CMD ["/bin/bash", "entrypoint.sh"]