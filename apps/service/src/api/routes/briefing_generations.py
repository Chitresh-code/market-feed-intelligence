from __future__ import annotations

from fastapi import APIRouter, HTTPException

from api.dependencies import DbDep
from domain.models import BriefingGeneration
from services.briefing_generation_service import BriefingGenerationService


router = APIRouter(tags=["Briefing Generations"])


@router.get("/generations/{cache_date}/{customer_id}", response_model=BriefingGeneration)
def get_generation(cache_date: str, customer_id: str, db: DbDep) -> BriefingGeneration:
    try:
        return BriefingGenerationService(db).get_generation(customer_id, cache_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put("/generations/{cache_date}/{customer_id}", response_model=BriefingGeneration)
def put_generation(
    cache_date: str,
    customer_id: str,
    payload: BriefingGeneration,
    db: DbDep,
) -> BriefingGeneration:
    if payload.cache_date != cache_date or payload.customer_id != customer_id:
        raise HTTPException(status_code=400, detail="Path parameters must match payload.")
    return BriefingGenerationService(db).upsert_generation(payload)
