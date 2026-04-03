# Sales Intelligence Service

`uv`-managed Python workspace for batch jobs and reusable domain logic.

## Intended responsibilities

- ingest cached `yfinance`, `fredapi`, and `Finnhub` inputs
- normalize raw data into a shared signal contract
- score evidence for each customer/persona
- compute and persist correlation artifacts
- optionally embed supporting narratives into ChromaDB

## Layout

- `src/config.py`: path and runtime settings
- `src/jobs`: batch job entry points
- `src/domain`: contracts and business logic
- `src/adapters`: source-specific integration code

## Preferred operator flow

- `uv run python -m jobs.refresh_cache --date YYYY-MM-DD`

This orchestrates raw ingest, correlation generation, and normalization in one step and is the default cache refresh entrypoint for the PoC.
