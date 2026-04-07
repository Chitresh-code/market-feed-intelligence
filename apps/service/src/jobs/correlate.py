from __future__ import annotations

import argparse

from db.session import init_db, session_scope
from services.refresh_orchestrator import RefreshOrchestrator


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compatibility entrypoint for the DB-backed refresh pipeline."
    )
    parser.add_argument("--date", required=True, help="Cache date in YYYY-MM-DD format.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    init_db()
    with session_scope() as session:
        result = RefreshOrchestrator(session).refresh_cache(args.date)

    print("Standalone correlation generation has been folded into the DB-backed refresh pipeline.")
    print(f"Refresh completed for {args.date}")
    print(result["output"][0])


if __name__ == "__main__":
    main()
