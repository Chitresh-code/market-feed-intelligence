from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from api.dependencies import DbDep
from domain.client_context_models import CustomerProfile
from services.customer_service import CustomerService


router = APIRouter(tags=["Customers"])


@router.get("/customers", response_model=list[CustomerProfile])
def list_customers(db: DbDep) -> list[CustomerProfile]:
    return CustomerService(db).list_customers()


@router.get("/customers/{customer_id}", response_model=CustomerProfile)
def get_customer(customer_id: str, db: DbDep) -> CustomerProfile:
    try:
        return CustomerService(db).get_customer(customer_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/customers", response_model=CustomerProfile, status_code=status.HTTP_201_CREATED)
def create_customer(payload: CustomerProfile, db: DbDep) -> CustomerProfile:
    try:
        return CustomerService(db).create_customer(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.put("/customers/{customer_id}", response_model=CustomerProfile)
@router.patch("/customers/{customer_id}", response_model=CustomerProfile)
def upsert_customer(customer_id: str, payload: CustomerProfile, db: DbDep) -> CustomerProfile:
    try:
        return CustomerService(db).put_customer(customer_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
