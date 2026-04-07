# App Overview

## Purpose

The application is a proof-of-concept sales intelligence workspace for relationship managers. It generates client-specific briefing notes by combining:
- synthetic client and persona context
- cached market, macro, news, and correlation artifacts
- a live LLM summary step

The app is designed to prove personalized briefing quality, not to act as a generic research assistant.

## Main surfaces

### Dashboard

The main UI lives at `/dashboard` and includes:
- client selector
- client mandate and allocation profile
- cache status and cache refresh action
- live briefing layer
- evidence panels for market, macro, catalysts, and correlations

### Summary generation

The live briefing layer generates a four-section brief:
- `Market Pulse`
- `Client-Relevant Signals`
- `Global Linkages`
- `Talking Points`

The summary is generated live from a compact evidence pack assembled from cache artifacts. Each section receives signals organized into three time horizons — short (days to 2 weeks), medium (2 weeks to 3 months), and long (3 months to 12+ months) — and a persona-specific horizon priority instruction that controls how the model weights and frames each horizon. HNI equity clients receive short-heavy framing; institutional fund clients receive medium and long-heavy framing.

### Export

The generated briefing can be exported as:
- Markdown
- PDF

Exports are presentation-oriented artifacts built from the currently generated client brief.

## Architectural split

### `apps/web`

Owns:
- Next.js App Router UI
- public API layer
- summary orchestration
- operator cache refresh trigger

### `apps/service`

Owns:
- provider ingestion
- normalization
- correlation generation
- cache refresh orchestration

### `data`

Stores:
- synthetic customer definitions
- persona configs
- cache artifacts

## Scope boundaries

Included:
- cached external data
- live summary generation
- sector and sleeve proxy coverage
- news-derived catalysts
- precomputed 90-day tactical correlations
- precomputed 365-day structural correlations
- multi-period FRED macro trend deltas (90-day and 180-day)
- three-horizon evidence organization with persona-specific horizon weighting

Excluded:
- live CRM integration
- holding-level fundamentals
- formal event-calendar workflows
- production auth and compliance controls
- vector retrieval in the active summary path
