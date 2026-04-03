# PoC Summary — Reusability Library Entry
## Macquarie India Sales Intelligence Agent

---

### Entry

**Date:** April 2026
**Domain:** Financial Services — Wealth Management
**Problem Type:** Personalised document generation / multi-source data synthesis / LLM summarisation
**Audience:** Head of Technology (8/10 technical), Head of Wealth (3/10)
**Timeline:** 3 weeks (PoC)

---

### What We Built

A Sales Intelligence Agent for Relationship Managers at a global investment bank. The agent ingests synthetic CRM and portfolio data for 5 clients across 2 personas (HNI Equity and Institutional Fund), pulls daily signals from 41 Yahoo Finance tickers, 16 FRED macro series, and Finnhub news, computes India ↔ US sector correlations using a 90-day rolling window, and generates a personalised, streaming client brief via Claude Sonnet 4 in under 30 seconds.

---

### Tech Stack

| Layer | Tools |
|---|---|
| Frontend | Next.js 14 App Router, Tailwind CSS |
| Data | yfinance (Python), fredapi, Finnhub REST API |
| Intelligence | ChromaDB, sentence-transformers, NumPy, SciPy |
| LLM | Claude Sonnet 4 — streaming SSE |
| Infra | Single machine, no auth, no Docker |

---

### Open Datasets Used

| Dataset | Source | Used for |
|---|---|---|
| 41 market tickers (India + US + Global) | Yahoo Finance via yfinance | All index signals |
| 16 macro series | FRED API | Rates, FX, credit, commodities |
| Financial news (global + India) | Finnhub free tier | Daily news feed |
| 5 synthetic customer profiles | Hand-crafted JSON | Customer personas |

---

### What Worked Well

- Streaming summary generation was the single most impactful demo moment — audiences consistently reacted to watching text appear in real time
- The India ↔ US sector correlation map (XLK → Nifty IT, XLV → Nifty Pharma etc.) was the strongest intellectual hook — it made the agent feel genuinely intelligent rather than template-driven
- Persona differentiation (HNI Equity vs Institutional Fund) was immediately legible to business audiences without explanation
- yfinance + FRED covered 100% of the required daily data with zero cost — no data vendor required

---

### What We Would Do Differently

- Build the offline/cache layer first — live API calls during a demo are always a risk; pre-fetched data should be the default, not the fallback
- Validate all yfinance NSE tickers in a pre-build step — some `.NS` suffix tickers resolve inconsistently
- Include a data timestamp display from day one — audiences always ask "is this live?"
- Consider splitting the correlation engine into a nightly batch job vs on-demand — 90-day correlation is slow to compute on the fly for 5+ customers

---

### Audience Reaction

Strong positive. The wow moment was Scene 3 — when the presenter explained that XLK rising 2% overnight was surfaced as the lead signal for an IT-heavy client. The comment heard most: *"How did it know that was relevant to this specific client?"*

The institutional fund persona (Macquarie India Growth Fund) landed better with technical audiences than expected — the macro regime framing resonated with the CDO in the room.

---

### Reusable Components

The following design cards and patterns from this PoC are directly reusable for any financial services LLM briefing PoC:

- **Persona engine config pattern** — YAML/JSON persona config with signal weights, template IDs, summary sections. Drop-in for any 2–5 persona financial product.
- **Correlation engine design** (Card 5) — NumPy 90-day rolling correlation + narrative template. Reusable for any India-global signal correlation use case.
- **Signal normaliser schema** (Card 2) — Unified Signal interface with delta_1d, delta_5d, direction, magnitude. Reusable across any market data product.
- **FRED + yfinance daily pipeline** — Confirmed ticker list + series IDs for Indian/US/Global markets. Reuse as-is for any India market PoC.
- **Finnhub news filter pipeline** — Keyword extraction from customer profile → cosine similarity relevance scoring → top-k articles. Reusable for any personalised news layer.

---

*Library entry added April 2026 — Quarks*
