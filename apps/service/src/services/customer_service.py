from __future__ import annotations

from sqlalchemy.orm import Session

from domain.client_context_models import CustomerProfile
from repositories.customer_repository import CustomerRepository
from repositories.persona_repository import PersonaRepository


class CustomerService:
    def __init__(self, session: Session):
        self.repository = CustomerRepository(session)
        self.persona_repository = PersonaRepository(session)

    def list_customers(self) -> list[CustomerProfile]:
        return [self.repository.to_model(row) for row in self.repository.list_customers()]

    def get_customer(self, customer_id: str) -> CustomerProfile:
        row = self.repository.get_customer(customer_id)
        if row is None:
            raise ValueError(f"Unknown customer: {customer_id}")
        return self.repository.to_model(row)

    def put_customer(self, customer_id: str, payload: CustomerProfile) -> CustomerProfile:
        normalized = payload.model_copy(update={"id": customer_id})
        self._validate_persona(normalized.persona)
        row = self.repository.upsert_customer(normalized)
        return self.repository.to_model(row)

    def create_customer(self, payload: CustomerProfile) -> CustomerProfile:
        self._validate_persona(payload.persona)
        row = self.repository.upsert_customer(payload)
        return self.repository.to_model(row)

    def _validate_persona(self, persona_id: str) -> None:
        if self.persona_repository.get_persona(persona_id) is None:
            raise ValueError(f"Unknown persona: {persona_id}")
