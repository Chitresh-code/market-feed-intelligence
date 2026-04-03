okay# Cache Contract

## Purpose

`data/cache` is the shared contract boundary between:

- Python batch jobs in `apps/service`
- Next.js API aggregation in `apps/web`

The contract is designed for the POC mode:

- external data is cached
- summary generation is live
- synthetic data is limited to customers, personas, and fallback briefs

No market, macro, news, or correlation data should be hard-coded in the web layer after this contract is implemented.

## Directory layout

```text
data/cache/
├── raw/
│   ├── market/
│   ├── macro/
│   └── news/
├── normalized/
│   └── signals/
├── correlations/
└── manifests/
```

## File naming

Use one file per dataset per demo date unless a later scaling need forces sharding.

### Raw cache

- `data/cache/raw/market/{date}.json`
- `data/cache/raw/macro/{date}.json`
- `data/cache/raw/news/{date}.json`

### Normalized signals

- `data/cache/normalized/signals/{date}--{customer_id}.json`

### Correlations

- `data/cache/correlations/{date}.json`

### Manifest

- `data/cache/manifests/{date}.json`

## Ownership by layer

### Python service owns writes to

- `raw/*`
- `normalized/signals/*`
- `correlations/*`
- `manifests/*`

### Web layer reads from

- `normalized/signals/*`
- `correlations/*`
- `manifests/*`
- raw artifacts only when detailed provenance is needed

## Dataset responsibilities

### `raw/market`

Source: `yfinance`

Contains:
- indices
- sector proxy market records
- global proxies
- ETF proxies used for sector linkage

Required fields per record:
- ticker
- label
- category
- currency
- close
- source
- as_of

Optional enrichment:
- OHLC
- volume
- delta_1d_pct
- delta_5d_pct

### `raw/macro`

Source: `fredapi`

Contains:
- daily macro series used in the brief
- values plus deltas when available

Required fields per record:
- series_id
- label
- value
- unit
- source
- as_of

### `raw/news`

Source: `Finnhub`

Contains:
- raw news articles used to derive event-like catalysts

Required fields per record:
- article_id
- headline
- summary
- source_name
- published_at
- url
- source

Optional enrichment:
- categories
- related_symbols

### `normalized/signals`

Scope: per customer and persona per date

Contains the ranked, unified evidence set that downstream APIs use. This is where:
- market records
- macro records
- sector proxy fundamentals
- news-derived event signals
- supporting narrative signals
are converted into one common schema.

Each file must include:
- bundle metadata
- customer id
- persona id
- date
- generated timestamp
- ordered signal list

Each signal must include:
- signal id
- category
- label
- source
- as_of
- customer relevance
- persona weight
- confidence
- narrative

### `correlations`

Scope: one date-level bundle containing all customer-eligible precomputed correlations

Contains:
- source signal
- target signal
- `r_value`
- direction
- strength
- lookback days
- narrative
- source
- as_of

Weak or invalid correlations should be omitted rather than written with ambiguous placeholders.

### `manifests`

Purpose:
- record what was generated for a given date
- provide freshness and missing-data information
- let the web layer explain stale or missing inputs cleanly

Each manifest must include:
- dataset file references
- generation timestamps
- freshness per dataset
- mode fixed to `cached_external_live_llm`

## Freshness rules

For the POC, every manifest must classify each dataset as:

- `fresh`
- `stale`
- `missing`

Freshness should be derived by the Python jobs and not inferred in the web layer.

The web layer should render these states directly instead of recomputing them.

## Web API consumption rules

### `GET /api/dashboard-data`

Reads:
- manifest for the requested date
- normalized bundle for the requested customer
- correlation bundle for the requested date

Returns:
- customer contract
- persona contract
- top market and macro snapshot items
- top sector proxy fundamentals
- top news/event signals
- top precomputed correlations
- freshness metadata

### `POST /api/summary`

Reads:
- same bundle inputs as `dashboard-data`
- optional meeting context

Builds:
- compact evidence payload for the model

Does not:
- fetch raw external data live
- compute correlations live

## POC boundaries

This cache contract intentionally excludes:

- live CRM artifacts
- holding-level fundamentals
- forward-looking macro event calendars
- stored model outputs as a primary cache layer

The only seeded/fake content allowed under `data/` is:
- customers
- personas
- fallback briefs

Everything under `data/cache` should be treated as generated output from real adapters or future seeded demo-date cache runs.
