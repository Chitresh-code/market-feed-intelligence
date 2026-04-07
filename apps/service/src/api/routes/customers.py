from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.dependencies import get_db
from domain.client_context_models import CustomerProfile
from services.customer_service import CustomerService


router = APIRouter()


@router.get("/customers")
def list_customers(db: Session = Depends(get_db)) -> list[dict]:
    return [
        customer.model_dump(mode="json")
        for customer in CustomerService(db).list_customers()
    ]


@router.get("/customers/{customer_id}")
def get_customer(customer_id: str, db: Session = Depends(get_db)) -> dict:
    try:
        return CustomerService(db).get_customer(customer_id).model_dump(mode="json")
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/customers")
def create_customer(payload: CustomerProfile, db: Session = Depends(get_db)) -> dict:
    try:
        return CustomerService(db).create_customer(payload).model_dump(mode="json")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/customers/{customer_id}")
@router.patch("/customers/{customer_id}")
def upsert_customer(customer_id: str, payload: CustomerProfile, db: Session = Depends(get_db)) -> dict:
    try:
        return CustomerService(db).put_customer(customer_id, payload).model_dump(mode="json")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
