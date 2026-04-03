from __future__ import annotations

import argparse
import json
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

from config import load_settings
from domain.models import (
    CacheFileRef,
    CacheManifest,
    CorrelationBundle,
    CorrelationRecord,
    FreshnessMetadata,
    NormalizedSignal,
    NormalizedSignalBundle,
)


TICKER_ALIASES = {
    "NIFTYIT.NS": "^CNXIT",
    "^CNXIT": "NIFTYIT.NS",
}

GENERIC_NEWS_BLOCKLIST = (
    "what are the main events for today",
    "givers’ regret",
    "givers' regret",
    "wells fargo and goldman",
    "visa launches new ai tools",
    "jim cramer warns rally lacks real leadership",
)

ALLOCATION_KEYWORD_ALIASES = {
    "g-sec": {"g-sec", "gsec", "sovereign", "government", "bond", "bonds", "yield", "duration"},
    "sovereign": {"g-sec", "gsec", "sovereign", "government", "bond", "bonds", "yield", "duration"},
    "corporate": {"corporate", "credit", "spread", "spreads", "bond", "bonds"},
    "bonds": {"bond", "bonds", "yield", "duration", "credit"},
    "liquid": {"liquid", "cash", "liquidity"},
    "consumption": {"consumption", "consumer", "demand", "household"},
    "psu": {"psu", "state-run", "public sector"},
    "infra": {"infra", "infrastructure", "capex", "construction"},
    "pharma": {"pharma", "pharmaceutical", "healthcare"},
    "commodities": {"commodity", "commodities", "gold", "metal", "crude", "oil"},
    "midcap": {"midcap", "mid-cap", "mid cap"},
    "smallcap": {"smallcap", "small-cap", "small cap"},
    "bank": {"bank", "banks", "banking", "financial", "financials"},
    "it": {"it", "technology", "tech", "software"},
    "auto": {"auto", "automobile", "automotive"},
}

GENERIC_ALLOCATION_TERMS = {
    "nifty",
    "india",
    "sectoral",
    "equities",
    "equity",
    "fund",
    "funds",
    "growth",
    "strategic",
    "opportunities",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Normalize raw cache datasets into per-customer ranked signal bundles."
    )
    parser.add_argument(
        "--date",
        required=True,
        help="Cache date in YYYY-MM-DD format.",
    )
    return parser.parse_args()


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2), encoding="utf8")


def requested_date(value: str) -> date:
    return date.fromisoformat(value)


def parse_iso_to_date(value: str) -> date:
    return datetime.fromisoformat(value).date()


def load_customers(settings_root: Path) -> list[dict[str, Any]]:
    customer_dir = settings_root / "data" / "customers"
    customers = []
    for path in sorted(customer_dir.glob("*.json")):
        customers.append(read_json(path))
    return customers


def load_persona(settings_root: Path, persona_id: str) -> dict[str, Any]:
    return read_json(settings_root / "data" / "personas" / f"{persona_id}.json")


def compute_freshness(
    dataset_name: str,
    records: list[dict[str, Any]],
    requested: date,
    generated_at: str,
) -> FreshnessMetadata:
    if not records:
        return FreshnessMetadata(
            status="missing",
            generated_at=generated_at,
            notes=[f"{dataset_name} contains no records"],
        )

    as_of_values = [
        record.get("as_of") or record.get("published_at")
        for record in records
        if record.get("as_of") or record.get("published_at")
    ]
    if not as_of_values:
        return FreshnessMetadata(
            status="missing",
            generated_at=generated_at,
            notes=[f"{dataset_name} has no timestamped records"],
        )

    record_dates = [parse_iso_to_date(value) for value in as_of_values]
    newest = max(record_dates)
    oldest = min(record_dates)
    oldest_age_days = (requested - oldest).days
    newest_age_days = (requested - newest).days

    if dataset_name == "raw_news":
        status = "fresh" if newest_age_days <= 1 else "stale"
    else:
        status = "fresh" if oldest_age_days <= 1 else "stale"

    notes: list[str] = []
    if oldest != newest:
        notes.append(
            f"Mixed source timestamps in bundle: oldest={oldest.isoformat()}, newest={newest.isoformat()}"
        )

    if status == "stale":
        notes.append(
            f"Oldest source record is {oldest_age_days} day(s) behind requested date {requested.isoformat()}"
        )

    return FreshnessMetadata(
        status=status,
        as_of=max(as_of_values),
        generated_at=generated_at,
        notes=notes,
    )


def allocation_relevance(customer: dict[str, Any], ticker: str, label: str) -> float:
    best = 0.0
    label_lower = label.lower()

    for allocation in customer["allocations"]:
        allocation_ticker = allocation.get("ticker")
        allocation_weight = float(allocation["weight"])

        if allocation_ticker and (
            ticker == allocation_ticker
            or TICKER_ALIASES.get(ticker) == allocation_ticker
            or TICKER_ALIASES.get(allocation_ticker) == ticker
        ):
            best = max(best, allocation_weight)
            continue

        sector_words = allocation["sector"].lower().replace("-", " ").split()
        expanded_terms: set[str] = set()
        for word in sector_words:
            if len(word) <= 3 or word in GENERIC_ALLOCATION_TERMS:
                continue
            expanded_terms.add(word)
            expanded_terms.update(ALLOCATION_KEYWORD_ALIASES.get(word, set()))

        if any(
            word in label_lower
            for word in expanded_terms
            if word not in GENERIC_ALLOCATION_TERMS and len(word) > 3
        ):
            best = max(best, allocation_weight * 0.88)

    if best == 0.0 and ticker == "^NSEI":
        return 0.35

    if best == 0.0 and ticker == "XLK":
        tech_exposure = max(
            (
                float(allocation["weight"])
                for allocation in customer["allocations"]
                if {
                    word
                    for word in allocation["sector"].lower().replace("-", " ").split()
                }
                & {"it", "tech", "technology"}
            ),
            default=0.0,
        )
        if tech_exposure:
            return tech_exposure * 0.9

    return min(best, 1.0)


def build_market_signals(
    customer: dict[str, Any],
    persona: dict[str, Any],
    records: list[dict[str, Any]],
) -> list[tuple[float, NormalizedSignal]]:
    signals: list[tuple[float, NormalizedSignal]] = []
    persona_weight = float(persona["category_weights"]["sector_proxy_market"])
    market_weight = float(persona["category_weights"]["market_index"])

    for record in records:
        category = record["category"]
        relevance = allocation_relevance(customer, record["ticker"], record["label"])
        if relevance <= 0:
            continue

        weight = market_weight if category == "market_index" else persona_weight
        if category == "market_index" and relevance < 0.45:
            continue

        confidence = 0.9 if relevance >= 0.2 else 0.65
        one_day = record.get("delta_1d_pct")
        five_day = record.get("delta_5d_pct")
        narrative = (
            f"{record['label']} closed at {record['close']:.2f}. "
            f"1D move: {one_day:+.2f}%." if one_day is not None else f"{record['label']} closed at {record['close']:.2f}."
        )
        if five_day is not None:
            narrative += f" 5D move: {five_day:+.2f}%."

        signal = NormalizedSignal(
            signal_id=f"{customer['id']}::{record['ticker']}::{record['as_of']}",
            category=category,
            label=record["label"],
            source=record["source"],
            as_of=record["as_of"],
            customer_relevance=relevance,
            persona_weight=weight,
            confidence=confidence,
            narrative=narrative,
        )
        score = relevance * weight * confidence
        signals.append((score, signal))

        if (
            category == "sector_proxy_market"
            and record.get("delta_5d_pct") is not None
            and relevance >= 0.16
        ):
            signals.append(
                (
                    score * 0.92,
                    NormalizedSignal(
                        signal_id=f"{customer['id']}::fundamental-proxy::{record['ticker']}::{record['as_of']}",
                        category="sector_proxy_fundamental",
                        label=f"{record['label']} proxy read-through",
                        source="derived_from_yfinance",
                        as_of=record["as_of"],
                        customer_relevance=relevance,
                        persona_weight=float(
                            persona["category_weights"]["sector_proxy_fundamental"]
                        ),
                        confidence=0.55,
                        narrative=(
                            f"{record['label']} is being used as a sector proxy read-through for the POC. "
                            f"Its 5D move is {record['delta_5d_pct']:+.2f}%, which helps frame sector strength "
                            "until a richer sector-fundamental source is added."
                        ),
                    ),
                )
            )

    return signals


def build_macro_signals(
    customer: dict[str, Any],
    persona: dict[str, Any],
    records: list[dict[str, Any]],
) -> list[tuple[float, NormalizedSignal]]:
    signals: list[tuple[float, NormalizedSignal]] = []
    weight = float(persona["category_weights"]["macro_series"])

    for record in records:
        relevance = 0.45
        if record["series_id"] == "DGS10" and customer["persona"] == "inst_fund":
            relevance = 0.8
            if any(
                keyword in customer["mandate"].lower() or keyword in customer["rm_notes"].lower()
                for keyword in ("fixed income", "macro", "bond", "duration", "sovereign", "credit")
            ):
                relevance = 0.92
        if record["series_id"] == "DEXINUS":
            relevance = max(relevance, 0.65 if "it" in customer["rm_notes"].lower() else 0.5)
            if any(
                keyword in customer["rm_notes"].lower() or keyword in customer["mandate"].lower()
                for keyword in ("mid-cap", "small-cap", "liquidity", "commodit", "macro")
            ):
                relevance = max(relevance, 0.75)

        signal = NormalizedSignal(
            signal_id=f"{customer['id']}::{record['series_id']}::{record['as_of']}",
            category="macro_series",
            label=record["label"],
            source=record["source"],
            as_of=record["as_of"],
            customer_relevance=relevance,
            persona_weight=weight,
            confidence=0.85,
            narrative=(
                f"{record['label']} is at {record['value']:.2f} {record['unit']}."
                + (
                    f" Daily delta: {record['delta_1d']:+.2f}."
                    if record.get("delta_1d") is not None
                    else ""
                )
            ),
        )
        signals.append((relevance * weight * 0.85, signal))

    return signals


def customer_keywords(customer: dict[str, Any]) -> set[str]:
    keywords: set[str] = set()
    for allocation in customer["allocations"]:
        for word in allocation["sector"].lower().replace("-", " ").split():
            if len(word) <= 2:
                continue
            keywords.add(word)
            keywords.update(ALLOCATION_KEYWORD_ALIASES.get(word, set()))
        keywords.update(holding.lower().replace(".ns", "") for holding in allocation["key_holdings"])
    keywords.update(word.lower() for word in customer["rm_notes"].split() if len(word) > 3)
    return keywords


def build_news_signals(
    customer: dict[str, Any],
    persona: dict[str, Any],
    records: list[dict[str, Any]],
) -> list[tuple[float, NormalizedSignal]]:
    signals: list[tuple[float, NormalizedSignal]] = []
    weight = float(persona["category_weights"]["news_event_signal"])
    keywords = customer_keywords(customer)
    macro_terms = {
        "fed",
        "yield",
        "treasury",
        "dollar",
        "rupee",
        "oil",
        "gold",
        "inflation",
        "equities",
        "stocks",
        "markets",
        "wall st",
        "bank",
        "banks",
    }

    for record in records:
        text = f"{record['headline']} {record['summary']}".lower()
        if any(blocked in text for blocked in GENERIC_NEWS_BLOCKLIST):
            continue

        hits = sum(1 for keyword in keywords if keyword in text)
        macro_hits = sum(1 for keyword in macro_terms if keyword in text)

        if customer["persona"] == "hni_equity" and hits == 0:
            continue
        if customer["persona"] == "inst_fund" and hits == 0 and macro_hits < 2:
            continue

        if "iran" in text and hits == 0 and macro_hits < 2:
            continue
        if "visa " in text and hits == 0:
            continue
        if "intel " in text and hits == 0:
            continue
        if "your money" in text:
            continue
        if "beaten-down bank stocks" in text:
            continue
        if "ai-driven gains" in text and hits == 0 and macro_hits < 2:
            continue
        if "prediction market regulation" in text:
            continue
        if "week ahead" in text:
            continue
        if "vietnam" in text:
            continue

        relevance = min(0.35 + (hits * 0.14) + (macro_hits * 0.05), 0.9)
        if relevance < 0.5:
            continue
        signal = NormalizedSignal(
            signal_id=f"{customer['id']}::news::{record['article_id']}",
            category="news_event_signal",
            label=record["headline"],
            source=record["source"],
            as_of=record["published_at"],
            customer_relevance=relevance,
            persona_weight=weight,
            confidence=0.7,
            narrative=(
                f"{record['source_name']} published a potentially relevant catalyst: {record['headline']}."
            ),
        )
        signals.append((relevance * weight * 0.7, signal))

    signals.sort(key=lambda item: item[0], reverse=True)
    return signals[:5]


def build_correlation_signals(
    customer: dict[str, Any],
    persona: dict[str, Any],
    correlations: list[dict[str, Any]],
) -> list[tuple[float, NormalizedSignal]]:
    weight = float(persona["category_weights"]["correlation_signal"])
    signals: list[tuple[float, NormalizedSignal]] = []

    for record in correlations:
        if record["customer_id"] != customer["id"]:
            continue

        confidence = 0.9 if record["strength"] == "strong" else 0.75
        relevance = min(0.5 + abs(float(record["r_value"])) * 0.4, 0.95)
        signal = NormalizedSignal(
            signal_id=f"{customer['id']}::correlation::{record['source_signal']}::{record['target_signal']}",
            category="correlation_signal",
            label=record["label"],
            source=record["source"],
            as_of=record["as_of"],
            customer_relevance=relevance,
            persona_weight=weight,
            confidence=confidence,
            narrative=record["narrative"],
        )
        signals.append((relevance * weight * confidence, signal))

    return signals


def normalize_customer_bundle(
    customer: dict[str, Any],
    persona: dict[str, Any],
    cache_date: str,
    generated_at: str,
    market_records: list[dict[str, Any]],
    macro_records: list[dict[str, Any]],
    news_records: list[dict[str, Any]],
    correlation_records: list[dict[str, Any]],
) -> NormalizedSignalBundle:
    ranked_signals = []
    ranked_signals.extend(build_market_signals(customer, persona, market_records))
    ranked_signals.extend(build_macro_signals(customer, persona, macro_records))
    ranked_signals.extend(build_news_signals(customer, persona, news_records))
    ranked_signals.extend(build_correlation_signals(customer, persona, correlation_records))
    ranked_signals.sort(key=lambda item: item[0], reverse=True)

    return NormalizedSignalBundle(
        bundle_id=f"{cache_date}--{customer['id']}",
        customer_id=customer["id"],
        persona_id=customer["persona"],
        date=cache_date,
        generated_at=generated_at,
        signals=[signal for _, signal in ranked_signals],
    )


def normalized_file_ref(
    repo_root: Path,
    generated_at: str,
    cache_date: str,
    bundle_count: int,
) -> CacheFileRef:
    return CacheFileRef(
        path=str((repo_root / "data" / "cache" / "normalized" / "signals").relative_to(repo_root)),
        record_count=bundle_count,
        generated_at=generated_at,
        source="normalization_job",
        date=cache_date,
    )


def run_normalize(cache_date: str) -> tuple[int, CacheManifest]:
    settings = load_settings()
    generated_at = datetime.now(timezone.utc).isoformat()
    requested = requested_date(cache_date)

    market = read_json(settings.raw_cache_root / "market" / f"{cache_date}.json")
    macro = read_json(settings.raw_cache_root / "macro" / f"{cache_date}.json")
    news = read_json(settings.raw_cache_root / "news" / f"{cache_date}.json")
    correlations_path = settings.correlation_cache_root / f"{cache_date}.json"
    correlations: dict[str, Any] = (
        read_json(correlations_path) if correlations_path.exists() else {"correlations": []}
    )
    manifest = CacheManifest.model_validate(
        read_json(settings.manifest_cache_root / f"{cache_date}.json")
    )

    customers = load_customers(settings.repo_root)
    bundle_count = 0

    for customer in customers:
        persona = load_persona(settings.repo_root, customer["persona"])
        bundle = normalize_customer_bundle(
            customer=customer,
            persona=persona,
            cache_date=cache_date,
            generated_at=generated_at,
            market_records=market["records"],
            macro_records=macro["records"],
            news_records=news["records"],
            correlation_records=correlations["correlations"],
        )
        path = settings.normalized_cache_root / "signals" / f"{cache_date}--{customer['id']}.json"
        write_json(path, bundle.model_dump(mode="json"))
        bundle_count += 1

    manifest.raw_market = manifest.raw_market
    manifest.raw_macro = manifest.raw_macro
    manifest.raw_news = manifest.raw_news
    manifest.normalized_signals = normalized_file_ref(
        settings.repo_root,
        generated_at=generated_at,
        cache_date=cache_date,
        bundle_count=bundle_count,
    )
    manifest.freshness["raw_market"] = compute_freshness(
        "raw_market", market["records"], requested, market["generated_at"]
    )
    manifest.freshness["raw_macro"] = compute_freshness(
        "raw_macro", macro["records"], requested, macro["generated_at"]
    )
    manifest.freshness["raw_news"] = compute_freshness(
        "raw_news", news["records"], requested, news["generated_at"]
    )
    manifest.freshness["normalized_signals"] = FreshnessMetadata(
        status="fresh",
        as_of=generated_at,
        generated_at=generated_at,
        notes=[],
    )
    if correlations["correlations"]:
        manifest.freshness["correlations"] = FreshnessMetadata(
            status="fresh",
            as_of=generated_at,
            generated_at=generated_at,
            notes=[],
        )

    write_json(
        settings.manifest_cache_root / f"{cache_date}.json",
        manifest.model_dump(mode="json"),
    )

    return bundle_count, manifest


def main() -> None:
    args = parse_args()
    settings = load_settings()
    bundle_count, _ = run_normalize(cache_date=args.date)

    print(f"Normalized bundles written: {bundle_count}")
    print(f"Updated manifest: {settings.manifest_cache_root / f'{args.date}.json'}")


if __name__ == "__main__":
    main()
