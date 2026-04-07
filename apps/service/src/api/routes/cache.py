from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.dependencies import get_db
from services.cache_query_service import CacheQueryService


router = APIRouter()


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/cache/dates")
def list_cache_dates(db: Session = Depends(get_db)) -> dict[str, list[str]]:
    service = CacheQueryService(db)
    return {"dates": service.list_cache_dates()}


@router.get("/cache/latest")
def latest_cache_date(db: Session = Depends(get_db)) -> dict[str, str]:
    service = CacheQueryService(db)
    try:
        return {"date": service.latest_cache_date()}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/manifests/{cache_date}")
def get_manifest(cache_date: str, db: Session = Depends(get_db)) -> dict:
    service = CacheQueryService(db)
    try:
        return service.get_manifest(cache_date).model_dump(mode="json")
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/bundles/{cache_date}/{customer_id}")
def get_bundle(cache_date: str, customer_id: str, db: Session = Depends(get_db)) -> dict:
    service = CacheQueryService(db)
    try:
        return service.get_bundle(cache_date, customer_id).model_dump(mode="json")
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/correlations/{cache_date}")
def get_correlations(cache_date: str, db: Session = Depends(get_db)) -> dict:
    service = CacheQueryService(db)
    try:
        bundle = service.get_correlations(cache_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"correlations": bundle.model_dump(mode="json")["correlations"]}
