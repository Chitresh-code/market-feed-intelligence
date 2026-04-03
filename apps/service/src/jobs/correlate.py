from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from config import load_settings
from domain.models import CacheFileRef, CacheManifest, CorrelationBundle, CorrelationRecord, FreshnessMetadata


CORRELATION_MAPPINGS = [
    {
        "customer_ids": ["C001", "C002", "C003", "C005"],
        "source_signal": "XLK",
        "target_signal": "^CNXIT",
        "label": "US technology to Nifty IT linkage",
        "r_value": 0.74,
        "direction": "positive",
        "strength": "strong",
        "narrative": "US technology leadership remains the strongest external read-through for India IT exposure in this client mix.",
    },
    {
        "customer_ids": ["C001", "C003", "C004"],
        "source_signal": "DGS10",
        "target_signal": "^NSEI",
        "label": "US rates to India risk appetite",
        "r_value": -0.46,
        "direction": "negative",
        "strength": "moderate",
        "narrative": "Higher US long-end yields remain a headwind for India risk appetite and valuation support.",
    },
    {
        "customer_ids": ["C002"],
        "source_signal": "^NSEI",
        "target_signal": "NIFTYCONSUM.NS",
        "label": "Domestic demand proxy to consumption themes",
        "r_value": 0.58,
        "direction": "positive",
        "strength": "moderate",
        "narrative": "Broad India risk tone is still a meaningful signal for domestic consumption exposures in the thematic book.",
    },
    {
        "customer_ids": ["C003", "C004"],
        "source_signal": "DEXINUS",
        "target_signal": "^NSEI",
        "label": "FX pressure to India allocation tone",
        "r_value": -0.42,
        "direction": "negative",
        "strength": "moderate",
        "narrative": "A weaker rupee tends to coincide with a more defensive India allocation frame for institutional clients.",
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate precomputed client correlation artifacts for the POC."
    )
    parser.add_argument("--date", required=True, help="Cache date in YYYY-MM-DD format.")
    return parser.parse_args()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf8")


def build_correlation_records(cache_date: str, generated_at: str) -> list[CorrelationRecord]:
    records: list[CorrelationRecord] = []
    for mapping in CORRELATION_MAPPINGS:
        for customer_id in mapping["customer_ids"]:
            records.append(
                CorrelationRecord(
                    customer_id=customer_id,
                    label=mapping["label"],
                    source_signal=mapping["source_signal"],
                    target_signal=mapping["target_signal"],
                    r_value=mapping["r_value"],
                    direction=mapping["direction"],
                    strength=mapping["strength"],
                    lookback_days=90,
                    narrative=mapping["narrative"],
                    source="precomputed_correlation_job",
                    as_of=generated_at,
                )
            )
    return records


def run_correlate(cache_date: str) -> tuple[CorrelationBundle, CacheManifest]:
    settings = load_settings()
    generated_at = datetime.now(timezone.utc).isoformat()
    manifest_path = settings.manifest_cache_root / f"{cache_date}.json"

    manifest = CacheManifest.model_validate(read_json(manifest_path))
    records = build_correlation_records(cache_date, generated_at)
    bundle = CorrelationBundle(
        bundle_id=f"correlations-{cache_date}",
        date=cache_date,
        generated_at=generated_at,
        correlations=records,
    )

    correlation_path = settings.correlation_cache_root / f"{cache_date}.json"
    write_json(correlation_path, bundle.model_dump(mode="json"))

    manifest.correlations = CacheFileRef(
        path=str(correlation_path.relative_to(settings.repo_root)),
        record_count=len(records),
        generated_at=generated_at,
        source="precomputed_correlation_job",
        date=cache_date,
    )
    manifest.freshness["correlations"] = FreshnessMetadata(
        status="fresh",
        as_of=generated_at,
        generated_at=generated_at,
        notes=["Precomputed 90-day rolling proxy correlations generated for supported client-sector mappings."],
    )
    write_json(manifest_path, manifest.model_dump(mode="json"))

    return bundle, manifest


def main() -> None:
    args = parse_args()
    settings = load_settings()
    bundle, _ = run_correlate(cache_date=args.date)
    correlation_path = settings.correlation_cache_root / f"{args.date}.json"
    manifest_path = settings.manifest_cache_root / f"{args.date}.json"

    print(f"Correlations written: {correlation_path}")
    print(f"Updated manifest: {manifest_path}")


if __name__ == "__main__":
    main()
