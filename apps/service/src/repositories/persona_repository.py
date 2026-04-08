from __future__ import annotations

import re

from sqlalchemy import select
from sqlalchemy.orm import Session

from db.models import PersonaModel
from domain.client_context_models import PersonaConfig


class PersonaRepository:
    def __init__(self, session: Session):
        self.session = session

    def list_personas(self) -> list[PersonaModel]:
        return list(self.session.scalars(select(PersonaModel).order_by(PersonaModel.id)).all())

    def get_persona(self, persona_id: str) -> PersonaModel | None:
        return self.session.get(PersonaModel, persona_id)

    def next_persona_id(self, label: str) -> str:
        base = re.sub(r"[^a-z0-9]+", "_", label.strip().lower()).strip("_") or "persona"
        existing_ids = set(self.session.scalars(select(PersonaModel.id)).all())
        if base not in existing_ids:
            return base

        suffix = 2
        while f"{base}_{suffix}" in existing_ids:
            suffix += 1
        return f"{base}_{suffix}"

    def upsert_persona(self, payload: PersonaConfig) -> PersonaModel:
        row = self.session.get(PersonaModel, payload.id)
        if row is None:
            row = PersonaModel(id=payload.id)
            self.session.add(row)

        row.label = payload.label
        row.section_order = payload.section_order
        row.category_weights = payload.category_weights
        row.tone_rules = payload.tone_rules
        row.preferred_narrative_style = payload.preferred_narrative_style
        row.prohibited_claim_patterns = payload.prohibited_claim_patterns
        row.fallback_rules = payload.fallback_rules
        self.session.flush()
        return row

    @staticmethod
    def to_model(row: PersonaModel) -> PersonaConfig:
        return PersonaConfig(
            id=row.id,
            label=row.label,
            section_order=row.section_order,
            category_weights=row.category_weights,
            tone_rules=row.tone_rules,
            preferred_narrative_style=row.preferred_narrative_style,
            prohibited_claim_patterns=row.prohibited_claim_patterns,
            fallback_rules=row.fallback_rules,
        )
