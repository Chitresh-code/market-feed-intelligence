from __future__ import annotations

from sqlalchemy.orm import Session

from domain.client_context_models import CorrelationMapping
from repositories.correlation_mapping_repository import CorrelationMappingRepository


class CorrelationMappingService:
    def __init__(self, session: Session):
        self.repository = CorrelationMappingRepository(session)

    def list_mappings(self) -> list[CorrelationMapping]:
        return [self.repository.to_model(row) for row in self.repository.list_mappings()]

    def get_mapping(self, mapping_id: str) -> CorrelationMapping:
        row = self.repository.get_mapping(mapping_id)
        if row is None:
            raise ValueError(f"Unknown correlation mapping: {mapping_id}")
        return self.repository.to_model(row)

    def create_mapping(self, payload: CorrelationMapping) -> CorrelationMapping:
        row = self.repository.upsert_mapping(payload)
        return self.repository.to_model(row)

    def put_mapping(self, mapping_id: str, payload: CorrelationMapping) -> CorrelationMapping:
        normalized = payload.model_copy(update={"id": mapping_id})
        row = self.repository.upsert_mapping(normalized)
        return self.repository.to_model(row)

    def list_active_mappings(self) -> list[CorrelationMapping]:
        return [self.repository.to_model(row) for row in self.repository.list_active_mappings()]
