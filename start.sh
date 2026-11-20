#!/usr/bin/env bash

# ==============================================================================
# Hotel Offer Orchestrator — Automated Startup Script
# ==============================================================================

set -e

echo ""
echo "===================================================================="
echo "           🏨  Hotel Offer Orchestrator Startup  🏨                "
echo "===================================================================="
echo ""

# Ensure .env exists
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    echo "📋 Creating .env file from .env.example..."
    cp .env.example .env
  fi
fi

# Function to start via Docker Compose
start_docker() {
  echo "🚀 Launching complete cluster via Docker Compose..."
  echo "   - Redis Server (:6379)"
  echo "   - Temporal Server (:7233)"
  echo "   - Temporal Web Dashboard (:8233)"
  echo "   - Express API Server (:3000)"
  echo "   - Temporal Background Worker"
  echo ""
  echo "👉 API & Web UI:         http://localhost:3000"
  echo "👉 Interactive Swagger:   http://localhost:3000/api-docs"
  echo "👉 Temporal UI:           http://localhost:8233"
  echo ""
  exec docker compose up --build
}

# Function to start via Local Node.js
start_local() {
  echo "⚡ Starting in Local Node.js standalone mode..."
  
  if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
  fi

  echo "🔨 Building TypeScript project..."
  npm run build

  echo ""
  echo "✅ Server starting on port 3000"
  echo "👉 Web UI & Search:       http://localhost:3000"
  echo "👉 Interactive Swagger:   http://localhost:3000/api-docs"
  echo "👉 Health Check:          http://localhost:3000/health"
  echo ""
  echo "Sample test command in another terminal:"
  echo '   curl "http://localhost:3000/api/hotels?city=delhi&minPrice=5400&maxPrice=6000"'
  echo ""
  exec npm start
}

# Check if Docker is installed and running
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo "🐳 Docker daemon is running."
  start_docker
else
  echo "ℹ️  Docker daemon is not running or not accessible."
  
  # On macOS, attempt to start Docker.app if present
  if [ -d "/Applications/Docker.app" ]; then
    echo "⏳ Attempting to start Docker Desktop..."
    open -a Docker
    
    # Wait up to 15 seconds for Docker to initialize
    for i in {1..15}; do
      if docker info >/dev/null 2>&1; then
        echo "🐳 Docker Desktop is ready!"
        start_docker
        exit 0
      fi
      sleep 1
    done
    echo "⚠️  Docker did not start in time. Falling back to local Node.js mode."
  fi

  start_local
fi

