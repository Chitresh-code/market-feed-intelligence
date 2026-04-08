from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from api.dependencies import DbDep
from domain.client_context_models import PersonaConfig
from services.persona_service import PersonaService


router = APIRouter(tags=["Personas"])


@router.get("/personas", response_model=list[PersonaConfig])
def list_personas(db: DbDep) -> list[PersonaConfig]:
    return PersonaService(db).list_personas()


@router.get("/personas/{persona_id}", response_model=PersonaConfig)
def get_persona(persona_id: str, db: DbDep) -> PersonaConfig:
    try:
        return PersonaService(db).get_persona(persona_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.post("/personas", response_model=PersonaConfig, status_code=status.HTTP_201_CREATED)
def create_persona(payload: PersonaConfig, db: DbDep) -> PersonaConfig:
    try:
        return PersonaService(db).create_persona(payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.put("/personas/{persona_id}", response_model=PersonaConfig)
@router.patch("/personas/{persona_id}", response_model=PersonaConfig)
def upsert_persona(persona_id: str, payload: PersonaConfig, db: DbDep) -> PersonaConfig:
    try:
        return PersonaService(db).put_persona(persona_id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
