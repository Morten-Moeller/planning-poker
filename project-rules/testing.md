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

| Source path                                                                                              | Unit and integration                                                                                           | End-to-end                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/src/main/java/planningpoker/platform/`                                                          | `backend/src/test/java/planningpoker/platform/`                                                                | `frontend/e2e/health.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                           |
| `backend/src/main/java/planningpoker/session/`                                                           | `backend/src/test/java/planningpoker/session/` (contract and stub tests from spec 0002, domain from spec 0004) | `frontend/e2e/create-and-join.spec.ts`, `frontend/e2e/project-picker.spec.ts`, `frontend/e2e/issue-filter.spec.ts`                                                                                                                                                                                                                                                                                                                      |
| `backend/src/main/java/planningpoker/gitlab/`                                                            | `backend/src/test/java/planningpoker/gitlab/` (from spec 0003)                                                 | –                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `backend/src/main/java/planningpoker/realtime/`                                                          | `backend/src/test/java/planningpoker/realtime/` (from spec 0009)                                               | `frontend/e2e/create-and-join.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                  |
| `frontend/src/app/start/`                                                                                | `frontend/src/app/start/*.spec.ts`                                                                             | `frontend/e2e/health.spec.ts`, `frontend/e2e/create-and-join.spec.ts`, `frontend/e2e/project-picker.spec.ts`                                                                                                                                                                                                                                                                                                                            |
| `frontend/src/app/api/`                                                                                  | `frontend/src/app/api/*.spec.ts` (from spec 0005)                                                              | –                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `frontend/src/app/shell/`, `frontend/src/styles.scss`, `frontend/src/styles/`, `frontend/src/index.html` | `frontend/src/app/shell/*.spec.ts`                                                                             | `frontend/e2e/theme.spec.ts`, `frontend/e2e/layout.spec.ts`, `frontend/e2e/design-sidebar.spec.ts`                                                                                                                                                                                                                                                                                                                                      |
| `frontend/src/app/join/`                                                                                 | `frontend/src/app/join/*.spec.ts`                                                                              | `frontend/e2e/create-and-join.spec.ts`, `frontend/e2e/full-flow.spec.ts`                                                                                                                                                                                                                                                                                                                                                                |
| `frontend/src/app/session/`                                                                              | `frontend/src/app/session/*.spec.ts`                                                                           | `frontend/e2e/create-and-join.spec.ts`, `frontend/e2e/session-room.spec.ts`, `frontend/e2e/voting-round.spec.ts`, `frontend/e2e/result-round.spec.ts`, `frontend/e2e/round-timer.spec.ts`, `frontend/e2e/outliers.spec.ts`, `frontend/e2e/consensus.spec.ts`, `frontend/e2e/full-flow.spec.ts`, `frontend/e2e/layout.spec.ts`, `frontend/e2e/issue-filter.spec.ts`, `frontend/e2e/theme.spec.ts`, `frontend/e2e/design-sidebar.spec.ts` |

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
  `GITLAB_DOUBLE_PORT` change them when a port is taken on a developer machine. `make e2e` never
  reads `.env` (only `make backend` and `make frontend` do), so it sees neither the GitLab token
  nor the ports from there; set the variables on the call. Playwright never
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
- Discussion (spec 0026, ADR 0010): a release, an issue switch and a new round lead to
  `DISCUSSION`. A flow that votes calls `startVoting(page)` from `frontend/e2e/helpers.ts` with the
  page of the scrum master after the release or the new round; it waits for „Diskussion“, clicks
  `round-start` and waits for „Runde läuft“.

## Test data

- Command: none yet. Sessions live in memory and are created through the public API
  (`POST /api/sessions`, `POST /api/sessions/{id}/participants`); the end-to-end flows create
  them in their setup. Backend tests of the session area run with the test resource
  `WireMockGitLab` and stub GitLab through `backend/src/test/java/planningpoker/session/GitLabStubs.java`
  (issue 42 of project 1234 by default, searches, projects, failures, delays); every test resets the stubs
  in its `@BeforeEach`. `ConfirmRoundTest` runs with the test resource `GitLabStubs.HeldGitLab`
  (timeout 5 s): `noteHeld` holds the answer to the note until the test calls
  `HeldResponses.release()`, so the checks during the confirmation do not depend on a delay
  (spec 0032). Tests of the realtime area use the same test resource with
  `backend/src/test/java/planningpoker/realtime/RestCalls.java` (REST flow and the stub of issue 42) and `SocketClient.java` (WebSocket client with timeouts). GitLab data of the end-to-end
  flows comes from the fixed mappings of the GitLab double in
  `frontend/e2e/gitlab-double/mappings/` (spec 0011): project `1234` with issues 42 and 43, the
  issue search of the project (both issues, header `X-Total`; also the mappings of the weight
  filters, spec 0030), notes and weight of both issues; issue 404 answers
  404, issue 403 answers 403 (`issue-403.json`, spec 0021). The project search
  (`projects-search.json`) and project `1234` (`project-1234.json`) answer the project
  „Planning Poker Test“ with path `group/project` (spec 0022). Issue 44 (spec 0012) has `**fett**`, a `<script>` element, an `<img onerror>` and an
  image from `https://tracker.example/pixel.gif` in its description for the check of the
  Markdown sanitizing and of the Content-Security-Policy (spec 0019); it is not part of the
  issue search. The search text `kein Treffer` answers an empty list
  (`issues-search-empty.json`, spec 0019). A flow that needs GitLab data with state adds it at
  run time through the admin API of the double with `frontend/e2e/gitlab-double.ts`:
  `stubIssueWithFailingFirstNote` stubs an issue with a unique iid (`uniqueIssueIid`) whose
  first note answers 500 and every later note 201, `removeStubs` removes the stubs after the
  test, `countNotes` counts the notes of an issue. The iid is unique per test, so repeated and
  parallel runs share no WireMock scenario (spec 0019). A flow that needs other fixed GitLab
  data adds a mapping there.
- Environment check: `make e2e` starts everything; for a manual check start backend and frontend
  as in `README.md`.
- Named states: none yet; a state the flows need goes into the spec that introduces it. The
  flows of spec 0011 and `session-room.spec.ts` (spec 0012) create their session through the
  start page (issue 42, issue 44 for the sanitizing check) and join through the join page in a
  second browser context; `voting-round.spec.ts` (spec 0013) joins two or three developers the
  same way; `result-round.spec.ts` (spec 0014) joins two developers for the result and the
  new round and stubs its own issue for the GitLab error (`gitlab-double.ts`); `round-timer.spec.ts` (spec 0016) joins one
  developer, sets the timer to 15 s, checks the discussion without cards and remaining time, starts
  the voting (spec 0026) and waits the real duration for the reveal by the server;
  `outliers.spec.ts` (spec 0017) joins two developers on issue 42;
  `consensus.spec.ts` (spec 0018) joins two developers on issue 42, both vote `5`, and runs one
  flow under `reducedMotion: 'reduce'`; `full-flow.spec.ts` (spec 0019) runs the whole flow with
  a scrum master and two developers (one joins through the link, one through the session id on
  the start page, both in small letters) on issues 42 and 43, confirms issue 43 and counts its
  notes in the double, and opens an unknown session id with a stored token;
  `layout.spec.ts` (spec 0019) joins one developer at a viewport of 375×800 and checks the
  320 px side column at 1440×900 (spec 0027); `theme.spec.ts` (spec 0027) reads the theme
  CSS variables under `emulateMedia({ colorScheme })`, the fonts and the keyboard focus on the start
  page and joins two developers (`Ben`, and `Cem` at 375×800) for the toolbar;
  `layout.spec.ts` also checks at 375×800 that the side column stands under the main area (spec
  0028); `design-sidebar.spec.ts` (spec 0028) joins `Ben` on issue 42, compares `data-motif` of
  both roles before and after „Erneut schätzen“, confirms the result `5` (notes mapping of issue 42)
  and checks `last-result` until the release of issue 43; it also compares the motif colours of
  room, toolbar and the card backs of the join page light and dark (spec 0032).
  `voting-round.spec.ts` chooses a card with the keyboard and checks the table, the 6 columns at
  375 px (spec 0029) and the deck of at most 1000 px with portrait cards at 1920 px (spec 0032);
  `consensus.spec.ts` checks the result under reduced motion (spec 0029);
  `issue-filter.spec.ts` checks the project name and „von N Issues“, `result-round.spec.ts` the
  error text in the confirm dialog (spec 0030); `create-and-join.spec.ts` checks the start and
  join page at 375 px light and dark and the state `join-not-found` (spec 0031);
  `project-picker.spec.ts` opens the project list with a click into the empty field (spec 0032)
  and creates a session with the project alone, then releases issue 43 in the room (spec 0033);
  `session-room.spec.ts` compares the size of `active-issue-iid` with the title (spec 0032).
- Never write rows by hand, never call internal endpoints, never click through the application to
  make data that a command makes.

## What `/verify` runs

- Automated: `make check` and the tests of the touched areas (table Areas), `make e2e` for
  changes under `frontend/src/app/` or at an endpoint.
- Browser checks: `http://localhost:4200/` with backend and frontend running
  (`README.md`, Schnellstart); no login; test data as the spec names it.
- Browser checks without backend: `pnpm -C frontend start:mock` serves the frontend with the
  mock backend (`project-rules/frontend.md`, Mock backend) on port 4200, under the application
  lock like `make e2e`. The mock session is `K7P2QX9M`; a token in `sessionStorage` under
  `planningpoker.session.K7P2QX9M` with `mock-scrum-master-…` or `mock-developer-…` opens the
  room in that role. The mock answers issue number 404 at the create form with
  `ISSUE_NOT_FOUND`, the name `Ben` at the join page with `NAME_TAKEN` and every other session id
  with `SESSION_NOT_FOUND` (spec 0011). For criteria that the real backend answers (endpoints from spec 0006), the
  check runs against the backend, not the mock.
