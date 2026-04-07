from __future__ import annotations

from sqlalchemy.orm import Session

from domain.client_context_models import PersonaConfig
from repositories.persona_repository import PersonaRepository


class PersonaService:
    def __init__(self, session: Session):
        self.repository = PersonaRepository(session)

    def list_personas(self) -> list[PersonaConfig]:
        return [self.repository.to_model(row) for row in self.repository.list_personas()]

    def get_persona(self, persona_id: str) -> PersonaConfig:
        row = self.repository.get_persona(persona_id)
        if row is None:
            raise ValueError(f"Unknown persona: {persona_id}")
        return self.repository.to_model(row)

    def put_persona(self, persona_id: str, payload: PersonaConfig) -> PersonaConfig:
        normalized = payload.model_copy(update={"id": persona_id})
        row = self.repository.upsert_persona(normalized)
        return self.repository.to_model(row)

    def create_persona(self, payload: PersonaConfig) -> PersonaConfig:
        row = self.repository.upsert_persona(payload)
        return self.repository.to_model(row)
