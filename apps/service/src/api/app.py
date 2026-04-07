from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI

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
    version="0.1.0",
    lifespan=lifespan,
)


app.include_router(cache_router)
app.include_router(persona_router)
app.include_router(customer_router)
app.include_router(correlation_mapping_router)
app.include_router(refresh_router)
