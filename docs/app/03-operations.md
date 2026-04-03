# Operations

## Local setup

### Web

```bash
cd apps/web
npm install
```

### Service

```bash
cd apps/service
uv sync
```

## Environment

### Service env

Create `apps/service/.env` with:
- `FRED_API_KEY`
- `FINNHUB_API_KEY`

Export it before running Python jobs:

```bash
cd apps/service
set -a
source .env
set +a
```

### Web env

Create `apps/web/.env.local` with:
- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_MODEL`

## Refresh workflow

Preferred command:

```bash
cd apps/service
set -a
source .env
set +a
uv run python -m jobs.refresh_cache --date 2026-04-02
```

This refreshes:
- raw market cache
- raw macro cache
- raw news cache
- correlations
- normalized per-customer bundles
- manifest freshness

## Web workflow

Start the app:

```bash
cd apps/web
npm run dev
```

Then:
1. open `/dashboard`
2. choose a client
3. refresh cache if needed
4. generate the brief
5. export as Markdown or PDF if needed

## Verification checklist

### Cache

After refresh, verify:
- `data/cache/manifests/{date}.json` exists
- `data/cache/normalized/signals/{date}--C001.json` through `C005.json` exist
- manifest freshness reflects the current run

### Briefing quality

Check:
- summaries differ by client and persona
- sleeve-level commentary matches the client allocation mix
- unsupported claims are not invented
- stale macro context is acknowledged when relevant

### UI

Check:
- each client keeps its own generated brief during the browser session
- cache refresh works from the dashboard
- exports download correctly

## Demo-day guidance

- refresh the target cache date before the session
- generate at least one brief per key demo client in advance for quality review
- keep the dashboard focused on the 2-3 strongest client scenarios
- if a sleeve has limited direct coverage, prefer honest framing over filling the gap with generic market commentary
