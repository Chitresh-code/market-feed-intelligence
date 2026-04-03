# Engineering Requirements Document
## Macquarie India — Sales Intelligence Agent (PoC)

| Field | Detail |
|---|---|
| Version | v1.0 DRAFT |
| Date | April 2026 |
| Status | For Review |
| Prepared by | Quarks / AI Engineering |
| Client | Macquarie Group — India |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Solution Architecture](#2-solution-architecture)
3. [Customer & Persona Definitions](#3-customer--persona-definitions)
4. [Technical Design Cards](#4-technical-design-cards)
5. [Complete Data Universe](#5-complete-data-universe)
6. [FRED Macro Indicators — Daily Series](#6-fred-macro-indicators--daily-series)
7. [Yahoo Finance — Indices & ETF Universe](#7-yahoo-finance--indices--etf-universe)
8. [India ↔ US Sector Correlation Map](#8-india--us-sector-correlation-map)
9. [News Data Layer](#9-news-data-layer)
10. [API Specifications](#10-api-specifications)
11. [Data Contracts](#11-data-contracts)
12. [Engineering Task Breakdown](#12-engineering-task-breakdown)
13. [Acceptance Criteria](#13-acceptance-criteria)
14. [Risks & Mitigations](#14-risks--mitigations)
15. [Timeline](#15-timeline)

---

## 1. Executive Summary

Client-facing Relationship Managers (RMs) at Macquarie India spend 2–3 hours per client preparing meeting briefs by manually correlating portfolio data with market signals from disparate sources. The quality of these briefs is inconsistent and highly dependent on the individual RM's experience and market connectivity.

This PoC demonstrates a **Sales Intelligence Agent** that ingests a client's internal portfolio and CRM context, pulls live daily signals from Indian and global indices, US sectoral ETFs, FRED macro indicators, and financial news, and generates a hyper-personalised, streaming client summary in under 30 seconds — tailored to the client's specific persona, allocation, and meeting context.

**What the PoC proves:**
- An AI agent can reliably connect internal client data with external market signals in real time
- Summaries are genuinely personalised — different by client, different by persona, different by day
- The correlation engine surfaces non-obvious linkages (e.g. XLK move → Nifty IT impact for a client with IT overweight)
- The full stack can be built and demonstrated within a 3-week sprint using open-source data

**What the PoC does not prove:**
- Production-grade latency at scale (100+ concurrent RMs)
- Compliance-grade hallucination prevention
- Integration with live Macquarie CRM/OMS systems (synthetic data used)

---

## 2. Solution Architecture

### Layer Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  DATA SOURCES                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  ┌────────┐ │
│  │ Synthetic    │  │ Yahoo Finance│  │   FRED   │  │Finnhub │ │
│  │ CRM +        │  │ Indices &    │  │  Daily   │  │  News  │ │
│  │ Portfolio    │  │ Sector ETFs  │  │  Macro   │  │  API   │ │
│  └──────────────┘  └──────────────┘  └──────────┘  └────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│  INGESTION & NORMALISATION (Next.js API Routes / Python)        │
│  ┌────────────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │  Data Orchestrator │  │   Signal     │  │  Vector Store  │  │
│  │  (daily + on-demand│  │  Normaliser  │  │  (ChromaDB)    │  │
│  └────────────────────┘  └──────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│  INTELLIGENCE LAYER                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Persona Engine  │  │ Correlation      │  │ LLM          │  │
│  │  (2 personas,    │  │ Engine           │  │ Summariser   │  │
│  │   5 customers)   │  │ (India ↔ US)     │  │ (Claude API) │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│  PRESENTATION (Next.js 14 App Router — Clean UI)                │
│  ┌─────────────────────┐  ┌────────────────────────────────┐    │
│  │ Customer Selector   │  │ Streaming Summary Panel        │    │
│  │ Sidebar             │  │ + Indices Snapshot             │    │
│  │ (5 clients)         │  │ + News Feed                    │    │
│  └─────────────────────┘  └────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Full-stack, SSR, streaming support, clean DX |
| Styling | Tailwind CSS | Rapid clean UI — no auth/nav complexity |
| Data fetching (indices) | `yfinance` Python + Next.js API route | Best-in-class free market data |
| Data fetching (macro) | `fredapi` Python | Direct FRED access, free API key |
| News | Finnhub REST API | Structured, dated, filterable, free tier |
| Vector store | ChromaDB (local) | Zero-cost, in-process for PoC |
| Embeddings | `sentence-transformers` | Local, no API cost |
| Correlation engine | NumPy + SciPy (Python) | Statistically grounded, explainable |
| LLM | Claude Sonnet 4 (Anthropic API) | Streaming, best financial prose quality |
| Backend orchestration | Next.js API Routes | Eliminates separate backend for PoC |
| Customer data | Static JSON | Synthetic profiles, zero integration risk |

---

## 3. Customer & Persona Definitions

### Persona 1 — HNI Equity

**Profile:** High Net Worth Individual, primary focus on equity portfolio returns. Thinks in terms of portfolio performance, sector rotation, and market timing. Expects the RM to know their holdings intimately and surface relevant news before they've seen it themselves.

**Summary characteristics:**
- Portfolio-centric — lead with holding-specific signals
- Sector rotation framing — which of their sectors are winning/losing today
- Global → India causality — "US tech fell overnight, here's what that means for your Infosys position"
- Tone: confident, direct, numbers-forward

---

### Persona 2 — Institutional Fund

**Profile:** Fund manager or Head of Wealth at a corporate/institutional fund. Thinks in terms of mandate compliance, macro regime, asset allocation drift, and cross-asset correlations. Less interested in individual stock moves, more interested in regime signals and flow dynamics.

**Summary characteristics:**
- Macro-regime framing — where are we in the global cycle today
- Cross-asset correlations — rates, FX, credit spreads, equity flows
- Mandate lens — does today's signal require rebalancing consideration
- Tone: analytical, structured, regime-aware

---

### The 5 Synthetic Customers

| ID | Name | Persona | Primary Mandate | Allocation Profile |
|---|---|---|---|---|
| C001 | Arjun Mehta | HNI Equity | Growth | 60% large-cap equity, 25% mid-cap, 15% cash |
| C002 | Priya Kapoor | HNI Equity | Strategic / Thematic | 40% infra/PSU, 35% consumption themes, 25% IT/tech |
| C003 | Macquarie India Growth Fund | Inst. Fund | Multi-asset growth | 45% equity, 30% fixed income, 25% commodities |
| C004 | Tata Strategic Opportunities | Inst. Fund | Fixed income + macro | 20% equity, 60% bonds/G-secs, 20% liquid |
| C005 | Blue River Emerging Cos. | Inst. Fund | Emerging/mid-small cap | 70% mid-small cap equities, 30% sectoral ETFs |

### Customer Sector Allocations (Detailed)

**C001 — Arjun Mehta**
| Sector | Weight | Key Holdings |
|---|---|---|
| Nifty IT | 25% | Infosys, TCS, Wipro |
| Nifty Bank | 20% | HDFC Bank, ICICI Bank |
| Nifty FMCG | 15% | HUL, ITC |
| Mid-cap mixed | 25% | Diversified |
| Cash / liquid | 15% | — |

**C002 — Priya Kapoor**
| Sector | Weight | Key Holdings |
|---|---|---|
| Nifty Infrastructure | 25% | L&T, NTPC, Power Grid |
| Nifty PSU Bank | 15% | SBI, Bank of Baroda |
| Nifty Consumption | 20% | Titan, Maruti |
| Nifty IT | 25% | HCL Tech, Tech Mahindra |
| Cash | 15% | — |

**C003 — Macquarie India Growth Fund**
| Asset Class | Weight | Instruments |
|---|---|---|
| Indian equities (Nifty 50) | 30% | Large-cap basket |
| Indian equities (sectoral) | 15% | Pharma, IT |
| Fixed income (G-secs) | 20% | 10Y govt bonds |
| Fixed income (corporate) | 10% | AAA-rated |
| Commodities | 25% | Gold, crude exposure |

**C004 — Tata Strategic Opportunities**
| Asset Class | Weight | Instruments |
|---|---|---|
| Indian equities | 20% | Blue-chip basket |
| G-Sec / Sovereign | 40% | 5Y–10Y bonds |
| Corporate bonds | 20% | AA+ rated |
| Liquid / money market | 20% | T-bills, overnight |

**C005 — Blue River Emerging Cos.**
| Sector | Weight | Focus |
|---|---|---|
| Nifty Midcap 100 | 40% | Broad mid-cap |
| Nifty Smallcap 100 | 30% | High-growth small cap |
| Nifty IT (mid-tier) | 15% | Midsized IT exporters |
| Nifty Auto | 15% | EV / component plays |

---

## 4. Technical Design Cards

### Card 1 — Data Orchestrator

| Field | Detail |
|---|---|
| **Layer** | Ingestion |
| **Purpose** | Coordinates daily pull of all data sources — yfinance indices, FRED macro, Finnhub news — and stores normalised snapshots for each trading day |
| **Tech choice** | Next.js API Route (`/api/ingest`) calling Python subprocess for yfinance + fredapi |
| **Rationale** | Eliminates separate backend; Next.js API routes handle scheduling via cron-compatible deployment |
| **Datasets** | yfinance (all tickers below), FRED (all series below), Finnhub (market news + company news) |
| **Data contract** | **Input:** `{ date: "YYYY-MM-DD", customer_id?: string }` → **Output:** `{ snapshot_id, date, indices_count, macro_count, news_count, status }` |
| **API spec** | `POST /api/ingest` `{ date: string, mode: "daily" \| "on_demand" }` → `{ job_id: string, status: "queued" \| "running" \| "complete", eta_seconds: number }` |
| **Effort** | M — 2–3 days |
| **Owner** | Data Engineer |
| **Dependencies** | None — entry point |
| **Risks** | yfinance rate limits under burst load; FRED weekly update cadence for some series |

---

### Card 2 — Signal Normaliser

| Field | Detail |
|---|---|
| **Layer** | Ingestion |
| **Purpose** | Converts heterogeneous raw data (USD prices, INR prices, % changes, basis points, text) into a unified daily signal schema |
| **Tech choice** | Pandas + Pydantic for schema validation; runs as Python microservice called by Next.js |
| **Rationale** | Deterministic, testable, AI-coding-friendly; Pydantic ensures schema integrity at runtime |
| **Data contract** | **Input:** `{ raw_indices: OHLCV[], raw_macro: SeriesPoint[], raw_news: Article[] }` → **Output:** `{ signals: [{ signal_id, category, name, value, delta_1d, delta_5d, direction, magnitude, unit, timestamp }] }` |
| **API spec** | Internal function — not externally exposed |
| **Effort** | S — 1 day |
| **Owner** | Data Engineer |
| **Dependencies** | Card 1 |
| **Risks** | Currency conversion (USD→INR) requires live FX rate; use `DEXINUS` from FRED as source of truth |

---

### Card 3 — Vector Store & RAG Layer

| Field | Detail |
|---|---|
| **Layer** | Ingestion / Intelligence boundary |
| **Purpose** | Embeds normalised daily signals and customer context for semantic retrieval at summary generation time; ensures LLM is grounded in retrieved facts, not hallucinated data |
| **Tech choice** | ChromaDB (local, in-process) + `sentence-transformers/all-MiniLM-L6-v2` |
| **Rationale** | Zero cost, zero infra, swappable to Pinecone/Weaviate in production with no code change |
| **Data contract** | **Input (store):** `{ signal_id, content: string, metadata: { category, date, customer_id } }` → **Output (retrieve):** `{ top_k_signals: [{ signal_id, content, relevance_score, metadata }] }` |
| **API spec** | `GET /api/context?customer_id={id}&query={text}&top_k={n}` → `{ signals: Signal[], retrieved_at: ISO8601 }` |
| **Effort** | M — 2 days |
| **Owner** | ML Engineer |
| **Dependencies** | Card 2 |
| **Risks** | Embedding quality determines relevance of retrieved context — must validate retrieval precision before connecting to LLM |

---

### Card 4 — Persona Engine

| Field | Detail |
|---|---|
| **Layer** | Intelligence |
| **Purpose** | Classifies each of the 5 customers into their persona (HNI Equity or Institutional Fund) and selects the appropriate summary template, signal weighting, and tone configuration |
| **Tech choice** | Rule-based classifier (TypeScript config in Next.js) — no ML model needed for PoC |
| **Rationale** | Deterministic and auditable — 5 known customers, 2 known personas; config-driven for easy demo customisation |
| **Data contract** | **Input:** `{ customer_id: string }` → **Output:** `{ persona_type: "hni_equity" \| "inst_fund", template_id: string, signal_weights: { macro: number, equity: number, sectoral: number, news: number, fx: number }, tone: string, summary_sections: string[] }` |
| **API spec** | `GET /api/persona/{customer_id}` → PersonaConfig (above schema) |
| **Effort** | S — 1 day |
| **Owner** | ML Engineer |
| **Dependencies** | None — parallel to Card 2 |
| **Risks** | Minimal — deterministic config; risk is incorrect template producing wrong tone |

**Persona signal weights:**

| Signal Category | HNI Equity weight | Inst. Fund weight |
|---|---|---|
| Indian sectoral indices | 0.35 | 0.20 |
| US sectoral ETFs | 0.25 | 0.20 |
| Global indices | 0.15 | 0.20 |
| FRED macro indicators | 0.10 | 0.35 |
| News | 0.15 | 0.05 |

---

### Card 5 — Correlation Engine

| Field | Detail |
|---|---|
| **Layer** | Intelligence |
| **Purpose** | Computes which global and US sectoral signals are most relevant to each customer's specific holdings — the core differentiator of the product |
| **Tech choice** | NumPy + SciPy rolling correlation matrix; pre-computed nightly on 90-day lookback, customer-specific slice at query time |
| **Rationale** | Statistically grounded, explainable output — each correlation has a numeric coefficient and a plain-English narrative, making it auditable and RM-presentable |
| **Data contract** | **Input:** `{ customer_id: string, customer_sectors: [{ sector_index_ticker, weight }], global_signals: [{ signal_id, value, delta_1d }] }` → **Output:** `{ correlations: [{ signal_name, customer_sector, r_value: float, direction: "positive" \| "negative", strength: "strong" \| "moderate" \| "weak", narrative: string }], computed_at: ISO8601 }` |
| **API spec** | `POST /api/correlate` `{ customer_id: string, lookback_days: 90 }` → `{ correlations: Correlation[], top_3: Correlation[] }` |
| **Effort** | L — 4–5 days (most complex component) |
| **Owner** | ML Engineer + Data Engineer |
| **Dependencies** | Cards 2, 3 |
| **Risks** | Spurious correlations with short windows; minimum 90-day lookback enforced; narratives must be reviewed for factual accuracy |

**Key correlation pairs to compute:**

| US/Global Signal | Indian Sector | Typical r-value |
|---|---|---|
| XLK (US Tech ETF) | Nifty IT (`NIFTYIT.NS`) | 0.65–0.80 |
| XLV (US Healthcare ETF) | Nifty Pharma (`NIFTYPHARMA.NS`) | 0.55–0.70 |
| XLE (US Energy ETF) + Brent (`BZ=F`) | Nifty Energy | 0.70–0.85 |
| XLF (US Financials ETF) | Nifty Bank (`^NSEBANK`) | 0.45–0.60 |
| XLB (US Materials ETF) | Nifty Metal (`NIFTYMETAL.NS`) | 0.60–0.75 |
| XLI (US Industrials ETF) | Nifty Infra (`NIFTYINFRA.NS`) | 0.40–0.55 |
| VIX (`VIXCLS`) | Nifty 50 (`^NSEI`) | -0.55–-0.70 |
| USD/INR (`DEXINUS`) | Nifty IT (inverse) | -0.50–-0.65 |
| US 10Y (`DGS10`) | Nifty Bank | -0.35–-0.50 |

---

### Card 6 — LLM Summariser

| Field | Detail |
|---|---|
| **Layer** | Intelligence |
| **Purpose** | Generates the final personalised streaming summary using retrieved signals, correlation narratives, customer context, and persona template |
| **Tech choice** | Claude Sonnet 4 via Anthropic API with streaming (SSE) |
| **Rationale** | Best-in-class instruction following for structured financial prose; streaming creates the live "generating now" experience central to the wow moment |
| **Data contract** | **Input:** `{ persona_config: PersonaConfig, customer: Customer, top_k_signals: Signal[], correlations: Correlation[], news: Article[], meeting_context?: string }` → **Output (streamed):** `SSE { delta: string, section: string, done: boolean }` |
| **API spec** | `POST /api/summary` `{ customer_id: string, meeting_context?: string }` → `SSE stream` |
| **System prompt structure** | Persona template + customer holdings + signal context + correlation narratives + news headlines → structured summary with sections: Market Pulse, Portfolio Signals, Global Linkages, Talking Points |
| **Effort** | M — 2–3 days |
| **Owner** | ML Engineer |
| **Dependencies** | Cards 3, 4, 5 |
| **Risks** | Hallucination on portfolio values — all numbers must be injected via retrieved context; LLM must never infer or estimate portfolio figures |

**Summary sections by persona:**

| Section | HNI Equity | Inst. Fund |
|---|---|---|
| Opening | Portfolio performance vs benchmark today | Macro regime snapshot |
| Section 1 | Sector signals relevant to holdings | Cross-asset signals (rates, FX, credit) |
| Section 2 | Global linkages (US sector → India sector) | Flow dynamics (FII/DII, global EM flows) |
| Section 3 | Top 3 news items relevant to portfolio | Policy signals (Fed, RBI, SEBI) |
| Closing | 3 talking points for today's meeting | Mandate / rebalancing consideration |

---

## 5. Complete Data Universe

### Data Frequency Summary

| Source | Type | Frequency | Cost | API/Package |
|---|---|---|---|---|
| Yahoo Finance | Indices, ETFs, Commodities | **Daily EOD** | Free | `yfinance` (Python) / `yahoo-finance` (npm) |
| FRED | Macro indicators | **Daily** | Free (API key required) | `fredapi` (Python) |
| Finnhub | Financial news | **Daily + real-time** | Free (60 req/min) | REST API |
| Synthetic JSON | Customer profiles + holdings | Static for PoC | N/A | Local file |

> **Note on FRED daily cadence:** FRED publishes daily values for all series listed below. Some exchange-rate series (e.g. `DEXINUS`) are submitted by the Fed weekly with daily readings included in each batch. For PoC purposes this is entirely acceptable. Production would supplement with a live FX feed.

---

## 6. FRED Macro Indicators — Daily Series

### Tier 1 — Daily, Direct India Market Impact

| FRED Series ID | Metric | Why it matters for India |
|---|---|---|
| `DEXINUS` | USD/INR spot exchange rate | Direct currency exposure across all portfolios |
| `VIXCLS` | CBOE VIX (fear index) | Global risk-off → FII selling Indian equities |
| `DGS10` | US 10-Year Treasury yield | Rate differential drives FII flows in/out of India |
| `DGS2` | US 2-Year Treasury yield | Short-end policy rate sensitivity |
| `T10Y2Y` | 10Y minus 2Y yield spread | US yield curve inversion = global recession signal |
| `DTWEXBGS` | Broad USD Dollar Index | Dollar strength = INR weakness + EM capital outflows |
| `DTWEXEMEGS` | Emerging Market USD Index | EM-specific dollar pressure — India included |
| `DCOILWTICO` | WTI Crude Oil (daily spot) | India imports ~85% of crude — direct macro transmission |
| `GOLDAMGBD228NLBM` | Gold price — London AM fix | Safe haven demand, INR hedge signal |

### Tier 2 — Daily/Near-Daily, Structural Signals

| FRED Series ID | Metric | Why it matters |
|---|---|---|
| `DFF` | Federal Funds Effective Rate | US monetary policy stance — all risk assets |
| `SOFR` | Secured Overnight Financing Rate | Global liquidity benchmark replacing LIBOR |
| `BAMLH0A0HYM2` | US High Yield credit spread | Credit risk appetite → EM risk-on / risk-off |
| `DBAA` | Moody's BAA corporate bond spread | Investment grade credit conditions |
| `DEXCNUS` | Chinese Yuan / USD rate | China trade, EM contagion proxy |
| `DEXJPUS` | Japanese Yen / USD rate | Yen carry trade unwind signal |
| `DEXUSUK` | USD / British Pound | Global developed market FX gauge |

### Excluded (not daily — unsuitable for daily briefings)

The following series are explicitly excluded as they are monthly or quarterly and would produce stale or misleading signals in a daily briefing context: CPI (`CPIAUCSL`), GDP (`GDP`), Unemployment Rate (`UNRATE`), PMI indices, Industrial Production (`INDPRO`).

---

## 7. Yahoo Finance — Indices & ETF Universe

All tickers below are confirmed available via `yfinance` at **daily OHLCV** frequency.

### Indian Broad Indices

| Ticker | Index | Type |
|---|---|---|
| `^NSEI` | Nifty 50 | Broad market benchmark |
| `^BSESN` | BSE Sensex | Broad market benchmark |
| `^INDIAVIX` | India VIX | Volatility / fear gauge |
| `^NSEBANK` | Nifty Bank | Banking sector |
| `^NSMIDCP50` | Nifty Next 50 | Large-mid bridge |

### Indian Sectoral Indices

| Ticker | Index | Sector |
|---|---|---|
| `NIFTYIT.NS` | Nifty IT | Information Technology |
| `NIFTYPHARMA.NS` | Nifty Pharma | Healthcare / Pharmaceuticals |
| `NIFTYAUTO.NS` | Nifty Auto | Automobile / EV |
| `NIFTYINFRA.NS` | Nifty Infrastructure | Infrastructure / PSU |
| `NIFTYFMCG.NS` | Nifty FMCG | Consumer Staples |
| `NIFTYMETAL.NS` | Nifty Metal | Metals & Mining |
| `NIFTYREALTY.NS` | Nifty Realty | Real Estate |
| `NIFTYPSUBNK.NS` | Nifty PSU Bank | Public Sector Banking |
| `NIFTYENERGY.NS` | Nifty Energy | Oil & Gas / Power |

### Indian Thematic Indices

| Ticker | Index | Theme |
|---|---|---|
| `^NSEMDCP100` | Nifty Midcap 100 | Mid-cap universe |
| `^NSESMCP100` | Nifty Smallcap 100 | Small-cap universe |
| `NIFTYCONSUM.NS` | Nifty India Consumption | Domestic demand |

### US Sectoral ETFs — SPDR Select Sector (All 11 GICS Sectors)

All confirmed daily since December 1998.

| Ticker | ETF Name | GICS Sector |
|---|---|---|
| `XLK` | Technology Select Sector SPDR | Information Technology |
| `XLF` | Financial Select Sector SPDR | Financials |
| `XLE` | Energy Select Sector SPDR | Energy |
| `XLV` | Health Care Select Sector SPDR | Health Care |
| `XLI` | Industrial Select Sector SPDR | Industrials |
| `XLB` | Materials Select Sector SPDR | Materials |
| `XLP` | Consumer Staples Select Sector SPDR | Consumer Staples |
| `XLY` | Consumer Discretionary Select Sector SPDR | Consumer Discretionary |
| `XLC` | Communication Services Select Sector SPDR | Communication Services |
| `XLRE` | Real Estate Select Sector SPDR | Real Estate |
| `XLU` | Utilities Select Sector SPDR | Utilities |

### Global Indices

| Ticker | Index | Region | India Relevance |
|---|---|---|---|
| `^GSPC` | S&P 500 | US | Primary FII risk appetite gauge |
| `^NDX` | Nasdaq 100 | US | Tech sentiment → Nifty IT |
| `^DJI` | Dow Jones | US | Broad US economic health |
| `^FTSE` | FTSE 100 | UK/Europe | Developed market tone |
| `^GDAXI` | DAX | Germany | European industrial signal |
| `^N225` | Nikkei 225 | Japan | Asian market overnight tone |
| `^HSI` | Hang Seng | Hong Kong | China/EM proxy |
| `000001.SS` | Shanghai Composite | China | China direct signal |
| `EEM` | iShares MSCI EM ETF | Emerging Markets | EM flows vs India |

### Commodities (via yfinance)

| Ticker | Commodity | India Relevance |
|---|---|---|
| `GC=F` | Gold futures | Safe haven, INR hedge |
| `BZ=F` | Brent Crude futures | India's primary crude benchmark |
| `CL=F` | WTI Crude futures | Cross-reference with Brent |
| `DX-Y.NYB` | US Dollar Index (DXY) | INR directional pressure |

---

## 8. India ↔ US Sector Correlation Map

This is the intelligence core of the product. The correlation engine computes these pairings daily on a 90-day rolling window.

| US Sector ETF | Indian Sector Index | Mechanism | Typical r-value |
|---|---|---|---|
| `XLK` (Tech) | `NIFTYIT.NS` | TCS, Infosys, Wipro earn 60%+ revenue from US clients; US tech valuations set the earnings multiple expectation | 0.65–0.80 |
| `XLV` (Health Care) | `NIFTYPHARMA.NS` | FDA drug approvals, US drug pricing policy directly impact Indian generic pharma exports | 0.55–0.70 |
| `XLE` (Energy) | `NIFTYENERGY.NS` | Oil price transmission — India imports ~85% of crude, ONGC/Reliance energy segment directly correlated | 0.70–0.85 |
| `XLF` (Financials) | `^NSEBANK` | FII risk appetite — US banking stress causes FII selling of Indian financials; rate expectations shared | 0.45–0.60 |
| `XLB` (Materials) | `NIFTYMETAL.NS` | Steel, copper, aluminium prices set in global commodity markets; Indian metal cos. are price takers | 0.60–0.75 |
| `XLI` (Industrials) | `NIFTYINFRA.NS` | Global capex cycle — US industrial strength correlates with commodity demand supporting Indian infra | 0.40–0.55 |
| `XLY` (Discretionary) | `NIFTYAUTO.NS` | Global consumer confidence and risk-on sentiment; auto cycle is globally synchronised | 0.35–0.50 |
| `XLP` (Staples) | `NIFTYFMCG.NS` | Defensive rotation signal — when XLP outperforms, global risk-off; FMCG seen as India's defensive play | 0.30–0.45 |
| `XLC` (Comms) | Nifty Telecom | Global media/tech sentiment; India telecom has structural domestic story but global tech mood matters | 0.25–0.40 |
| `XLRE` (Real Estate) | `NIFTYREALTY.NS` | Both driven by global rate cycle; rising US rates signal rising India rates, hurting real estate | 0.35–0.50 |
| `XLU` (Utilities) | — | Pure global risk-off signal; no direct Indian sector proxy but useful for macro regime detection | N/A |

**Additional macro correlations:**

| FRED Signal | India Impact | Direction |
|---|---|---|
| `VIXCLS` rises | Nifty 50 falls; FII outflows | Negative |
| `DGS10` rises | Nifty Bank falls; INR weakens | Negative |
| `DEXINUS` rises (INR weaker) | Nifty IT rises (export earnings up), import costs rise | Mixed |
| `DCOILWTICO` rises | Nifty Energy rises; inflation pressure; INR weakens | Mixed |
| `BAMLH0A0HYM2` widens | Risk-off; FII selling India | Negative |
| `DTWEXBGS` rises | EM outflows including India; INR pressure | Negative |

---

## 9. News Data Layer

### Primary Source: Finnhub API (Free Tier)

| Field | Detail |
|---|---|
| **API base** | `https://finnhub.io/api/v1` |
| **Auth** | `token=API_KEY` query param or `X-Finnhub-Token` header |
| **Free tier limits** | 60 API calls/minute — sufficient for PoC with 5 customers |
| **Coverage** | Reuters, Bloomberg, CNBC, ET Markets, Moneycontrol, Business Standard, Financial Times |

**Endpoints used:**

```
GET /news?category=general&token={key}
→ Global market news for today — returns headline, source, datetime, summary, url

GET /news?category=forex&token={key}
→ FX and macro news

GET /company-news?symbol={ticker}&from={YYYY-MM-DD}&to={YYYY-MM-DD}&token={key}
→ Company/sector specific news by date range
→ Used for news relevant to customer's key holdings
```

**News filtering pipeline:**
1. Pull last 24h of general market news
2. Filter by keyword relevance to customer's sectors and holdings
3. Score by relevance using sentence embedding similarity to customer profile
4. Return top 5 articles per customer per day

### Secondary Source: GDELT Project (Phase 2 only)

Not included in PoC. GDELT provides 15-minute updates of global news with India-specific filtering via `Actor1CountryCode = 'IND'` in BigQuery. Recommended for production phase to capture geopolitical and macro-event signals not covered by Finnhub's financial focus.

---

## 10. API Specifications

### Summary Generation

```
POST /api/summary
Content-Type: application/json

Request:
{
  "customer_id": "C001",
  "meeting_context": "Review Q1 performance, discuss sectoral rotation"  // optional
}

Response: SSE stream
data: { "delta": "Good morning. Here is today's brief for", "section": "opening", "done": false }
data: { "delta": " Arjun Mehta...", "section": "opening", "done": false }
data: { "delta": "", "section": "complete", "done": true }
```

### Market Data Snapshot

```
GET /api/market-data?date={YYYY-MM-DD}

Response:
{
  "date": "2026-04-02",
  "indices": {
    "nifty50": { "close": 22450.5, "change_pct": -0.82, "direction": "down" },
    "niftyIT": { "close": 34210.0, "change_pct": 1.23, "direction": "up" },
    "XLK": { "close": 135.57, "change_pct": 2.01, "direction": "up" }
    // ... all tickers
  },
  "macro": {
    "DEXINUS": { "value": 84.32, "change": 0.15 },
    "VIXCLS": { "value": 18.4, "change": -1.2 },
    "DGS10": { "value": 4.21, "change": -0.03 }
    // ... all FRED series
  },
  "snapshot_at": "2026-04-02T09:30:00Z"
}
```

### Customer Profile

```
GET /api/customer/{customer_id}

Response:
{
  "id": "C001",
  "name": "Arjun Mehta",
  "persona": "hni_equity",
  "mandate": "Growth",
  "allocations": [
    { "sector": "Nifty IT", "ticker": "NIFTYIT.NS", "weight": 0.25 },
    { "sector": "Nifty Bank", "ticker": "^NSEBANK", "weight": 0.20 }
  ],
  "rm_notes": "Prefers morning briefs. Concerned about US tech correction impact.",
  "last_meeting": "2026-03-20"
}
```

### News Feed

```
GET /api/news?customer_id={id}&date={YYYY-MM-DD}&limit=5

Response:
{
  "articles": [
    {
      "headline": "Fed signals two rate cuts in 2026 amid tariff uncertainty",
      "source": "Reuters",
      "published_at": "2026-04-02T06:15:00Z",
      "relevance_score": 0.89,
      "relevant_to": ["DGS10", "VIXCLS", "Nifty Bank"],
      "summary": "...",
      "url": "..."
    }
  ]
}
```

---

## 11. Data Contracts

### Normalised Signal Schema

```typescript
interface Signal {
  signal_id: string           // e.g. "IDX_NIFTYIT_2026-04-02"
  category: "india_sectoral" | "india_thematic" | "us_sectoral" | "global_index" | "macro" | "commodity"
  name: string                // e.g. "Nifty IT"
  ticker: string              // e.g. "NIFTYIT.NS"
  value: number               // closing price or macro value
  delta_1d: number            // 1-day change (absolute)
  delta_1d_pct: number        // 1-day % change
  delta_5d_pct: number        // 5-day % change
  direction: "up" | "down" | "flat"
  magnitude: "large" | "medium" | "small"  // >2%, 0.5–2%, <0.5%
  unit: "INR" | "USD" | "pct" | "bps" | "index"
  timestamp: string           // ISO8601
}
```

### Correlation Output Schema

```typescript
interface Correlation {
  us_signal: string           // e.g. "XLK"
  india_sector: string        // e.g. "NIFTYIT.NS"
  r_value: number             // -1 to 1
  direction: "positive" | "negative"
  strength: "strong" | "moderate" | "weak"  // |r|>0.6, 0.4–0.6, <0.4
  narrative: string           // e.g. "US tech (XLK) rose 2% overnight. Nifty IT historically follows with 0.7 correlation — watch for gap-up open."
  lookback_days: number       // 90
  computed_at: string         // ISO8601
}
```

### Customer Schema

```typescript
interface Customer {
  id: string
  name: string
  persona: "hni_equity" | "inst_fund"
  mandate: string
  allocations: Array<{
    sector: string
    ticker: string
    weight: number            // 0–1
    key_holdings?: string[]
  }>
  rm_notes: string
  last_meeting: string        // ISO8601 date
}
```

---

## 12. Engineering Task Breakdown

| # | Task | Component | Effort | Owner | Dependencies |
|---|---|---|---|---|---|
| 1 | Set up Next.js 14 project with Tailwind | Frontend | S | FE Dev | — |
| 2 | Create 5 customer JSON profiles | Data | S | Data Engineer | — |
| 3 | Build yfinance data fetch script (all tickers) | Ingestion | M | Data Engineer | — |
| 4 | Build FRED data fetch script (all series) | Ingestion | S | Data Engineer | — |
| 5 | Build signal normaliser (Pandas + Pydantic) | Ingestion | S | Data Engineer | 3, 4 |
| 6 | Set up ChromaDB + sentence-transformers | Intelligence | M | ML Engineer | 5 |
| 7 | Build persona engine (TypeScript config) | Intelligence | S | ML Engineer | — |
| 8 | Build correlation engine (NumPy/SciPy) | Intelligence | L | ML Engineer | 5 |
| 9 | Finnhub news fetch + relevance filter | Ingestion | M | Data Engineer | — |
| 10 | Build `/api/summary` with Claude streaming | Intelligence | M | ML Engineer | 6, 7, 8, 9 |
| 11 | Build `/api/market-data` endpoint | Backend | S | Data Engineer | 5 |
| 12 | Build `/api/news` endpoint | Backend | S | Data Engineer | 9 |
| 13 | Build customer selector sidebar (UI) | Frontend | S | FE Dev | — |
| 14 | Build streaming summary panel (UI) | Frontend | M | FE Dev | 10 |
| 15 | Build indices snapshot widget (UI) | Frontend | S | FE Dev | 11 |
| 16 | Build news feed widget (UI) | Frontend | S | FE Dev | 12 |
| 17 | Integration testing (end-to-end) | QA | M | All | All |
| 18 | Demo data seeding + dry run | Demo prep | S | ML Engineer | All |

**Effort key:** S = 0.5–1 day, M = 2–3 days, L = 4–5 days

---

## 13. Acceptance Criteria

### Functional

- RM can select any of the 5 customers from the sidebar
- Clicking "Generate Brief" initiates a streaming summary that begins within 3 seconds
- Summary completes within 30 seconds for all 5 customers
- Summary content is demonstrably different between HNI Equity and Institutional Fund customers
- Summary content changes meaningfully when market data is different (i.e. not static)
- At least 3 correlation narratives are surfaced per summary (US sector → India sector)
- News section contains at least 3 relevant articles dated to the current day
- All market data displayed in the UI reflects the most recent trading day's values

### Non-Functional

- The prototype runs on a single developer laptop without internet dependency for static data
- No authentication, no login, no RBAC — single-URL access
- The UI is clean, readable, and demo-presentable on a projected screen
- No build errors or console warnings during the demo

### Demo Success Criteria

The PoC is considered successful if a Macquarie decision-maker, after seeing the demo, says any of the following (unprompted):
- "How did it know that was relevant to this client?"
- "How quickly could you connect this to our actual CRM?"
- "This would save my RMs hours every morning"

---

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| yfinance rate limiting during demo | Medium | High | Pre-fetch and cache all market data nightly; demo runs from cache, not live |
| FRED data lag (weekly batch updates) | Low | Medium | Use previous day's values with clear timestamp; acceptable for daily briefing |
| Finnhub free tier exhausted during demo | Low | High | Pre-fetch news once per day; store in local JSON; demo reads from cache |
| LLM hallucination on portfolio figures | Medium | High | All portfolio numbers injected via system prompt from static customer JSON; LLM explicitly instructed not to infer or estimate |
| Correlation r-values misleading on short history | Medium | Medium | Enforce 90-day minimum lookback; display lookback window in UI |
| India NSE tickers not resolving in yfinance | Medium | Medium | Validate all tickers in a pre-build script; maintain fallback values for demo |
| Demo environment has no internet | Low | Critical | Ship with full offline mode — all data pre-fetched, Claude API cached via mock |

---

## 15. Timeline

| Week | Milestone | Deliverables |
|---|---|---|
| Week 1 | Data foundation complete | yfinance + FRED pipelines working; 5 customer profiles ready; signal normaliser tested |
| Week 1 | Intelligence skeleton | ChromaDB set up; persona engine configured; correlation engine scaffold |
| Week 2 | Core intelligence working | Correlation engine producing output for all 5 customers; Claude integration with streaming |
| Week 2 | UI skeleton | Next.js project, customer sidebar, summary panel rendering streamed text |
| Week 3 | Full integration | End-to-end working for all 5 customers; news feed live; all UI widgets connected |
| Week 3 | Demo ready | Offline mode tested; demo script rehearsed; data seeded for demo day |

---

*Document version 1.0 — Quarks / Macquarie India Sales Intelligence Agent PoC*
