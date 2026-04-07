# Runtime Flow

## End-to-end flow

### 1. Cache preparation

The Python data microservice refreshes one Postgres-backed cache snapshot for a given date.

Operator and UI refresh both converge on the same orchestration path:
- `POST /refresh` on the Python service
- or `uv run python -m jobs.refresh_cache --date YYYY-MM-DD`

The refresh pipeline:
1. fetches raw market data
2. fetches raw macro data
3. fetches raw news data
4. generates correlations
5. normalizes one ranked signal bundle per customer
6. stores manifest freshness rows for the run

This produces:
- raw market, macro, and news rows in Postgres
- correlation rows
- per-customer normalized signal bundle rows
- manifest freshness metadata tied to the cache run
- all customer, allocation, persona, and correlation-mapping context remains service-owned in Postgres during runtime

### 2. Dashboard load

When `/dashboard` loads, the web app:
- reads the selected customer
- resolves the default cache date from the latest successful cache run exposed by the Python service
- loads customers, personas, the customer bundle, manifest, and correlations from the Python service over HTTP
- builds an evidence pack for display and summary generation

### 3. Summary generation

When the user clicks `Generate Brief`, the web app:
- calls `POST /api/summary`
- reads the customer, persona, manifest, bundle, and correlations
- assembles a compact allocation-anchored evidence pack
- loads one YAML prompt profile per section from `apps/web/prompts`
- builds section-specific context slices instead of sending one bulk prompt
- sends four parallel requests to an OpenAI-compatible LLM
- streams section events back to the dashboard over `text/event-stream`

The four sections are:
- `Market Pulse`
- `Client-Relevant Signals`
- `Global Linkages`
- `Talking Points`

Each section has its own prompt contract and evidence slice:
- `Market Pulse`: short-term market and sleeve signals plus long-term signals
- `Client-Relevant Signals`: market signals, medium-term macro and news context, plus long-term signals
- `Global Linkages`: medium-term correlations, macro context, short-term news catalysts, plus long-term signals
- `Talking Points`: all signal types combined across all three horizons

Signals are organized into three horizon groups before being passed to each prompt: `SHORT-TERM SIGNALS`, `MEDIUM-TERM SIGNALS`, and `LONG-TERM SIGNALS`. Each prompt also receives a `horizon_priority` variable describing the persona's horizon weighting (HNI equity: short-primary; institutional fund: medium and long-primary). The output contract for each section requires explicit `**Short-term:**`, `**Medium-term:**`, and `**Long-term:**` labels within each sleeve or linkage analysis.

### 4. Session persistence

Generated summaries are stored in browser `sessionStorage` keyed by:
- `customerId`
- `cacheDate`

This allows the user to move between clients during a session without losing previously generated briefings.

## Evidence selection

The evidence pack is ranking-first, allocation-anchored, and horizon-aware.

### Signal horizon classification

Every normalized signal carries a `time_horizon` field set at normalization time:
- `short`: market indices, sector proxies, news catalysts
- `medium`: macro series current values, 90-day rolling correlations
- `long`: macro 6-month trend signals, 365-day structural correlations

### Persona horizon weighting

Signal selection applies a per-persona horizon multiplier to the score used for ranking:
- HNI equity: short × 1.3, medium × 1.0, long × 0.7
- Institutional fund: short × 0.8, medium × 1.2, long × 1.3

This biases the ranked selection toward the horizons that matter most for each persona without hard-filtering any horizon.

### Evidence pack structure

The assembled evidence pack contains four signal buckets:
- `marketSignals`: short-term market and sector proxy signals anchored to top allocations
- `contextSignals`: medium-term macro series plus allocation-matched news catalysts
- `correlationSignals`: medium-term 90-day rolling correlations matched to client sleeves
- `longTermSignals`: long-term signals selected independently — 365-day structural correlations and macro 180-day trend signals — always included regardless of score ranking against the medium bucket

`longTermSignals` are a separate bucket to guarantee long-horizon evidence reaches the prompts rather than being crowded out by higher-scoring short-term signals.

### Honest degradation

If no long-term signals are available for a given date, the horizon group emits an explicit note to the LLM rather than being silently omitted.

## Current provider path

### Market proxies

Market and sleeve data is fetched from `yfinance` using:
- broad indices
- ETFs
- tested single-name or fund proxies when direct sector indices are not available

### Macro

Macro series are fetched from `fredapi`. The adapter computes three deltas from the full historical series returned by the API: `delta_1d` (previous observation), `delta_90d` (90 calendar days prior), and `delta_180d` (180 calendar days prior). The normalization job uses `delta_90d` and `delta_180d` to generate a separate long-term trend signal per series with a narrative describing the rate or currency cycle direction over the 6-month window.

### News

News and catalysts are fetched from `Finnhub` and filtered during normalization.

### LLM

The summary route uses the official OpenAI Node SDK against an OpenAI-compatible endpoint configured by:
- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_MODEL`
- `LLM_REASONING_EFFORT` optional, provider-dependent

## Important runtime constraints

- external providers are not called during summary generation
- the summary path is cache-backed and deterministic up to the LLM step
- the web app does not read runtime cache JSON files directly anymore
- the Python service is now the read/write boundary for operational market, macro, news, correlation, and normalized data
- the web app also does not read runtime customer or persona JSON files directly anymore
- freshness metadata must be treated as part of the interpretation layer
- if a sleeve lacks direct evidence, the prompt instructs the model not to invent support
- thinking-style providers may emit hidden-reasoning tokens or stray closing tags in the stream; the route sanitizes these before sending visible content to the UI
- Google’s `generativelanguage` OpenAI-compatible endpoint rejects `reasoning_effort` for the currently tested model path, so that setting is ignored there
