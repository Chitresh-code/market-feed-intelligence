from __future__ import annotations

import argparse
from datetime import datetime, timezone

from config import load_settings
from jobs.correlate import run_correlate
from jobs.ingest import run_ingest
from jobs.normalize import run_normalize


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Refresh the full POC cache by running ingest, correlate, and normalize."
    )
    parser.add_argument(
        "--date",
        default=datetime.now(timezone.utc).date().isoformat(),
        help="Cache date in YYYY-MM-DD format.",
    )
    parser.add_argument(
        "--lookback-days",
        type=int,
        default=5,
        help="Lookback window used during raw ingest.",
    )
    return parser.parse_args()


def required_raw_artifacts_exist(cache_date: str) -> tuple[bool, list[str]]:
    settings = load_settings()
    required_paths = {
        "raw_market": settings.raw_cache_root / "market" / f"{cache_date}.json",
        "raw_macro": settings.raw_cache_root / "macro" / f"{cache_date}.json",
        "raw_news": settings.raw_cache_root / "news" / f"{cache_date}.json",
    }

    missing = [name for name, path in required_paths.items() if not path.exists()]
    return len(missing) == 0, missing


def main() -> None:
    args = parse_args()

    ingest_manifest = run_ingest(cache_date=args.date, lookback_days=args.lookback_days)
    _, correlation_manifest = run_correlate(cache_date=args.date)

    raw_ready, missing = required_raw_artifacts_exist(args.date)
    if raw_ready:
        bundle_count, normalized_manifest = run_normalize(cache_date=args.date)
        print(f"Cache refresh complete for {args.date}")
        print(f"Normalized bundles written: {bundle_count}")
        for dataset, metadata in normalized_manifest.freshness.items():
            print(f"{dataset}: {metadata.status}")
            for note in metadata.notes:
                print(f"  note: {note}")
        return

    print(f"Cache refresh incomplete for {args.date}")
    print("Normalization skipped because required raw cache artifacts are missing.")
    for dataset_name in missing:
        metadata = ingest_manifest.freshness.get(dataset_name)
        status = metadata.status if metadata else "missing"
        print(f"{dataset_name}: {status}")
        if metadata:
            for note in metadata.notes:
                print(f"  note: {note}")

    if "correlations" in correlation_manifest.freshness:
        correlation_metadata = correlation_manifest.freshness["correlations"]
        print(f"correlations: {correlation_metadata.status}")
        for note in correlation_metadata.notes:
            print(f"  note: {note}")


if __name__ == "__main__":
    main()
