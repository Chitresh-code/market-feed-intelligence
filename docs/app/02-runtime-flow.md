# Runtime Flow

## End-to-end flow

### 1. Cache preparation

The Python service refreshes the cache for a given date:

1. `jobs.ingest`
2. `jobs.correlate`
3. `jobs.normalize`

This produces:
- raw market, macro, and news artifacts
- correlation artifacts
- per-customer normalized signal bundles
- a manifest with freshness metadata

### 2. Dashboard load

When `/dashboard` loads, the web app:
- reads the selected customer
- resolves the default cache date from the latest manifest
- loads the customer bundle and related manifest data
- builds an evidence pack for display and summary generation

### 3. Summary generation

When the user clicks `Generate Brief`, the web app:
- calls `POST /api/summary`
- reads the customer, persona, manifest, bundle, and correlations
- assembles a compact allocation-anchored evidence pack
- sends the evidence to an OpenAI-compatible LLM
- streams the four-section response back to the dashboard

### 4. Session persistence

Generated summaries are stored in browser `sessionStorage` keyed by:
- `customerId`
- `cacheDate`

This allows the user to move between clients during a session without losing previously generated briefings.

## Evidence selection

The evidence pack is ranking-first and allocation-anchored.

That means:
- top allocations drive which market and sector signals are included
- macro and news context is limited and filtered
- correlations are used when directly relevant to the client sleeve mix
- missing sleeve coverage should degrade honestly instead of being filled with generic commentary

## Current provider path

### Market proxies

Market and sleeve data is fetched from `yfinance` using:
- broad indices
- ETFs
- tested single-name or fund proxies when direct sector indices are not available

### Macro

Macro series are fetched from `fredapi`.

### News

News and catalysts are fetched from `Finnhub` and filtered during normalization.

### LLM

The summary route uses the official OpenAI Node SDK against an OpenAI-compatible endpoint configured by:
- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_MODEL`

## Important runtime constraints

- external providers are not called during summary generation
- the summary path is cache-backed and deterministic up to the LLM step
- freshness metadata must be treated as part of the interpretation layer
- if a sleeve lacks direct evidence, the prompt instructs the model not to invent support
