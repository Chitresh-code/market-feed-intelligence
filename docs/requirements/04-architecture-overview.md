# Architecture Overview
## Macquarie India — Sales Intelligence Agent PoC

| Field | Detail |
|---|---|
| Version | v1.0 |
| Stack | Next.js 14 · Python · ChromaDB · Claude Sonnet 4 |
| Deployment | Single developer machine (PoC) |

---

## System Layers

```
╔══════════════════════════════════════════════════════════════════════╗
║  LAYER 0 — DATA SOURCES                                             ║
║                                                                      ║
║  ┌─────────────────┐  ┌──────────────────┐  ┌──────┐  ┌─────────┐  ║
║  │  SYNTHETIC CRM  │  │  YAHOO FINANCE   │  │ FRED │  │FINNHUB  │  ║
║  │  5 customer     │  │  41 tickers/day  │  │  16  │  │  News   │  ║
║  │  profiles (JSON)│  │  India + US +    │  │daily │  │  API    │  ║
║  │                 │  │  Global + Commod.│  │macro │  │         │  ║
║  └─────────────────┘  └──────────────────┘  └──────┘  └─────────┘  ║
╚══════════════════════════════════════════════════════════════════════╝
                                  │
                                  ▼
╔══════════════════════════════════════════════════════════════════════╗
║  LAYER 1 — INGESTION & NORMALISATION (Python)                       ║
║                                                                      ║
║  ┌──────────────────────┐  ┌────────────────────┐  ┌─────────────┐  ║
║  │  DATA ORCHESTRATOR   │  │  SIGNAL NORMALISER │  │ VECTOR STORE│  ║
║  │  Next.js API Route   │  │  Pandas + Pydantic │  │  ChromaDB   │  ║
║  │  Schedules daily     │→ │  Unified schema    │→ │  + MiniLM   │  ║
║  │  fetch of all sources│  │  for all signals   │  │  embeddings │  ║
║  └──────────────────────┘  └────────────────────┘  └─────────────┘  ║
╚══════════════════════════════════════════════════════════════════════╝
                                  │
                                  ▼
╔══════════════════════════════════════════════════════════════════════╗
║  LAYER 2 — INTELLIGENCE (Python + Anthropic API)                    ║
║                                                                      ║
║  ┌──────────────────┐  ┌──────────────────────┐  ┌───────────────┐  ║
║  │  PERSONA ENGINE  │  │  CORRELATION ENGINE  │  │LLM SUMMARISER │  ║
║  │  TypeScript      │  │  NumPy + SciPy       │  │Claude Sonnet 4│  ║
║  │  Rule-based      │  │  90-day rolling      │  │Streaming SSE  │  ║
║  │  2 personas      │→ │  India ↔ US sectors  │→ │Persona-aware  │  ║
║  │  5 customers     │  │  r-value + narrative │  │4 sections     │  ║
║  └──────────────────┘  └──────────────────────┘  └───────────────┘  ║
╚══════════════════════════════════════════════════════════════════════╝
                                  │
                                  ▼
╔══════════════════════════════════════════════════════════════════════╗
║  LAYER 3 — SERVING (Next.js 14 API Routes)                         ║
║                                                                      ║
║  POST /api/summary  ·  GET /api/market-data  ·  GET /api/news       ║
║  GET /api/persona/{id}  ·  GET /api/customer/{id}                   ║
║  GET /api/context  ·  POST /api/correlate                           ║
╚══════════════════════════════════════════════════════════════════════╝
                                  │
                                  ▼
╔══════════════════════════════════════════════════════════════════════╗
║  LAYER 4 — PRESENTATION (Next.js 14 App Router + Tailwind CSS)      ║
║                                                                      ║
║  ┌───────────────────┐  ┌──────────────────────────────────────┐    ║
║  │  CUSTOMER         │  │  MAIN PANEL                          │    ║
║  │  SELECTOR SIDEBAR │  │                                      │    ║
║  │                   │  │  ┌──────────────────────────────┐    │    ║
║  │  • Arjun Mehta    │  │  │  STREAMING SUMMARY           │    │    ║
║  │    HNI Equity     │  │  │  Market Pulse                │    │    ║
║  │                   │  │  │  Portfolio Signals           │    │    ║
║  │  • Priya Kapoor   │  │  │  Global Linkages             │    │    ║
║  │    HNI Equity     │  │  │  Talking Points              │    │    ║
║  │                   │  │  └──────────────────────────────┘    │    ║
║  │  • MIG Fund       │  │                                      │    ║
║  │    Inst. Fund     │  │  ┌────────────┐  ┌───────────────┐   │    ║
║  │                   │  │  │  INDICES   │  │  NEWS FEED    │   │    ║
║  │  • Tata Strat.    │  │  │  SNAPSHOT  │  │  Top 5 today  │   │    ║
║  │    Inst. Fund     │  │  │  (today's  │  │  filtered by  │   │    ║
║  │                   │  │  │  closes)   │  │  customer     │   │    ║
║  │  • Blue River     │  │  └────────────┘  └───────────────┘   │    ║
║  │    Inst. Fund     │  │                                      │    ║
║  └───────────────────┘  └──────────────────────────────────────┘    ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

## Data Flow — Request Lifecycle

```
User selects customer → clicks "Generate Brief"
        │
        ▼
Next.js /app/dashboard (client component)
        │
        ├── GET /api/customer/{id}        → Load customer profile + allocations
        │
        ├── GET /api/market-data?date=T   → Load today's index snapshot
        │
        ├── GET /api/news?customer_id={id} → Load top 5 relevant articles
        │
        └── POST /api/summary (SSE)       → Begin streaming summary
                │
                ├── GET /api/persona/{id}         → Resolve persona + signal weights
                │
                ├── GET /api/context?customer_id  → Retrieve top-k signals from ChromaDB
                │
                ├── POST /api/correlate           → Compute India ↔ US correlations
                │
                └── Claude Sonnet 4 API (stream)  → Generate + stream summary text
                        │
                        ▼
                SSE delta events → UI renders text in real time
```

---

## Component Dependency Map

```
[Synthetic JSON] ─────────────────────→ [Persona Engine]
                                                │
[yfinance] ──→ [Orchestrator] ──→ [Normaliser] ──→ [ChromaDB]
                                                │         │
[FRED API] ──→ [Orchestrator] ──→ [Normaliser] ─┘         │
                                                          │
[Finnhub] ───→ [Orchestrator] ──→ [News filter] ──────────┤
                                                          │
                                    [Correlation Engine] ←┘
                                                │
                                    [LLM Summariser] (Claude)
                                                │
                                    [Next.js API /api/summary]
                                                │
                                    [Streaming Summary Panel]
```

---

## Technology Decisions

### Why Next.js 14 (App Router)?

- Single framework for frontend and backend — eliminates FastAPI/Express overhead for PoC
- Native SSE streaming support for real-time summary generation
- Server Components for fast initial page load
- Tailwind CSS integration out of the box
- No auth/session complexity required for PoC

### Why ChromaDB?

- Runs in-process (no Docker, no server setup)
- Python-native with simple API
- Swappable to Pinecone, Weaviate, or pgvector in production with minimal code change
- Sufficient for 5 customers × ~100 daily signals per customer

### Why Claude Sonnet 4?

- Best-in-class instruction following for structured prose generation
- Native streaming (SSE) support
- System prompt adherence — does not hallucinate when explicitly grounded in retrieved context
- Cost-effective at ~$0.01–0.03 per summary

### Why yfinance + fredapi over a paid data provider?

- Zero cost — entire data layer is free for PoC
- yfinance covers all required tickers including NSE India, NYSE, and futures
- FRED covers all required macro series at daily frequency
- Both are well-documented, widely used in production finance applications

---

## Infrastructure (PoC)

```
Single developer machine
│
├── Node.js 20+ (Next.js 14)
│   └── npm packages: next, react, tailwindcss, yahoo-finance2, axios
│
├── Python 3.11+
│   └── pip packages: yfinance, fredapi, chromadb, sentence-transformers,
│                     numpy, scipy, pandas, pydantic, anthropic, fastapi
│
├── /data/
│   ├── customers/          → 5 synthetic customer JSON files
│   ├── snapshots/          → Daily cached market data (date-stamped)
│   ├── news/               → Daily cached Finnhub articles per customer
│   └── chromadb/           → Local ChromaDB persistent storage
│
└── .env
    ├── ANTHROPIC_API_KEY
    ├── FRED_API_KEY
    └── FINNHUB_API_KEY
```

---

## Project File Structure

```
macquarie-sales-agent/
│
├── app/                          # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                  # Dashboard — customer selector + main panel
│   └── api/
│       ├── summary/route.ts      # SSE streaming endpoint → Claude
│       ├── market-data/route.ts  # Today's index snapshot
│       ├── news/route.ts         # Customer-filtered news
│       ├── customer/[id]/route.ts
│       ├── persona/[id]/route.ts
│       ├── context/route.ts      # ChromaDB retrieval
│       └── correlate/route.ts    # Correlation engine
│
├── components/
│   ├── CustomerSidebar.tsx
│   ├── SummaryPanel.tsx          # Streaming text renderer
│   ├── IndicesSnapshot.tsx
│   └── NewsFeed.tsx
│
├── data/
│   ├── customers/                # C001.json ... C005.json
│   └── personas/                 # hni_equity.yaml, inst_fund.yaml
│
├── scripts/                      # Python data pipeline
│   ├── fetch_market_data.py      # yfinance + FRED daily fetch
│   ├── fetch_news.py             # Finnhub news fetch + filter
│   ├── normalise_signals.py      # Unified signal schema
│   ├── embed_signals.py          # ChromaDB population
│   └── compute_correlations.py   # NumPy/SciPy correlation engine
│
├── lib/
│   ├── customers.ts              # Customer data loader
│   ├── personas.ts               # Persona config
│   └── prompts.ts                # Claude system prompt templates
│
└── .env.local                    # API keys (never committed)
```

---

*Architecture document v1.0 — Macquarie India Sales Intelligence Agent PoC*
