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

- Status: `accepted`
- Date: `2026-04-02`

### Context

The original docs mixed subprocess scripts, microservice patterns, and route-level orchestration.

### Decision

Python is implemented as batch-style `uv` jobs that write persisted artifacts under `data/cache`. It is not an always-on HTTP microservice for this PoC.

### Consequences

- Jobs are invoked explicitly:
  - `jobs.ingest`
  - `jobs.correlate`
  - `jobs.normalize`
  - `jobs.refresh_cache`
- Public web routes do not depend on a live Python server
- The operator refresh route can shell out to the Python refresh job

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

## Maintenance

When a new architecture or product-scope decision is made:
- add a new `ADR-xxx` section here
- mark superseded decisions explicitly instead of deleting them
- keep implementation details in code and contracts, but keep the decision and reasoning here
