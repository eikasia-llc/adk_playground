#!/usr/bin/env bash
# Start backend and frontend concurrently for local development.
# Usage: ./dev.sh

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# ---- Backend ----
echo "Starting backend..."
cd "$ROOT/backend"

if [ ! -d ".venv" ]; then
  echo "  Creating virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate

if [ ! -f ".env" ]; then
  echo "  WARNING: backend/.env not found. Copying from .env.example..."
  cp .env.example .env
  echo "  Edit backend/.env and add your GOOGLE_API_KEY, then re-run."
  exit 1
fi

pip install -q -r requirements.txt

uvicorn main:app --reload --port 8080 &
BACKEND_PID=$!
echo "  Backend PID: $BACKEND_PID (http://localhost:8080)"

# ---- Frontend ----
echo "Starting frontend..."
cd "$ROOT/frontend"

if [ ! -f ".env.local" ]; then
  echo "  Copying .env.local.example → .env.local"
  cp .env.local.example .env.local
fi

if [ ! -d "node_modules" ]; then
  echo "  Installing npm dependencies..."
  npm install
fi

npm run dev &
FRONTEND_PID=$!
echo "  Frontend PID: $FRONTEND_PID (http://localhost:3000)"

# ---- Cleanup on Ctrl+C ----
trap "echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" INT TERM

echo ""
echo "  Backend:  http://localhost:8080"
echo "  Frontend: http://localhost:3000"
echo "  Press Ctrl+C to stop both."
echo ""

wait
