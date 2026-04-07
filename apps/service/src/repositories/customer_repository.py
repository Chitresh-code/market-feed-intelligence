from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.orm import Session, selectinload

from db.models import CustomerAllocationModel, CustomerModel
from domain.client_context_models import CustomerProfile


class CustomerRepository:
    def __init__(self, session: Session):
        self.session = session

    def list_customers(self) -> list[CustomerModel]:
        statement = (
            select(CustomerModel)
            .options(selectinload(CustomerModel.allocations))
            .order_by(CustomerModel.id)
        )
        return list(self.session.scalars(statement).all())

    def get_customer(self, customer_id: str) -> CustomerModel | None:
        statement = (
            select(CustomerModel)
            .where(CustomerModel.id == customer_id)
            .options(selectinload(CustomerModel.allocations))
        )
        return self.session.scalar(statement)

    def upsert_customer(self, payload: CustomerProfile) -> CustomerModel:
        row = self.get_customer(payload.id)
        if row is None:
            row = CustomerModel(id=payload.id)
            self.session.add(row)

        row.name = payload.name
        row.persona_id = payload.persona
        row.mandate = payload.mandate
        row.client_profile = payload.client_profile
        row.risk_rating = payload.risk_rating
        row.relationship_since = payload.relationship_since
        row.last_meeting = payload.last_meeting
        row.next_meeting = payload.next_meeting
        row.meeting_context = payload.meeting_context
        row.primary_objective = payload.primary_objective
        row.communication_style = payload.communication_style
        row.decision_lens = payload.decision_lens
        row.key_concerns = payload.key_concerns
        row.watchlist = payload.watchlist
        row.rm_notes = payload.rm_notes
        self.session.flush()

        self.session.execute(
            delete(CustomerAllocationModel).where(CustomerAllocationModel.customer_id == row.id)
        )
        self.session.add_all(
            [
                CustomerAllocationModel(
                    customer_id=row.id,
                    position=index,
                    sector=allocation.sector,
                    ticker=allocation.ticker,
                    weight=allocation.weight,
                    key_holdings=allocation.key_holdings,
                )
                for index, allocation in enumerate(payload.allocations)
            ]
        )
        self.session.flush()
        self.session.expire(row, ["allocations"])
        return self.get_customer(payload.id)  # type: ignore[return-value]

    @staticmethod
    def to_model(row: CustomerModel) -> CustomerProfile:
        allocations = sorted(row.allocations, key=lambda allocation: allocation.position)
        return CustomerProfile(
            id=row.id,
            name=row.name,
            persona=row.persona_id,
            mandate=row.mandate,
            client_profile=row.client_profile,
            risk_rating=row.risk_rating,
            relationship_since=row.relationship_since,
            last_meeting=row.last_meeting,
            next_meeting=row.next_meeting,
            meeting_context=row.meeting_context,
            primary_objective=row.primary_objective,
            communication_style=row.communication_style,
            decision_lens=row.decision_lens,
            key_concerns=row.key_concerns,
            watchlist=row.watchlist,
            rm_notes=row.rm_notes,
            allocations=[
                {
                    "sector": allocation.sector,
                    "ticker": allocation.ticker,
                    "weight": allocation.weight,
                    "key_holdings": allocation.key_holdings,
                }
                for allocation in allocations
            ],
        )
