from __future__ import annotations

import argparse
from datetime import date, timedelta

from db.session import init_db, session_scope
from services.refresh_orchestrator import RefreshOrchestrator


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Bootstrap a rolling window of cache history into Postgres."
    )
    parser.add_argument(
        "--days",
        type=int,
        default=7,
        help="Number of days of history to seed, inclusive of the end date.",
    )
    parser.add_argument(
        "--end-date",
        default=date.today().isoformat(),
        help="End date in YYYY-MM-DD format. Defaults to today.",
    )
    parser.add_argument(
        "--lookback-days",
        type=int,
        default=5,
        help="Fetch window lookback passed through to the refresh orchestrator.",
    )
    return parser.parse_args()


def iter_dates(days: int, end_date: str) -> list[str]:
    end = date.fromisoformat(end_date)
    return [
        (end - timedelta(days=offset)).isoformat()
        for offset in reversed(range(max(days, 1)))
    ]


def main() -> None:
    args = parse_args()
    init_db()
    dates = iter_dates(args.days, args.end_date)

    with session_scope() as session:
        orchestrator = RefreshOrchestrator(session)
        for cache_date in dates:
            orchestrator.refresh_cache(cache_date, args.lookback_days)
            print(f"Bootstrapped history date: {cache_date}")

    print(f"Bootstrapped history window: {dates[0]} to {dates[-1]} ({len(dates)} day(s))")


if __name__ == "__main__":
    main()
