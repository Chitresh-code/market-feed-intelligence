# Macquarie Sales Intelligence Agent PoC

Repository scaffold for a two-layer proof of concept:

- `apps/web`: public-facing Next.js application, UI, and demo-safe API layer
- `apps/service`: `uv`-managed Python data microservice backed by Postgres
- `data`: bootstrap fixtures for customers and personas
- `docs/app`: current application behavior, runtime flow, and operator docs
- `docs`: architecture and application docs

## Environment files

Current env vars:

- `apps/service/.env.example`
  - `DATABASE_URL`
  - `FRED_API_KEY`
  - `FINNHUB_API_KEY`
- `apps/web/.env.example`
  - `SERVICE_BASE_URL`
  - `LLM_BASE_URL`
  - `LLM_API_KEY`
  - `LLM_MODEL`
  - `LLM_REASONING_EFFORT` optional override for providers that support reasoning levels; ignored for Google's generativelanguage OpenAI-compatible endpoint

Create local env files before running:

```bash
cp apps/service/.env.example apps/service/.env
cp apps/web/.env.example apps/web/.env.local
```

The Python service does not auto-load `.env` yet. Export it into your shell before running Python commands:

```bash
cd apps/service
set -a
source .env
set +a
```

## Setup

### Web

```bash
cd apps/web
npm install
```

### Python

```bash
cd apps/service
uv sync
```

Start Postgres separately before running the service.

## Run

### Start the Python service

```bash
cd apps/service
set -a
source .env
set +a
uv run uvicorn api.app:app --reload --port 8000
```

### Start the web app

```bash
cd apps/web
npm run dev
```

The web app expects:
- the Python service at `SERVICE_BASE_URL`
- an OpenAI-compatible provider configuration in `apps/web/.env.local`

### Refresh the shared cache

```bash
cd apps/service
set -a
source .env
set +a
uv run python -m jobs.refresh_cache --date 2026-04-07
```

This refreshes Postgres-backed:
- raw market data
- raw macro data
- raw news data
- correlations
- normalized per-customer bundles
- manifest freshness

### Bootstrap personas, customers, and correlation mappings

For a fresh database:

```bash
cd apps/service
set -a
source .env
set +a
uv run python -m jobs.bootstrap_personas
uv run python -m jobs.bootstrap_customers
uv run python -m jobs.bootstrap_correlation_mappings
```

Runtime data is now stored in Postgres. `data/cache` should be treated as historical artifacts, and `data/customers` plus `data/personas` should be treated as bootstrap fixtures rather than runtime sources of truth.
