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
- `DATABASE_URL`
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
- `SERVICE_BASE_URL`
- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_MODEL`
- `LLM_REASONING_EFFORT` optional

Start Postgres before starting the Python service.

Bootstrap a fresh database before the first refresh:

```bash
cd apps/service
set -a
source .env
set +a
uv run python -m jobs.bootstrap_personas
uv run python -m jobs.bootstrap_customers
uv run python -m jobs.bootstrap_correlation_mappings
```

### Start the service

```bash
cd apps/service
set -a
source .env
set +a
uv run uvicorn api.app:app --reload --port 8001
```

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
- raw market rows
- raw macro rows
- raw news rows
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

## Summary generation notes

- The summary route uses four parallel section prompts defined in `apps/web/prompts`.
- The route streams structured section events back to the UI rather than one monolithic text blob.
- For Google’s `generativelanguage` OpenAI-compatible endpoint, `LLM_REASONING_EFFORT` is currently ignored because the endpoint returns `400` for the tested model path when that field is present.
- If a provider leaks hidden reasoning tags such as `<thought>` into the stream, the route sanitizes them before rendering and export.

## Verification checklist

### Cache

After refresh, verify:
- `GET {SERVICE_BASE_URL}/cache/latest` returns the requested or newest successful date
- `GET {SERVICE_BASE_URL}/manifests/{date}` returns freshness for the current run
- `GET {SERVICE_BASE_URL}/bundles/{date}/C001` through `C005` return bundle payloads
- `GET {SERVICE_BASE_URL}/customers` returns the active customer set
- `GET {SERVICE_BASE_URL}/personas` returns the active persona set
- `GET {SERVICE_BASE_URL}/correlation-mappings` returns the active mapping rules

### Briefing quality

Check:
- summaries differ by client and persona
- sleeve-level commentary matches the client allocation mix
- unsupported claims are not invented
- stale macro context is acknowledged when relevant
- `Client-Relevant Signals` stays analytical and does not collapse into `Talking Points`
- `Talking Points` reads like RM conversation cues rather than a restatement of the analysis

Horizon quality checks:
- each sleeve or linkage sub-section contains explicit `**Short-term:**`, `**Medium-term:**`, and `**Long-term:**` labels
- HNI briefings open with immediate price action and have concise long-term entries
- institutional briefings give proportionally more weight to medium and long-term entries
- long-term entries contain real data (cycle direction, 90d/180d delta, structural correlation narrative) rather than a generic "no data available" placeholder
- `Talking Points` bullets open with `[Short-term]`, `[Medium-term]`, or `[Long-term]` tags and the full set covers all three horizons

### UI

Check:
- each client keeps its own generated brief during the browser session
- cache refresh works from the dashboard
- exports download correctly

## Demo-day guidance

- run a full `refresh_cache` (not just `normalize`) before the session so the raw macro cache contains `delta_90d` and `delta_180d` fields; without them, long-term macro trend signals will not be generated
- keep the Python service running during the demo; the web app now depends on its HTTP endpoints for manifest, bundle, and correlation reads
- generate at least one brief per key demo client in advance for quality review
- keep the dashboard focused on the 2-3 strongest client scenarios
- verify that long-term entries contain actual cycle data (e.g. "yield has moved +0.22% over 180 days, gradual tightening bias") rather than a fallback placeholder
- if a sleeve has limited direct coverage, prefer honest framing over filling the gap with generic market commentary
