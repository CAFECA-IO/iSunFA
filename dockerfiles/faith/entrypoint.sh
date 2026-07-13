#!/bin/sh

# Info: (20260626 - Luphia) Start the Ollama server in the background
ollama serve &
OLLAMA_PID=$!

# Info: (20260626 - Luphia) Wait for the server to be available
echo "Waiting for Ollama server to start..."
sleep 5

# Info: (20260626 - Luphia) Pull the requested model
echo "Pulling model gemma4:e4b..."
ollama pull gemma4:e4b

echo "Model pulled successfully. Keeping the server running..."
# Info: (20260626 - Luphia) Wait for the background process to prevent the container from exiting
wait $OLLAMA_PID
