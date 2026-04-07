from __future__ import annotations

from sqlalchemy.orm import Session

from domain.models import CacheManifest, CorrelationBundle, NormalizedSignalBundle
from repositories.cache_repository import CacheRepository


class CacheQueryService:
    def __init__(self, session: Session):
        self.repository = CacheRepository(session)

    def list_cache_dates(self) -> list[str]:
        return self.repository.fetch_all_successful_dates()

    def latest_cache_date(self) -> str:
        latest = self.repository.fetch_latest_successful_date()
        if not latest:
            raise ValueError("No successful cache runs are available.")
        return latest

    def get_manifest(self, cache_date: str) -> CacheManifest:
        run = self.repository.fetch_successful_run_for_date(cache_date)
        if not run:
            raise ValueError(f"No successful cache run found for {cache_date}.")
        return self.repository.build_manifest_from_run(run)

    def get_bundle(self, cache_date: str, customer_id: str) -> NormalizedSignalBundle:
        result = self.repository.fetch_bundle_with_run_for_date(cache_date, customer_id)
        if not result:
            raise ValueError(f"No normalized signal bundle found for {customer_id} on {cache_date}.")
        run, bundle = result
        return self.repository.build_bundle_response_with_run(run, bundle)

    def get_correlations(self, cache_date: str) -> CorrelationBundle:
        run = self.repository.fetch_successful_run_for_date(cache_date)
        if not run:
            raise ValueError(f"No successful cache run found for {cache_date}.")
        return self.repository.build_correlation_bundle(run)
