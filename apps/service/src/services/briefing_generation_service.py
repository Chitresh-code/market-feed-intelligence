from __future__ import annotations

from sqlalchemy.orm import Session

from domain.models import BriefingGeneration
from repositories.briefing_generation_repository import BriefingGenerationRepository


class BriefingGenerationService:
    def __init__(self, session: Session):
        self.repository = BriefingGenerationRepository(session)

    def get_generation(self, customer_id: str, cache_date: str) -> BriefingGeneration:
        row = self.repository.get_generation(customer_id, cache_date)
        if row is None:
            raise ValueError(
                f"No persisted briefing generation found for {customer_id} on {cache_date}."
            )
        return self.repository.to_model(row)

    def upsert_generation(self, payload: BriefingGeneration) -> BriefingGeneration:
        row = self.repository.upsert_generation(payload)
        return self.repository.to_model(row)
