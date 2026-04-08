from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from api.dependencies import DbDep
from domain.models import (
    CacheManifest,
    CorrelationRecord,
    NormalizedSignalBundle,
    RawMacroRecord,
    RawMarketRecord,
    RawNewsRecord,
)
from services.cache_query_service import CacheQueryService


router = APIRouter(tags=["Cache"])


class CacheDatesResponse(BaseModel):
    dates: list[str]


class LatestDateResponse(BaseModel):
    date: str


class CorrelationsResponse(BaseModel):
    correlations: list[CorrelationRecord]


class RawMarketResponse(BaseModel):
    records: list[RawMarketRecord]


class RawMacroResponse(BaseModel):
    records: list[RawMacroRecord]


class RawNewsResponse(BaseModel):
    records: list[RawNewsRecord]


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


@router.get("/raw/market/{cache_date}", response_model=RawMarketResponse)
def get_raw_market(cache_date: str, db: DbDep) -> RawMarketResponse:
    try:
        records = CacheQueryService(db).get_raw_market(cache_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return RawMarketResponse(records=records)


@router.get("/raw/macro/{cache_date}", response_model=RawMacroResponse)
def get_raw_macro(cache_date: str, db: DbDep) -> RawMacroResponse:
    try:
        records = CacheQueryService(db).get_raw_macro(cache_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return RawMacroResponse(records=records)


@router.get("/raw/news/{cache_date}", response_model=RawNewsResponse)
def get_raw_news(cache_date: str, db: DbDep) -> RawNewsResponse:
    try:
        records = CacheQueryService(db).get_raw_news(cache_date)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return RawNewsResponse(records=records)
