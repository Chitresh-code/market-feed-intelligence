# Dataset Catalogue Mapping

Source: [docs/requirements/03-dataset-catalogue.md](/Users/chitreshgyanani/qtsolv/MacquirePOC/docs/requirements/03-dataset-catalogue.md)

## Overview

- Requirement intent: document all data sources and expected use.
- Implementation: partially realized through the active cache contract and provider adapters.
- Active contract reference: [docs/internal/cache-contract.md](/Users/chitreshgyanani/qtsolv/MacquirePOC/docs/internal/cache-contract.md).

## Section 1 — Yahoo Finance: Indian Indices

### Indian Broad Market Indices

- Implementation: `Nifty 50` active.

### Indian Sectoral Indices

- Implementation: mixed.
  - direct supported examples: `Nifty Bank`, `Nifty IT`
  - unsupported indices replaced by tested proxies
- Decision reference: ADR-013.

### Indian Thematic Indices

- Implementation: proxied where necessary.

## Section 2 — Yahoo Finance: US Sectoral ETFs

- Implementation: narrowed to the subset relevant to current client coverage.
- Active example: `XLK`.

## Section 3 — Yahoo Finance: Global Indices & Commodities

### Global Equity Indices

- Implementation: mostly deferred from the active PoC.

### Commodities

- Implementation: active through `GC=F`.

## Section 4 — FRED Macro Indicators

### Tier 1 — Direct Daily India Impact

- Implementation: reduced active set currently used by the PoC.

### Tier 2 — Structural Daily Signals

- Implementation: mostly deferred.

### Excluded Series

- Implementation: aligned.

## Section 5 — Finnhub News API

### Endpoints Used

- Implementation: active through the current Finnhub adapter.

### News Filtering Pipeline

- Implementation: active but intentionally conservative after ranking fixes.
- Decision: generic headlines are filtered harder and unsupported client fill-in is discouraged.

### Sample Finnhub Response Schema

- Implementation: active in raw cache artifacts.

### News Quality Notes

- Implementation: strongly relevant to the current PoC; this remains the noisiest data layer.

## Section 6 — Synthetic Customer Data

### Schema

- Implementation: active in [data/customers](/Users/chitreshgyanani/qtsolv/MacquirePOC/data/customers), expanded with richer briefing context fields.

## Data Flow Summary

- Implementation: active and reflected in:
  - [docs/app/02-runtime-flow.md](/Users/chitreshgyanani/qtsolv/MacquirePOC/docs/app/02-runtime-flow.md)
  - [docs/internal/cache-contract.md](/Users/chitreshgyanani/qtsolv/MacquirePOC/docs/internal/cache-contract.md)

## Preprocessing Requirements

- Implementation: active through ingest, normalize, correlate, and refresh jobs.
