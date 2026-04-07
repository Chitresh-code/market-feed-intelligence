from __future__ import annotations

import argparse

from db.session import init_db, session_scope
from services.correlation_resolver import default_correlation_mappings
from services.correlation_mapping_service import CorrelationMappingService


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Bootstrap default correlation mappings into Postgres."
    )
    return parser.parse_args()


def main() -> None:
    parse_args()
    init_db()
    with session_scope() as session:
        service = CorrelationMappingService(session)
        count = 0
        for mapping in default_correlation_mappings():
            service.create_mapping(mapping)
            count += 1

    print(f"Bootstrapped correlation mappings: {count}")


if __name__ == "__main__":
    main()
