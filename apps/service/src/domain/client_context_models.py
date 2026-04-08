from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator


AllowedSection = Literal[
    "Market Pulse",
    "Client-Relevant Signals",
    "Global Linkages",
    "Talking Points",
]

CorrelationScopeType = Literal["allocation_ticker", "persona", "customer_id"]


class PersonaConfig(BaseModel):
    id: str = ""
    label: str
    section_order: list[AllowedSection]
    category_weights: dict[str, float]
    tone_rules: list[str]
    preferred_narrative_style: str
    prohibited_claim_patterns: list[str]
    fallback_rules: list[str]

    @model_validator(mode="after")
    def validate_category_weights(self) -> "PersonaConfig":
        required = {
            "sector_proxy_market",
            "market_index",
            "macro_series",
            "sector_proxy_fundamental",
            "news_event_signal",
            "correlation_signal",
        }
        missing = required.difference(self.category_weights)
        if missing:
            raise ValueError(f"Missing category weights: {', '.join(sorted(missing))}")
        return self


class CustomerAllocation(BaseModel):
    sector: str
    ticker: str | None = None
    weight: float = Field(ge=0.0, le=1.0)
    key_holdings: list[str] = Field(default_factory=list)


class CustomerProfile(BaseModel):
    id: str = ""
    name: str
    persona: str
    mandate: str
    client_profile: str
    risk_rating: str
    relationship_since: str
    last_meeting: str
    next_meeting: str
    meeting_context: str
    primary_objective: str
    communication_style: str
    decision_lens: str
    key_concerns: list[str] = Field(default_factory=list)
    watchlist: list[str] = Field(default_factory=list)
    rm_notes: str
    allocations: list[CustomerAllocation]

    @model_validator(mode="after")
    def validate_allocations(self) -> "CustomerProfile":
        if not self.allocations:
            raise ValueError("At least one allocation is required.")
        total = sum(allocation.weight for allocation in self.allocations)
        if abs(total - 1.0) > 0.001:
            raise ValueError(f"Allocation weights must sum to 1.0. Received {total:.4f}.")
        return self


class CorrelationMapping(BaseModel):
    id: str = ""
    label: str
    source_signal: str
    target_signal: str
    r_value: float = Field(ge=-1.0, le=1.0)
    direction: Literal["positive", "negative"]
    strength: Literal["strong", "moderate", "weak"]
    lookback_days: int = Field(ge=1)
    narrative: str
    scope_type: CorrelationScopeType
    scope_value: str
    active: bool = True
    created_at: str | None = None
    updated_at: str | None = None
