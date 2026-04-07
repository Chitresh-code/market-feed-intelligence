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
    TimeHorizon,
)


def classify_signal_horizon(category: str, lookback_days: int = 0) -> TimeHorizon:
    """Classify a signal's inherent time horizon based on its category.

    - short: immediate price action and news catalysts (days to 2 weeks)
    - medium: macro current values, 90-day correlations (2 weeks to 3 months)
    - long: multi-month macro trends, 365-day structural correlations (3 months to 12+ months)
    """
    if category in ("market_index", "sector_proxy_market", "news_event_signal"):
        return "short"
    if category == "correlation_signal":
        return "long" if lookback_days >= 270 else "medium"
    return "medium"  # macro_series current-value signals


TICKER_ALIASES = {
    "NIFTYIT.NS": "^CNXIT",
    "^CNXIT": "NIFTYIT.NS",
}

GENERIC_NEWS_BLOCKLIST = (
    "what are the main events for today",
    "what is the distribution of forecasts",
    "what's behind",
    "what’s behind",
    "givers’ regret",
    "givers' regret",
    "wells fargo and goldman",
    "visa launches new ai tools",
    "jim cramer warns rally lacks real leadership",
    "shares edge up on rupee rally",
    "stocks end mixed",
    "stocks higher on hopes",
    "week ahead",
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

GENERIC_RM_TERMS = {
    "focused",
    "whether",
    "today",
    "recent",
    "around",
    "after",
    "before",
    "carry",
    "client",
    "wants",
    "prefers",
    "review",
    "call",
    "meeting",
    "briefs",
    "brief",
    "morning",
    "lead",
    "with",
    "into",
    "exposure",
    "portfolio",
    "performance",
    "timing",
    "strategic",
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
            time_horizon=classify_signal_horizon(category),
        )
        score = relevance * weight * confidence
        signals.append((score, signal))

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

        medium_narrative = (
            f"{record['label']} is at {record['value']:.2f} {record['unit']}."
            + (
                f" Daily delta: {record['delta_1d']:+.2f}."
                if record.get("delta_1d") is not None
                else ""
            )
        )
        signal = NormalizedSignal(
            signal_id=f"{customer['id']}::{record['series_id']}::{record['as_of']}",
            category="macro_series",
            label=record["label"],
            source=record["source"],
            as_of=record["as_of"],
            customer_relevance=relevance,
            persona_weight=weight,
            confidence=0.85,
            narrative=medium_narrative,
            time_horizon=classify_signal_horizon("macro_series"),
        )
        signals.append((relevance * weight * 0.85, signal))

        # Generate a long-term signal when multi-month delta data is available.
        delta_90d = record.get("delta_90d")
        delta_180d = record.get("delta_180d")
        if delta_90d is not None or delta_180d is not None:
            long_narrative = _build_macro_long_term_narrative(
                record["series_id"], record["label"], record["unit"],
                record["value"], delta_90d, delta_180d
            )
            long_signal = NormalizedSignal(
                signal_id=f"{customer['id']}::{record['series_id']}::long::{record['as_of']}",
                category="macro_series",
                label=f"{record['label']} — 6-month trend",
                source=record["source"],
                as_of=record["as_of"],
                customer_relevance=relevance,
                persona_weight=weight,
                confidence=0.80,
                narrative=long_narrative,
                time_horizon="long",
            )
            signals.append((relevance * weight * 0.80, long_signal))

    return signals


def _build_macro_long_term_narrative(
    series_id: str,
    label: str,
    unit: str,
    current_value: float,
    delta_90d: float | None,
    delta_180d: float | None,
) -> str:
    parts: list[str] = [f"{label} is currently at {current_value:.2f} {unit}."]

    if delta_180d is not None:
        abs_180 = abs(delta_180d)
        if series_id == "DGS10":
            if delta_180d > 0.5:
                cycle = "sustained tightening cycle in progress"
            elif delta_180d > 0.1:
                cycle = "gradual tightening bias over the period"
            elif delta_180d < -0.5:
                cycle = "sustained easing cycle in progress"
            elif delta_180d < -0.1:
                cycle = "easing bias emerging"
            else:
                cycle = "broadly stable range over the period"
            parts.append(
                f"Over the past 180 days, the yield has moved {delta_180d:+.2f} {unit} ({cycle})."
            )
        elif series_id == "DEXINUS":
            if delta_180d > 2.0:
                cycle = "sustained rupee depreciation pressure"
            elif delta_180d > 0.5:
                cycle = "mild rupee weakness"
            elif delta_180d < -2.0:
                cycle = "meaningful rupee appreciation"
            elif delta_180d < -0.5:
                cycle = "mild rupee strength"
            else:
                cycle = "broadly stable exchange rate"
            parts.append(
                f"Over the past 180 days, the rate has moved {delta_180d:+.2f} {unit} ({cycle})."
            )
        else:
            parts.append(f"180-day change: {delta_180d:+.2f} {unit}.")

    if delta_90d is not None:
        parts.append(f"90-day change: {delta_90d:+.2f} {unit}.")

    if delta_180d is not None and delta_90d is not None:
        # Check for acceleration: if 90d move is more than 60% of the 180d move
        if abs(delta_180d) > 0.05 and abs(delta_90d) / abs(delta_180d) > 0.6:
            parts.append("The pace has accelerated in the recent quarter relative to the full 6-month window.")
        elif abs(delta_180d) > 0.05 and abs(delta_90d) / abs(delta_180d) < 0.3:
            parts.append("The pace has decelerated in the recent quarter, suggesting the trend may be stabilizing.")

    return " ".join(parts)


def customer_keywords(customer: dict[str, Any]) -> set[str]:
    keywords: set[str] = set()
    for allocation in customer["allocations"]:
        for word in allocation["sector"].lower().replace("-", " ").split():
            if len(word) <= 2:
                continue
            keywords.add(word)
            keywords.update(ALLOCATION_KEYWORD_ALIASES.get(word, set()))
        keywords.update(holding.lower().replace(".ns", "") for holding in allocation["key_holdings"])
    keywords.update(
        word.lower()
        for entry in customer.get("key_concerns", [])
        for word in entry.replace("-", " ").split()
        if len(word) > 3 and word.lower() not in GENERIC_RM_TERMS
    )
    keywords.update(
        word.lower()
        for entry in customer.get("watchlist", [])
        for word in entry.replace("-", " ").split()
        if len(word) > 2
    )
    keywords.update(
        word.lower()
        for word in customer.get("primary_objective", "").replace("-", " ").split()
        if len(word) > 3 and word.lower() not in GENERIC_RM_TERMS
    )
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
        headline = record["headline"].lower()
        source_name = (record.get("source_name") or "").lower()
        text = f"{headline} {record['summary']}".lower()
        if any(blocked in text for blocked in GENERIC_NEWS_BLOCKLIST):
            continue
        if headline.endswith("?"):
            continue
        if source_name == "forexlive":
            continue

        hits = sum(1 for keyword in keywords if keyword in text)
        macro_hits = sum(1 for keyword in macro_terms if keyword in text)

        direct_theme_terms = {
            "technology",
            "tech",
            "bank",
            "banking",
            "consumer",
            "consumption",
            "infrastructure",
            "infra",
            "midcap",
            "mid-cap",
            "smallcap",
            "small-cap",
            "auto",
            "gold",
            "oil",
            "bond",
            "yield",
            "rupee",
            "dollar",
            "credit",
            "liquidity",
            "pharma",
        }
        direct_theme_hits = sum(1 for term in direct_theme_terms if term in text)

        if customer["persona"] == "hni_equity" and hits == 0:
            continue
        if customer["persona"] == "inst_fund" and hits == 0 and macro_hits < 2 and direct_theme_hits == 0:
            continue

        if "iran" in text and hits == 0 and macro_hits < 2:
            continue
        if source_name == "reuters" and hits == 0 and direct_theme_hits == 0 and macro_hits < 3:
            continue
        if any(
            phrase in text
            for phrase in (
                "stocks end mixed",
                "shares edge up",
                "stocks higher",
                "war worries drag",
                "renewed concerns about middle east conflict",
            )
        ) and hits == 0:
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

        relevance = min(0.25 + (hits * 0.18) + (direct_theme_hits * 0.08) + (macro_hits * 0.04), 0.92)
        if customer["persona"] == "hni_equity" and hits < 1:
            continue
        if relevance < 0.62:
            continue
        signal = NormalizedSignal(
            signal_id=f"{customer['id']}::news::{record['article_id']}",
            category="news_event_signal",
            label=record["headline"],
            source=record["source"],
            as_of=record["published_at"],
            customer_relevance=relevance,
            persona_weight=weight,
            confidence=0.64 if source_name == "reuters" and hits == 0 else 0.72,
            narrative=(
                f"{record['source_name']} published a potentially relevant catalyst: {record['headline']}."
            ),
            time_horizon=classify_signal_horizon("news_event_signal"),
        )
        confidence = 0.64 if source_name == "reuters" and hits == 0 else 0.72
        signals.append((relevance * weight * confidence, signal))

    signals.sort(key=lambda item: item[0], reverse=True)
    return signals[:3]


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
            signal_id=f"{customer['id']}::correlation::{record['source_signal']}::{record['target_signal']}::{record.get('lookback_days', 90)}d",
            category="correlation_signal",
            label=record["label"],
            source=record["source"],
            as_of=record["as_of"],
            customer_relevance=relevance,
            persona_weight=weight,
            confidence=confidence,
            narrative=record["narrative"],
            time_horizon=classify_signal_horizon("correlation_signal", record.get("lookback_days", 90)),
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
