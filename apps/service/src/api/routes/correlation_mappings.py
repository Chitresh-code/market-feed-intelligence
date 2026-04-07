from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.dependencies import get_db
from domain.client_context_models import CorrelationMapping
from services.correlation_mapping_service import CorrelationMappingService


router = APIRouter()


@router.get("/correlation-mappings")
def list_correlation_mappings(db: Session = Depends(get_db)) -> list[dict]:
    service = CorrelationMappingService(db)
    return [mapping.model_dump(mode="json") for mapping in service.list_mappings()]


@router.post("/correlation-mappings")
def create_correlation_mapping(payload: CorrelationMapping, db: Session = Depends(get_db)) -> dict:
    try:
        return CorrelationMappingService(db).create_mapping(payload).model_dump(mode="json")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/correlation-mappings/{mapping_id}")
@router.patch("/correlation-mappings/{mapping_id}")
def upsert_correlation_mapping(
    mapping_id: str,
    payload: CorrelationMapping,
    db: Session = Depends(get_db),
) -> dict:
    try:
        return CorrelationMappingService(db).put_mapping(mapping_id, payload).model_dump(mode="json")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
