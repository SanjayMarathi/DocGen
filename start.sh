#!/bin/bash

# Start Ollama in the background
echo "Starting Ollama server..."
ollama serve &

# Wait for Ollama to be ready
echo "Waiting for Ollama to start..."
while ! curl -s http://localhost:11434/api/tags > /dev/null; do
    sleep 1
done
echo "Ollama is ready!"

# Pull the model (this might take some time on the first run if not cached)
# Using the 3B model as it's the default in the frontend and better suited for limited RAM
echo "Pulling Qwen2.5-Coder model..."
ollama pull qwen2.5-coder:3b

# Apply Django migrations
echo "Applying database migrations..."
cd /app/backend
python manage.py migrate

# Start the Django server on port 7860 (Hugging Face default)
echo "Starting Django server..."
python manage.py runserver 0.0.0.0:7860
