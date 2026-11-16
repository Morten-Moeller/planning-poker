# Quality gates. The target names are the contract with CI (harness/quality-gates.md).
# test, typecheck, lint and e2e run both projects. sast, deps, drift, check, setup and help come
# from harness/gates.mk. e2e starts backend and frontend itself (Playwright webServer) under
# harness/scripts/app-lock.sh, so only one worktree runs the application at a time.

include harness/gates.mk

# The backend needs JDK 21. When JAVA_HOME is not set, take the JDK 21 of macOS when it exists.
ifeq ($(origin JAVA_HOME), undefined)
JAVA_21 := $(shell /usr/libexec/java_home -v 21 2>/dev/null)
ifneq ($(JAVA_21),)
export JAVA_HOME := $(JAVA_21)
endif
endif

MVN = cd backend && ./mvnw -q -B
PNPM = pnpm -C frontend -s
E2E_OWNER ?= $(shell git branch --show-current 2>/dev/null || echo make-e2e)

.PHONY: test test-backend test-frontend typecheck typecheck-backend typecheck-frontend
.PHONY: lint lint-backend lint-frontend format e2e install

test: test-backend test-frontend ## Unit and integration tests of both projects

test-backend: ## Backend tests (JUnit, REST Assured, free port)
	$(MVN) test

test-frontend: ## Frontend unit tests (vitest, once)
	$(PNPM) test

typecheck: typecheck-backend typecheck-frontend ## Static type check of both projects

typecheck-backend: ## Compile main and test sources
	$(MVN) -DskipTests compile test-compile

typecheck-frontend: ## Angular build with strict templates
	$(PNPM) typecheck

lint: lint-backend lint-frontend ## Style and static rules of both projects

lint-backend: ## Spotless check (palantir-java-format)
	$(MVN) spotless:check

lint-frontend: ## angular-eslint and Prettier check
	$(PNPM) lint

format: ## Apply the formatters of both projects
	$(MVN) spotless:apply
	$(PNPM) format

e2e: ## End-to-end tests; starts backend (profile e2e) and frontend under the application lock
	@harness/scripts/app-lock.sh acquire --owner "$(E2E_OWNER)" --wait 900
	@status=0; $(PNPM) e2e || status=$$?; harness/scripts/app-lock.sh release --owner "$(E2E_OWNER)"; exit $$status

install: ## Install the dependencies of both projects and the Playwright browser
	$(PNPM) install --frozen-lockfile
	$(PNPM) exec playwright install chromium
	$(MVN) quarkus:go-offline
