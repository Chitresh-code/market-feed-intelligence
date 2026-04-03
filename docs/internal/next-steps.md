# Next Steps

## Current scaffold

- `apps/web` owns the public-facing UI and demo API layer.
- `apps/service` owns batch ingestion, normalization, scoring, embeddings, and correlation logic.
- `data/customers` and `data/personas` hold canonical synthetic input fixtures.
- `data/demo/fallback-briefs` is reserved for deterministic demo recovery assets.
- `data/cache` is the generated artifact boundary and is defined in `docs/internal/cache-contract.md`.
- `uv run python -m jobs.refresh_cache --date YYYY-MM-DD` is now the canonical operator command for rebuilding the cache.

## Immediate build sequence

1. Replace the scaffolded `/api/summary` output with a grounded LLM orchestration path.
2. Implement real customer switching and a streaming client component in the web UI.
3. Tighten news relevance scoring so generic finance headlines do not outrank client-specific signals.
4. Add ChromaDB only for supporting retrieval of normalized narratives and news summaries.
5. Add fallback brief fixtures for each persona and a demo operator runbook.

## Definition of done for the next milestone

- `GET /api/customers` lists all five synthetic clients.
- `GET /api/customer/{id}` returns the canonical customer and persona contract.
- `GET /api/dashboard-data` reads cache-backed artifacts instead of hard-coded placeholders.
- `POST /api/summary` streams grounded sectioned output using the assembled evidence bundle.
- Python jobs can populate `data/cache` for a demo date without changing the web layer contract.
