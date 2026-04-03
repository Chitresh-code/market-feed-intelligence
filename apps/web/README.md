# Web App

Next.js dashboard and API layer for the Sales Intelligence Agent PoC.

## Required env vars

Copy `apps/web/.env.example` to `apps/web/.env.local` and configure:

- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_MODEL`

The summary route assumes an OpenAI-compatible API surface at `LLM_BASE_URL`.
