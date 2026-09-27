# Pesan AI monorepo - convenience targets.
# The Next.js app lives in web/ (package name: pesan-ai); docs/ is a separate package.

PNPM := pnpm
APP  := pesan-ai

# ---- OS-aware shell + commands -------------------------------------------
ifeq ($(OS),Windows_NT)
  SHELL       := powershell.exe
  .SHELLFLAGS := -NoProfile -Command
  HELP_CMD     = Get-Content $(MAKEFILE_LIST) | Where-Object { $$_ -match '^([a-zA-Z_-]+):.*?\#\# (.*)$$' } | ForEach-Object { $$Matches[1].PadRight(16) + $$Matches[2] } | Sort-Object
  SCAFFOLD_ENV = if (-not (Test-Path web/.env)) { Copy-Item web/.env.example web/.env; Write-Host 'Created web/.env from web/.env.example - fill in your DB, Better Auth, and WhatsApp values, then run make dev.' }
  CLEAN_CMD    = Remove-Item -Recurse -Force -ErrorAction SilentlyContinue node_modules,web/node_modules,docs/node_modules,web/.next,web/coverage; exit 0
else
  SHELL       := /bin/sh
  HELP_CMD     = grep -E '^[a-zA-Z_-]+:.*?\#\# .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN{FS=":.*?\#\# "}{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'
  SCAFFOLD_ENV = [ -f web/.env ] || { cp web/.env.example web/.env && echo "Created web/.env from web/.env.example - fill in your DB, Better Auth, and WhatsApp values, then run make dev."; }
  CLEAN_CMD    = rm -rf node_modules web/node_modules docs/node_modules web/.next web/coverage
endif

.PHONY: help setup web-dev web-build web-start web-test test docker-build clean

help: ## Show this help
	@echo "Pesan AI monorepo targets:"
	@$(HELP_CMD)

setup: ## First-time setup: install deps, generate Prisma client, scaffold web/.env
	$(PNPM) install
	$(PNPM) --filter $(APP) exec prisma generate
	@$(SCAFFOLD_ENV)

web-dev: ## Run the web app in development
	$(PNPM) --filter $(APP) dev

web-build: ## Build the web app (runs prisma generate + next build)
	$(PNPM) --filter $(APP) build

web-start: ## Start the built web app
	$(PNPM) --filter $(APP) start

web-test: ## Run only the web app's tests
	$(PNPM) --filter $(APP) test

test: web-test ## Run all tests in the monorepo (add each package's *-test target here)

docker-build: ## Build the app Docker image locally
	docker build -f .deployment/app/Dockerfile -t pesanai:local .

clean: ## Remove installed deps and build artifacts
	$(CLEAN_CMD)
