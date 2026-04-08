#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_HOST="${BACKEND_HOST:-127.0.0.1}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_HOST="${FRONTEND_HOST:-0.0.0.0}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
BOOTSTRAP="${BOOTSTRAP:-0}"
BOOTSTRAP_DAYS="${BOOTSTRAP_DAYS:-7}"
BOOTSTRAP_END_DATE="${BOOTSTRAP_END_DATE:-$(date +%Y-%m-%d)}"

cleanup() {
  if [[ -n "${API_PID:-}" ]]; then
    kill "$API_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

echo "Starting backend..."
(
  cd "$ROOT_DIR"
  BACKEND_HOST="$BACKEND_HOST" \
  BACKEND_PORT="$BACKEND_PORT" \
  BOOTSTRAP="$BOOTSTRAP" \
  BOOTSTRAP_DAYS="$BOOTSTRAP_DAYS" \
  BOOTSTRAP_END_DATE="$BOOTSTRAP_END_DATE" \
  ./scripts/run-api.sh
) &
API_PID=$!

echo "Waiting for backend health on http://${BACKEND_HOST}:${BACKEND_PORT}/health ..."
for _ in $(seq 1 60); do
  if command -v curl >/dev/null 2>&1 && curl -fsS "http://${BACKEND_HOST}:${BACKEND_PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! command -v curl >/dev/null 2>&1 || ! curl -fsS "http://${BACKEND_HOST}:${BACKEND_PORT}/health" >/dev/null 2>&1; then
  echo "Backend did not become healthy in time." >&2
  exit 1
fi

echo "Starting frontend..."
cd "$ROOT_DIR"
FRONTEND_HOST="$FRONTEND_HOST" FRONTEND_PORT="$FRONTEND_PORT" ./scripts/run-web.sh
