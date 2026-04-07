from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.orm import Session

from db.models import CorrelationMappingModel
from domain.client_context_models import CorrelationMapping


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class CorrelationMappingRepository:
    def __init__(self, session: Session):
        self.session = session

    def list_mappings(self) -> list[CorrelationMappingModel]:
        statement = select(CorrelationMappingModel).order_by(
            CorrelationMappingModel.scope_type,
            CorrelationMappingModel.scope_value,
            CorrelationMappingModel.lookback_days,
        )
        return list(self.session.scalars(statement).all())

    def get_mapping(self, mapping_id: str) -> CorrelationMappingModel | None:
        return self.session.get(CorrelationMappingModel, mapping_id)

    def list_active_mappings(self) -> list[CorrelationMappingModel]:
        statement = (
            select(CorrelationMappingModel)
            .where(CorrelationMappingModel.active.is_(True))
            .order_by(CorrelationMappingModel.scope_type, CorrelationMappingModel.scope_value)
        )
        return list(self.session.scalars(statement).all())

    def upsert_mapping(self, payload: CorrelationMapping) -> CorrelationMappingModel:
        mapping_id = payload.id or uuid4().hex
        row = self.get_mapping(mapping_id)
        created_at = utc_now()
        if row is None:
            row = CorrelationMappingModel(id=mapping_id, created_at=created_at)
            self.session.add(row)

        row.label = payload.label
        row.source_signal = payload.source_signal
        row.target_signal = payload.target_signal
        row.r_value = payload.r_value
        row.direction = payload.direction
        row.strength = payload.strength
        row.lookback_days = payload.lookback_days
        row.narrative = payload.narrative
        row.scope_type = payload.scope_type
        row.scope_value = payload.scope_value
        row.active = payload.active
        row.updated_at = utc_now()
        self.session.flush()
        return row

    @staticmethod
    def to_model(row: CorrelationMappingModel) -> CorrelationMapping:
        return CorrelationMapping(
            id=row.id,
            label=row.label,
            source_signal=row.source_signal,
            target_signal=row.target_signal,
            r_value=row.r_value,
            direction=row.direction,
            strength=row.strength,
            lookback_days=row.lookback_days,
            narrative=row.narrative,
            scope_type=row.scope_type,
            scope_value=row.scope_value,
            active=row.active,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )
