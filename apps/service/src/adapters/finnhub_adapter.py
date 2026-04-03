from __future__ import annotations

from dataclasses import dataclass

import httpx
import pandas as pd

from adapters.base import AdapterError, FetchWindow
from domain.models import RawDatasetEnvelope, RawNewsRecord


@dataclass(frozen=True)
class FinnhubRequestSpec:
    category: str = "general"
    related_symbols: tuple[str, ...] = ()


class FinnhubNewsAdapter:
    source = "finnhub"
    base_url = "https://finnhub.io/api/v1"

    def __init__(self, api_key: str, timeout_seconds: float = 20.0) -> None:
        if not api_key:
            raise AdapterError("Finnhub API key is required")
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds

    def fetch(
        self,
        specs: list[FinnhubRequestSpec],
        window: FetchWindow,
    ) -> RawDatasetEnvelope:
        records: list[RawNewsRecord] = []

        with httpx.Client(timeout=self.timeout_seconds) as client:
            for spec in specs:
                response = client.get(
                    f"{self.base_url}/news",
                    params={
                        "category": spec.category,
                        "token": self.api_key,
                    },
                )
                if response.status_code != 200:
                    raise AdapterError(
                        f"Finnhub request failed for category {spec.category}: {response.status_code}"
                    )

                articles = response.json()
                if not isinstance(articles, list):
                    raise AdapterError("Finnhub response was not a list of articles")

                for article in articles:
                    article_id = article.get("id")
                    headline = article.get("headline")
                    url = article.get("url")
                    published_at = article.get("datetime")

                    if not article_id or not headline or not url or not published_at:
                        continue

                    records.append(
                        RawNewsRecord(
                            article_id=str(article_id),
                            headline=str(headline),
                            summary=str(article.get("summary") or ""),
                            source_name=str(article.get("source") or "Unknown"),
                            published_at=pd.Timestamp(int(published_at), unit="s", tz="UTC").isoformat(),
                            url=str(url),
                            categories=[spec.category],
                            related_symbols=list(spec.related_symbols),
                            source="finnhub",
                        )
                    )

        return RawDatasetEnvelope(
            dataset="news",
            date=window.date,
            generated_at=pd.Timestamp.utcnow().isoformat(),
            source=self.source,
            records=[record.model_dump(mode="json") for record in records],
        )
