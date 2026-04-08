from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.dependencies import DbDep
from domain.models import CacheManifest, CorrelationRecord, NormalizedSignalBundle
from services.cache_query_service import CacheQueryService


router = APIRouter(tags=["Cache"])


class CacheDatesResponse(BaseModel):
    dates: list[str]


class LatestDateResponse(BaseModel):
    date: str


class CorrelationsResponse(BaseModel):
    correlations: list[CorrelationRecord]


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/cache/dates", response_model=CacheDatesResponse)
def list_cache_dates(db: DbDep) -> CacheDatesResponse:
    return CacheDatesResponse(dates=CacheQueryService(db).list_cache_dates())


@router.get("/cache/latest", response_model=LatestDateResponse)
def latest_cache_date(db: DbDep) -> LatestDateResponse:
    try:
        return LatestDateResponse(date=CacheQueryService(db).latest_cache_date())
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/manifests/{cache_date}", response_model=CacheManifest)
def get_manifest(cache_date: str, db: DbDep) -> CacheManifest:
    try:
        return CacheQueryService(db).get_manifest(cache_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/bundles/{cache_date}/{customer_id}", response_model=NormalizedSignalBundle)
def get_bundle(cache_date: str, customer_id: str, db: DbDep) -> NormalizedSignalBundle:
    try:
        return CacheQueryService(db).get_bundle(cache_date, customer_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/correlations/{cache_date}", response_model=CorrelationsResponse)
def get_correlations(cache_date: str, db: DbDep) -> CorrelationsResponse:
    try:
        bundle = CacheQueryService(db).get_correlations(cache_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return CorrelationsResponse(correlations=bundle.correlations)
