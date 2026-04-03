from __future__ import annotations

from dataclasses import dataclass


class AdapterError(RuntimeError):
    """Raised when an external provider request fails or returns invalid data."""


@dataclass(frozen=True)
class FetchWindow:
    date: str
    lookback_days: int = 5

