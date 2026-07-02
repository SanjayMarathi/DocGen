#!/bin/bash
# Start Ollama in the background
ollama serve & 

# Wait for Ollama to be "alive" before pulling
sleep 5

echo "Pre-loading model..."
ollama pull qwen2.5-coder:3b

# This allows "backend.settings" to be found
export PYTHONPATH=$PYTHONPATH:/app/backend

echo "Running migrations..."
cd backend || exit
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Creating demo user..."
python manage.py shell -c "from django.contrib.auth.models import User; User.objects.filter(username='demo').exists() or User.objects.create_user('demo', 'demo@example.com', 'demouser')"

echo "Starting Gunicorn with Threads..."
# Added --threads to handle streaming better without blocking the main worker
# Increased timeout to 300 because LLM generation is slow on CPU
gunicorn backend.wsgi:application \
    --bind 0.0.0.0:7860 \
    --workers 2 \
    --threads 4 \
    --timeout 300 \
    --graceful-timeout 300