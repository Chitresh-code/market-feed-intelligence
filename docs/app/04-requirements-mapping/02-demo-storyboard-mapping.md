# Demo Storyboard Mapping

Source: [docs/requirements/02-demo-storyboard-script.md](/Users/chitreshgyanani/qtsolv/MacquirePOC/docs/requirements/02-demo-storyboard-script.md)

## Audience Brief

### Who is in the room

- Requirement intent: optimize the demo for business and product stakeholders.
- Implementation: the dashboard and briefing flow are presentation-first and RM-oriented.

### What will land

- Requirement intent: show personalization, signal linkage, and fast briefing generation.
- Implementation: active and visible in the current dashboard flow.

### Likely objections

- Requirement intent: prepare for questions about relevance, reliability, and data quality.
- Implementation: addressed by cache-backed artifacts, provenance, and stricter grounding rules.

## Pre-Demo Checklist

- Requirement intent: ensure cache prep and offline-safe behavior.
- Implementation: realized through `jobs.refresh_cache` and manifest-backed dashboard loading.
- Docs reference: [docs/app/03-operations.md](/Users/chitreshgyanani/qtsolv/MacquirePOC/docs/app/03-operations.md).

## Scene 1 — The Hook

- Requirement intent: land the problem quickly.
- Implementation: supported by the client selector plus immediate access to mandate, allocation profile, and briefing generation.

## Scene 2 — The Brief Generates

- Requirement intent: make summary generation the visible moment of intelligence.
- Implementation: active in the `Live Briefing Layer` with streaming four-section output.

## Scene 3 — Walk Through the Brief

- Requirement intent: show how the brief is grounded in signals and client context.
- Implementation: active through evidence panels and summary sections.

## Scene 4 — Persona Switch

- Requirement intent: prove that switching clients changes the briefing.
- Implementation: active, including per-customer session persistence for generated briefs.
- Decision reference: ADR-011.

## Scene 5 — The Invitation

- Requirement intent: make the PoC feel extensible and productionizable.
- Implementation: partly supported through clean app/service separation and explicit decision records.

## Anticipated Q&A

- Requirement intent: prepare for objections around data, reliability, and scalability.
- Implementation: partly documented in:
  - [docs/internal/architecture-decision-record.md](/Users/chitreshgyanani/qtsolv/MacquirePOC/docs/internal/architecture-decision-record.md)
  - [docs/app/03-operations.md](/Users/chitreshgyanani/qtsolv/MacquirePOC/docs/app/03-operations.md)

## Contingency Plan

- Requirement intent: preserve demo quality when dependencies fail.
- Implementation:
  - cached data path is active
  - refresh flow is explicit
  - generated brief persistence helps during live switching
- Gap: there is no active fallback-summary path right now by design
