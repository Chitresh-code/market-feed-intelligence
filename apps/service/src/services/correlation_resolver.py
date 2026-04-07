from __future__ import annotations

from domain.client_context_models import CorrelationMapping
from domain.models import CorrelationRecord


DEFAULT_CORRELATION_MAPPINGS = [
    {
        "id": "it-linkage-90d",
        "source_signal": "XLK",
        "target_signal": "^CNXIT",
        "label": "US technology to Nifty IT linkage",
        "r_value": 0.74,
        "direction": "positive",
        "strength": "strong",
        "lookback_days": 90,
        "narrative": "US technology leadership remains the strongest external read-through for India IT exposure in this client mix.",
        "scope_type": "allocation_ticker",
        "scope_value": "NIFTYIT.NS",
        "active": True,
    },
    {
        "id": "us-rates-india-risk-90d-arjun",
        "source_signal": "DGS10",
        "target_signal": "^NSEI",
        "label": "US rates to India risk appetite",
        "r_value": -0.46,
        "direction": "negative",
        "strength": "moderate",
        "lookback_days": 90,
        "narrative": "Higher US long-end yields remain a headwind for India risk appetite and valuation support.",
        "scope_type": "customer_id",
        "scope_value": "C001",
        "active": True,
    },
    {
        "id": "domestic-demand-consumption-90d",
        "source_signal": "^NSEI",
        "target_signal": "NIFTYCONSUM.NS",
        "label": "Domestic demand proxy to consumption themes",
        "r_value": 0.58,
        "direction": "positive",
        "strength": "moderate",
        "lookback_days": 90,
        "narrative": "Broad India risk tone is still a meaningful signal for domestic consumption exposures in the thematic book.",
        "scope_type": "allocation_ticker",
        "scope_value": "TITAN.NS",
        "active": True,
    },
    {
        "id": "fx-pressure-inst-90d",
        "source_signal": "DEXINUS",
        "target_signal": "^NSEI",
        "label": "FX pressure to India allocation tone",
        "r_value": -0.42,
        "direction": "negative",
        "strength": "moderate",
        "lookback_days": 90,
        "narrative": "A weaker rupee tends to coincide with a more defensive India allocation frame for institutional clients.",
        "scope_type": "persona",
        "scope_value": "inst_fund",
        "active": True,
    },
    {
        "id": "it-linkage-365d",
        "source_signal": "XLK",
        "target_signal": "^CNXIT",
        "label": "US technology structural cycle to Nifty IT (1-year)",
        "r_value": 0.65,
        "direction": "positive",
        "strength": "strong",
        "lookback_days": 365,
        "narrative": (
            "Over a one-year cycle, US technology sector performance has been the primary structural driver "
            "of Indian IT valuations, reflecting the global synchronization of enterprise software demand cycles. "
            "The relationship has held through multiple rate and earnings cycles, confirming it is structural "
            "rather than tactical. Periods of sustained US tech outperformance have historically preceded "
            "12-18 month stretches of Indian IT multiple expansion."
        ),
        "scope_type": "allocation_ticker",
        "scope_value": "NIFTYIT.NS",
        "active": True,
    },
    {
        "id": "us-rates-india-risk-365d-arjun",
        "source_signal": "DGS10",
        "target_signal": "^NSEI",
        "label": "US rate cycle to India equity regime (1-year)",
        "r_value": -0.41,
        "direction": "negative",
        "strength": "moderate",
        "lookback_days": 365,
        "narrative": (
            "Across annual rate cycles, sustained US long-end yield elevation has historically preceded FPI "
            "outflows from Indian equities, with the full impact typically manifesting 2-4 months after the "
            "yield peak. The current rate cycle positioning — and specifically whether yields have peaked — "
            "is the primary structural variable determining India allocation headroom over the next 12 months."
        ),
        "scope_type": "customer_id",
        "scope_value": "C001",
        "active": True,
    },
    {
        "id": "consumption-structure-365d",
        "source_signal": "^NSEI",
        "target_signal": "NIFTYCONSUM.NS",
        "label": "India macro regime to consumption sector (1-year)",
        "r_value": 0.54,
        "direction": "positive",
        "strength": "moderate",
        "lookback_days": 365,
        "narrative": (
            "Over a one-year horizon, domestic consumption sector performance tracks the broader India growth "
            "narrative closely, with the relationship strengthening during periods of policy-led demand stimulus "
            "and weakening during global risk-off cycles. Structural consumption growth in India remains "
            "underpinned by rising middle-class income, making this a long-duration allocation rather than "
            "a tactical trade."
        ),
        "scope_type": "allocation_ticker",
        "scope_value": "TITAN.NS",
        "active": True,
    },
    {
        "id": "inr-structure-inst-365d",
        "source_signal": "DEXINUS",
        "target_signal": "^NSEI",
        "label": "INR structural trajectory to India allocation (1-year)",
        "r_value": -0.38,
        "direction": "negative",
        "strength": "moderate",
        "lookback_days": 365,
        "narrative": (
            "Structurally, a persistently weakening rupee compresses real returns for unhedged foreign investors "
            "and raises import-cost inflation, both weighing on India's multi-year equity return profile. "
            "The long-term INR trajectory relative to domestic growth rates is a key mandate constraint for "
            "institutional allocations and a primary input for strategic FX hedging decisions."
        ),
        "scope_type": "persona",
        "scope_value": "inst_fund",
        "active": True,
    },
]


def default_correlation_mappings() -> list[CorrelationMapping]:
    return [CorrelationMapping.model_validate(mapping) for mapping in DEFAULT_CORRELATION_MAPPINGS]


def mapping_applies(mapping: dict, customer: dict) -> bool:
    scope_type = mapping["scope_type"]
    scope_value = mapping["scope_value"]

    if scope_type == "customer_id":
        return customer["id"] == scope_value
    if scope_type == "persona":
        return customer["persona"] == scope_value
    if scope_type == "allocation_ticker":
        return any((allocation.get("ticker") or "") == scope_value for allocation in customer.get("allocations", []))
    return False


def build_correlation_records(
    cache_date: str,
    generated_at: str,
    customers: list[dict],
    mappings: list[dict],
) -> list[CorrelationRecord]:
    del cache_date
    records: list[CorrelationRecord] = []
    for mapping in mappings:
        if not mapping.get("active", True):
            continue
        for customer in customers:
            if not mapping_applies(mapping, customer):
                continue
            records.append(
                CorrelationRecord(
                    customer_id=customer["id"],
                    label=mapping["label"],
                    source_signal=mapping["source_signal"],
                    target_signal=mapping["target_signal"],
                    r_value=mapping["r_value"],
                    direction=mapping["direction"],
                    strength=mapping["strength"],
                    lookback_days=mapping["lookback_days"],
                    narrative=mapping["narrative"],
                    source="precomputed_correlation_job",
                    as_of=generated_at,
                )
            )
    return records
