from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    repo_root: Path
    data_root: Path
    raw_cache_root: Path
    normalized_cache_root: Path
    correlation_cache_root: Path
    manifest_cache_root: Path
    fred_api_key: str
    finnhub_api_key: str


def load_settings() -> Settings:
    repo_root = Path(__file__).resolve().parents[3]
    data_root = repo_root / "data"
    raw_cache_root = data_root / "cache" / "raw"
    normalized_cache_root = data_root / "cache" / "normalized"
    correlation_cache_root = data_root / "cache" / "correlations"
    manifest_cache_root = data_root / "cache" / "manifests"

    return Settings(
        repo_root=repo_root,
        data_root=data_root,
        raw_cache_root=raw_cache_root,
        normalized_cache_root=normalized_cache_root,
        correlation_cache_root=correlation_cache_root,
        manifest_cache_root=manifest_cache_root,
        fred_api_key=os.environ.get("FRED_API_KEY", ""),
        finnhub_api_key=os.environ.get("FINNHUB_API_KEY", ""),
    )
