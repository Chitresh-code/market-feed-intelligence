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

            records.append(
                RawMacroRecord(
                    series_id=spec.series_id,
                    label=spec.label,
                    value=latest_value,
                    delta_1d=(latest_value - previous_value) if previous_value is not None else None,
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
