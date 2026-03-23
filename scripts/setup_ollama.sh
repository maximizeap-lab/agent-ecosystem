#!/bin/bash
# setup_ollama.sh — Install Ollama and pull all 6 recommended models

set -e

echo "==> Installing Ollama..."
curl -fsSL https://ollama.com/install.sh | sh

echo "==> Starting Ollama server in background..."
ollama serve &>/tmp/ollama.log &
sleep 3

echo "==> Pulling 6 local models (this will take a while)..."

# 1. Fast/simple tasks — docs, descriptions
ollama pull llama3.2:3b

# 2. General research and writing
ollama pull llama3.1:8b

# 3. Code generation — backend, frontend, tests
ollama pull deepseek-coder:6.7b

# 4. Structured output — schemas, configs, JSON
ollama pull mistral:7b

# 5. Analysis and reasoning
ollama pull phi3.5

# 6. Complex multi-step reasoning
ollama pull gemma2:9b

echo ""
echo "✓ All 6 models ready. Ollama is running at http://localhost:11434"
echo ""
echo "Models installed:"
ollama list
