# Engineering Requirements Mapping

Source: [docs/requirements/01-engineering-requirements.md](/Users/chitreshgyanani/qtsolv/MacquirePOC/docs/requirements/01-engineering-requirements.md)

## 1. Executive Summary

- Requirement intent: define a personalized sales intelligence PoC for client-facing teams.
- Implementation: accepted as the core product framing.
- Current realization: cache-backed dashboard plus live four-section briefing generation.
- Decision reference: ADR-001, ADR-002.

## 2. Solution Architecture

### Layer Overview

- Requirement intent: split UI, orchestration, data, and intelligence layers.
- Implementation: realized as `apps/web` plus `apps/service` plus `data/cache`.
- Decision: Python is job-based, not a live service.
- Decision reference: ADR-003, ADR-004.

### Technology Stack

- Requirement intent: Next.js, Python, vector store, LLM, public data APIs.
- Implementation:
  - kept: Next.js, Python, yfinance, fredapi, Finnhub
  - changed: no active ChromaDB path
  - changed: OpenAI-compatible SDK integration instead of a provider-specific stack
- Decision reference: ADR-006, ADR-009, ADR-010.

## 3. Customer & Persona Definitions

### Persona 1 — HNI Equity

- Requirement intent: concise, portfolio-relevant, timing-aware briefing behavior.
- Implementation: persona config exists in [data/personas/hni_equity.json](/Users/chitreshgyanani/qtsolv/MacquirePOC/data/personas/hni_equity.json) and drives ranking and prompt tone.

### Persona 2 — Institutional Fund

- Requirement intent: macro-first, cross-asset, disciplined allocation framing.
- Implementation: persona config exists in [data/personas/inst_fund.json](/Users/chitreshgyanani/qtsolv/MacquirePOC/data/personas/inst_fund.json).

### The 5 Synthetic Customers

- Requirement intent: cover multiple realistic client situations.
- Implementation: realized in [data/customers](/Users/chitreshgyanani/qtsolv/MacquirePOC/data/customers) with richer profile, watchlist, meeting context, and allocation definitions.

### Customer Sector Allocations (Detailed)

- Requirement intent: customer outputs should be grounded in allocation mix.
- Implementation: accepted and strengthened. Allocation-first evidence selection is now the main ranking mechanism.
- Decision reference: ADR-008, ADR-013.

## 4. Technical Design Cards

### Card 1 — Data Orchestrator

- Requirement intent: unify source fetch and orchestration.
- Implementation: realized as `jobs.ingest` and `jobs.refresh_cache` in [apps/service/src/jobs](/Users/chitreshgyanani/qtsolv/MacquirePOC/apps/service/src/jobs).

### Card 2 — Signal Normaliser

- Requirement intent: unify heterogeneous inputs into one signal schema.
- Implementation: realized in [apps/service/src/jobs/normalize.py](/Users/chitreshgyanani/qtsolv/MacquirePOC/apps/service/src/jobs/normalize.py).

### Card 3 — Vector Store & RAG Layer

- Requirement intent: retrieval support for contextual evidence.
- Implementation: deferred from active runtime path.
- Decision: not used in the current summary flow.
- Decision reference: ADR-010.

### Card 4 — Persona Engine

- Requirement intent: configurable briefing behavior by persona.
- Implementation: accepted and active through persona configs and prompt rules.

### Card 5 — Correlation Engine

- Requirement intent: precomputed global-to-India linkage logic.
- Implementation: realized in [apps/service/src/jobs/correlate.py](/Users/chitreshgyanani/qtsolv/MacquirePOC/apps/service/src/jobs/correlate.py) and normalized into customer bundles.

### Card 6 — LLM Summariser

- Requirement intent: grounded summary generation over structured evidence.
- Implementation: realized in [apps/web/app/api/summary/route.ts](/Users/chitreshgyanani/qtsolv/MacquirePOC/apps/web/app/api/summary/route.ts) and [apps/web/lib/briefing.ts](/Users/chitreshgyanani/qtsolv/MacquirePOC/apps/web/lib/briefing.ts).
- Decision: OpenAI-compatible SDK, strict grounding rules, streaming output.
- Decision reference: ADR-009.

## 5. Complete Data Universe

### Data Frequency Summary

- Requirement intent: document update cadence.
- Implementation: partly realized through manifest freshness and cache contract.
- Gap: not every aspirational dataset from the requirement doc is active in the current PoC.

## 6. FRED Macro Indicators — Daily Series

### Tier 1 — Daily, Direct India Market Impact

- Requirement intent: include high-signal daily macro series.
- Implementation: narrowed to a smaller active set in the PoC.

### Tier 2 — Daily/Near-Daily, Structural Signals

- Requirement intent: include broader structural macro support.
- Implementation: mostly deferred for PoC simplicity.

### Excluded

- Requirement intent: explicitly mark non-daily series as out of scope.
- Implementation: aligned.

## 7. Yahoo Finance — Indices & ETF Universe

### Indian Broad Indices

- Implementation: partially realized, with `Nifty 50` active.

### Indian Sectoral Indices

- Implementation: partly realized through direct indices where available and tested proxies where Yahoo symbols failed.
- Decision reference: ADR-013.

### Indian Thematic Indices

- Implementation: realized through proxies rather than a full exact index set.

### US Sectoral ETFs

- Implementation: narrowed. `XLK` is active because it is directly relevant to the current client set and correlation stories.

### Global Indices

- Implementation: mostly deferred from the active PoC path.

### Commodities

- Implementation: `GC=F` is active as the current commodity proxy.

## 8. India ↔ US Sector Correlation Map

- Requirement intent: map external signals to India sleeves.
- Implementation: accepted in reduced form through precomputed client-specific correlations.
- Gap: still smaller than the aspirational full map.

## 9. News Data Layer

### Primary Source: Finnhub API (Free Tier)

- Implementation: active.

### Secondary Source: GDELT Project

- Implementation: not active.

## 10. API Specifications

### Summary Generation

- Implementation: active as `POST /api/summary`.

### Market Data Snapshot

- Implementation: realized through dashboard data loading rather than a distinct broad public snapshot product surface.

### Customer Profile

- Implementation: active through customer fixtures and dashboard loading.

### News Feed

- Implementation: active as evidence panels rather than a standalone feed product.

## 11. Data Contracts

### Normalised Signal Schema

- Implementation: active in Python domain models and normalized cache bundles.

### Correlation Output Schema

- Implementation: active in correlation artifacts.

### Customer Schema

- Implementation: active and richer than the initial minimum.

## 12. Engineering Task Breakdown

- Requirement intent: provide staged build plan.
- Implementation: realized incrementally through the current scaffold, jobs, dashboard, and summary flow.

## 13. Acceptance Criteria

### Functional

- Implementation: largely satisfied for the current PoC shape.

### Non-Functional

- Implementation: partially satisfied. The strongest achieved property is demo reliability via cached data.

### Demo Success Criteria

- Implementation: largely aligned with the current briefing workflow.

## 14. Risks & Mitigations

- Implementation: aligned with the live-summary/cached-data model and freshness handling.

## 15. Timeline

- Implementation: historical planning section only; not treated as an active runtime artifact.
