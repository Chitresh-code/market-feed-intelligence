from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from db.models import BriefingGenerationModel
from domain.models import BriefingGeneration


class BriefingGenerationRepository:
    def __init__(self, session: Session):
        self.session = session

    def get_generation(self, customer_id: str, cache_date: str) -> BriefingGenerationModel | None:
        return self.session.scalar(
            select(BriefingGenerationModel)
            .where(
                BriefingGenerationModel.customer_id == customer_id,
                BriefingGenerationModel.cache_date == cache_date,
            )
            .order_by(BriefingGenerationModel.generated_at.desc())
            .limit(1)
        )

    def upsert_generation(self, payload: BriefingGeneration) -> BriefingGenerationModel:
        row = self.get_generation(payload.customer_id, payload.cache_date)
        if row is None:
            row = BriefingGenerationModel(
                customer_id=payload.customer_id,
                cache_date=payload.cache_date,
                generated_at=payload.generated_at,
                run_state=payload.run,
                sections=payload.sections,
            )
            self.session.add(row)
        else:
            row.generated_at = payload.generated_at
            row.run_state = payload.run
            row.sections = payload.sections
            self.session.add(row)
        self.session.flush()
        return row

    @staticmethod
    def to_model(row: BriefingGenerationModel) -> BriefingGeneration:
        return BriefingGeneration(
            customer_id=row.customer_id,
            cache_date=row.cache_date,
            generated_at=row.generated_at,
            run=row.run_state,
            sections=row.sections,
        )
