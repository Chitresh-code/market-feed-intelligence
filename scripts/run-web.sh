#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/apps/web"
WEB_ENV_FILE="${WEB_ENV_FILE:-$WEB_DIR/.env}"
HOST="${FRONTEND_HOST:-0.0.0.0}"
PORT="${FRONTEND_PORT:-3000}"
INSTALL_ONLY="${INSTALL_ONLY:-0}"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but not installed." >&2
  exit 1
fi

if [[ ! -f "$WEB_ENV_FILE" ]]; then
  echo "Missing frontend env file: $WEB_ENV_FILE" >&2
  exit 1
fi

cd "$WEB_DIR"
set -a
source "$WEB_ENV_FILE"
set +a

required_vars=(SERVICE_BASE_URL LLM_BASE_URL LLM_API_KEY LLM_MODEL)
for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Missing required frontend environment variable: $var_name" >&2
    exit 1
  fi
done

echo "Preparing frontend dependencies..."
npm install

echo "Building frontend..."
npm run build

if [[ "$INSTALL_ONLY" == "1" ]]; then
  echo "Frontend prepared successfully."
  exit 0
fi

echo "Starting frontend on ${HOST}:${PORT}..."
exec npm run start -- --hostname "$HOST" --port "$PORT"
