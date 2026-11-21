# ── k6-performance-testing Makefile ──────────────────────────────────
# Run `make` (or `make help`) to list all targets.
# k6 runs directly on your machine (see README for install) — only the
# QuickPizza test target is containerized (compose.yaml).

.DEFAULT_GOAL := help

PNPM := pnpm
K6   := k6

.PHONY: help setup install up down pull jenkins version run lint format format-check typecheck check

help: ## Show this help
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## / \
	  {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ── Setup ─────────────────────────────────────────────────────────────

install: ## Install workspace dependencies (pnpm)
	$(PNPM) install

setup: ## First-time setup: check prerequisites, install deps, start QuickPizza
	@./scripts/setup.sh

up: ## Start the self-hosted QuickPizza target → http://localhost:3333
	docker compose up -d quickpizza

down: ## Stop QuickPizza + Jenkins and remove containers
	docker compose --profile jenkins down

pull: ## Pull the QuickPizza image (compose.yaml)
	docker compose pull

jenkins: ## Build + start local Jenkins for ci-cd/ → http://localhost:8080
	docker compose --profile jenkins up -d --build

version: ## Print the installed k6 version
	$(K6) version

# ── Running scenarios ────────────────────────────────────────────────

run: ## Run a scenario: make run s=intro/load-test.ts
	@test -n "$(s)" || { echo 'Usage: make run s=intro/smoke-test.ts'; exit 1; }
	$(K6) run "$(s)"

# ── Quality ──────────────────────────────────────────────────────────

lint: ## Lint (oxlint) + format check (prettier)
	$(PNPM) lint

format: ## Format everything (prettier)
	$(PNPM) format

format-check: ## Check formatting without writing (prettier)
	$(PNPM) format:check

typecheck: ## Type-check all TypeScript (tsc --noEmit)
	$(PNPM) typecheck

check: lint typecheck ## Run all quality gates
