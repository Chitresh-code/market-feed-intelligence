# Demo Storyboard & Script
## Macquarie India — Sales Intelligence Agent PoC

| Field | Detail |
|---|---|
| Version | v1.0 |
| Audience | Macquarie Head of Technology / CDO / Head of Wealth |
| Duration | 10–12 minutes |
| Format | Live demo — agent generates summaries in real time |
| Presenter | Solutions Lead / RM |

---

## Audience Brief

### Who is in the room

| Role | Technical depth | What they care about |
|---|---|---|
| Head of Technology / CDO | 8/10 | Architecture soundness, integration path to prod, data provenance |
| Head of Wealth / Business Lead | 3/10 | RM time savings, client experience, competitive differentiation |
| Relationship Manager (if present) | 4/10 | Does this actually work for my clients? Is it accurate? |

### What will land

- **Speed** — the fact that it generates in under 30 seconds will surprise everyone
- **Specificity** — the correlation between a US sector move and a specific Indian client's holdings is the wow moment
- **Differentiation by persona** — showing HNI vs Institutional summaries back-to-back proves it is not a template

### Likely objections

| Objection | Suggested response |
|---|---|
| "How do we know the AI isn't making up portfolio values?" | "Every number you see comes from either the customer's own data or a verified market source. The AI's job is to write — not to calculate." |
| "Is this using our actual client data?" | "For the PoC, we use synthetic profiles that mirror real client archetypes. Production integration would connect to your CRM and OMS via API." |
| "What happens when markets are closed or data is stale?" | "The agent always displays data timestamps. If the last close was yesterday, it says so clearly." |
| "Can it go wrong?" | "Yes — which is why the RM reviews before sharing. This is a brief generator, not an autonomous advisor." |

---

## Pre-Demo Checklist

- [ ] All market data pre-fetched and cached for today's date
- [ ] Finnhub news fetched and filtered for all 5 customers
- [ ] ChromaDB populated with latest signals
- [ ] All 5 customer profiles load correctly in the sidebar
- [ ] Claude API key active and streaming tested
- [ ] Offline mode enabled (demo should not depend on live internet)
- [ ] Browser window at 1920×1080, Tailwind dark mode off
- [ ] Demo script printed and ready for presenter
- [ ] Screen recording running (always record the demo)

---

## Scene 1 — The Hook *(0:00 – 0:45)*

**What's on screen:** The agent UI — clean, minimal. Left sidebar shows 5 client names. Main panel is empty with a placeholder: *"Select a client to generate today's brief."*

**Presenter says:**

> "Every morning, your Relationship Managers prepare for client calls. They check WhatsApp groups, pull up Moneycontrol, look at the client's CRM notes from three weeks ago, and try to mentally connect everything happening in global markets to what that specific client holds. On a good day, one brief takes two hours. On a busy day, the brief doesn't happen."

> "What I'm going to show you now takes thirty seconds."

**Action:** Click on *Arjun Mehta* in the sidebar.

**Audience moment:** The client's portfolio snapshot appears in the right panel — sectors, holdings, last meeting date. The audience sees real-looking data. It feels live.

---

## Scene 2 — The Brief Generates *(0:45 – 3:00)*

**What's on screen:** Arjun Mehta selected. A "Generate Today's Brief" button visible. Below it — an empty summary panel with section headers already shown: *Market Pulse · Portfolio Signals · Global Linkages · Talking Points.*

**Presenter says:**

> "Arjun is an HNI equity client — 25% in Nifty IT, 20% in banking, the rest across FMCG and mid-caps. His RM has a call with him at 11am. Let's see what the agent prepares."

**Action:** Click *Generate Today's Brief.*

**What happens:** Text begins streaming immediately — the "Market Pulse" section fills first. The audience watches words appear in real time.

**Presenter says (while it streams, narrating lightly):**

> "It's pulling last night's US market closes, this morning's India pre-open signals, FRED macro data, and Arjun's specific portfolio context — all simultaneously."

**Pause.** Let the brief complete. Do not rush this moment. The streaming itself is part of the demo.

**Audience moment:** *"Wait — it's actually doing it right now."*

---

## Scene 3 — Walk Through the Brief *(3:00 – 6:30)*

**What's on screen:** Completed brief for Arjun Mehta. Walk through it section by section.

**Presenter says:**

**On Market Pulse section:**
> "This is today's market snapshot — but it's not just a list of numbers. It's already interpreted. Nifty 50 is down 0.8%. VIX is elevated. That context is set before the RM even opens the call."

**On Portfolio Signals section:**
> "Now here's where it gets specific. Arjun holds 25% in Nifty IT. Last night, XLK — the US Technology ETF — rose 2%. The agent knows that Nifty IT has a 0.72 historical correlation with XLK. So it surfaces this as the lead signal for Arjun's portfolio. It tells the RM: watch for Nifty IT to follow US tech higher today, and here's why that matters for Arjun's position."

**On Global Linkages section:**
> "This is the section no RM can produce manually in two hours. The agent connects five global signals to Arjun's specific holdings — US energy, the dollar index, the yield curve — and explains each one in plain English. Not Bloomberg jargon. Language Arjun will understand."

**On Talking Points section:**
> "Three ready-to-use conversation starters. The RM doesn't need to prepare anything. They walk in knowing exactly what to say."

**Audience moment:** *"How did it know XLK was relevant to Arjun's IT holdings?"*

**Presenter responds:**
> "Because it knows Arjun's sector allocation. The correlation engine runs every night against 90 days of price history. It doesn't guess — it computes."

---

## Scene 4 — Persona Switch *(6:30 – 8:30)*

**What's on screen:** Switch to *Macquarie India Growth Fund* in the sidebar — an Institutional Fund persona.

**Presenter says:**

> "Now watch what happens when we switch to an institutional client. Same engine. Same data. Completely different brief."

**Action:** Click on *Macquarie India Growth Fund.* Click *Generate Today's Brief.*

**While it streams:**
> "This is a multi-asset fund — 45% equity, 30% fixed income, 25% commodities. The Head of Wealth at this fund doesn't want to hear about individual stock moves. They want macro regime analysis."

**After it completes — highlight the differences:**

> "Notice the opening — it's not portfolio performance. It's a macro regime statement. The sections focus on cross-asset signals: what the US yield curve is doing, what the dollar index means for EM flows, what the high-yield credit spread says about global risk appetite."

> "Same technology. Same data feeds. The persona engine ensures the brief speaks the language of whoever is reading it."

**Audience moment:** *"It's not a template. It actually changes."*

---

## Scene 5 — The Invitation *(8:30 – 10:30)*

**What's on screen:** Split view or return to the main dashboard showing both clients side by side if UI supports it. Otherwise return to the agent home screen.

**Presenter says:**

> "What you've seen today is a working proof of concept — built in three weeks, using open financial data, running entirely on standard infrastructure. No proprietary data sources were required."

> "The path from here is straightforward. A four-week pilot connects this to your actual CRM and portfolio data — the synthetic profiles we used today are replaced with your real clients. Five RMs use it for a month. We measure brief preparation time before and after. We collect RM feedback on accuracy and relevance."

> "The goal is simple: every Relationship Manager at Macquarie India walks into every client meeting with the best brief your firm has ever produced — regardless of how long they've been here, how well-connected they are, or how busy their morning was."

> "That's what this agent delivers."

**Pause. Open for questions.**

---

## Anticipated Q&A

**Q: Can we connect this to our actual Salesforce CRM?**
> Yes — the customer data layer is a simple API interface. Replacing the synthetic JSON with a Salesforce connector is a two-day engineering task. We'd scope that in the pilot phase.

**Q: What model is powering the summaries?**
> Claude Sonnet 4 from Anthropic — the same model family used by enterprise teams at Amazon, Notion, and others. It runs via API, so no model hosting is required on your infrastructure.

**Q: How do we prevent the AI from giving wrong advice?**
> The agent generates briefs, not advice. Every factual claim in the summary is grounded in either the customer's own portfolio data or a verified market data source. The system prompt explicitly instructs the model not to estimate or infer numbers. The RM reviews before any client interaction.

**Q: What's the data latency? Is this real-time?**
> Market data is pulled at end of day — the brief reflects last close plus any pre-market signals available in the morning. For a PoC, this is appropriate. Production can add an intraday refresh for key signals.

**Q: How much does this cost to run?**
> The data layer uses entirely free APIs — Yahoo Finance, FRED, Finnhub free tier. The only cost is Anthropic API usage — approximately $0.01–0.03 per summary at current pricing. For 50 RMs generating 5 briefs daily, that is under $75/month in API costs.

**Q: How long to production?**
> Pilot: 4 weeks. Production-ready with CRM integration, audit logging, and compliance review: 12–16 weeks.

---

## Contingency Plan

**If the live demo fails (internet down, API error, Claude timeout):**

1. Do not panic. Say: *"Let me show you a pre-generated brief from this morning — the agent ran at 7am today."*
2. Open the pre-saved brief (stored as static HTML in the browser tab — always pre-load this before the demo)
3. Walk through it exactly as you would a live brief — the content is identical
4. Emphasise: *"This is what every RM would see when they arrive at their desk."*

**If a specific correlation is questioned as wrong:**

Say: *"Great observation. The correlation is computed on 90 days of price history — it reflects structural relationships, not necessarily today's specific move. That's why the RM reviews the brief before the call. The agent surfaces the signal; the RM applies judgment."*

**If the audience is not engaged by Scene 2:**

Skip ahead to Scene 4 (persona switch) — the contrast between HNI and Institutional briefs is often the stronger wow moment for business audiences.

---

*Demo script v1.0 — Macquarie India Sales Intelligence Agent PoC*
