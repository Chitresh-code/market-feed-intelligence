from __future__ import annotations

import argparse
import json
from pathlib import Path

from config import load_settings
from db.session import init_db, session_scope
from domain.client_context_models import CustomerProfile
from services.customer_service import CustomerService


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bootstrap customers from JSON fixtures into Postgres.")
    return parser.parse_args()


def read_fixture(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf8"))


def main() -> None:
    parse_args()
    settings = load_settings()
    fixture_dir = settings.data_root / "customers"
    init_db()
    with session_scope() as session:
        service = CustomerService(session)
        count = 0
        for path in sorted(fixture_dir.glob("*.json")):
            payload = CustomerProfile.model_validate(read_fixture(path))
            service.create_customer(payload)
            count += 1

    print(f"Bootstrapped customers: {count}")


if __name__ == "__main__":
    main()
