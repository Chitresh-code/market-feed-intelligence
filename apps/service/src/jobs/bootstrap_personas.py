from __future__ import annotations

import argparse
import json
from pathlib import Path

from config import load_settings
from db.session import init_db, session_scope
from domain.client_context_models import PersonaConfig
from services.persona_service import PersonaService


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bootstrap personas from JSON fixtures into Postgres.")
    return parser.parse_args()


def read_fixture(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf8"))


def main() -> None:
    parse_args()
    settings = load_settings()
    fixture_dir = settings.data_root / "personas"
    init_db()
    with session_scope() as session:
        service = PersonaService(session)
        count = 0
        for path in sorted(fixture_dir.glob("*.json")):
            payload = PersonaConfig.model_validate(read_fixture(path))
            service.create_persona(payload)
            count += 1

    print(f"Bootstrapped personas: {count}")


if __name__ == "__main__":
    main()
