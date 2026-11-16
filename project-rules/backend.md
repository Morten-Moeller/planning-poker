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
  error format, id generation).
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
  `create(gitlabProjectId, issueIid, creatorName)` returns the session with its scrum master;
  `find(sessionId)` answers empty for an unknown or expired session; a read of the state (the
  mapper to `SessionView`, from spec 0006) goes through `read(sessionId, query)` under the same
  lock, without an event. A command or read on a missing session throws
  `SessionException(SESSION_NOT_FOUND)`. A rejected command leaves `lastActivityAt` unchanged.
- `Session` is the aggregate; only its methods change the state (A1.4): `join`, `connect`,
  `disconnect`, `selectIssue`, `vote`, `reveal`, `restart`, `beginConfirm`, `finishConfirm`,
  `failConfirm`. Role and phase checks live inside these methods and throw `SessionException`
  with the `ErrorCode` from `platform` (`FORBIDDEN_ROLE`, `INVALID_STATE`, `NAME_TAKEN`,
  `VALIDATION_ERROR`, `UNAUTHORIZED`). The rules are listed in `docs/domain/invariants.md`.
- A state check runs inside the lock and answers `INVALID_STATE` on an invalid transition. No
  read, change, save outside the lock.
- No GitLab call and no slow I/O inside the lock (A3.3). Loading an issue happens before the
  lock, the state is checked again inside it; the confirmation protects itself with `confirming`
  (`beginConfirm` inside the lock, GitLab call outside, `finishConfirm` or `failConfirm` inside).
- Change event: `SessionRegistryProducer` wires the registry with `Event<SessionChanged>`; the
  event fires synchronously in the thread of the command, after the lock is released. Observers
  (`realtime`, from spec 0009) read the session through the registry, never from the event.
- Expiry: `SessionConfig` (`@ConfigMapping`, prefix `planningpoker.session`) holds `ttl`
  (default `12h`). `find` and `update` remove an expired session on access; a Vert.x timer in
  `SessionRegistryProducer` (every 10 minutes) calls `expire(now)` for the rest. No
  `quarkus-scheduler`.
- Time comes from the `Clock` bean (`platform.ClockProducer`, `Clock.systemUTC()`); tests build
  the registry with a test clock. Ids come from `platform.Ids` (session id, token) and
  `platform.UuidV7` (participant id), ADR 0003.
- Personal data: participant names and tokens live only in memory and expire with the session
  (`planningpoker.session.ttl`).

## Errors, logging, configuration

- Errors: `planningpoker.platform.ErrorCode` holds every stable `errorCode` with its HTTP status
  (`VALIDATION_ERROR`, `INVALID_CARD`, `UNAUTHORIZED`, `FORBIDDEN_ROLE`, `SESSION_NOT_FOUND`,
  `ISSUE_NOT_FOUND`, `NAME_TAKEN`, `INVALID_STATE`, `GITLAB_ERROR`; `NOT_IMPLEMENTED` until the
  last stub is replaced). Code throws `ApiException(ErrorCode, detail)`; `ApiExceptionMapper`
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
  and read timeout) has its default in the mapping, not in `application.properties`. Profiles
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
- Snapshots: `SessionViewMapper.toView(session, receiverId)` builds the `SessionView` under the
  lock of `SessionRegistry.read` with the filter rules of the plan (4.6): no foreign card before
  the reveal, `myVote` only for the receiver, `preselectedIssueIid` only for the scrum master,
  `activeIssue` and `round` `null` in `LOBBY`, history newest first, `revealedAt` in UTC. Tokens
  never leave the domain: `Participant.token` has no view field.
- `SessionException` reaches the client through `SessionExceptionMapper` as
  `application/problem+json` with its `errorCode` and status.
- Commands answer 204, or 201 with the new ids; the new state reaches clients through the
  WebSocket snapshot (ADR 0004).
- Formatting: palantir-java-format through Spotless (`make lint-backend`, `make format`).
