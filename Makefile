SHELL := /bin/zsh

.PHONY: web api dev install install-web install-service \
	service refresh bootstrap bootstrap-personas bootstrap-customers bootstrap-correlations

DATE ?= $(shell date +%Y-%m-%d)
SERVICE_PORT ?= 8000
JOB ?= refresh_cache

web:
	cd apps/web && npm run dev

api:
	cd apps/service && set -a && source .env && set +a && uv run uvicorn api.app:app --reload --port $(SERVICE_PORT)

dev:
	$(MAKE) -j2 web api

service:
	cd apps/service && set -a && source .env && set +a && uv run python -m jobs.$(JOB) --date $(DATE)

refresh:
	cd apps/service && set -a && source .env && set +a && uv run python -m jobs.refresh_cache --date $(DATE)

bootstrap: bootstrap-personas bootstrap-customers bootstrap-correlations

bootstrap-personas:
	cd apps/service && set -a && source .env && set +a && uv run python -m jobs.bootstrap_personas

bootstrap-customers:
	cd apps/service && set -a && source .env && set +a && uv run python -m jobs.bootstrap_customers

bootstrap-correlations:
	cd apps/service && set -a && source .env && set +a && uv run python -m jobs.bootstrap_correlation_mappings

install: install-web install-service

install-web:
	cd apps/web && npm install

install-service:
	cd apps/service && uv sync
