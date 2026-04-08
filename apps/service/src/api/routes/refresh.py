from __future__ import annotations

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from api.dependencies import DbDep
from domain.models import CacheManifest
from services.refresh_orchestrator import RefreshOrchestrator


router = APIRouter(tags=["Refresh"])


class RefreshRequest(BaseModel):
    date: str
    lookback_days: int = 5


class RefreshResponse(BaseModel):
    status: str
    date: str
    startedAt: str | None
    finishedAt: str | None
    output: list[str]
    manifest: CacheManifest


@router.post("/refresh", response_model=RefreshResponse)
def refresh_cache(payload: RefreshRequest, db: DbDep) -> RefreshResponse:
    try:
        result = RefreshOrchestrator(db).refresh_cache(payload.date, payload.lookback_days)
        return RefreshResponse(**result)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc)
        ) from exc
