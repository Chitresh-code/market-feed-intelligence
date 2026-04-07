# Persona-Driven Multi-Horizon Summary Generation

## Purpose

This document addresses the most common quality failure in briefing generation: **summaries that read the same regardless of persona**. The fix is twofold:

1. Each section must evaluate evidence through **three time horizons** — short, medium, and long term
2. Each persona must filter, weight, and frame those horizons differently

If a summary feels generic, it is almost certainly collapsing all horizons into a single "current market" blob and ignoring persona-specific priorities.

---

## The Three-Horizon Framework

Every piece of evidence — market data, macro signals, news catalysts, correlations — carries information at three distinct time scales. The briefing must surface all three, but in persona-appropriate proportions.

### Short-Term View (Days to 2 Weeks)

**What it captures:**
- Immediate market reactions to news, earnings, or policy events
- Technical positioning signals and momentum shifts
- Near-term catalysts from the news pipeline
- Correlation breakdowns or spikes that signal regime changes

**Evidence sources:**
- Latest yfinance price action and volume anomalies
- Breaking Finnhub headlines from the last 48-72 hours
- Intraday or daily macro prints (e.g. RBI policy surprises)

**Persona weight:**
- HNI Equity: **high** — clients want to know what is moving now and what to do this week
- Institutional Fund: **medium** — relevant for tactical overlay but not the primary frame

### Medium-Term View (2 Weeks to 3 Months)

**What it captures:**
- Earnings cycle positioning and sector rotation trends
- Macro data trajectory (e.g. CPI trend, GDP revision direction)
- Policy implementation lag effects (e.g. rate cuts flowing through to credit)
- Correlation stability — whether relationships that drove recent allocations are holding

**Evidence sources:**
- Normalized signal bundles showing trend direction and conviction
- FRED series momentum over 30-90 day windows
- Correlation artifacts showing rolling window stability

**Persona weight:**
- HNI Equity: **medium** — provides context for whether short-term moves have staying power
- Institutional Fund: **high** — this is the primary decision horizon for allocation adjustments

### Long-Term View (3 Months to 12+ Months)

**What it captures:**
- Structural shifts in sector leadership or macro regime
- Policy cycle completion and second-order effects
- Cross-market linkage durability (e.g. does US tech weakness structurally impact Indian IT?)
- Client mandate alignment over their investment horizon

**Evidence sources:**
- FRED series trend over 6-12 month windows
- Correlation artifacts showing long-window relationships
- Customer mandate and allocation profile definitions

**Persona weight:**
- HNI Equity: **low to medium** — only surface if it directly impacts current holdings or mandate
- Institutional Fund: **high** — structural positioning and mandate compliance are core concerns

---

## How Each Persona Sees the Same Evidence Differently

### HNI Equity Persona

**Communication style:** Direct, actionable, portfolio-centric. Avoid academic framing.

**Market Pulse should read like:**
- Short-term: "Nifty Bank rallied 2.3% on RBI pause signals — your 18% allocation benefits immediately"
- Medium-term: "Banking sector momentum has held for 6 weeks; earnings season next month will test sustainability"
- Long-term: "Rate cycle peak is behind us; structural credit growth supports current allocation weight"

**Client-Relevant Signals should read like:**
- Short-term: "Your top holding in HDFC Bank faces FII selling pressure this week — monitor for entry on dips"
- Medium-term: "IT sector weakness correlates with your underweight; consider whether this is an over-hedge"
- Long-term: "Your infrastructure sleeve aligns with capex cycle tailwinds — conviction remains justified"

**Global Linkages should read like:**
- Short-term: "NASDAQ selloff overnight is pressuring Indian IT proxies — expect gap-down opens"
- Medium-term: "US rate cut expectations are building; INR strength could offset some export headwinds"
- Long-term: "China reopening trajectory matters more for your materials exposure than US tech direction"

**Talking Points should read like:**
- "Your banking allocation is working — RBI pause confirms the thesis"
- "IT weakness is creating a conversation risk — clients will ask why we are underweight"
- "Infrastructure story is intact but needs patience — set expectations for a 6-month hold"

### Institutional Fund Persona

**Communication style:** Analytical, macro-first, allocation-disciplined. Reference mandate constraints.

**Market Pulse should read like:**
- Short-term: "Nifty 50 consolidated within 0.4% range; FII flows turned net positive for the first time in 8 sessions"
- Medium-term: "Sector rotation from defensives to cyclicals is underway; your 22% financials overweight is positioned correctly"
- Long-term: "India risk premium has compressed 40bps YTD; structural inflows support current valuation band"

**Client-Relevant Signals should read like:**
- Short-term: "Finnhub-derived catalysts show 3 near-term earnings downgrades in your consumer discretionary sleeve — below consensus revision threshold"
- Medium-term: "Correlation analysis shows your pharma hedge is losing diversification benefit as INR strengthens"
- Long-term: "Mandate constraint: emerging market equity allocation must remain within 60-80% band; current 74% leaves room for tactical increase"

**Global Linkages should read like:**
- Short-term: "DXY weakness is supporting EM FX; your unhedged INR exposure benefits tactically"
- Medium-term: "XLK-Nifty IT correlation has decayed from 0.72 to 0.58 over 60-day rolling window — diversification argument for Indian IT is strengthening"
- Long-term: "Global rate cycle inflection supports EM allocation; your 74% EM equity weight is below peer median of 78%"

**Talking Points should read like:**
- "IC review: your financials overweight is generating 180bps alpha vs benchmark; recommend maintaining through earnings"
- "Risk committee note: pharma hedge diversification ratio has degraded — consider rebalancing if correlation drops below 0.4"
- "Mandate positioning: current allocation leaves 6% dry powder within EM equity band; tactical deployment window is open"

---

## Prompt Engineering Rules for Multi-Horizon Persona Alignment

### Rule 1: Never collapse horizons

Each section prompt must instruct the model to distinguish between short, medium, and long-term interpretations. If a section only discusses "what is happening now," it has failed.

**Bad:** "Nifty Bank is up 2.3% today on RBI pause signals."

**Good:** "Nifty Bank rallied 2.3% on RBI pause signals — your 18% allocation benefits immediately. The 6-week sector momentum trend supports this move, and the rate cycle peak being behind us provides structural backing for the overweight position."

### Rule 2: Weight horizons by persona

The evidence pack assembly should pass horizon-weighted context, not equal slices. For HNI Equity, the evidence pack should emphasize short-term signals with medium-term context. For Institutional Fund, medium and long-term evidence should dominate.

**Implementation guidance:**
- When building the evidence pack in `briefing.ts`, tag each signal with its horizon classification
- Pass horizon-weighted slices to each section prompt rather than dumping all evidence equally
- The prompt contract should explicitly state the persona's horizon priority

### Rule 3: Keep sections distinct even across horizons

A common failure mode is `Client-Relevant Signals` becoming a restatement of `Market Pulse` with the word "your" inserted. The sections must stay distinct:

- **Market Pulse:** What the market is doing across all three horizons
- **Client-Relevant Signals:** Why those market movements matter to this specific client's allocation, mandate, and watchlist
- **Global Linkages:** How external markets and macro factors connect to the client's India exposure across horizons
- **Talking Points:** RM-ready conversation cues derived from the analysis — not a summary of the summary

### Rule 4: Honest degradation per horizon

If short-term evidence is strong but long-term evidence is thin, say so explicitly. Do not fill gaps with generic commentary at any horizon.

**Example:** "Short-term banking momentum is clear. Medium-term earnings trajectory supports the trend. Long-term structural positioning is less certain — credit growth data is stale by 3 weeks and should be interpreted cautiously."

### Rule 5: Correlation must be horizon-aware

A correlation that holds over 90 days may break over 5 days. The briefing must distinguish:

- **Short-term correlation breaks:** Signal regime change or event-driven dislocation
- **Medium-term correlation stability:** Validates current allocation logic
- **Long-term correlation trends:** Structural relationship shifts that may require mandate review

---

## Verification Checklist for Persona-Horizon Quality

After generating a briefing, verify each section against this checklist:

### Per-Section Checks

- [ ] Does Market Pulse distinguish between short, medium, and long-term market behavior?
- [ ] Does Client-Relevant Signals connect each horizon to the client's specific allocation mix?
- [ ] Does Global Linkages show external-to-India connections at each horizon?
- [ ] Do Talking Points read as conversation cues, not a restatement of the other three sections?

### Per-Persona Checks

- [ ] Would this briefing feel different if generated for a different persona?
- [ ] Is the horizon weighting appropriate for the persona (HNI = short-heavy, Institutional = medium/long-heavy)?
- [ ] Does the language match the persona's communication style?
- [ ] Are mandate constraints referenced for Institutional personas?
- [ ] Are portfolio-specific actions referenced for HNI personas?

### Cross-Horizon Consistency Checks

- [ ] Do short-term signals contradict long-term trends without acknowledgment?
- [ ] Are correlation claims consistent across horizons (or is the divergence explained)?
- [ ] Is there honest degradation where evidence is thin at any horizon?
- [ ] Would a client asking "what does this mean for me in 6 months?" get a clear answer from the brief?

---

## Common Failure Modes and Fixes

### Failure: All personas get the same summary

**Cause:** Evidence pack is not persona-filtered; prompt does not enforce persona-specific framing.

**Fix:**
- Filter the evidence pack by persona-relevant sleeves before assembly
- Add explicit persona instructions to each section prompt
- Include the customer's allocation profile as the first evidence element

### Failure: Only short-term view appears

**Cause:** Evidence assembly defaults to latest data; prompts do not request multi-horizon analysis.

**Fix:**
- Tag signals with horizon metadata during normalization
- Pass medium and long-term evidence slices alongside short-term data
- Add explicit horizon requirements to prompt contracts

### Failure: Sections blur together

**Cause:** Prompts do not enforce section boundaries; model treats all four sections as variations of "summarize the evidence."

**Fix:**
- Sharpen section-specific prompt contracts with explicit "do not do X" rules
- Pass different evidence slices to each section (e.g. Talking Points gets a reduced, conversation-oriented slice)
- Post-process to detect overlap between sections

### Failure: Correlations are stated without horizon context

**Cause:** Correlation artifacts are passed as single values without rolling window information.

**Fix:**
- Include rolling window correlation data in the evidence pack
- Prompt the model to distinguish between short-term breaks and long-term trends
- Flag significant correlation changes in the normalized signal bundle
