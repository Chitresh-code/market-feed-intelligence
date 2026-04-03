# Dataset Catalogue
## Macquarie India — Sales Intelligence Agent PoC

| Field | Detail |
|---|---|
| Version | v1.0 |
| Last updated | April 2026 |
| Frequency | All datasets confirmed daily |

---

## Overview

This PoC uses four data source categories. All sources are free, open, and accessible via standard APIs or Python packages. No proprietary or paid data feeds are required.

| Category | Source | Records/day | Format | Cost |
|---|---|---|---|---|
| Indian indices & ETFs | Yahoo Finance (`yfinance`) | ~35 tickers × OHLCV | JSON → DataFrame | Free |
| US Sectoral ETFs | Yahoo Finance (`yfinance`) | 11 tickers × OHLCV | JSON → DataFrame | Free |
| Global Indices & Commodities | Yahoo Finance (`yfinance`) | ~14 tickers × OHLCV | JSON → DataFrame | Free |
| Macro Indicators | FRED API (`fredapi`) | 16 daily series | JSON | Free (API key) |
| Financial News | Finnhub API | ~50–100 articles/day | JSON | Free (60 req/min) |
| Customer Profiles | Synthetic JSON | 5 static records | JSON | N/A |

---

## Section 1 — Yahoo Finance: Indian Indices

**Access:** `yfinance.download(ticker, period="1d", interval="1d")`
**Frequency:** Daily EOD (End of Day)
**Fields returned:** Open, High, Low, Close, Adj Close, Volume
**License:** Yahoo Finance Terms of Service — research and personal use

### Indian Broad Market Indices

| Ticker | Index Name | Notes |
|---|---|---|
| `^NSEI` | Nifty 50 | Primary India benchmark — always include |
| `^BSESN` | BSE Sensex | Secondary benchmark — cross-reference |
| `^INDIAVIX` | India VIX | Fear gauge — key for risk-on/off signals |
| `^NSEBANK` | Nifty Bank | Largest sectoral index by market cap |
| `^NSMIDCP50` | Nifty Next 50 | Bridge between large and mid cap |

### Indian Sectoral Indices

| Ticker | Index Name | Sector | Relevant to Customers |
|---|---|---|---|
| `NIFTYIT.NS` | Nifty IT | Information Technology | C001, C002, C005 |
| `NIFTYPHARMA.NS` | Nifty Pharma | Pharmaceuticals / Healthcare | C003 |
| `NIFTYAUTO.NS` | Nifty Auto | Automobile & EV | C005 |
| `NIFTYINFRA.NS` | Nifty Infrastructure | Infrastructure / PSU | C002 |
| `NIFTYFMCG.NS` | Nifty FMCG | Consumer Staples | C001 |
| `NIFTYMETAL.NS` | Nifty Metal | Metals & Mining | C003 |
| `NIFTYREALTY.NS` | Nifty Realty | Real Estate | C003 |
| `NIFTYPSUBNK.NS` | Nifty PSU Bank | Public Sector Banks | C002 |
| `NIFTYENERGY.NS` | Nifty Energy | Oil, Gas & Power | C003 |

### Indian Thematic Indices

| Ticker | Index Name | Theme | Relevant to Customers |
|---|---|---|---|
| `^NSEMDCP100` | Nifty Midcap 100 | Mid-cap universe | C005 |
| `^NSESMCP100` | Nifty Smallcap 100 | Small-cap universe | C005 |
| `NIFTYCONSUM.NS` | Nifty India Consumption | Domestic demand | C001, C002 |

---

## Section 2 — Yahoo Finance: US Sectoral ETFs

**Access:** `yfinance.download(ticker, period="1d", interval="1d")`
**Frequency:** Daily EOD — confirmed available since December 1998
**Source:** State Street Global Advisors — SPDR Select Sector ETF suite
**Coverage:** All 11 GICS (Global Industry Classification Standard) sectors of the S&P 500

> These are the most liquid sector ETFs in the world — average daily volume exceeds $100M per ETF. Daily data availability is guaranteed with no gaps.

| Ticker | ETF Full Name | GICS Sector | India Correlation Pair | Signal Use |
|---|---|---|---|---|
| `XLK` | Technology Select Sector SPDR | Information Technology | `NIFTYIT.NS` | US tech sentiment → Indian IT exports |
| `XLF` | Financial Select Sector SPDR | Financials | `^NSEBANK` | US bank health → FII risk appetite |
| `XLE` | Energy Select Sector SPDR | Energy | `NIFTYENERGY.NS` | Crude proxy → India energy cost |
| `XLV` | Health Care Select Sector SPDR | Health Care | `NIFTYPHARMA.NS` | FDA / drug pricing → pharma exports |
| `XLI` | Industrial Select Sector SPDR | Industrials | `NIFTYINFRA.NS` | Global capex cycle → infra demand |
| `XLB` | Materials Select Sector SPDR | Materials | `NIFTYMETAL.NS` | Global commodity prices → metals |
| `XLP` | Consumer Staples Select Sector SPDR | Consumer Staples | `NIFTYFMCG.NS` | Defensive rotation signal |
| `XLY` | Consumer Discretionary Select Sector SPDR | Consumer Discretionary | `NIFTYAUTO.NS` | Global consumer confidence |
| `XLC` | Communication Services Select Sector SPDR | Communication Services | Telecom | Global tech/media sentiment |
| `XLRE` | Real Estate Select Sector SPDR | Real Estate | `NIFTYREALTY.NS` | Global rate sensitivity |
| `XLU` | Utilities Select Sector SPDR | Utilities | — | Global risk-off signal |

---

## Section 3 — Yahoo Finance: Global Indices & Commodities

**Access:** `yfinance.download(ticker, period="1d", interval="1d")`
**Frequency:** Daily EOD

### Global Equity Indices

| Ticker | Index | Region | India Relevance |
|---|---|---|---|
| `^GSPC` | S&P 500 | United States | Primary FII risk appetite gauge |
| `^NDX` | Nasdaq 100 | United States | Tech valuations → Nifty IT |
| `^DJI` | Dow Jones Industrial Average | United States | Broad US economic health signal |
| `^FTSE` | FTSE 100 | United Kingdom | European developed market tone |
| `^GDAXI` | DAX 40 | Germany | European industrial cycle |
| `^N225` | Nikkei 225 | Japan | Asian market overnight cue |
| `^HSI` | Hang Seng Index | Hong Kong | China + EM proxy |
| `000001.SS` | Shanghai Composite | China | China direct — trade partner |
| `EEM` | iShares MSCI Emerging Markets ETF | Global EM | EM capital flows vs India |

### Commodities

| Ticker | Commodity | Unit | India Relevance |
|---|---|---|---|
| `GC=F` | Gold Futures | USD/oz | Safe haven demand, INR hedge |
| `BZ=F` | Brent Crude Futures | USD/barrel | India's primary crude benchmark |
| `CL=F` | WTI Crude Futures | USD/barrel | Cross-reference with Brent |
| `DX-Y.NYB` | US Dollar Index (DXY) | Index | INR directional pressure |

---

## Section 4 — FRED Macro Indicators

**Access:** `fredapi.Fred(api_key=KEY).get_series(series_id)`
**Registration:** Free API key at https://fred.stlouisfed.org/docs/api/api_key.html
**Frequency:** All series below are published at **daily** frequency
**License:** Public domain — Federal Reserve Bank of St. Louis

> **Important caveat:** FRED updates its exchange rate series (H.10 release) once per week, batching the prior week's daily readings. All values are daily observations but may be published with a 1–5 day lag. For a PoC daily briefing, this is acceptable. Production systems should supplement with a live FX data provider for same-day rates.

### Tier 1 — Direct Daily India Impact

| FRED Series ID | Metric | Frequency | Unit | India Relevance |
|---|---|---|---|---|
| `DEXINUS` | Indian Rupees to USD Spot Rate | Daily | INR per USD | Direct currency exposure for all portfolios |
| `VIXCLS` | CBOE VIX Volatility Index | Daily | Index | Global risk-off → FII selling Indian equities |
| `DGS10` | US 10-Year Treasury Yield | Daily | % | Rate differential driving FII flows |
| `DGS2` | US 2-Year Treasury Yield | Daily | % | Short-end US monetary policy |
| `T10Y2Y` | 10Y–2Y Treasury Yield Spread | Daily | % | US yield curve — recession signal |
| `DTWEXBGS` | Broad USD Dollar Index | Daily | Index (2006=100) | Dollar strength = EM capital outflows |
| `DTWEXEMEGS` | Emerging Market USD Index | Daily | Index | EM-specific dollar pressure |
| `DCOILWTICO` | WTI Crude Oil Spot Price | Daily | USD/barrel | India imports ~85% oil — direct macro |
| `GOLDAMGBD228NLBM` | Gold Price — London AM Fix | Daily | USD/troy oz | Safe haven signal, INR hedge |

### Tier 2 — Structural Daily Signals

| FRED Series ID | Metric | Frequency | Unit | Use |
|---|---|---|---|---|
| `DFF` | Federal Funds Effective Rate | Daily | % | US monetary policy stance |
| `SOFR` | Secured Overnight Financing Rate | Daily | % | Global liquidity benchmark |
| `BAMLH0A0HYM2` | US High Yield Credit Spread | Daily | bps | Credit risk appetite → EM risk-on/off |
| `DBAA` | Moody's BAA Corporate Spread | Daily | % | Investment grade credit conditions |
| `DEXCNUS` | Chinese Yuan to USD | Daily | CNY per USD | China trade + EM contagion proxy |
| `DEXJPUS` | Japanese Yen to USD | Daily | JPY per USD | Yen carry trade signal |
| `DEXUSUK` | USD to British Pound | Daily | USD per GBP | Developed market FX gauge |

### Excluded Series (not daily — unsuitable for daily briefs)

| Series ID | Metric | Frequency | Reason excluded |
|---|---|---|---|
| `CPIAUCSL` | US CPI | Monthly | Stale in daily context |
| `GDP` | US GDP | Quarterly | Not actionable daily |
| `UNRATE` | US Unemployment | Monthly | Not actionable daily |
| `INDPRO` | Industrial Production | Monthly | Not actionable daily |

---

## Section 5 — Finnhub News API

**Access:** REST API — `https://finnhub.io/api/v1`
**Auth:** Free API key at https://finnhub.io — no credit card required
**Rate limit:** 60 API calls/minute on free tier
**Coverage:** Reuters, Bloomberg, CNBC, ET Markets, Moneycontrol, Business Standard, Financial Times, WSJ

### Endpoints Used

| Endpoint | Parameters | Returns | Use |
|---|---|---|---|
| `GET /news` | `category=general` | Last 100 global market articles | Daily global market news |
| `GET /news` | `category=forex` | FX and macro news | Currency and rate news |
| `GET /company-news` | `symbol, from, to` | Articles for specific company | Holdings-specific news |

### News Filtering Pipeline

```
1. Pull last 24h general market news (Finnhub /news endpoint)
2. Extract relevant keywords from customer's sector allocations
   e.g. C001 Arjun Mehta → ["Nifty IT", "HDFC Bank", "FMCG", "technology", "banking"]
3. Score each article by cosine similarity to customer keyword set
   (using sentence-transformers locally — no API cost)
4. Return top 5 articles per customer per day, sorted by relevance score
5. Store in local cache to avoid repeated API calls during demo
```

### Sample Finnhub Response Schema

```json
{
  "category": "general",
  "datetime": 1743580800,
  "headline": "Fed signals two rate cuts in 2026 amid tariff uncertainty",
  "id": 7891234,
  "image": "https://...",
  "related": "",
  "source": "Reuters",
  "summary": "Federal Reserve officials signalled...",
  "url": "https://reuters.com/..."
}
```

### News Quality Notes

- Finnhub's free tier covers global financial news with strong Reuters and Bloomberg coverage
- India-specific sources (ET Markets, Moneycontrol) are included but with lower volume than global sources
- For production, consider upgrading to Finnhub Premium or adding NewsData.io for richer India coverage
- GDELT Project (completely free, BigQuery) recommended as a Phase 2 addition for geopolitical and macro-event signals

---

## Section 6 — Synthetic Customer Data

**Format:** Static JSON files stored in `/data/customers/`
**Purpose:** Simulate CRM and portfolio data for PoC without requiring real client data integration
**Volume:** 5 customer records, each with portfolio allocations and RM notes

### Schema

```json
{
  "id": "C001",
  "name": "Arjun Mehta",
  "persona": "hni_equity",
  "mandate": "Growth",
  "risk_rating": "Moderate-High",
  "relationship_since": "2019-03-15",
  "last_meeting": "2026-03-20",
  "next_meeting": "2026-04-02T11:00:00",
  "rm_notes": "Prefers morning briefs. Currently concerned about US tech correction.",
  "allocations": [
    { "sector": "Nifty IT", "ticker": "NIFTYIT.NS", "weight": 0.25, "key_holdings": ["INFY.NS", "TCS.NS", "WIPRO.NS"] },
    { "sector": "Nifty Bank", "ticker": "^NSEBANK", "weight": 0.20, "key_holdings": ["HDFCBANK.NS", "ICICIBANK.NS"] },
    { "sector": "Nifty FMCG", "ticker": "NIFTYFMCG.NS", "weight": 0.15, "key_holdings": ["HINDUNILVR.NS", "ITC.NS"] },
    { "sector": "Mid-cap mixed", "ticker": "^NSEMDCP100", "weight": 0.25, "key_holdings": [] },
    { "sector": "Cash", "ticker": null, "weight": 0.15, "key_holdings": [] }
  ]
}
```

---

## Data Flow Summary

```
Yahoo Finance (yfinance)
├── Indian Sectoral Indices (9 tickers)     → Daily OHLCV
├── Indian Thematic Indices (3 tickers)     → Daily OHLCV
├── Indian Broad Indices (5 tickers)        → Daily OHLCV
├── US Sectoral ETFs — SPDR (11 tickers)   → Daily OHLCV
├── Global Indices (9 tickers)              → Daily OHLCV
└── Commodities (4 tickers)                → Daily OHLCV
                                              Total: ~41 tickers/day
FRED API (fredapi)
├── Tier 1 Daily Series (9 series)         → Daily values
└── Tier 2 Daily Series (7 series)         → Daily values
                                              Total: 16 macro series/day

Finnhub API
├── General market news                    → ~50–100 articles/day
└── Company news (per holdings ticker)     → ~5–10 articles/ticker/day

Synthetic JSON
└── 5 customer profiles                    → Static, updated manually
```

---

## Preprocessing Requirements

| Data Source | Preprocessing Step | Tool |
|---|---|---|
| yfinance (all tickers) | Compute 1d and 5d % change; classify direction + magnitude | Pandas |
| FRED series | Forward-fill missing values (weekends/holidays); compute daily delta | Pandas |
| Finnhub news | Timestamp conversion (Unix → ISO8601); keyword relevance scoring | sentence-transformers |
| All signals | Normalise to unified Signal schema (see Engineering Requirements) | Pydantic |
| All signals | Embed for ChromaDB storage | sentence-transformers/all-MiniLM-L6-v2 |

---

*Dataset catalogue v1.0 — Macquarie India Sales Intelligence Agent PoC*
