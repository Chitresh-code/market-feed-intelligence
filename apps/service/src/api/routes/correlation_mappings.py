from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from api.dependencies import DbDep
from domain.client_context_models import CorrelationMapping
from services.correlation_mapping_service import CorrelationMappingService


router = APIRouter(tags=["Correlation Mappings"])


@router.get("/correlation-mappings", response_model=list[CorrelationMapping])
def list_correlation_mappings(db: DbDep) -> list[CorrelationMapping]:
    return CorrelationMappingService(db).list_mappings()


@router.post(
    "/correlation-mappings",
    response_model=CorrelationMapping,
    status_code=status.HTTP_201_CREATED,
)
def create_correlation_mapping(payload: CorrelationMapping, db: DbDep) -> CorrelationMapping:
    try:
        return CorrelationMappingService(db).create_mapping(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.put("/correlation-mappings/{mapping_id}", response_model=CorrelationMapping)
@router.patch("/correlation-mappings/{mapping_id}", response_model=CorrelationMapping)
def upsert_correlation_mapping(
    mapping_id: str,
    payload: CorrelationMapping,
    db: DbDep,
) -> CorrelationMapping:
    try:
        return CorrelationMappingService(db).put_mapping(mapping_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
