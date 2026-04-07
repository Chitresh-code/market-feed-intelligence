# Persona-Driven Multi-Horizon Summary Generation Mapping

Source: [docs/requirements/06-persona-driven-multi-horizon-summary.md](/Users/chitreshgyanani/qtsolv/MacquirePOC/docs/requirements/06-persona-driven-multi-horizon-summary.md)

## Purpose

- Requirement intent: fix the most common quality failure — summaries that read the same regardless of persona — by enforcing three time horizons (short, medium, long) and weighting them differently per persona.
- Implementation: accepted in full. Both the evidence assembly layer and the prompt layer now carry horizon metadata and persona-specific horizon priority instructions.

---

## The Three-Horizon Framework

### Short-Term View (Days to 2 Weeks)

- Requirement intent: capture immediate price action, near-term catalysts, and correlation breaks from the latest market and news data.
- Implementation: realized. `market_index`, `sector_proxy_market`, and `news_event_signal` categories are all classified as `time_horizon="short"` in the normalization pipeline.
- Evidence sources active: yfinance 1D/5D price action, Finnhub headlines.
- Decision: 1D and 5D market deltas are both surfaced in the short-term group because the 5D delta provides supporting context for whether the 1D move is a continuation or an outlier. Separating them would require structural changes to signal narrative construction.

### Medium-Term View (2 Weeks to 3 Months)

- Requirement intent: capture earnings cycle positioning, macro trajectory, and rolling correlation stability.
- Implementation: realized. `macro_series` (DGS10, DEXINUS) and `correlation_signal` (90-day lookback) are classified as `time_horizon="medium"`.
- Evidence sources active: FRED series, precomputed 90-day correlations.
- Decision: correlations are classified as medium rather than long because the current lookback window is fixed at 90 days, which falls within the medium-term band. Classifying them as long would overstate structural confidence given the window length.

### Long-Term View (3 Months to 12+ Months)

- Requirement intent: surface structural sector leadership shifts, policy cycle completion, and cross-market linkage durability.
- Implementation: partially realized at the prompt layer only. No current data source produces long-horizon signals. The `time_horizon="long"` value is defined in the schema but no normalization path sets it.
- Gap: FRED 6-12 month trend windows, long-window correlation artifacts, and mandate alignment checks are not yet active data products. The prompt layer handles this by emitting an explicit "no long-term evidence available" note in the signal block passed to the LLM, which instructs the model to acknowledge the gap rather than fabricate structural commentary.
- Decision: honest degradation was preferred over stub signals. The requirement's Rule 4 explicitly calls for this.

---

## Horizon Weighting by Persona

- Requirement intent: HNI should receive a short-heavy evidence pack; Institutional should receive a medium/long-heavy pack.
- Implementation: realized through `horizonMultiplier()` in [apps/web/lib/poc-data.ts](/Users/chitreshgyanani/qtsolv/MacquirePOC/apps/web/lib/poc-data.ts). Applied as a scoring multiplier inside `sortSignals()`, which feeds all three evidence selection paths (`selectAllocationAnchoredSignals`, `selectMatchedSignals`, and the macro/news sort).
  - HNI equity: short × 1.3, medium × 1.0, long × 0.7
  - Institutional fund: short × 0.8, medium × 1.2, long × 1.3
- Decision: the multiplier adjusts rank order rather than hard-filtering by horizon. This preserves the allocation-anchoring logic while biasing the final selection toward persona-appropriate horizons.

---

## How Each Persona Sees the Same Evidence Differently

### HNI Equity Persona

- Requirement intent: direct, actionable, portfolio-centric framing; short-term primary, long-term only if directly portfolio-relevant.
- Implementation: realized through `buildHorizonPriority()` in [apps/web/lib/briefing.ts](/Users/chitreshgyanani/qtsolv/MacquirePOC/apps/web/lib/briefing.ts), which passes a persona-specific `horizon_priority` string to all four section prompts. The HNI instruction emphasizes immediate portfolio impact and restricts long-term commentary to holdings-relevant observations only.

### Institutional Fund Persona

- Requirement intent: analytical, macro-first, allocation-disciplined framing; medium and long-term primary, short-term as tactical overlay only.
- Implementation: realized through the same `buildHorizonPriority()` path. The institutional instruction foregrounds allocation adjustments, mandate compliance, and structural positioning, and frames short-term signals as overlays on the medium/long thesis.

---

## Prompt Engineering Rules

### Rule 1 — Never Collapse Horizons

- Requirement intent: each section prompt must distinguish short, medium, and long-term interpretations.
- Implementation: all four prompt YAML files in [apps/web/prompts](/Users/chitreshgyanani/qtsolv/MacquirePOC/apps/web/prompts) now include explicit multi-horizon analysis blocks in both `system_prompt_template` and `user_prompt_template`. Signals are passed to the LLM organized into labelled horizon groups via `formatSignalsByHorizon()` in [apps/web/lib/briefing.ts](/Users/chitreshgyanani/qtsolv/MacquirePOC/apps/web/lib/briefing.ts).

### Rule 2 — Weight Horizons by Persona

- Requirement intent: the evidence pack should pass horizon-weighted context, not equal slices.
- Implementation: realized at the evidence selection layer as described above. The prompt also receives a `horizon_priority` variable that states the persona's horizon weighting explicitly, so the model understands both the ranked signal ordering and why it is ordered that way.

### Rule 3 — Keep Sections Distinct Even Across Horizons

- Requirement intent: `Client-Relevant Signals` must not restate `Market Pulse` with "your" inserted.
- Implementation: the existing section-specific signal routing in `getSectionSignals()` passes different evidence slices to each section. The `market-pulse` prompt receives market signals only; `client-relevant-signals` adds macro and news context; `global-linkages` receives correlation and macro signals; `talking-points` receives all three. This pre-existing design satisfies Rule 3. No changes were needed here beyond ensuring the horizon-organized format does not blur the section boundaries.

### Rule 4 — Honest Degradation Per Horizon

- Requirement intent: if long-term evidence is thin, say so explicitly rather than filling the gap.
- Implementation: `formatSignalsByHorizon()` always emits the long-term horizon group with an explicit "not available" note when no long signals exist. All four section prompts instruct the model to acknowledge the limitation rather than substitute generic structural commentary.

### Rule 5 — Correlation Must Be Horizon-Aware

- Requirement intent: distinguish short-term correlation breaks from medium-term stability and long-term structural trends.
- Implementation: realized at the prompt layer. The `global-linkages` system prompt now explicitly instructs the model to frame short-term correlation moves as event-driven signals and medium-term stability as allocation validation. The `time_horizon="medium"` tag on correlation signals gives the LLM the horizon context to apply this framing.
- Gap: the current correlation pipeline computes a single 90-day window per pair. Short-term correlation breaks (5-10 day rolling) are not yet a data product, so the short-term correlation framing in prompts relies on the model inferring event-driven context from the news and market signals rather than from dedicated short-window correlation artifacts.

---

## Signal Schema Changes

- Requirement intent: tag signals with horizon classification.
- Implementation: `time_horizon: TimeHorizon` field added to `NormalizedSignal` in [apps/service/src/domain/models.py](/Users/chitreshgyanani/qtsolv/MacquirePOC/apps/service/src/domain/models.py). Classification is applied at normalization time by `classify_signal_horizon()` in [apps/service/src/jobs/normalize.py](/Users/chitreshgyanani/qtsolv/MacquirePOC/apps/service/src/jobs/normalize.py). The `Signal` TypeScript type in [apps/web/lib/poc-data.ts](/Users/chitreshgyanani/qtsolv/MacquirePOC/apps/web/lib/poc-data.ts) carries the field through to the briefing layer.
- Note: existing cached signal bundles (pre-implementation) do not have the `time_horizon` field. The Python model uses `default="short"` so old bundles deserialize safely. Re-running the normalization job regenerates bundles with correct horizon tags.

---

## Verification Checklist Mapping

| Checklist Item | Status |
|---|---|
| Market Pulse distinguishes short, medium, long-term behavior | Prompt enforces this; signal block organized by horizon |
| Client-Relevant Signals connects each horizon to specific allocation mix | Prompt enforces per-sleeve horizon analysis |
| Global Linkages shows external-to-India connections at each horizon | Prompt enforces horizon-aware correlation framing |
| Talking Points read as conversation cues, not a restatement of other sections | Pre-existing section routing preserved; horizon coverage added to bullet guidance |
| Would briefing feel different for a different persona | Yes — horizon multiplier changes signal rank; `horizon_priority` changes LLM instruction |
| Horizon weighting appropriate per persona | Enforced at both evidence selection and prompt layers |
| Language matches persona communication style | Pre-existing `sharedOutputGuardrail` in briefing.ts covers this; unchanged |
| Mandate constraints referenced for Institutional | `client_context` includes mandate; `horizon_priority` foregrounds mandate compliance |
| Portfolio-specific actions referenced for HNI | `horizon_priority` foregrounds immediate portfolio impact; allocation anchoring unchanged |
| Short-term signals do not contradict long-term without acknowledgment | Honest degradation note in signal block provides the model the mechanism to flag this |
| Correlation claims consistent across horizons | Covered by global-linkages prompt horizon framing |
| Honest degradation where evidence is thin | Realized via `formatSignalsByHorizon()` long-term fallback note |
| Client asking "what does this mean in 6 months?" gets a clear answer | Institutional briefings will address this via medium-term framing; HNI will acknowledge long-term data limits |

---

## Known Gaps and Deferred Items

| Gap | Reason Deferred |
|---|---|
| Long-term signals (`time_horizon="long"`) from actual data sources | No current source produces 6-12 month FRED trend windows or long-window correlation artifacts |
| Short-window (5-10 day) correlation artifacts for short-term correlation breaks | Correlation pipeline computes one fixed 90-day window per pair; adding rolling windows requires pipeline work |
| Post-generation horizon overlap detection | Requirement mentions post-processing to detect section overlap; deferred — prompt-level enforcement is the primary guard |
