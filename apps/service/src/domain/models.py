from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, HttpUrl


SignalCategory = Literal[
    "market_index",
    "sector_proxy_market",
    "macro_series",
    "sector_proxy_fundamental",
    "news_event_signal",
    "correlation_signal",
]


class NormalizedSignal(BaseModel):
    signal_id: str
    category: SignalCategory
    label: str
    source: str
    as_of: str
    customer_relevance: float = Field(ge=0.0, le=1.0)
    persona_weight: float = Field(ge=0.0)
    confidence: float = Field(ge=0.0, le=1.0)
    narrative: str


class NewsEvent(BaseModel):
    headline: str
    source: str
    published_at: str
    rationale: str
    url: HttpUrl


class CacheFileRef(BaseModel):
    path: str
    record_count: int = Field(ge=0)
    generated_at: str
    source: str
    date: str


class FreshnessMetadata(BaseModel):
    status: Literal["fresh", "stale", "missing"]
    as_of: str | None = None
    generated_at: str
    notes: list[str] = Field(default_factory=list)


class CacheManifest(BaseModel):
    manifest_id: str
    date: str
    mode: Literal["cached_external_live_llm"]
    generated_at: str
    raw_market: CacheFileRef | None = None
    raw_macro: CacheFileRef | None = None
    raw_news: CacheFileRef | None = None
    normalized_signals: CacheFileRef | None = None
    correlations: CacheFileRef | None = None
    freshness: dict[str, FreshnessMetadata]


class RawMarketRecord(BaseModel):
    ticker: str
    label: str
    category: Literal["market_index", "sector_proxy_market"]
    currency: str
    open: float | None = None
    high: float | None = None
    low: float | None = None
    close: float
    volume: float | None = None
    delta_1d_pct: float | None = None
    delta_5d_pct: float | None = None
    source: Literal["yfinance"]
    as_of: str


class RawMacroRecord(BaseModel):
    series_id: str
    label: str
    value: float
    delta_1d: float | None = None
    unit: str
    source: Literal["fredapi"]
    as_of: str


class RawNewsRecord(BaseModel):
    article_id: str
    headline: str
    summary: str
    source_name: str
    published_at: str
    url: HttpUrl
    categories: list[str] = Field(default_factory=list)
    related_symbols: list[str] = Field(default_factory=list)
    source: Literal["finnhub"]


class RawDatasetEnvelope(BaseModel):
    dataset: Literal["market", "macro", "news"]
    date: str
    generated_at: str
    source: str
    notes: list[str] = Field(default_factory=list)
    records: list[Any]


class NormalizedSignalBundle(BaseModel):
    bundle_id: str
    customer_id: str
    persona_id: str
    date: str
    generated_at: str
    signals: list[NormalizedSignal]


class CorrelationRecord(BaseModel):
    customer_id: str
    label: str
    source_signal: str
    target_signal: str
    r_value: float = Field(ge=-1.0, le=1.0)
    direction: Literal["positive", "negative"]
    strength: Literal["strong", "moderate", "weak"]
    lookback_days: int = Field(ge=1)
    narrative: str
    source: Literal["precomputed_correlation_job"]
    as_of: str


class CorrelationBundle(BaseModel):
    bundle_id: str
    date: str
    generated_at: str
    correlations: list[CorrelationRecord]
