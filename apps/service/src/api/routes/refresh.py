from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api.dependencies import get_db
from services.refresh_orchestrator import RefreshOrchestrator


router = APIRouter()


class RefreshRequest(BaseModel):
    date: str
    lookback_days: int = 5


@router.post("/refresh")
def refresh_cache(payload: RefreshRequest, db: Session = Depends(get_db)) -> dict:
    service = RefreshOrchestrator(db)
    try:
        return service.refresh_cache(payload.date, payload.lookback_days)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
