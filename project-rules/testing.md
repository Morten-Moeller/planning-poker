---
sources: [frontend/playwright.config.ts, frontend/e2e/**, backend/src/test/**, Makefile]
---

# Testing rules

The general rules are in `harness/testing.md` (T1 to T7). ADR 0002 replaces T1.2: there is no
database engine; integration tests run against the real `SessionRegistry` in memory through HTTP.

## Levels

| Level       | Tool                                                                                     | Runs in                                  | Scope (harness/testing.md T1)                                                                                              |
| ----------- | ---------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| unit        | JUnit 5 (backend), vitest with jsdom (frontend)                                          | `make test`                              | pure calculations and isolated mechanisms, table-driven: domain transitions, round evaluation, store, guards               |
| integration | JUnit 5 with `@QuarkusTest`, REST Assured, WireMock for GitLab, Quarkus WebSocket client | `make test`                              | one feature through its public interface (HTTP route, WebSocket), real `SessionRegistry` in memory, no database (ADR 0002) |
| end-to-end  | Playwright (Chromium) in `frontend/e2e/`                                                 | `make e2e`, in CI with `e2e_in_ci: true` | user flows in the browser against backend profile `e2e` and the GitLab double                                              |

## Additions

- File layout: backend tests mirror the package under `backend/src/test/java/planningpoker/`;
  frontend unit tests next to the file as `*.spec.ts`; end-to-end specs in `frontend/e2e/`.
- Builders: backend integration tests build sessions through the HTTP flow (create, join) with
  helpers in the test package; domain unit tests use `SessionBuilder` in
  `backend/src/test/java/planningpoker/session/` (defaults: scrum master, two connected
  developers, issue 42; `inPhase`, `voting`, `revealed`, `confirming`). Frontend tests take
  example snapshots from `contracts/api/examples/` (from spec 0002).
- Test doubles only for GitLab (WireMock, T1.4) and the clock (`TestClock` in the session test
  package, T4.1). No mocks of own classes.
- Coverage floor: none.
- Backend tests use a free port (`quarkus.http.test-port=0`); the `test` profile writes JSON
  logs to `backend/target/quarkus-test.log`. Two worktrees run `make test` at the same time
  (T3.6).

## Areas

Which tests belong to which source paths. `implement` and `/verify` run the tests of the areas a
change touches.

| Source path                                     | Unit and integration                                                                                           | End-to-end                                                                                                       |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `backend/src/main/java/planningpoker/platform/` | `backend/src/test/java/planningpoker/platform/`                                                                | `frontend/e2e/health.spec.ts`                                                                                    |
| `backend/src/main/java/planningpoker/session/`  | `backend/src/test/java/planningpoker/session/` (contract and stub tests from spec 0002, domain from spec 0004) | `frontend/e2e/create-and-join.spec.ts`                                                                           |
| `backend/src/main/java/planningpoker/gitlab/`   | `backend/src/test/java/planningpoker/gitlab/` (from spec 0003)                                                 | –                                                                                                                |
| `backend/src/main/java/planningpoker/realtime/` | `backend/src/test/java/planningpoker/realtime/` (from spec 0009)                                               | `frontend/e2e/create-and-join.spec.ts`                                                                           |
| `frontend/src/app/start/`                       | `frontend/src/app/start/*.spec.ts`                                                                             | `frontend/e2e/health.spec.ts`, `frontend/e2e/create-and-join.spec.ts`                                            |
| `frontend/src/app/api/`                         | `frontend/src/app/api/*.spec.ts` (from spec 0005)                                                              | –                                                                                                                |
| `frontend/src/app/join/`                        | `frontend/src/app/join/*.spec.ts`                                                                              | `frontend/e2e/create-and-join.spec.ts`                                                                           |
| `frontend/src/app/session/`                     | `frontend/src/app/session/*.spec.ts`                                                                           | `frontend/e2e/create-and-join.spec.ts`, `frontend/e2e/session-room.spec.ts`, `frontend/e2e/voting-round.spec.ts` |

## End-to-end

- Start: the tests start the application themselves. `frontend/playwright.config.ts` has three
  `webServer` entries: the GitLab double (WireMock Standalone, `--root-dir
frontend/e2e/gitlab-double`, ready at `/__admin/health`), the backend (`./mvnw -q -DskipTests
package`, then the jar with `-Dquarkus.profile=e2e` and
  `-Dplanningpoker.gitlab.base-url=http://localhost:<GITLAB_DOUBLE_PORT>`) and the frontend dev
  server. `make gitlab-double` fetches the jar to `backend/target/gitlab-double/` (part of
  `make install`; `make e2e` runs it first). `make e2e` takes `harness/scripts/app-lock.sh`
  (owner: the branch), so only one worktree runs the application. The ports are 8080 (backend),
  4200 (frontend) and 8089 (GitLab double) by default; `BACKEND_PORT`, `FRONTEND_PORT` and
  `GITLAB_DOUBLE_PORT` change them when a port is taken on a developer machine. Playwright never
  reuses a server that already answers on a port (`reuseExistingServer: false`), so the tests
  always run against the profile `e2e` and the double; a running `quarkus:dev` on the same port
  fails the start.
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
  them in their setup. Backend tests of the session area run with the test resource
  `WireMockGitLab` and stub GitLab through `backend/src/test/java/planningpoker/session/GitLabStubs.java`
  (issue 42 of project 1234 by default, searches, failures, delays); every test resets the stubs
  in its `@BeforeEach`. Tests of the realtime area use the same test resource with
  `backend/src/test/java/planningpoker/realtime/RestCalls.java` (REST flow and the stub of issue 42) and `SocketClient.java` (WebSocket client with timeouts). GitLab data of the end-to-end
  flows comes from the fixed mappings of the GitLab double in
  `frontend/e2e/gitlab-double/mappings/` (spec 0011): project `1234` with issues 42 and 43, the
  issue search of the project (both issues), notes and weight of both issues; issue 404 answers 404. Issue 44 (spec 0012) has `**fett**`, a `<script>` element and an `<img onerror>` in its
  description for the check of the Markdown sanitizing; it is not part of the issue search. A
  flow that needs other GitLab data adds a mapping there.
- Environment check: `make e2e` starts everything; for a manual check start backend and frontend
  as in `README.md`.
- Named states: none yet; a state the flows need goes into the spec that introduces it. The
  flows of spec 0011 and `session-room.spec.ts` (spec 0012) create their session through the
  start page (issue 42, issue 44 for the sanitizing check) and join through the join page in a
  second browser context; `voting-round.spec.ts` (spec 0013) joins two or three developers the
  same way.
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
  room in that role. The mock answers issue number 404 at the create form with
  `ISSUE_NOT_FOUND`, the name `Ben` at the join page with `NAME_TAKEN` and every other session id
  with `SESSION_NOT_FOUND` (spec 0011). For criteria that the real backend answers (endpoints from spec 0006), the
  check runs against the backend, not the mock.
