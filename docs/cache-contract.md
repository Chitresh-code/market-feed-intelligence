# Cache Contract

## Purpose

The active operational contract is no longer `data/cache`.

The current runtime boundary is:
- Python microservice in `apps/service`
- Postgres as the operational store
- Next.js in `apps/web` consuming Python service HTTP endpoints

`data/cache` should be treated as historical generated artifacts only. It is useful for reference and older demo snapshots, but it is not the runtime source of truth.

## Active runtime contract

### Python service owns

- fetching market, macro, and news provider data
- generating correlations
- normalizing ranked signal bundles
- persisting refresh snapshots into Postgres
- exposing read APIs for manifests, bundles, and correlations

### Next.js owns

- customer and persona JSON inputs
- dashboard composition
- evidence assembly for LLM prompts
- live summary generation
- export UX
- operator-triggered refresh via Python `POST /refresh`

## Postgres snapshot model

The service stores date-versioned refresh snapshots rather than mutable latest-only rows.

Core tables:
- `cache_runs`
- `raw_market_records`
- `raw_macro_records`
- `raw_news_records`
- `correlation_records`
- `signal_bundles`
- `normalized_signals`
- `manifest_freshness`

Read behavior:
- the app resolves the latest successful cache date from `cache_runs`
- manifest, bundle, and correlation reads always resolve against the latest successful run for a requested date

## HTTP contract

The web app should rely on these Python service endpoints:
- `GET /health`
- `GET /cache/dates`
- `GET /cache/latest`
- `GET /manifests/{date}`
- `GET /bundles/{date}/{customer_id}`
- `GET /correlations/{date}`
- `POST /refresh`

The response shapes intentionally mirror the previous file-based manifest and bundle payloads so the UI contract stays stable while the storage layer changes.

## Freshness rules

Freshness is computed and persisted by the Python service, not inferred in the web layer.

Every manifest dataset is classified as:
- `fresh`
- `stale`
- `missing`

The web app should render freshness as returned by the service.

## Historical artifact guidance

If `data/cache` exists in the repository:
- do not rely on it for request-time reads
- do not treat it as authoritative for the dashboard
- only use it for historical comparison, debugging, or archival reference
