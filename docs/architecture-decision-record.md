# Architecture Decision Record

This document is the canonical record of the PoC's architecture and product-scope decisions.

Status values:
- `accepted`: active decision implemented or intentionally adopted
- `superseded`: older decision replaced by a later one
- `proposed`: under consideration, not yet treated as committed

## ADR-001: PoC product shape

- Status: `accepted`
- Date: `2026-04-02`

### Context

The PoC needs to prove that a sales agent can generate client-specific briefings by combining internal context with external market and macro signals, without drifting into a broad research assistant or generic market dashboard.

### Decision

The PoC is defined as a personalized client-briefing engine for RM workflows, not a general-purpose copilot.

The primary output is a four-section brief:
- `Market Pulse`
- `Client-Relevant Signals`
- `Global Linkages`
- `Talking Points`

### Consequences

- UI, APIs, and prompts are optimized around briefing generation
- Client context and allocation relevance are first-class inputs
- Generic chat or open-ended research workflows are out of scope

## ADR-002: Live summary over cached external data

- Status: `accepted`
- Date: `2026-04-02`

### Context

The requirements and storyboard prioritize demo reliability, offline resilience for external data, and deterministic prep over a fully live data feed.

### Decision

External data is cached and read from persisted artifacts. Summary generation remains live.

### Consequences

- Market, macro, news, correlations, and normalized bundles are refreshed through jobs
- The web layer reads cache artifacts, not live providers, at request time
- Freshness metadata must be surfaced and handled honestly

## ADR-003: Backend split

- Status: `accepted`
- Date: `2026-04-02`

### Context

The PoC needs a clear separation between public UI/API responsibilities and data-processing responsibilities.

### Decision

The system is split as:
- `apps/web`: Next.js UI and public API layer
- `apps/service`: Python service for ingestion, normalization, correlations, and cache refresh

### Consequences

- Next.js owns dashboard rendering, summary orchestration, and operator actions
- Python owns provider fetches, signal scoring, and cache materialization
- The split is preserved even though both run in one local repo

## ADR-004: Python execution model

- Status: `superseded`
- Date: `2026-04-02`

### Context

The original docs mixed subprocess scripts, microservice patterns, and route-level orchestration.

### Decision

This was the initial file-backed PoC execution model. It has since been replaced by ADR-014.

### Consequences

- Historical note only
- Do not use this ADR as the current runtime contract

## ADR-005: Public API surface

- Status: `accepted`
- Date: `2026-04-02`

### Context

The PoC should expose only the minimum public API surface needed for the dashboard and summary flow.

### Decision

The public web-facing endpoints are:
- `GET /api/customers`
- `GET /api/customer/{id}`
- `GET /api/dashboard-data`
- `POST /api/summary`
- `POST /api/cache/refresh`

### Consequences

- Ingestion, normalization, and correlation are internal job concerns, not public APIs
- The UI is cache-backed and request-time summary generation is the only live intelligence step

## ADR-006: Provider choices for external data

- Status: `accepted`
- Date: `2026-04-02`

### Context

The PoC needed stable, low-friction data sources aligned to the constrained scope.

### Decision

External data providers are:
- `yfinance` for indices, ETFs, and sector or sleeve proxies
- `fredapi` for historical macro series
- `Finnhub` for news and news-derived catalysts

### Consequences

- Macro inputs are historical and timestamped, not future event-calendar data
- Market coverage depends on valid Yahoo symbols or tradable proxies
- News quality depends on relevance scoring and downstream filtering

## ADR-007: Events and fundamentals scope

- Status: `accepted`
- Date: `2026-04-02`

### Context

The original docs and discussions risked expanding the PoC into holding-level fundamentals and forward event-calendar workflows.

### Decision

The PoC includes:
- news-derived catalysts
- sector or sleeve proxy read-throughs

The PoC excludes:
- holding-level fundamentals
- formal future macro-event calendars

### Consequences

- “Events” in the UI and summary mean catalyst-style news signals
- “Fundamentals” are proxy signals derived from sector or sleeve instruments
- The model must not imply deeper issuer-level coverage than exists

## ADR-008: Ranking-first evidence assembly

- Status: `accepted`
- Date: `2026-04-03`

### Context

Initial generations overused generic IT/global-tech narratives because the same high-scoring global signals appeared across multiple clients.

### Decision

Evidence selection is deterministic and allocation-anchored first. The summary route uses a compact evidence pack built from ranked signals rather than retrieval-first selection.

### Consequences

- Top allocations drive which market, macro, news, and correlation signals are surfaced
- Generic signals should not dominate clients without direct sleeve relevance
- Missing sleeve coverage should degrade honestly rather than being filled with unsupported commentary

## ADR-009: LLM integration choice

- Status: `accepted`
- Date: `2026-04-03`

### Context

The summary layer needed live generation while staying provider-flexible.

### Decision

The web API uses the official OpenAI Node SDK against an OpenAI-compatible endpoint, configured through:
- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_MODEL`

### Consequences

- The code is not tied to a single hosted provider
- Changing provider or model should not require code changes
- The integration depends on OpenAI-compatible API semantics

## ADR-010: No vector retrieval in the active summary path

- Status: `accepted`
- Date: `2026-04-03`

### Context

ChromaDB and embeddings were discussed, but the implemented summary flow needed to remain deterministic and grounded.

### Decision

The current summary path does not use ChromaDB or vector retrieval.

## ADR-014: Postgres-backed Python microservice

- Status: `accepted`
- Date: `2026-04-07`

### Context

The file-based cache contract was sufficient for the earliest PoC, but it left the runtime split ambiguous: Python looked like a job folder rather than a service boundary, and Next.js depended on local filesystem layout for operational reads.

### Decision

Python now runs as a FastAPI microservice backed by Postgres.

The active runtime contract is:
- Python owns ingestion, normalization, correlations, persistence, and cache-read APIs
- Postgres is the operational store for raw data, correlations, bundles, and manifest freshness
- Next.js reads operational data from the Python service over HTTP
- customers and personas remain file-backed in Next.js for this phase

### Consequences

- The active service endpoints are:
  - `GET /health`
  - `GET /cache/dates`
  - `GET /cache/latest`
  - `GET /manifests/{date}`
  - `GET /bundles/{date}/{customer_id}`
  - `GET /correlations/{date}`
  - `POST /refresh`
- The operator refresh route in Next.js no longer shells out to Python directly
- `data/cache` remains only as historical generated artifacts and is not the runtime source of truth
- Schema management is model-driven with `Base.metadata.create_all(...)` for now; migration tooling is intentionally deferred

### Consequences

- The brief is generated from cache artifacts and deterministic evidence selection only
- Retrieval quality is not a current runtime dependency
- If vector retrieval is introduced later, it should remain secondary to allocation-anchored ranking

## ADR-011: Per-customer session persistence for generated briefs

- Status: `accepted`
- Date: `2026-04-03`

### Context

Users need to switch between clients during a demo without losing previously generated briefs.

### Decision

Generated summaries are stored in `sessionStorage` per `customerId + cacheDate`.

### Consequences

- Briefs persist while navigating across clients in the same browser session
- Refreshing the page clears the state unless a new persistence layer is introduced
- Each client can keep a separate generated brief without requerying the LLM immediately

## ADR-012: Export artifacts

- Status: `accepted`
- Date: `2026-04-03`

### Context

The demo needs portable handoff artifacts from the generated briefing flow.

### Decision

The live briefing layer supports formatted export as:
- Markdown
- PDF

### Consequences

- Exports are generated from the current client briefing state
- The export format is presentation-oriented rather than raw system-debug JSON
- JSON remains out of the primary operator flow unless reintroduced intentionally

## ADR-013: Proxy strategy for unsupported Yahoo sector indices

- Status: `accepted`
- Date: `2026-04-03`

### Context

Many desired India sector index symbols were not reliably available from Yahoo Finance, which left some client sleeves under-covered.

### Decision

Use tested, tradable proxies when direct sector index symbols are unavailable. Current proxies include:
- `LT.NS` for infrastructure
- `SBIN.NS` for PSU bank
- `TITAN.NS` for consumption
- `SUNPHARMA.NS` for pharma
- `MID150BEES.NS` for midcap
- `SMALLCAP.NS` for small-cap
- `MARUTI.NS` for auto
- `HINDUNILVR.NS` for FMCG
- `GILT5YBEES.NS` for government bonds
- `EBBETF0430.NS` for corporate bonds
- `LIQUIDBEES.NS` for liquidity

### Consequences

- Client sleeve coverage is materially better than the earlier failing-symbol setup
- Some sleeves still use representative proxies rather than exact index instruments
- The briefing must continue to present these as proxies, not perfect substitutes

## ADR-014: Briefing date display

- Status: `accepted`
- Date: `2026-04-03`

### Context

For demo consistency, the displayed briefing date should feel like the “next morning” briefing regardless of the underlying cache date.

### Decision

The UI displays the briefing date as `today + 1`, while the underlying cache date remains the actual artifact date.

### Consequences

- The UI feels aligned to the morning-briefing use case
- Exported and rendered artifacts distinguish displayed briefing date from cache date where needed
- This is a PoC presentation rule, not a production scheduling rule

## ADR-015: Parallel sectioned LLM generation with YAML prompt profiles

- Status: `accepted`
- Date: `2026-04-03`

### Context

The initial single-prompt summary flow made it harder to control section-specific behavior, delayed visible output, and blurred the distinction between analytical sections and RM conversation cues.

### Decision

The summary layer is implemented as four parallel section generators driven by YAML prompt profiles stored under `apps/web/prompts`.

Each section has:
- its own prompt template
- its own render contract
- its own evidence slice

The route streams structured section events to the UI over SSE.

### Consequences

- Section behavior can be tuned without changing the entire summary prompt
- The UI can render sections independently as they complete
- Prompt quality depends on keeping section responsibilities sharply separated

## ADR-016: Provider compatibility and reasoning sanitization

- Status: `accepted`
- Date: `2026-04-03`

### Context

Google’s OpenAI-compatible `generativelanguage` endpoint was tested with a thinking-capable hosted model and showed two behaviors:
- it emitted hidden reasoning content in the normal stream, marked via `delta.extra_content.google.thought`
- it returned `400` when `reasoning_effort` was sent for the tested model path

### Decision

The summary route must:
- sanitize hidden reasoning tags before content reaches the UI or exports
- skip Google-marked thought chunks during streaming
- ignore `LLM_REASONING_EFFORT` for the `generativelanguage` endpoint unless provider behavior changes in a later validation pass

### Consequences

- Visible briefing content stays cleaner across thinking and non-thinking model types
- Provider compatibility is handled in code rather than assumed from nominal OpenAI API parity
- Reasoning-effort control remains available for other providers that actually support it

## ADR-017: Three-horizon evidence assembly with persona-specific weighting

- Status: `accepted`
- Date: `2026-04-07`

### Context

Briefings generated with the allocation-anchored evidence pack read similarly across personas. The root cause was that all signals were assembled into a flat ranked list with no time-horizon metadata, and prompts had no instruction to distinguish short-term, medium-term, and long-term analysis. The result was summaries that collapsed all evidence into a "current market" narrative regardless of whether the client was HNI or institutional.

### Decision

Signal horizon classification is applied at normalization time and carried as a `time_horizon` field on every `NormalizedSignal`. The classification rules are:
- `short`: market indices, sector proxies, news catalysts
- `medium`: macro series current values, 90-day rolling correlations
- `long`: macro 6-month trend signals, 365-day structural correlations

Evidence selection in the web layer applies a persona-specific horizon multiplier to the sort score:
- HNI equity: short × 1.3, medium × 1.0, long × 0.7
- Institutional fund: short × 0.8, medium × 1.2, long × 1.3

Long-term signals are assembled into a separate `longTermSignals` bucket and added to every section's evidence slice unconditionally, preventing them from being crowded out by higher-scoring short-term signals.

All four prompt profiles receive signals organized into labeled horizon groups and a `horizon_priority` context variable. Each render contract requires explicit `**Short-term:**`, `**Medium-term:**`, and `**Long-term:**` labels within each sleeve or linkage sub-section, with mandatory honest-degradation language when evidence for a horizon is absent.

### Consequences

- A HNI briefing and an institutional briefing generated from the same cache date should be visibly different in both signal ranking and narrative framing
- Long-term entries can only be "no data available" if the cache was not generated with a full `refresh_cache` run after the FRED adapter changes
- Adding new data sources that carry inherent multi-month windows (e.g. earnings consensus revisions, 6-month FRED trend windows) should classify them as `long` and they will flow into `longTermSignals` automatically

## ADR-018: Long-term signal sources — multi-period FRED deltas and 365-day structural correlations

- Status: `accepted`
- Date: `2026-04-07`

### Context

The three-horizon framework (ADR-017) requires actual long-horizon evidence. Two options were available without adding new provider dependencies: compute multi-period deltas from the historical series already returned by the FRED API, and add 365-day structural correlation variants alongside the existing 90-day tactical correlations in `correlate.py`.

### Decision

**FRED adapter:** The `get_series` call already returns the full historical series. The adapter now computes `delta_90d` and `delta_180d` by looking up the series value 90 and 180 calendar days before the latest observation. These fields are written to `RawMacroRecord` and to the raw macro cache. The normalization job detects their presence and generates a second, long-tagged signal per series with a narrative describing the rate or currency cycle direction (e.g. "gradual tightening bias", "sustained rupee depreciation pressure").

**Structural correlations:** A second mapping table `LONG_CORRELATION_MAPPINGS` in `correlate.py` contains 365-day variants of the existing signal pairs, with r-values reflecting the longer-window relationship and narratives framed around cycle-level rather than tactical dynamics. These produce `time_horizon="long"` signals during normalization because `classify_signal_horizon` returns `long` for correlation signals with `lookback_days >= 270`.

### Consequences

- Long-term macro trend signals are only generated when the raw cache was produced by a `refresh_cache` or `ingest` run after this change; caches produced before the change will omit `delta_90d` and `delta_180d` and produce no long-term macro signals
- The FRED series history depth determines how far back the deltas can reach; for shorter series, some deltas may return `None` and the long-term signal will be silently skipped
- The 365-day correlation r-values and narratives are precomputed and static; they represent the structural relationship at the time of authoring, not a live rolling window calculation

## Maintenance

When a new architecture or product-scope decision is made:
- add a new `ADR-xxx` section here
- mark superseded decisions explicitly instead of deleting them
- keep implementation details in code and contracts, but keep the decision and reasoning here
