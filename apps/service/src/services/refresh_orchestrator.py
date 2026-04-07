from __future__ import annotations

from sqlalchemy.orm import Session

from adapters.base import FetchWindow
from config import load_settings
from domain.models import CacheManifest, FreshnessMetadata, NormalizedSignalBundle
from jobs.ingest import (
    fetch_macro_dataset,
    fetch_market_dataset,
    fetch_news_dataset,
)
from jobs.normalize import (
    compute_freshness,
    normalize_customer_bundle,
    requested_date,
)
from repositories.cache_repository import CacheRepository
from repositories.correlation_mapping_repository import CorrelationMappingRepository
from repositories.customer_repository import CustomerRepository
from repositories.persona_repository import PersonaRepository
from services.correlation_resolver import build_correlation_records


class RefreshOrchestrator:
    def __init__(self, session: Session):
        self.session = session
        self.repository = CacheRepository(session)
        self.customer_repository = CustomerRepository(session)
        self.persona_repository = PersonaRepository(session)
        self.correlation_mapping_repository = CorrelationMappingRepository(session)
        self.settings = load_settings()

    def refresh_cache(self, cache_date: str, lookback_days: int = 5) -> dict:
        run = self.repository.create_cache_run(
            cache_date=cache_date,
            mode="cached_external_live_llm",
        )
        notes: list[str] = []

        try:
            window = FetchWindow(date=cache_date, lookback_days=lookback_days)
            market_envelope = fetch_market_dataset(window)
            macro_envelope = fetch_macro_dataset(window, self.settings.fred_api_key)
            news_envelope = fetch_news_dataset(window, self.settings.finnhub_api_key)

            market_records = list(market_envelope.records)
            macro_records = list(macro_envelope.records)
            news_records = list(news_envelope.records)

            self.repository.replace_raw_market_records(run.id, market_records)
            self.repository.replace_raw_macro_records(run.id, macro_records)
            self.repository.replace_raw_news_records(run.id, news_records)

            generated_at = max(
                market_envelope.generated_at,
                macro_envelope.generated_at,
                news_envelope.generated_at,
            )
            customers = [
                self.customer_repository.to_model(row).model_dump(mode="json")
                for row in self.customer_repository.list_customers()
            ]
            if not customers:
                raise ValueError("No customers are configured in the service database.")

            mappings = [
                self.correlation_mapping_repository.to_model(row).model_dump(mode="json")
                for row in self.correlation_mapping_repository.list_active_mappings()
            ]
            correlation_records = [
                record.model_dump(mode="json")
                for record in build_correlation_records(cache_date, generated_at, customers, mappings)
            ]
            self.repository.replace_correlation_records(run.id, correlation_records)

            bundles: list[NormalizedSignalBundle] = []
            for customer in customers:
                persona_row = self.persona_repository.get_persona(customer["persona"])
                if persona_row is None:
                    raise ValueError(f"Persona {customer['persona']} is not configured in the service database.")
                persona = self.persona_repository.to_model(persona_row).model_dump(mode="json")
                bundle = normalize_customer_bundle(
                    customer=customer,
                    persona=persona,
                    cache_date=cache_date,
                    generated_at=generated_at,
                    market_records=market_records,
                    macro_records=macro_records,
                    news_records=news_records,
                    correlation_records=correlation_records,
                )
                bundles.append(bundle)
                self.repository.replace_signal_bundle(run.id, bundle)

            requested = requested_date(cache_date)
            freshness = {
                "raw_market": compute_freshness(
                    "raw_market",
                    market_records,
                    requested,
                    market_envelope.generated_at,
                ),
                "raw_macro": compute_freshness(
                    "raw_macro",
                    macro_records,
                    requested,
                    macro_envelope.generated_at,
                ),
                "raw_news": compute_freshness(
                    "raw_news",
                    news_records,
                    requested,
                    news_envelope.generated_at,
                ),
                "correlations": FreshnessMetadata(
                    status="fresh",
                    as_of=generated_at,
                    generated_at=generated_at,
                    notes=[
                        "Precomputed correlations generated for supported client-sector mappings."
                    ],
                ),
                "normalized_signals": FreshnessMetadata(
                    status="fresh",
                    as_of=generated_at,
                    generated_at=generated_at,
                    notes=[],
                ),
            }
            self.repository.replace_manifest_freshness(run.id, freshness)
            self.repository.set_run_status(run, "success", notes)

            manifest = self.repository.build_manifest_from_run(run)
            return self._build_refresh_response(cache_date, run.started_at, run.completed_at, manifest)
        except Exception as exc:
            notes.append(str(exc))
            self.repository.set_run_status(run, "failed", notes)
            self.session.commit()
            raise

    @staticmethod
    def _build_refresh_response(
        cache_date: str,
        started_at: str,
        completed_at: str | None,
        manifest: CacheManifest,
    ) -> dict:
        return {
            "status": "success",
            "date": cache_date,
            "startedAt": started_at,
            "finishedAt": completed_at,
            "output": [f"Cache refresh complete for {cache_date}"],
            "manifest": manifest.model_dump(mode="json"),
        }
