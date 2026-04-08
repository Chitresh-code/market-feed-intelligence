from __future__ import annotations

from dataclasses import dataclass
import time

import pandas as pd
import yfinance as yf

from adapters.base import AdapterError, FetchWindow
from domain.models import RawDatasetEnvelope, RawMarketRecord


@dataclass(frozen=True)
class MarketTickerSpec:
    ticker: str
    label: str
    category: str
    currency: str


def _extract_series(frame: pd.DataFrame, column: str) -> pd.Series:
    if column not in frame.columns:
        raise AdapterError(f"yfinance response did not include column {column}")

    values = frame[column]
    if isinstance(values, pd.DataFrame):
        if values.empty:
            return pd.Series(dtype=float)
        values = values.iloc[:, 0]

    return values.dropna()


def _coerce_number(frame: pd.DataFrame, row_index: int, column: str) -> float | None:
    try:
        values = _extract_series(frame, column)
    except AdapterError:
        return None

    if values.empty:
        return None

    value = values.iloc[row_index]
    if pd.isna(value):
        return None
    return float(value)


class YFinanceMarketAdapter:
    source = "yfinance"

    def _download_history(
        self,
        spec: MarketTickerSpec,
        window: FetchWindow,
    ) -> pd.DataFrame | None:
        attempts = 3

        for attempt in range(1, attempts + 1):
            try:
                history = yf.download(
                    spec.ticker,
                    period=f"{max(window.lookback_days, 5) + 5}d",
                    interval="1d",
                    auto_adjust=False,
                    progress=False,
                    threads=False,
                    timeout=30,
                )
            except Exception as exc:
                if attempt == attempts:
                    raise AdapterError(
                        f"yfinance request failed for {spec.ticker}: {exc}"
                    ) from exc
                time.sleep(1.5 * attempt)
                continue

            if history is None:
                if attempt == attempts:
                    raise AdapterError(
                        f"yfinance returned no response for {spec.ticker}"
                    )
                time.sleep(1.5 * attempt)
                continue

            return history

        return None

    def fetch(
        self,
        specs: list[MarketTickerSpec],
        window: FetchWindow,
    ) -> RawDatasetEnvelope:
        records: list[RawMarketRecord] = []
        notes: list[str] = []

        for spec in specs:
            try:
                history = self._download_history(spec, window)
            except AdapterError as exc:
                notes.append(f"Skipped ticker {spec.ticker}: {exc}")
                continue

            if history is None:
                notes.append(f"Skipped ticker {spec.ticker}: yfinance returned no response")
                continue
            if history.empty:
                notes.append(f"Skipped ticker {spec.ticker}: yfinance returned no rows")
                continue

            history = history.dropna(how="all")
            try:
                closes = _extract_series(history, "Close")
            except AdapterError:
                notes.append(f"Skipped ticker {spec.ticker}: yfinance returned no close column")
                continue
            if closes.empty:
                notes.append(f"Skipped ticker {spec.ticker}: yfinance returned no close prices")
                continue

            latest_close = float(closes.iloc[-1])
            previous_close = float(closes.iloc[-2]) if len(closes) > 1 else None
            prior_five_close = float(closes.iloc[-6]) if len(closes) > 5 else None

            delta_1d_pct = (
                ((latest_close - previous_close) / previous_close) * 100
                if previous_close and previous_close != 0
                else None
            )
            delta_5d_pct = (
                ((latest_close - prior_five_close) / prior_five_close) * 100
                if prior_five_close and prior_five_close != 0
                else None
            )

            records.append(
                RawMarketRecord(
                    ticker=spec.ticker,
                    label=spec.label,
                    category=spec.category,  # type: ignore[arg-type]
                    currency=spec.currency,
                    open=_coerce_number(history, -1, "Open"),
                    high=_coerce_number(history, -1, "High"),
                    low=_coerce_number(history, -1, "Low"),
                    close=latest_close,
                    volume=_coerce_number(history, -1, "Volume"),
                    delta_1d_pct=delta_1d_pct,
                    delta_5d_pct=delta_5d_pct,
                    source="yfinance",
                    as_of=history.index[-1].isoformat(),
                )
            )

        if not records:
            detail = "; ".join(notes) if notes else "No market records were returned"
            raise AdapterError(detail)

        return RawDatasetEnvelope(
            dataset="market",
            date=window.date,
            generated_at=pd.Timestamp.utcnow().isoformat(),
            source=self.source,
            notes=notes,
            records=[record.model_dump(mode="json") for record in records],
        )
