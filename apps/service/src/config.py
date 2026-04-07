from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    repo_root: Path
    data_root: Path
    database_url: str
    fred_api_key: str
    finnhub_api_key: str


def load_settings() -> Settings:
    repo_root = Path(__file__).resolve().parents[3]
    data_root = repo_root / "data"

    return Settings(
        repo_root=repo_root,
        data_root=data_root,
        database_url=os.environ.get(
            "DATABASE_URL",
            "postgresql+psycopg://postgres:postgres@127.0.0.1:5432/macquire_poc",
        ),
        fred_api_key=os.environ.get("FRED_API_KEY", ""),
        finnhub_api_key=os.environ.get("FINNHUB_API_KEY", ""),
    )
