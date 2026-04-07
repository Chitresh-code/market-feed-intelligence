from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from config import load_settings
from db.base import Base


def get_database_url() -> str:
    value = load_settings().database_url.strip()
    if not value:
        raise RuntimeError("DATABASE_URL is not configured.")
    return value


def create_db_engine():
    return create_engine(get_database_url(), future=True, pool_pre_ping=True)


ENGINE = create_db_engine()
SessionLocal = sessionmaker(bind=ENGINE, autoflush=False, autocommit=False, future=True)


def init_db() -> None:
    Base.metadata.create_all(bind=ENGINE)


@contextmanager
def session_scope() -> Iterator[Session]:
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
