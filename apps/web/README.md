# Web App

Next.js dashboard and API layer for the Sales Intelligence Agent PoC.

## Required env vars

Copy `apps/web/.env.example` to `apps/web/.env.local` and configure:

- `LLM_BASE_URL`
- `LLM_API_KEY`
- `LLM_MODEL`
- `LLM_REASONING_EFFORT` optional override for providers that support reasoning levels; ignored for Google's generativelanguage OpenAI-compatible endpoint

The summary route assumes an OpenAI-compatible API surface at `LLM_BASE_URL`.
