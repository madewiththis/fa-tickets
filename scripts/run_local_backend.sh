#!/usr/bin/env bash
set -euo pipefail

if [ ! -f .env ]; then
  echo ".env not found. Copy .env.example to .env and edit DATABASE_URL."
  exit 1
fi

cd backend
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Apply migrations
export $(grep -v '^#' ../.env | xargs)
alembic -c alembic.ini upgrade head

# Run dev server
uvicorn app.main:app --reload --port ${BACKEND_PORT:-8000}

