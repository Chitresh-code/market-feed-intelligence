#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_DIR="$ROOT_DIR/apps/service"
SERVICE_ENV_FILE="${SERVICE_ENV_FILE:-$SERVICE_DIR/.env}"
HOST="${BACKEND_HOST:-0.0.0.0}"
PORT="${BACKEND_PORT:-8000}"
BOOTSTRAP="${BOOTSTRAP:-0}"
BOOTSTRAP_DAYS="${BOOTSTRAP_DAYS:-7}"
BOOTSTRAP_END_DATE="${BOOTSTRAP_END_DATE:-$(date +%Y-%m-%d)}"

if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required but not installed." >&2
  exit 1
fi

if [[ ! -f "$SERVICE_ENV_FILE" ]]; then
  echo "Missing backend env file: $SERVICE_ENV_FILE" >&2
  exit 1
fi

cd "$SERVICE_DIR"
set -a
source "$SERVICE_ENV_FILE"
set +a

required_vars=(DATABASE_URL FRED_API_KEY FINNHUB_API_KEY)
for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Missing required backend environment variable: $var_name" >&2
    exit 1
  fi
done

echo "Preparing backend dependencies..."
PYTHONPATH=src uv sync

if [[ "$BOOTSTRAP" == "1" ]]; then
  echo "Bootstrapping personas, customers, correlation mappings, and ${BOOTSTRAP_DAYS} day history..."
  PYTHONPATH=src uv run python -m jobs.bootstrap_personas
  PYTHONPATH=src uv run python -m jobs.bootstrap_customers
  PYTHONPATH=src uv run python -m jobs.bootstrap_correlation_mappings
  PYTHONPATH=src uv run python -m jobs.bootstrap_history --days "$BOOTSTRAP_DAYS" --end-date "$BOOTSTRAP_END_DATE"
fi

echo "Starting backend on ${HOST}:${PORT}..."
exec env PYTHONPATH=src uv run uvicorn api.app:app --host "$HOST" --port "$PORT"
