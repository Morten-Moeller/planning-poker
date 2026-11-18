---
sources: [backend/pom.xml, backend/src/main/**, backend/src/main/resources/application.properties]
---

# Backend rules

## Stack

- Java 21 (`maven.compiler.release`), Maven Wrapper (`backend/mvnw`), Quarkus 3.x from the
  platform BOM in `backend/pom.xml`. Build and tests run with JDK 21 (`JAVA_HOME`); the Makefile
  picks JDK 21 on macOS when `JAVA_HOME` is empty.
- Jakarta REST with `quarkus-rest-jackson`, Jakarta Validation, Jakarta CDI;
  `quarkus-websockets-next` for the WebSocket; MicroProfile REST Client with
  `quarkus-rest-client-jackson` for GitLab; `quarkus-smallrye-openapi` for the contract;
  `quarkus-logging-json` for logs (ADR 0001).
- No database and no migration tool: sessions live in memory (ADR 0002).
- `backend/pom.xml` manages the versions of jetty (`wiremock-jetty12`), handlebars, guava and
  json-smart above what WireMock 3.13 declares, because the gate `deps` reports OSV advisories for
  the declared versions. Drop the pins when a WireMock release declares fixed versions.

## Structure

- Base package `planningpoker`, grouped by business capability (A1.1): `session` (session,
  participants, rounds, history, commands, `SessionRegistry`, mapper to `SessionView`), `gitlab`
  (REST client, configuration, error mapping), `realtime` (WebSocket endpoint, connection
  registry, snapshot delivery), `platform` (code without business terms: health, token check,
  error format, id generation, `ConfigResource`).
- Dependency direction: `session` and `realtime` use `gitlab` and `platform`; `gitlab` uses
  `platform`; `platform` uses no feature package (A1.6). `realtime` reacts to the change event of
  `SessionRegistry` and is never called by `session`.
- No layering inside a package: a resource class, the domain types and the registry live next to
  each other. No repository or service interface without a second implementation (A1.2).
- DTOs are Java records in the package `api` below their resource (`planningpoker.session.api`:
  requests, responses, `SessionView`). They are the source of the contract (`contracts/README.md`):
  `quarkus-smallrye-openapi` writes `backend/target/openapi/openapi.yaml` on every build, `make
  contracts` copies it to `contracts/api/openapi.yaml` and generates the frontend types. The
  WebSocket messages live in `backend/src/main/resources/META-INF/openapi.yaml`, which smallrye
  merges into the document.
- Every DTO carries `@Schema` with a description and `requiredProperties`; a field that may be
  `null` carries `@Schema(nullable = true)` alone, without a description, so the document keeps a
  clean `anyOf` with the referenced schema. The enums `Card`, `Phase`, `Role` live in
  `planningpoker.session`; `Card` serializes over `@JsonValue` to the wire values of the deck.
- `make contracts` after every DTO change; `make drift` fails otherwise.

## Data

- Sessions live in a `ConcurrentHashMap` in `SessionRegistry` (`planningpoker.session`). Every
  change runs through `SessionRegistry.update(sessionId, command)`: lock per session
  (`ReentrantLock`), `lastActivityAt` from the `Clock` bean, command, change event
  `SessionChanged(sessionId)` after the lock is released (ADR 0002 replaces A4.1, A4.3, A4.4).
  `create(gitlabProjectId, issueIid, creatorName)` (`issueIid` may be `null`) returns the session with its scrum master;
  `find(sessionId)` answers empty for an unknown or expired session; a read of the state (the
  mapper to `SessionView`, from spec 0006) goes through `read(sessionId, query)` under the same
  lock, without an event. A command or read on a missing session throws
  `SessionException(SESSION_NOT_FOUND)`. A rejected command leaves `lastActivityAt` unchanged.
- `Session` is the aggregate; only its methods change the state (A1.4): `join`, `connect`,
  `disconnect`, `setTimer`, `selectIssue`, `startVoting`, `vote`, `reveal`, `revealIfDue`, `restart`, `beginConfirm`, `finishConfirm`,
  `failConfirm`. Role and phase checks live inside these methods and throw `SessionException`
  with the `ErrorCode` from `platform` (`FORBIDDEN_ROLE`, `INVALID_STATE`, `NAME_TAKEN`,
  `VALIDATION_ERROR`, `UNAUTHORIZED`). The rules are listed in `docs/domain/invariants.md`.
- A state check runs inside the lock and answers `INVALID_STATE` on an invalid transition. No
  read, change, save outside the lock.
- No GitLab call and no slow I/O inside the lock (A3.3). Loading an issue happens before the
  lock, the state is checked again inside it; the confirmation protects itself with `confirming`
  (`beginConfirm` inside the lock, GitLab call outside, `finishConfirm` or `failConfirm` inside).
- Change event: `SessionRegistryProducer` wires the registry with `Event<SessionChanged>`; the
  event fires synchronously in the thread of the command (or of the periodic check `revealDue`), after the lock is released. Observers
  (`realtime`, from spec 0009) read the session through the registry, never from the event.
- Round completion: `SessionResource.vote` fires the CDI event `RoundCompleted(sessionId,
  roundNumber)` once, when `Session.vote` reports that the last connected developer has voted
  (A-02, A-10); `realtime` (spec 0009) turns it into the message `round.allVoted` for the scrum
  master. A later card change in a complete round fires nothing.
- Expiry: `SessionConfig` (`@ConfigMapping`, prefix `planningpoker.session`) holds `ttl`
  (default `12h`), `maxSessions` and `maxParticipants` (`@Min(1)`, defaults in the mapping) and
  `allowedProjects` (`Optional<List<String>>`; an empty value counts as not set) and `remember`
  (default `true`, spec 0039, ADR 0013). `find` and `update` remove an expired session on access; a Vert.x timer in
  `SessionRegistryProducer` (every 10 minutes) calls `expire(now)` for the rest. No
  `quarkus-scheduler`.
- Deadline (ADR 0010, replaces ADR 0006; ADR 0012): `selectIssue` starts a round in
  `DISCUSSION` without a deadline; `Session.startVoting` (`POST …/round/start`, start time from the
  `Clock`) moves it to `VOTING` and sets `Round.deadline` from `Session.timerSeconds` (null or 5 to
  3600, `Session.setTimer`). `Session.restart` (`POST …/round/restart`, start time from the
  `Clock`) starts the next round of a revealed issue directly in `VOTING` with the same deadline
  rule. A second Vert.x timer in `SessionRegistryProducer` (every 250 ms) calls
  `SessionRegistry.revealDue(now)`: under the lock of each live session `Session.revealIfDue`
  reveals a round in `VOTING` whose deadline is reached, the same way as `reveal`; only then
  `lastActivityAt` is set and `SessionChanged` fires. The mapper takes the snapshot time
  `serverTime` from the `Clock` as a parameter.
- Time comes from the `Clock` bean (`platform.ClockProducer`, `Clock.systemUTC()`); tests build
  the registry with a test clock. Ids come from `platform.Ids` (session id, token) and
  `platform.UuidV7` (participant id), ADR 0003.
- Personal data: participant names and tokens live only in memory and expire with the session
  (`planningpoker.session.ttl`).

## Errors, logging, configuration

- Errors: `planningpoker.platform.ErrorCode` holds every stable `errorCode` with its HTTP status
  (`VALIDATION_ERROR`, `INVALID_CARD`, `UNAUTHORIZED`, `FORBIDDEN_ROLE`, `SESSION_NOT_FOUND`,
  `ISSUE_NOT_FOUND`, `PROJECT_NOT_FOUND`, `PROJECT_NOT_ALLOWED`, `NAME_TAKEN`, `INVALID_STATE`, `LIMIT_REACHED`,
  `GITLAB_ACCESS_DENIED`, `GITLAB_ERROR`). Code throws `ApiException(ErrorCode, detail)`; `ApiExceptionMapper`
  writes RFC 9457 `application/problem+json` (`ProblemDetail`) and unwraps an `ApiException`
  that Jackson wrapped while reading a body (unknown card). `ValidationExceptionMapper` maps
  Bean Validation failures to 400 `VALIDATION_ERROR`. Domain code throws typed exceptions; only
  the boundary maps them to HTTP (A3.5). GitLab error texts are never forwarded.
- Logging: JBoss Logging through `quarkus-logging-json`, JSON lines on the console (`dev` profile
  plain text). Never logged: the GitLab token, participant tokens, hidden card values.
- Configuration: `backend/src/main/resources/application.properties` holds every
  `planningpoker.*` key with its default. The GitLab token comes from `GITLAB_TOKEN` and has no
  default; a missing token stops the start with the key name (A6.1): `GitLabConfig`
  (`@ConfigMapping`, prefix `planningpoker.gitlab`) is read by `GitLabClient`, a `@Startup` bean,
  so the config validation fails at start. `planningpoker.gitlab.timeout` (default `10s`, connect
  and read timeout), `planningpoker.session.max-sessions` and `max-participants` have their
  defaults in the mapping, not in `application.properties`. Profiles
  `test` and `e2e` set placeholder values. No secret in the repository.
- Ports: `quarkus.http.port=8080`, tests on a free port (`quarkus.http.test-port=0`).

## APIs

- Contract first: every endpoint and WebSocket message exists in `contracts/api/openapi.yaml`
  before a client uses it (from spec 0002). Paths under `/api`, JSON, camelCase fields, enums in
  UPPER_SNAKE_CASE, times in RFC 3339 with offset (A2.2).
- Authentication: `Authorization: Bearer <token>` on every call except create and join; the
  WebSocket takes the token in its first message `auth`, never in the URL (ADR 0003). A resource
  method carries `@Authenticated` (`planningpoker.platform`): `BearerTokenFilter` (priority
  `AUTHENTICATION`, no business terms) reads the header and answers 401 `UNAUTHORIZED` without a
  bearer token; `ActorFilter` (`planningpoker.session`, priority `AUTHORIZATION`) resolves the
  path parameter `id` and the token through `SessionRegistry.read` to an `Actor(sessionId,
  participantId, role)`: 404 `SESSION_NOT_FOUND` for an unknown session, 401 for a token that
  belongs to no participant of that session. The method reads the actor with
  `ActorFilter.actorOf(context)`. The filter injects `Instance<SessionRegistry>` and resolves it
  per request: Quarkus creates the REST filters at start before the config mappings
  (`SessionConfig`) are registered, so a direct injection fails the boot.
- Authorisation: the role comes from the token (A5.1); `@RequiresRole(Role)` on the method is
  checked by `ActorFilter` and answers 403 `FORBIDDEN_ROLE` before the method runs; the domain
  checks the role again (A1.4). The frontend never sends a role.
- Snapshots: `SessionViewMapper.toView(session, receiverId, serverTime)` builds the `SessionView` under the
  lock of `SessionRegistry.read` with the filter rules of the plan (4.6): no foreign card before
  the reveal, `myVote` only for the receiver, `preselectedIssueIid` only for the scrum master,
  `activeIssue` and `round` `null` in `LOBBY`, history newest first, `revealedAt` in UTC. Tokens
  never leave the domain: `Participant.token` has no view field.
- `SessionException` reaches the client through `SessionExceptionMapper` as
  `application/problem+json` with its `errorCode` and status.
- Issue filters (ADR 0009): `GitLabClient.searchIssues` takes an `IssueQuery` (search, GitLab
  weight, `updated_after`, page) and always sends `state=opened`, `order_by=updated_at` and
  `sort=desc`. `GitLabIssues.search` maps `WeightFilter` (`NONE` to `weight=None`, `ANY` to
  `weight=Any`, `ALL` without parameter) and `UpdatedPeriod` (now from the `Clock`, truncated to
  seconds, minus 7, 30 or 365 days; `ALL` without parameter); the start page searches with `ALL`
  and `ALL`. Both enums parse query values with `fromString` and answer an unknown value with 400
  `VALIDATION_ERROR`. `IssueSummary.weight` is the GitLab `weight` or `null`.
- GitLab at the boundary: `GitLabIssues` (`planningpoker.session`) loads and searches issues
  through `GitLabClient` and maps `GitLabException` to `ApiException` (`NOT_FOUND` of a single
  issue to `ISSUE_NOT_FOUND`, `UNAUTHORIZED` (GitLab 401 or 403) to `GITLAB_ACCESS_DENIED`,
  everything else to `GITLAB_ERROR`, each with a fixed detail text, never the GitLab message;
  ADR 0007). `ResultPublisher` uses the same mapping for the comment and the weight.
  `GitLabClient` writes one line on `WARN` per error response and per missing or unreadable
  response: operation (`loadIssue`, `searchIssues`, `addNote`, `setWeight`, `searchProjects`,
  `loadProject`), project id (empty for `searchProjects`; control
  characters replaced), status (0 without a response) and reason; never the token, a header or
  the GitLab response body. The resource loads the issue before `SessionRegistry.update` (ADR 0002,
  no GitLab call inside the lock) and hands the finished `Issue` to `Session.selectIssue`.
- Project choice before a session (ADR 0008): `ProjectResource` (`/api/projects`, open, read only,
  no `@Authenticated`) lists projects through `GitLabProjects` and open issues through
  `GitLabIssues.search`. `GitLabClient` reads projects through `GitLabProjectApi`
  (`GET /api/v4/projects?membership=true&simple=true&order_by=last_activity_at`, 20 per page, and
  `GET /api/v4/projects/{id}`). With the project allowlist `GitLabProjects` loads every entry with
  `loadProject`, filters name and path case-insensitively, answers without `nextPage` and answers
  an empty list without a GitLab call for `page>1`; an entry that GitLab rejects with 403 or 404
  is left out (the `WARN` line of `GitLabClient` names it), 401 and other errors map like the
  issues. `SessionResource.createSession` loads the project once after the allowlist and the
  issue with `GitLabProjects.loadForSession`; a failure leaves `Session.project` empty, the
  creation succeeds, and the `WARN` line of `GitLabClient` is the only trace. Without `issueIid`
  (ADR 0011, spec 0033) it loads the project after the allowlist with
  `GitLabProjects.loadRequired` instead and loads no issue: GitLab 404 answers 404
  `PROJECT_NOT_FOUND`, 401 and 403 `GITLAB_ACCESS_DENIED`, everything else `GITLAB_ERROR`, and
  no session is created; `preselectedIssueIid` of the session is then `null`. The snapshot carries
  it as `project` and the setting `write-weight` as `writeWeight`. `GitLabClient.searchIssues`
  reads `X-Total` into `IssuePage.total`; both issue lists answer it as `total` or `null`. `ProjectAllowlist` (`planningpoker.session`) holds the trimmed entries of
  `SessionConfig.allowedProjects` and the check `requireAllowed`, used by `createSession` and
  `listProjectIssues` before any GitLab call.
- Accepted risk (plan, A-01, A-08, A-14): creating a session needs no login, and the backend
  reads the named project with its own GitLab token. Whoever creates a session can read title,
  description and link of the issues of every project that token sees. The project id is
  URL-encoded in the GitLab path (a `/` becomes `%2F`, tested). Limits (ADR 0005):
  `planningpoker.session.allowed-projects`, when set, restricts creation to the listed project
  ids (exact match after trimming); `SessionResource.createSession` and
  `ProjectResource.listProjectIssues` check it through `ProjectAllowlist` before the GitLab call
  and answer 403 `PROJECT_NOT_ALLOWED`. The project choice (ADR 0008) lists, without allowlist,
  names and paths of every project with membership of the token to whoever reaches the backend;
  set the allowlist for an instance that more than a trusted group reaches. The choice sets the
  numeric project id, so an entry given only as path cannot be chosen (`PROJECT_NOT_ALLOWED`);
  use numeric ids in the allowlist. `planningpoker.session.max-sessions` (default 1000,
  expired sessions do not count, checked in `SessionRegistry.create`) and
  `planningpoker.session.max-participants` (default 50, the scrum master counts, checked first in
  `Session.join`) answer 409 `LIMIT_REACHED`. No rate limit per client IP and no limit for
  WebSocket connections before `auth`; both stay accepted risk.
- Frontend settings (spec 0039, ADR 0013): `ConfigResource` (`platform`, `GET /api/config`, open,
  no `@Authenticated`) answers `ConfigResponse { rememberSessions }` from
  `planningpoker.session.remember` through `@ConfigProperty` with the default `true`, so
  `platform` does not import `session`; `SessionConfig.remember()` maps the same key. `false`
  switches the recent sessions of the browser off for an open environment.
- Commands answer 204, or 201 with the new ids; the new state reaches clients through the
  WebSocket snapshot (ADR 0004).

## Realtime

- `SessionSocket` (`quarkus-websockets-next`, `/ws/sessions/{sessionId}`) takes the token only
  from the first message `auth` (ADR 0003) and resolves it with `Session.participantByToken`
  under `SessionRegistry.read`, the same token comparison as `ActorFilter` (constant time). An
  unknown token answers `error` with `UNAUTHORIZED`, an unknown or expired session
  `SESSION_NOT_FOUND`; both close the connection (code 1008). A message other than `auth` before
  `auth` answers `error` without a close. After `auth` only `ping` is valid; it answers `pong`.
- Auth deadline: a Vert.x timer per connection, `planningpoker.realtime.auth-timeout` (default
  `5s`, `RealtimeConfig`, default in the mapping; the `test` profile sets `1s`). A successful
  `auth` cancels it; a connection without `auth` closes without a snapshot.
- `ConnectionRegistry` holds the open connections per session with participant id and role, only
  in `realtime`. `connected` changes only through `SessionRegistry.update` (`Session.connect`
  after `auth`, `Session.disconnect` on close when no other connection of the participant is
  open); a missing session on close is ignored.
- `SnapshotBroadcaster` observes `SessionChanged` and `RoundCompleted` synchronously in the
  thread of the command or of the periodic check (ADR 0002). It builds each snapshot under `SessionRegistry.read` with
  `SessionViewMapper.toView(session, participantId, serverTime)` and sends `session.state` to every
  connection of the session; `round.allVoted` goes only to connections with role
  `SCRUM_MASTER`. New commands need no code in `realtime`.
- `MessageSender` writes the envelope `WsMessage` (`type`, `payload`; no `payload` for `pong`)
  with the Quarkus `ObjectMapper` and sends without waiting; a failed send closes only that
  connection (code 1011).
- Tests: `backend/src/test/java/planningpoker/realtime/` with `SocketClient`
  (`BasicWebSocketConnector`, message queue, waits with timeout) and `RestCalls`. A test proves
  the absence of a message with `untilPong`: messages of one connection arrive in order, so
  everything sent before the `pong` has arrived.
- Formatting: palantir-java-format through Spotless (`make lint-backend`, `make format`).
