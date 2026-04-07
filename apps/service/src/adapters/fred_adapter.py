from __future__ import annotations

from dataclasses import dataclass

import pandas as pd
from fredapi import Fred

from adapters.base import AdapterError, FetchWindow
from domain.models import RawDatasetEnvelope, RawMacroRecord


@dataclass(frozen=True)
class MacroSeriesSpec:
    series_id: str
    label: str
    unit: str


class FredMacroAdapter:
    source = "fredapi"

    def __init__(self, api_key: str) -> None:
        if not api_key:
            raise AdapterError("FRED API key is required")
        self.client = Fred(api_key=api_key)

    @staticmethod
    def _value_at_offset(series: pd.Series, calendar_days: int) -> float | None:
        """Return the most recent observed value on or before calendar_days ago."""
        if len(series) < 2:
            return None
        cutoff = series.index[-1] - pd.Timedelta(days=calendar_days)
        historical = series[series.index <= cutoff].dropna()
        if historical.empty:
            return None
        return float(historical.iloc[-1])

    def fetch(
        self,
        specs: list[MacroSeriesSpec],
        window: FetchWindow,
    ) -> RawDatasetEnvelope:
        records: list[RawMacroRecord] = []

        for spec in specs:
            series = self.client.get_series(spec.series_id)
            if series.empty:
                raise AdapterError(f"fredapi returned no rows for series {spec.series_id}")

            series = series.dropna()
            if series.empty:
                raise AdapterError(f"fredapi returned only null values for series {spec.series_id}")

            latest_value = float(series.iloc[-1])
            previous_value = float(series.iloc[-2]) if len(series) > 1 else None

            val_90d_ago = self._value_at_offset(series, 90)
            val_180d_ago = self._value_at_offset(series, 180)

            records.append(
                RawMacroRecord(
                    series_id=spec.series_id,
                    label=spec.label,
                    value=latest_value,
                    delta_1d=(latest_value - previous_value) if previous_value is not None else None,
                    delta_90d=(latest_value - val_90d_ago) if val_90d_ago is not None else None,
                    delta_180d=(latest_value - val_180d_ago) if val_180d_ago is not None else None,
                    unit=spec.unit,
                    source="fredapi",
                    as_of=pd.Timestamp(series.index[-1]).isoformat(),
                )
            )

        return RawDatasetEnvelope(
            dataset="macro",
            date=window.date,
            generated_at=pd.Timestamp.utcnow().isoformat(),
            source=self.source,
            records=[record.model_dump(mode="json") for record in records],
        )
