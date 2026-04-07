from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from db.models import (
    CacheRunRecord,
    CorrelationRecordModel,
    ManifestFreshnessModel,
    NormalizedSignalModel,
    RawMacroRecordModel,
    RawMarketRecordModel,
    RawNewsRecordModel,
    SignalBundleModel,
)
from domain.models import (
    CacheFileRef,
    CacheManifest,
    CorrelationBundle,
    CorrelationRecord,
    FreshnessMetadata,
    NormalizedSignal,
    NormalizedSignalBundle,
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class CacheRepository:
    def __init__(self, session: Session):
        self.session = session

    def create_cache_run(self, cache_date: str, mode: str) -> CacheRunRecord:
        record = CacheRunRecord(
            id=uuid4().hex,
            cache_date=cache_date,
            status="running",
            mode=mode,
            started_at=utc_now(),
            completed_at=None,
            notes=[],
        )
        self.session.add(record)
        self.session.flush()
        return record

    def set_run_status(
        self, run: CacheRunRecord, status: str, notes: list[str] | None = None
    ) -> CacheRunRecord:
        run.status = status
        run.completed_at = utc_now()
        run.notes = notes or []
        self.session.add(run)
        self.session.flush()
        return run

    def replace_raw_market_records(self, run_id: str, records: list[dict]) -> None:
        self.session.execute(
            delete(RawMarketRecordModel).where(RawMarketRecordModel.cache_run_id == run_id)
        )
        self.session.add_all([RawMarketRecordModel(cache_run_id=run_id, **record) for record in records])
        self.session.flush()

    def replace_raw_macro_records(self, run_id: str, records: list[dict]) -> None:
        self.session.execute(
            delete(RawMacroRecordModel).where(RawMacroRecordModel.cache_run_id == run_id)
        )
        self.session.add_all([RawMacroRecordModel(cache_run_id=run_id, **record) for record in records])
        self.session.flush()

    def replace_raw_news_records(self, run_id: str, records: list[dict]) -> None:
        self.session.execute(
            delete(RawNewsRecordModel).where(RawNewsRecordModel.cache_run_id == run_id)
        )
        self.session.add_all([RawNewsRecordModel(cache_run_id=run_id, **record) for record in records])
        self.session.flush()

    def replace_correlation_records(self, run_id: str, records: list[dict]) -> None:
        self.session.execute(
            delete(CorrelationRecordModel).where(CorrelationRecordModel.cache_run_id == run_id)
        )
        self.session.add_all([CorrelationRecordModel(cache_run_id=run_id, **record) for record in records])
        self.session.flush()

    def replace_signal_bundle(self, run_id: str, bundle: NormalizedSignalBundle) -> None:
        existing = self.session.scalar(
            select(SignalBundleModel)
            .where(SignalBundleModel.bundle_id == bundle.bundle_id)
            .options(selectinload(SignalBundleModel.signals))
        )
        if existing:
            self.session.delete(existing)
            self.session.flush()

        row = SignalBundleModel(
            bundle_id=bundle.bundle_id,
            cache_run_id=run_id,
            customer_id=bundle.customer_id,
            persona_id=bundle.persona_id,
            date=bundle.date,
            generated_at=bundle.generated_at,
        )
        self.session.add(row)
        self.session.flush()
        self.session.add_all(
            [
                NormalizedSignalModel(
                    bundle_id=row.id,
                    signal_id=signal.signal_id,
                    category=signal.category,
                    label=signal.label,
                    source=signal.source,
                    as_of=signal.as_of,
                    customer_relevance=signal.customer_relevance,
                    persona_weight=signal.persona_weight,
                    confidence=signal.confidence,
                    narrative=signal.narrative,
                    time_horizon=signal.time_horizon,
                )
                for signal in bundle.signals
            ]
        )
        self.session.flush()

    def replace_manifest_freshness(self, run_id: str, freshness: dict[str, FreshnessMetadata]) -> None:
        self.session.execute(
            delete(ManifestFreshnessModel).where(ManifestFreshnessModel.cache_run_id == run_id)
        )
        self.session.add_all(
            [
                ManifestFreshnessModel(
                    cache_run_id=run_id,
                    dataset_name=dataset_name,
                    status=metadata.status,
                    as_of=metadata.as_of,
                    generated_at=metadata.generated_at,
                    notes=metadata.notes,
                )
                for dataset_name, metadata in freshness.items()
            ]
        )
        self.session.flush()

    def fetch_latest_successful_date(self) -> str | None:
        return self.session.scalar(
            select(CacheRunRecord.cache_date)
            .where(CacheRunRecord.status == "success")
            .order_by(CacheRunRecord.cache_date.desc(), CacheRunRecord.completed_at.desc())
            .limit(1)
        )

    def fetch_all_successful_dates(self) -> list[str]:
        rows = self.session.scalars(
            select(CacheRunRecord.cache_date)
            .where(CacheRunRecord.status == "success")
            .order_by(CacheRunRecord.cache_date.asc(), CacheRunRecord.completed_at.asc())
        ).all()
        return list(dict.fromkeys(rows))

    def fetch_successful_run_for_date(self, cache_date: str) -> CacheRunRecord | None:
        return self.session.scalar(
            select(CacheRunRecord)
            .where(CacheRunRecord.cache_date == cache_date, CacheRunRecord.status == "success")
            .options(
                selectinload(CacheRunRecord.raw_market_records),
                selectinload(CacheRunRecord.raw_macro_records),
                selectinload(CacheRunRecord.raw_news_records),
                selectinload(CacheRunRecord.correlation_records),
                selectinload(CacheRunRecord.signal_bundles).selectinload(SignalBundleModel.signals),
                selectinload(CacheRunRecord.freshness_records),
            )
            .order_by(CacheRunRecord.completed_at.desc())
            .limit(1)
        )

    def fetch_bundle_for_date(self, cache_date: str, customer_id: str) -> SignalBundleModel | None:
        run = self.fetch_successful_run_for_date(cache_date)
        if not run:
            return None
        for bundle in run.signal_bundles:
            if bundle.customer_id == customer_id:
                return bundle
        return None

    def fetch_bundle_with_run_for_date(
        self, cache_date: str, customer_id: str
    ) -> tuple[CacheRunRecord, SignalBundleModel] | None:
        run = self.fetch_successful_run_for_date(cache_date)
        if not run:
            return None
        for bundle in run.signal_bundles:
            if bundle.customer_id == customer_id:
                return run, bundle
        return None

    def build_manifest_from_run(self, run: CacheRunRecord) -> CacheManifest:
        freshness = {
            row.dataset_name: FreshnessMetadata(
                status=row.status,
                as_of=row.as_of,
                generated_at=row.generated_at,
                notes=row.notes,
            )
            for row in run.freshness_records
        }

        return CacheManifest(
            manifest_id=f"manifest-{run.cache_date}",
            date=run.cache_date,
            mode="cached_external_live_llm",
            generated_at=run.completed_at or run.started_at,
            raw_market=self._build_file_ref("raw_market", run.cache_date, run.started_at, len(run.raw_market_records), "yfinance")
            if run.raw_market_records
            else None,
            raw_macro=self._build_file_ref("raw_macro", run.cache_date, run.started_at, len(run.raw_macro_records), "fredapi")
            if run.raw_macro_records
            else None,
            raw_news=self._build_file_ref("raw_news", run.cache_date, run.started_at, len(run.raw_news_records), "finnhub")
            if run.raw_news_records
            else None,
            normalized_signals=self._build_file_ref("normalized_signals", run.cache_date, run.completed_at or run.started_at, len(run.signal_bundles), "normalization_job")
            if run.signal_bundles
            else None,
            correlations=self._build_file_ref("correlations", run.cache_date, run.completed_at or run.started_at, len(run.correlation_records), "precomputed_correlation_job")
            if run.correlation_records
            else None,
            freshness=freshness,
        )

    def build_bundle_response(self, bundle: SignalBundleModel) -> NormalizedSignalBundle:
        return NormalizedSignalBundle(
            bundle_id=bundle.bundle_id,
            customer_id=bundle.customer_id,
            persona_id=bundle.persona_id,
            date=bundle.date,
            generated_at=bundle.generated_at,
            signals=[
                NormalizedSignal(
                    signal_id=signal.signal_id,
                    category=signal.category,
                    label=signal.label,
                    source=signal.source,
                    as_of=signal.as_of,
                    customer_relevance=signal.customer_relevance,
                    persona_weight=signal.persona_weight,
                    confidence=signal.confidence,
                    narrative=signal.narrative,
                    time_horizon=signal.time_horizon,
                )
                for signal in bundle.signals
            ],
        )

    def build_bundle_response_with_run(
        self, run: CacheRunRecord, bundle: SignalBundleModel
    ) -> NormalizedSignalBundle:
        news_url_by_article_id = {
            record.article_id: record.url for record in run.raw_news_records
        }

        def resolve_signal_url(signal: NormalizedSignalModel) -> str | None:
            if signal.category != "news_event_signal":
                return None
            article_id = signal.signal_id.rsplit("::", 1)[-1]
            return news_url_by_article_id.get(article_id)

        return NormalizedSignalBundle(
            bundle_id=bundle.bundle_id,
            customer_id=bundle.customer_id,
            persona_id=bundle.persona_id,
            date=bundle.date,
            generated_at=bundle.generated_at,
            signals=[
                NormalizedSignal(
                    signal_id=signal.signal_id,
                    category=signal.category,
                    label=signal.label,
                    source=signal.source,
                    source_url=resolve_signal_url(signal),
                    as_of=signal.as_of,
                    customer_relevance=signal.customer_relevance,
                    persona_weight=signal.persona_weight,
                    confidence=signal.confidence,
                    narrative=signal.narrative,
                    time_horizon=signal.time_horizon,
                )
                for signal in bundle.signals
            ],
        )

    def build_correlation_bundle(self, run: CacheRunRecord) -> CorrelationBundle:
        return CorrelationBundle(
            bundle_id=f"correlations-{run.cache_date}",
            date=run.cache_date,
            generated_at=run.completed_at or run.started_at,
            correlations=[
                CorrelationRecord(
                    customer_id=record.customer_id,
                    label=record.label,
                    source_signal=record.source_signal,
                    target_signal=record.target_signal,
                    r_value=record.r_value,
                    direction=record.direction,
                    strength=record.strength,
                    lookback_days=record.lookback_days,
                    narrative=record.narrative,
                    source=record.source,
                    as_of=record.as_of,
                )
                for record in run.correlation_records
            ],
        )

    @staticmethod
    def _build_file_ref(dataset_name: str, cache_date: str, generated_at: str, record_count: int, source: str) -> CacheFileRef:
        return CacheFileRef(
            path=f"db/{dataset_name}/{cache_date}",
            record_count=record_count,
            generated_at=generated_at,
            source=source,
            date=cache_date,
        )
