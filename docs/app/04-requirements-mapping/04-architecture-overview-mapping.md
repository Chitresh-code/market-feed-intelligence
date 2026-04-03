# Architecture Overview Mapping

Source: [docs/requirements/04-architecture-overview.md](/Users/chitreshgyanani/qtsolv/MacquirePOC/docs/requirements/04-architecture-overview.md)

## Macquarie India — Sales Intelligence Agent PoC

- Requirement intent: define the end-state PoC architecture.
- Implementation: accepted in narrowed form.

## System Layers

- Requirement intent: show layered decomposition across UI, orchestration, signals, and data.
- Implementation: active as:
  - `apps/web`
  - `apps/service`
  - `data/cache`
- Decision reference: ADR-003, ADR-004.

## Data Flow — Request Lifecycle

- Requirement intent: separate batch prep from request-time generation.
- Implementation: active and documented in [docs/app/02-runtime-flow.md](/Users/chitreshgyanani/qtsolv/MacquirePOC/docs/app/02-runtime-flow.md).

## Component Dependency Map

- Requirement intent: make dependencies explicit.
- Implementation: active in code, but not redrawn as a diagram yet.
- Gap: if needed, this can be added as a dedicated runtime diagram later.

## Technology Decisions

### Why Next.js 14 (App Router)?

- Requirement intent: justify the web framework.
- Implementation decision changed: the app is on Next.js 16 now.

### Why ChromaDB?

- Requirement intent: justify vector retrieval.
- Implementation decision changed: ChromaDB is not in the active runtime path.
- Decision reference: ADR-010.

### Why Claude Sonnet 4?

- Requirement intent: specify the summarizer model.
- Implementation decision changed: the app uses an OpenAI-compatible SDK and configurable provider/model.
- Decision reference: ADR-009.

### Why yfinance + fredapi over a paid data provider?

- Requirement intent: justify source selection for a PoC.
- Implementation: accepted.

## Infrastructure (PoC)

- Requirement intent: describe the deployable footprint.
- Implementation: single-repo local PoC with cache-backed runtime and local job orchestration.

## Project File Structure

- Requirement intent: provide the codebase layout.
- Implementation: partly aligned but updated to the current repo structure.
- Current source of truth:
  - [README.md](/Users/chitreshgyanani/qtsolv/MacquirePOC/README.md)
  - [docs/app/01-overview.md](/Users/chitreshgyanani/qtsolv/MacquirePOC/docs/app/01-overview.md)
