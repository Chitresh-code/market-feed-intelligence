# Sales Intelligence Service

`uv`-managed Python data microservice for ingestion, normalization, correlations, and Postgres-backed cache APIs.

## Intended responsibilities

- fetch external market, macro, and news data
- own personas, customers, allocations, and correlation mappings in Postgres
- normalize and persist signal bundles into Postgres
- compute and persist correlation artifacts
- expose cache/query APIs over FastAPI
- run synchronous cache refresh for the PoC operator flow

## Layout

- `src/api`: FastAPI application and routes
- `src/db`: SQLAlchemy engine and ORM models
- `src/repositories`: persistence layer
- `src/services`: orchestration and query services
- `src/jobs`: CLI entry points
- `src/domain`: contracts and business logic
- `src/adapters`: source-specific integration code

## Run locally

```bash
cd apps/service
uv sync
set -a
source .env
set +a
uv run uvicorn api.app:app --reload --port 8000
```

## Preferred operator flow

- `uv run python -m jobs.refresh_cache --date YYYY-MM-DD`
- `uv run python -m jobs.bootstrap_personas`
- `uv run python -m jobs.bootstrap_customers`
- `uv run python -m jobs.bootstrap_correlation_mappings`

This refreshes Postgres-backed cache data in one step and is the default operator entrypoint for the PoC.

Bootstrap order for a fresh database:
1. `jobs.bootstrap_personas`
2. `jobs.bootstrap_customers`
3. `jobs.bootstrap_correlation_mappings`
4. `jobs.refresh_cache --date YYYY-MM-DD`
