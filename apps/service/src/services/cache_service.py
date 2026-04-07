from __future__ import annotations

from sqlalchemy.orm import Session

from services.cache_query_service import CacheQueryService
from services.refresh_orchestrator import RefreshOrchestrator


class CacheService:
    """Compatibility facade for callers that still expect a single service object."""

    def __init__(self, session: Session):
        self.query_service = CacheQueryService(session)
        self.refresh_orchestrator = RefreshOrchestrator(session)

    def list_cache_dates(self) -> list[str]:
        return self.query_service.list_cache_dates()

    def latest_cache_date(self) -> str:
        return self.query_service.latest_cache_date()

    def get_manifest(self, cache_date: str):
        return self.query_service.get_manifest(cache_date)

    def get_bundle(self, cache_date: str, customer_id: str):
        return self.query_service.get_bundle(cache_date, customer_id)

    def get_correlations(self, cache_date: str):
        return self.query_service.get_correlations(cache_date)

    def refresh_cache(self, cache_date: str, lookback_days: int = 5) -> dict:
        return self.refresh_orchestrator.refresh_cache(cache_date, lookback_days)
