from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api.dependencies import get_db
from domain.client_context_models import PersonaConfig
from services.persona_service import PersonaService


router = APIRouter()


@router.get("/personas")
def list_personas(db: Session = Depends(get_db)) -> list[dict]:
    return [persona.model_dump(mode="json") for persona in PersonaService(db).list_personas()]


@router.get("/personas/{persona_id}")
def get_persona(persona_id: str, db: Session = Depends(get_db)) -> dict:
    try:
        return PersonaService(db).get_persona(persona_id).model_dump(mode="json")
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/personas")
def create_persona(payload: PersonaConfig, db: Session = Depends(get_db)) -> dict:
    try:
        return PersonaService(db).create_persona(payload).model_dump(mode="json")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.put("/personas/{persona_id}")
@router.patch("/personas/{persona_id}")
def upsert_persona(persona_id: str, payload: PersonaConfig, db: Session = Depends(get_db)) -> dict:
    try:
        return PersonaService(db).put_persona(persona_id, payload).model_dump(mode="json")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
