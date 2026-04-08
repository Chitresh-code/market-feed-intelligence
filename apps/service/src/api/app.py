from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes.cache import router as cache_router
from api.routes.correlation_mappings import router as correlation_mapping_router
from api.routes.customers import router as customer_router
from api.routes.personas import router as persona_router
from api.routes.refresh import router as refresh_router
from db.session import init_db


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Sales Intelligence Data Service",
    description="Data service for the Macquire Sales Intelligence PoC. Provides market signals, customer context, and LLM-ready evidence bundles.",
    version="0.1.0",
    lifespan=lifespan,
)

_cors_origins = os.environ.get("CORS_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in _cors_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(cache_router)
app.include_router(persona_router)
app.include_router(customer_router)
app.include_router(correlation_mapping_router)
app.include_router(refresh_router)
