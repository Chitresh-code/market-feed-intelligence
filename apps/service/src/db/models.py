from __future__ import annotations

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from db.base import Base


class CacheRunRecord(Base):
    __tablename__ = "cache_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    cache_date: Mapped[str] = mapped_column(String(10), index=True)
    status: Mapped[str] = mapped_column(String(16), index=True)
    mode: Mapped[str] = mapped_column(String(64))
    started_at: Mapped[str] = mapped_column(String(64))
    completed_at: Mapped[str | None] = mapped_column(String(64), nullable=True)
    notes: Mapped[list[str]] = mapped_column(JSON, default=list)

    raw_market_records: Mapped[list["RawMarketRecordModel"]] = relationship(
        back_populates="cache_run", cascade="all, delete-orphan"
    )
    raw_macro_records: Mapped[list["RawMacroRecordModel"]] = relationship(
        back_populates="cache_run", cascade="all, delete-orphan"
    )
    raw_news_records: Mapped[list["RawNewsRecordModel"]] = relationship(
        back_populates="cache_run", cascade="all, delete-orphan"
    )
    correlation_records: Mapped[list["CorrelationRecordModel"]] = relationship(
        back_populates="cache_run", cascade="all, delete-orphan"
    )
    signal_bundles: Mapped[list["SignalBundleModel"]] = relationship(
        back_populates="cache_run", cascade="all, delete-orphan"
    )
    freshness_records: Mapped[list["ManifestFreshnessModel"]] = relationship(
        back_populates="cache_run", cascade="all, delete-orphan"
    )


class PersonaModel(Base):
    __tablename__ = "personas"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    label: Mapped[str] = mapped_column(String(255))
    section_order: Mapped[list[str]] = mapped_column(JSON, default=list)
    category_weights: Mapped[dict[str, float]] = mapped_column(JSON, default=dict)
    tone_rules: Mapped[list[str]] = mapped_column(JSON, default=list)
    preferred_narrative_style: Mapped[str] = mapped_column(Text)
    prohibited_claim_patterns: Mapped[list[str]] = mapped_column(JSON, default=list)
    fallback_rules: Mapped[list[str]] = mapped_column(JSON, default=list)
    customers: Mapped[list["CustomerModel"]] = relationship(back_populates="persona")


class CustomerModel(Base):
    __tablename__ = "customers"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    persona_id: Mapped[str] = mapped_column(ForeignKey("personas.id"))
    mandate: Mapped[str] = mapped_column(String(255))
    client_profile: Mapped[str] = mapped_column(Text)
    risk_rating: Mapped[str] = mapped_column(String(64))
    relationship_since: Mapped[str] = mapped_column(String(64))
    last_meeting: Mapped[str] = mapped_column(String(64))
    next_meeting: Mapped[str] = mapped_column(String(64))
    meeting_context: Mapped[str] = mapped_column(Text)
    primary_objective: Mapped[str] = mapped_column(Text)
    communication_style: Mapped[str] = mapped_column(Text)
    decision_lens: Mapped[str] = mapped_column(Text)
    key_concerns: Mapped[list[str]] = mapped_column(JSON, default=list)
    watchlist: Mapped[list[str]] = mapped_column(JSON, default=list)
    rm_notes: Mapped[str] = mapped_column(Text)

    persona: Mapped[PersonaModel] = relationship(back_populates="customers")
    allocations: Mapped[list["CustomerAllocationModel"]] = relationship(
        back_populates="customer", cascade="all, delete-orphan", order_by="CustomerAllocationModel.position"
    )


class CustomerAllocationModel(Base):
    __tablename__ = "customer_allocations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    sector: Mapped[str] = mapped_column(String(255))
    ticker: Mapped[str | None] = mapped_column(String(128), nullable=True)
    weight: Mapped[float] = mapped_column(Float)
    key_holdings: Mapped[list[str]] = mapped_column(JSON, default=list)

    customer: Mapped[CustomerModel] = relationship(back_populates="allocations")


class CorrelationMappingModel(Base):
    __tablename__ = "correlation_mappings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    label: Mapped[str] = mapped_column(String(255))
    source_signal: Mapped[str] = mapped_column(String(128))
    target_signal: Mapped[str] = mapped_column(String(128))
    r_value: Mapped[float] = mapped_column(Float)
    direction: Mapped[str] = mapped_column(String(16))
    strength: Mapped[str] = mapped_column(String(16))
    lookback_days: Mapped[int] = mapped_column(Integer)
    narrative: Mapped[str] = mapped_column(Text)
    scope_type: Mapped[str] = mapped_column(String(32), index=True)
    scope_value: Mapped[str] = mapped_column(String(128), index=True)
    active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[str] = mapped_column(String(64))
    updated_at: Mapped[str] = mapped_column(String(64))


class RawMarketRecordModel(Base):
    __tablename__ = "raw_market_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cache_run_id: Mapped[str] = mapped_column(ForeignKey("cache_runs.id", ondelete="CASCADE"))
    ticker: Mapped[str] = mapped_column(String(64), index=True)
    label: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(64))
    currency: Mapped[str] = mapped_column(String(16))
    open: Mapped[float | None] = mapped_column(Float, nullable=True)
    high: Mapped[float | None] = mapped_column(Float, nullable=True)
    low: Mapped[float | None] = mapped_column(Float, nullable=True)
    close: Mapped[float] = mapped_column(Float)
    volume: Mapped[float | None] = mapped_column(Float, nullable=True)
    delta_1d_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    delta_5d_pct: Mapped[float | None] = mapped_column(Float, nullable=True)
    source: Mapped[str] = mapped_column(String(64))
    as_of: Mapped[str] = mapped_column(String(64), index=True)

    cache_run: Mapped[CacheRunRecord] = relationship(back_populates="raw_market_records")


class RawMacroRecordModel(Base):
    __tablename__ = "raw_macro_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cache_run_id: Mapped[str] = mapped_column(ForeignKey("cache_runs.id", ondelete="CASCADE"))
    series_id: Mapped[str] = mapped_column(String(64), index=True)
    label: Mapped[str] = mapped_column(String(255))
    value: Mapped[float] = mapped_column(Float)
    delta_1d: Mapped[float | None] = mapped_column(Float, nullable=True)
    delta_90d: Mapped[float | None] = mapped_column(Float, nullable=True)
    delta_180d: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str] = mapped_column(String(64))
    source: Mapped[str] = mapped_column(String(64))
    as_of: Mapped[str] = mapped_column(String(64), index=True)

    cache_run: Mapped[CacheRunRecord] = relationship(back_populates="raw_macro_records")


class RawNewsRecordModel(Base):
    __tablename__ = "raw_news_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cache_run_id: Mapped[str] = mapped_column(ForeignKey("cache_runs.id", ondelete="CASCADE"))
    article_id: Mapped[str] = mapped_column(String(64), index=True)
    headline: Mapped[str] = mapped_column(String(512))
    summary: Mapped[str] = mapped_column(Text)
    source_name: Mapped[str] = mapped_column(String(128))
    published_at: Mapped[str] = mapped_column(String(64), index=True)
    url: Mapped[str] = mapped_column(Text)
    categories: Mapped[list[str]] = mapped_column(JSON, default=list)
    related_symbols: Mapped[list[str]] = mapped_column(JSON, default=list)
    source: Mapped[str] = mapped_column(String(64))

    cache_run: Mapped[CacheRunRecord] = relationship(back_populates="raw_news_records")


class CorrelationRecordModel(Base):
    __tablename__ = "correlation_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cache_run_id: Mapped[str] = mapped_column(ForeignKey("cache_runs.id", ondelete="CASCADE"))
    customer_id: Mapped[str] = mapped_column(String(64), index=True)
    label: Mapped[str] = mapped_column(String(255))
    source_signal: Mapped[str] = mapped_column(String(128))
    target_signal: Mapped[str] = mapped_column(String(128))
    r_value: Mapped[float] = mapped_column(Float)
    direction: Mapped[str] = mapped_column(String(16))
    strength: Mapped[str] = mapped_column(String(16))
    lookback_days: Mapped[int] = mapped_column(Integer)
    narrative: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(64))
    as_of: Mapped[str] = mapped_column(String(64))

    cache_run: Mapped[CacheRunRecord] = relationship(back_populates="correlation_records")


class SignalBundleModel(Base):
    __tablename__ = "signal_bundles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bundle_id: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    cache_run_id: Mapped[str] = mapped_column(ForeignKey("cache_runs.id", ondelete="CASCADE"))
    customer_id: Mapped[str] = mapped_column(String(64), index=True)
    persona_id: Mapped[str] = mapped_column(String(64))
    date: Mapped[str] = mapped_column(String(10), index=True)
    generated_at: Mapped[str] = mapped_column(String(64))

    cache_run: Mapped[CacheRunRecord] = relationship(back_populates="signal_bundles")
    signals: Mapped[list["NormalizedSignalModel"]] = relationship(
        back_populates="bundle", cascade="all, delete-orphan"
    )


class NormalizedSignalModel(Base):
    __tablename__ = "normalized_signals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    bundle_id: Mapped[int] = mapped_column(ForeignKey("signal_bundles.id", ondelete="CASCADE"))
    signal_id: Mapped[str] = mapped_column(String(255), index=True)
    category: Mapped[str] = mapped_column(String(64))
    label: Mapped[str] = mapped_column(String(255))
    source: Mapped[str] = mapped_column(String(64))
    as_of: Mapped[str] = mapped_column(String(64))
    customer_relevance: Mapped[float] = mapped_column(Float)
    persona_weight: Mapped[float] = mapped_column(Float)
    confidence: Mapped[float] = mapped_column(Float)
    narrative: Mapped[str] = mapped_column(Text)
    time_horizon: Mapped[str] = mapped_column(String(16))

    bundle: Mapped[SignalBundleModel] = relationship(back_populates="signals")


class ManifestFreshnessModel(Base):
    __tablename__ = "manifest_freshness"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    cache_run_id: Mapped[str] = mapped_column(ForeignKey("cache_runs.id", ondelete="CASCADE"))
    dataset_name: Mapped[str] = mapped_column(String(64), index=True)
    status: Mapped[str] = mapped_column(String(16))
    as_of: Mapped[str | None] = mapped_column(String(64), nullable=True)
    generated_at: Mapped[str] = mapped_column(String(64))
    notes: Mapped[list[str]] = mapped_column(JSON, default=list)

    cache_run: Mapped[CacheRunRecord] = relationship(back_populates="freshness_records")
