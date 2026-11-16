---
sources: [frontend/playwright.config.ts, frontend/e2e/**, backend/src/test/**, Makefile]
---

# Testing rules

The general rules are in `harness/testing.md` (T1 to T7). ADR 0002 replaces T1.2: there is no
database engine; integration tests run against the real `SessionRegistry` in memory through HTTP.

## Levels

| Level | Tool | Runs in | Scope (harness/testing.md T1) |
|---|---|---|---|
| unit | JUnit 5 (backend), vitest with jsdom (frontend) | `make test` | pure calculations and isolated mechanisms, table-driven: domain transitions, round evaluation, store, guards |
| integration | JUnit 5 with `@QuarkusTest`, REST Assured, WireMock for GitLab, Quarkus WebSocket client | `make test` | one feature through its public interface (HTTP route, WebSocket), real `SessionRegistry` in memory, no database (ADR 0002) |
| end-to-end | Playwright (Chromium) in `frontend/e2e/` | `make e2e`, in CI with `e2e_in_ci: true` | user flows in the browser against backend profile `e2e` and the GitLab double |

## Additions

- File layout: backend tests mirror the package under `backend/src/test/java/planningpoker/`;
  frontend unit tests next to the file as `*.spec.ts`; end-to-end specs in `frontend/e2e/`.
- Builders: backend tests build sessions through the HTTP flow (create, join) with helpers in
  the test package; a `SessionBuilder` for domain unit tests comes with spec 0004. Frontend tests
  take example snapshots from `contracts/api/examples/` (from spec 0002).
- Test doubles only for GitLab (WireMock, T1.4). No mocks of own classes.
- Coverage floor: none.
- Backend tests use a free port (`quarkus.http.test-port=0`); the `test` profile writes JSON
  logs to `backend/target/quarkus-test.log`. Two worktrees run `make test` at the same time
  (T3.6).

## Areas

Which tests belong to which source paths. `implement` and `/verify` run the tests of the areas a
change touches.

| Source path | Unit and integration | End-to-end |
|---|---|---|
| `backend/src/main/java/planningpoker/platform/` | `backend/src/test/java/planningpoker/platform/` | `frontend/e2e/health.spec.ts` |
| `backend/src/main/java/planningpoker/session/` | `backend/src/test/java/planningpoker/session/` (contract and stub tests from spec 0002, domain from spec 0004) | flows of the session room (from spec 0011) |
| `backend/src/main/java/planningpoker/gitlab/` | `backend/src/test/java/planningpoker/gitlab/` (from spec 0003) | – |
| `backend/src/main/java/planningpoker/realtime/` | `backend/src/test/java/planningpoker/realtime/` (from spec 0009) | flows of the session room (from spec 0011) |
| `frontend/src/app/start/` | `frontend/src/app/start/*.spec.ts` | `frontend/e2e/health.spec.ts`, create and join flows (from spec 0011) |
| `frontend/src/app/api/` | `frontend/src/app/api/*.spec.ts` (from spec 0005) | – |
| `frontend/src/app/session/` | `frontend/src/app/session/*.spec.ts` (from spec 0012) | session room flows (from spec 0012) |

## End-to-end

- Start: the tests start the application themselves. `frontend/playwright.config.ts` has two
  `webServer` entries: the backend (`./mvnw -q -DskipTests package`, then the jar with
  `-Dquarkus.profile=e2e` on port 8080) and the frontend dev server on port 4200. The GitLab
  double (WireMock Standalone on port 8089) joins as a third entry with spec 0011. `make e2e`
  takes `harness/scripts/app-lock.sh` (owner: the branch), so only one worktree runs the
  application. The ports are 8080 and 4200 by default; `BACKEND_PORT` and `FRONTEND_PORT`
  change them when a port is taken on a developer machine. Playwright never reuses a server that
  already answers on a port (`reuseExistingServer: false`), so the tests always run against the
  profile `e2e`; a running `quarkus:dev` on the same port fails the start.
- One spec: `pnpm -C frontend exec playwright test e2e/health.spec.ts`; Playwright starts the
  servers for this run as well.
- Session setup (T6.2): there is no login. A flow creates its session through the start page or
  the REST API in a `beforeEach`; the token lands in `sessionStorage` through the application.
- Environment check (T4.3): Playwright waits for `/api/health` of the backend and for the
  frontend with a timeout and fails when one does not come up; `DEBUG=pw:webserver make e2e`
  shows the output of both servers.
- Selectors: `data-testid` first, then role and accessible name (T6.1).

## Test data

- Command: none yet. Sessions live in memory and are created through the public API
  (`POST /api/sessions`, `POST /api/sessions/{id}/participants`); the end-to-end flows create
  them in their setup. GitLab data comes from the fixed mappings of the GitLab double
  (`frontend/e2e/gitlab-double/`, from spec 0011).
- Environment check: `make e2e` starts everything; for a manual check start backend and frontend
  as in `README.md`.
- Named states: none yet; a state the flows need goes into the spec that introduces it.
- Never write rows by hand, never call internal endpoints, never click through the application to
  make data that a command makes.

## What `/verify` runs

- Automated: `make check` and the tests of the touched areas (table Areas), `make e2e` for
  changes under `frontend/src/app/` or at an endpoint.
- Browser checks: `http://localhost:4200/` with backend and frontend running
  (`README.md`, Einrichtung und Start); no login; test data as the spec names it.
- Browser checks without backend: `pnpm -C frontend start:mock` serves the frontend with the
  mock backend (`project-rules/frontend.md`, Mock backend) on port 4200, under the application
  lock like `make e2e`. The mock session is `K7P2QX9M`; a token in `sessionStorage` under
  `planningpoker.session.K7P2QX9M` with `mock-scrum-master-…` or `mock-developer-…` opens the
  room in that role. For criteria that the real backend answers (endpoints from spec 0006), the
  check runs against the backend, not the mock.
