# Macquarie Sales Intelligence Agent PoC

Repository scaffold for a two-layer proof of concept:

- `apps/web`: public-facing Next.js application, UI, and demo-safe API layer
- `apps/service`: `uv`-managed Python workspace for ingestion, normalization, ranking, embeddings, and correlation jobs
- `data`: synthetic customer/persona inputs and demo artifacts
- `docs/app`: current application behavior, runtime flow, and operator docs
- `docs/internal`: implementation notes and next steps

## Environment files

Current env vars:

- `apps/service/.env.example`
  - `FRED_API_KEY`
  - `FINNHUB_API_KEY`
- `apps/web/.env.example`
  - `LLM_BASE_URL`
  - `LLM_API_KEY`
  - `LLM_MODEL`

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

## Run

### Start the web app

```bash
cd apps/web
npm run dev
```

The web app summary route expects an OpenAI-compatible provider configuration in `apps/web/.env.local`.

### Run the raw ingest job

```bash
cd apps/service
set -a
source .env
set +a
uv run python -m jobs.ingest --date 2026-04-02
```

### Refresh the full cache in one command

```bash
cd apps/service
set -a
source .env
set +a
uv run python -m jobs.refresh_cache --date 2026-04-02
```

### Normalize raw cache into per-customer bundles

```bash
cd apps/service
uv run python -m jobs.normalize --date 2026-04-02
```

### Generate correlation artifacts

```bash
cd apps/service
uv run python -m jobs.correlate --date 2026-04-02
uv run python -m jobs.normalize --date 2026-04-02
```

Expected outputs after a successful ingest run:

- `data/cache/raw/market/2026-04-02.json`
- `data/cache/raw/macro/2026-04-02.json`
- `data/cache/raw/news/2026-04-02.json`
- `data/cache/manifests/2026-04-02.json`

Expected outputs after a successful normalize run:

- `data/cache/normalized/signals/2026-04-02--C001.json`
- `data/cache/normalized/signals/2026-04-02--C002.json`
- `data/cache/normalized/signals/2026-04-02--C003.json`
- `data/cache/normalized/signals/2026-04-02--C004.json`
- `data/cache/normalized/signals/2026-04-02--C005.json`

Expected correlation output:

- `data/cache/correlations/2026-04-02.json`

Expected outputs after a successful refresh run:

- `data/cache/raw/market/2026-04-02.json`
- `data/cache/raw/macro/2026-04-02.json`
- `data/cache/raw/news/2026-04-02.json`
- `data/cache/correlations/2026-04-02.json`
- `data/cache/normalized/signals/2026-04-02--C001.json`
- `data/cache/normalized/signals/2026-04-02--C002.json`
- `data/cache/normalized/signals/2026-04-02--C003.json`
- `data/cache/normalized/signals/2026-04-02--C004.json`
- `data/cache/normalized/signals/2026-04-02--C005.json`
- `data/cache/manifests/2026-04-02.json`

`jobs.refresh_cache` runs the pipeline in this order:

1. `jobs.ingest`
2. `jobs.correlate`
3. `jobs.normalize`

If one or more raw providers fail, the refresh command still updates the manifest and correlation artifact, but it skips normalization when required raw cache files are missing.

If a provider key is missing or a provider call fails, the run still writes the manifest and marks the affected dataset as `missing`.
