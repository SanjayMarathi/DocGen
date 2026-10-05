#!/bin/bash
# Container entrypoint: start Ollama, load + warm the model in the background while Django
# sets itself up, then hand over to gunicorn.

MODEL="${OLLAMA_MODEL:-qwen2.5-coder:3b}"
# Must match NUM_CTX in backend/generator/views.py: Ollama reloads the model if num_ctx changes.
NUM_CTX="${OLLAMA_NUM_CTX:-6144}"
OLLAMA_HOST_URL="http://127.0.0.1:11434"

# Start Ollama in the background
ollama serve &

# Pull (only if missing) and warm the model in parallel with the Django setup below.
# Warming loads the weights into RAM so the first user request doesn't pay the load time.
prepare_model() {
    echo "Waiting for Ollama..."
    for _ in $(seq 1 60); do
        curl -sf "${OLLAMA_HOST_URL}/api/tags" > /dev/null && break
        sleep 1
    done

    if ollama list | grep -q "^${MODEL}"; then
        echo "Model ${MODEL} already present."
    else
        echo "Pulling ${MODEL}..."
        ollama pull "${MODEL}"
    fi

    echo "Warming up ${MODEL}..."
    curl -s "${OLLAMA_HOST_URL}/api/generate" \
        -d "{\"model\":\"${MODEL}\",\"prompt\":\"\",\"keep_alive\":\"${OLLAMA_KEEP_ALIVE:-24h}\",\"options\":{\"num_ctx\":${NUM_CTX}}}" \
        > /dev/null
    echo "Model ready."
}
prepare_model &
MODEL_PID=$!

# This allows "backend.settings" to be found
export PYTHONPATH=$PYTHONPATH:/app/backend

cd backend || exit 1

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Creating demo user..."
python manage.py shell -c "from django.contrib.auth.models import User; User.objects.filter(username='demo').exists() or User.objects.create_user('demo', 'demo@example.com', 'demouser')"

# Don't accept traffic until the model is loaded, otherwise the first requests would fail.
wait "$MODEL_PID"

echo "Starting Gunicorn with Threads..."
# --threads keeps streaming responses from blocking a whole worker.
# Timeout is generous because LLM generation is slow on CPU.
exec gunicorn backend.wsgi:application \
    --bind 0.0.0.0:7860 \
    --workers 2 \
    --threads 4 \
    --timeout 300 \
    --graceful-timeout 300
