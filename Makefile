.PHONY: web service dev install install-web install-service

DATE ?= $(shell date +%Y-%m-%d)

# Run frontend dev server
web:
	cd apps/web && npm run dev

JOB ?= refresh_cache

# Run a backend job (usage: make service JOB=normalize, optionally DATE=2026-04-02)
service:
	cd apps/service && set -a && source .env && set +a && uv run python -m src.jobs.$(JOB) --date $(DATE)

# Run both frontend and backend normalize job in parallel
dev:
	$(MAKE) -j2 web normalize

normalize:
	cd apps/service && set -a && source .env && set +a && uv run python -m src.jobs.normalize --date $(DATE)

# Install all dependencies
install: install-web install-service

install-web:
	cd apps/web && npm install

install-service:
	cd apps/service && uv sync
