from __future__ import annotations

import argparse
from datetime import datetime, timezone

from db.session import init_db, session_scope
from services.cache_service import CacheService


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


def main() -> None:
    args = parse_args()
    init_db()
    with session_scope() as session:
        service = CacheService(session)
        result = service.refresh_cache(args.date, args.lookback_days)

    print(f"Cache refresh complete for {args.date}")
    for line in result["output"]:
        print(line)


if __name__ == "__main__":
    main()
