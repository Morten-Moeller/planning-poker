---
id: "0002"
title: Schnittstellenvertrag (M1)
status: Review
risk: high
adrs: ["0004"]
owner: Morten Möller
created: 2026-11-16
updated: 2026-11-16
pr: ""
note: freigegeben in der Session
---

# Schnittstellenvertrag (M1)

Meilenstein M1 aus `docs/umsetzungsplan.md`. Deckt ab: R-25 (erste Fassung). Annahmen: A-15
(Fehlertexte der API auf Englisch, Clients entscheiden nur anhand von `errorCode`), A-17
(Session-ID und Teilnehmer-ID im Vertrag). Grundlage: Abschnitte 4.2 bis 4.6 des Plans.

## Ziel

Der Vertrag aus 4.4 bis 4.6 liegt generiert in `contracts/api/openapi.yaml` vor und ist die
Referenz für Backend und Frontend. Die Java-DTOs und Ressourcen sind die Quelle; `make contracts`
schreibt den Vertrag und die TypeScript-Typen des Frontends, `make drift` meldet einen nicht
committeten Stand. Beispiel-Snapshots je Phase und Rolle binden beide Seiten an dieselben Daten.
Die Endpunkte antworten 501, bis ihr Meilenstein sie umsetzt.

## Scope

### Enthalten

- DTOs als Java-Records für alle Requests und Antworten aus 4.4 und den SessionView aus 4.6, mit Jakarta-Validation-Annotationen (Namensregeln A-13, Kartensatz) und OpenAPI-Annotationen; Enums `Card`, `Phase`, `Role` nach 4.2.
- `SessionResource` mit allen neun Methoden aus 4.4, jede antwortet 501 `NOT_IMPLEMENTED` als Problem Detail; `GET /api/health` kommt mit in den Vertrag.
- Fehlerformat nach 4.4 (RFC 9457, `application/problem+json`, `errorCode`) als Exception-Mapper im Paket `platform`; Validierungsfehler antworten 400 `VALIDATION_ERROR`.
- WebSocket-Nachrichten aus 4.5 als Schemas in der statischen Ergänzung `backend/src/main/resources/META-INF/openapi.yaml`; smallrye führt sie mit den Annotationen zusammen.
- `make contracts`: Backend-Build schreibt `contracts/api/openapi.yaml`, `openapi-typescript` erzeugt `frontend/src/app/api/schema.d.ts`; beide mit Kopfzeile, die Quelle und Generator nennt; `.gitattributes` markiert sie als generiert.
- Sechs Beispiel-Snapshots unter `contracts/api/examples/` (Phasen `LOBBY`, `VOTING`, `REVEALED` je Rolle); ein Backend-Test liest sie in die DTOs, das Frontend bindet sie typisiert ein.
- `HealthStatus` im Frontend aus den generierten Typen (Hinweis aus dem Review von 0001).
- README-Abschnitt „Schnittstellen“, erste Fassung mit Verweis auf `contracts/api/`.

### Nicht enthalten

- Fachlogik, Zustandsautomat, Token-Prüfung, Rollenprüfung (0004, 0006).
- WebSocket-Endpunkt (0009); hier nur die Schemas der Nachrichten.
- Übersetzungen; die Oberfläche bleibt Deutsch als Quellsprache.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Sitzung, Session-ID, Teilnehmer, Rolle, Scrum Master, Entwickler, Phase, Issue, Runde, Karte, Stimme, Abstimmungsstatus, Auswertung, Protokoll, Protokolleintrag, Snapshot, Befehl | wie im Glossar; der Snapshot heißt im Vertrag `SessionView` |
| Vertrag | `contracts/api/openapi.yaml`, erzeugt aus den Java-DTOs und der statischen Ergänzung; Quelle für die Frontend-Typen |
| Problem Detail | Fehlerantwort nach RFC 9457 mit `type`, `title`, `status`, `detail`, `errorCode` |
| Beispiel-Snapshot | JSON-Datei unter `contracts/api/examples/`, ein vollständiger `SessionView` je Phase und Rolle |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `contracts/api/openapi.yaml` enthält jede Methode und jeden Pfad aus 4.4 sowie `GET /api/health`, mit Request-Schema, Erfolgsantwort und den Fehlerantworten aus 4.4 als `ProblemDetail`; jede Zeile des Zustandsautomaten (4.3) hat so einen Endpunkt. | Test `backend/src/test/java/planningpoker/session/api/ContractTest.java` |
| A2 | Die Nachrichten aus 4.5 (`auth`, `session.state`, `round.allVoted`, `error`, `ping`, `pong`) stehen als Schemas unter `components.schemas` in `contracts/api/openapi.yaml`; `session.state` verweist auf `SessionView`. | Test `backend/src/test/java/planningpoker/session/api/ContractTest.java` |
| A3 | Unter `contracts/api/examples/` liegt je Phase und Rolle ein Snapshot nach den Filterregeln aus 4.6 (sechs Dateien); ein Backend-Test liest jeden in `SessionView` ein; ein unbekanntes Feld lässt den Test fehlschlagen. | Test `backend/src/test/java/planningpoker/session/api/ContractExamplesTest.java` |
| A4 | Das Frontend bindet die sechs Beispiele in `frontend/src/app/api/examples.ts` typisiert gegen die generierten Typen ein; `make typecheck` prüft sie, ein zusätzliches Feld in einer Kopie lässt `make typecheck` fehlschlagen. | Aufruf (Probe mit geändertem Beispiel) |
| A5 | `make contracts` schreibt `contracts/api/openapi.yaml` und `frontend/src/app/api/schema.d.ts` deterministisch (zweiter Lauf ohne Diff); nach einer DTO-Änderung ohne `make contracts` schlägt `make drift` fehl. | Aufruf (zweimal `make contracts`; DTO-Feld ändern, `make drift`) |
| A6 | Jeder Endpunkt aus 4.4 antwortet 501 mit `application/problem+json` und `errorCode` `NOT_IMPLEMENTED`; ein ungültiger Body beim Erstellen (leerer Name, Name über 30 Zeichen, fehlende Projekt-ID) antwortet 400 `VALIDATION_ERROR`; eine ungültige Karte bei `vote` antwortet 400 `INVALID_CARD`. | Test `backend/src/test/java/planningpoker/session/SessionResourceTest.java` |
| A7 | Das README nennt unter „Schnittstellen“ Endpunkte, WebSocket-Nachrichten, Fehlerformat mit allen `errorCode`-Werten und den Echtzeit-Ablauf und verweist auf `contracts/api/openapi.yaml` und die Beispiele. | Aufruf |
| A8 | `frontend/src/app/start/health-api.ts` verwendet den generierten Typ für die Antwort von `GET /api/health`; kein handgeschriebener Typ eines Vertragsobjekts bleibt im Frontend. | Aufruf (`grep -rn "interface HealthStatus" frontend/src`) |

## Contracts

Neu: `contracts/api/openapi.yaml` (generiert aus `backend/src/main/java/planningpoker/session/api/`,
`backend/src/main/java/planningpoker/session/SessionResource.java`,
`backend/src/main/java/planningpoker/platform/HealthResource.java` und
`backend/src/main/resources/META-INF/openapi.yaml`) und `contracts/api/examples/*.json`.
Konsumenten: das Frontend über `frontend/src/app/api/schema.d.ts` (generiert mit
`openapi-typescript`). Erste Fassung, keine Abwärtskompatibilität zu prüfen. Version `1.0.0`.

## Risiko

Stufe: high
Begründung: `contracts/**` und `harness/config.yml` sind high. `Makefile`, `project-rules/`,
`backend/src/main/` und `frontend/src/` sind medium; `docs/` und Tests low. Der Eskalator
`token` greift über die Token-Felder der DTOs.
Gates: G0 und G1 in dieser Session. G2: Label `human-approved` nach dem letzten Push. G3: Status
`verified` auf dem Head-Commit. Reviews: Code, Sicherheit, Architektur (contracts).
ADR nötig: nein, weil der Vertrag A2.1 und das Fehlerformat A2.3 den Grundregeln folgen; die
Snapshot-Entscheidung steht in ADR 0004.

## Umsetzung

Entscheidungen:

- Keine neuen Abhängigkeiten; `quarkus-smallrye-openapi` und `openapi-typescript` sind seit 0001 vorhanden. `harness/config.yml` erhält `contracts_generate_target: contracts` in derselben Änderung wie das Makefile-Ziel (Regel aus `.claude/skills/contract/SKILL.md`) sowie `e2e_in_ci: true` und `worktree_setup: "make install"`; alle drei Zeilen von der Person freigegeben, sie prüft sie im PR.
- Vertrag aus dem Build: `quarkus.smallrye-openapi.store-schema-directory=../contracts/api` mit `store-schema-file-type=YAML`, `operation-id-strategy=METHOD`, `info-title`/`info-version`; `make contracts` baut das Backend (`./mvnw -q -DskipTests package`), setzt die Kopfzeile und ruft `openapi-typescript`.
- Neuer, befristeter `errorCode` `NOT_IMPLEMENTED` (501) für die Stub-Methoden; fällt mit dem letzten Stub weg. Bearer-Token als `securitySchemes.bearerToken`; `POST /api/sessions` und `POST …/participants` ohne, alle anderen mit `security`.
- DTO-Paket `planningpoker.session.api`; Enums `Card`, `Phase`, `Role` im Paket `planningpoker.session` (0004 nutzt sie als Domäne). `Card` serialisiert über `@JsonValue` auf die Wire-Werte aus 4.2 und steht im Vertrag als Enum dieser Werte.
- Beispiele im Frontend über `resolveJsonModule` direkt aus `contracts/api/examples/` importiert, keine Kopie.

Dateien:

- `backend/src/main/java/planningpoker/session/Card.java`: neu, Enum mit Wire-Werten `"0"` bis `"34"`, `"?"`, `"COFFEE"`, Reihenfolge des Kartensatzes
- `backend/src/main/java/planningpoker/session/Phase.java`: neu, `LOBBY`, `VOTING`, `REVEALED`
- `backend/src/main/java/planningpoker/session/Role.java`: neu, `SCRUM_MASTER`, `DEVELOPER`
- `backend/src/main/java/planningpoker/session/api/CreateSessionRequest.java`: neu, `name` (1 bis 30 Zeichen, getrimmt), `gitlabProjectId`, `issueIid`
- `backend/src/main/java/planningpoker/session/api/CreateSessionResponse.java`: neu, `sessionId`, `participantId`, `token`
- `backend/src/main/java/planningpoker/session/api/JoinSessionRequest.java`: neu, `name`
- `backend/src/main/java/planningpoker/session/api/JoinSessionResponse.java`: neu, `participantId`, `token`
- `backend/src/main/java/planningpoker/session/api/SessionView.java`: neu, Snapshot nach 4.6 mit verschachtelten Records `Me`, `ParticipantView`, `IssueView`, `RoundView`, `VoteView`, `RoundStats`, `CardCount`, `HistoryEntryView`
- `backend/src/main/java/planningpoker/session/api/IssueListResponse.java`: neu, `items` (`iid`, `title`, `webUrl`), `nextPage`
- `backend/src/main/java/planningpoker/session/api/SelectIssueRequest.java`: neu, `issueIid`
- `backend/src/main/java/planningpoker/session/api/VoteRequest.java`: neu, `card`
- `backend/src/main/java/planningpoker/session/api/ConfirmRequest.java`: neu, `card`
- `backend/src/main/java/planningpoker/session/SessionResource.java`: neu, neun Methoden aus 4.4 unter `/api/sessions`, OpenAPI-Annotationen, 501
- `backend/src/main/java/planningpoker/platform/ErrorCode.java`: neu, Codes aus 4.4 plus `NOT_IMPLEMENTED`, je Code der HTTP-Status
- `backend/src/main/java/planningpoker/platform/ProblemDetail.java`: neu, Record `type`, `title`, `status`, `detail`, `errorCode`
- `backend/src/main/java/planningpoker/platform/ApiException.java`: neu, Exception mit `ErrorCode` und `detail`
- `backend/src/main/java/planningpoker/platform/ApiExceptionMapper.java`: neu, `ApiException` auf `application/problem+json`
- `backend/src/main/java/planningpoker/platform/ValidationExceptionMapper.java`: neu, `ConstraintViolationException` auf 400 `VALIDATION_ERROR`
- `backend/src/main/java/planningpoker/platform/HealthResource.java`: ändern, OpenAPI-Annotationen
- `backend/src/main/resources/META-INF/openapi.yaml`: neu, Schemas der WebSocket-Nachrichten aus 4.5, Beschreibung des Endpunkts `/ws/sessions/{sessionId}` in `info.description`
- `backend/src/main/resources/application.properties`: ändern, smallrye-openapi-Schlüssel aus den Entscheidungen
- `backend/src/test/java/planningpoker/session/api/ContractTest.java`: neu, A1, A2
- `backend/src/test/java/planningpoker/session/api/ContractExamplesTest.java`: neu, A3
- `backend/src/test/java/planningpoker/session/SessionResourceTest.java`: neu, A6
- `contracts/api/openapi.yaml`: neu, generiert
- `contracts/api/examples/lobby-scrum-master.json`: neu
- `contracts/api/examples/lobby-developer.json`: neu
- `contracts/api/examples/voting-scrum-master.json`: neu
- `contracts/api/examples/voting-developer.json`: neu
- `contracts/api/examples/revealed-scrum-master.json`: neu
- `contracts/api/examples/revealed-developer.json`: neu
- `frontend/src/app/api/schema.d.ts`: neu, generiert
- `frontend/src/app/api/examples.ts`: neu, sechs Importe, typisiert als `components['schemas']['SessionView']`
- `frontend/src/app/start/health-api.ts`: ändern, generierter Typ
- `frontend/tsconfig.json`: ändern, `resolveJsonModule`
- `frontend/eslint.config.js`: ändern, `ignores` für `src/app/api/schema.d.ts`
- `frontend/.prettierignore`: ändern, `src/app/api/schema.d.ts`
- `.gitattributes`: ändern, `linguist-generated=true` für beide generierten Dateien
- `Makefile`: ändern, Ziel `contracts`
- `harness/config.yml`: ändern, `contracts_generate_target: contracts`, `e2e_in_ci: true`, `worktree_setup: "make install"`
- `README.md`: ändern, Abschnitt „Schnittstellen“
- `project-rules/backend.md`: ändern, Fehlerformat (Mapper, `ErrorCode`), DTO-Paket
- `project-rules/frontend.md`: ändern, Pfad der generierten Typen und der Beispiele

Schritte:

1. Enums und DTOs nach 4.2, 4.4 und 4.6 anlegen; Validation-Annotationen auf `name` (A-13), `gitlabProjectId`, `issueIid`, `card`; `@Schema` mit Beschreibung und Beispielwerten, `Card` mit `@JsonValue`/`@JsonCreator`.
2. `ErrorCode`, `ProblemDetail`, `ApiException` und die beiden Mapper; `NOT_IMPLEMENTED` als 501.
3. `SessionResource` mit allen Methoden, `@Operation(operationId=…)`, `@APIResponse` je Status aus 4.4, `@SecurityRequirement` nach den Entscheidungen; jede Methode wirft `ApiException(NOT_IMPLEMENTED)`. `HealthResource` annotieren.
4. Statische Ergänzung `META-INF/openapi.yaml` mit den sechs Nachrichten-Schemas (Hülle `type`, `payload`), `session.state.payload` als `$ref` auf `SessionView`.
5. `application.properties`: `quarkus.smallrye-openapi.store-schema-directory=../contracts/api`, `store-schema-file-type=YAML`, `operation-id-strategy=METHOD`, `info-title=Planning Poker API`, `info-version=1.0.0`. Prüfen, dass der Build genau `contracts/api/openapi.yaml` schreibt (sonst Dateinamen im Makefile umbenennen).
6. Makefile-Ziel `contracts`; in `harness/config.yml` `contracts_generate_target: contracts`, `e2e_in_ci: true`, `worktree_setup: "make install"`: Backend-Build, Kopfzeile `# Generated by make contracts from backend/src/main (quarkus-smallrye-openapi). Do not edit.` vor die YAML setzen, `pnpm -C frontend exec openapi-typescript ../contracts/api/openapi.yaml -o src/app/api/schema.d.ts`; zweimal laufen lassen, kein Diff.
7. Beispiele nach 4.6 schreiben (Session-ID `K7P2QX9M`, UUIDv7-IDs, `preselectedIssueIid` nur beim Scrum Master, `round` und `activeIssue` in `LOBBY` null, `votes` und `stats` vor der Auflösung null, `history` mit einem Eintrag in `REVEALED`).
8. `ContractTest` (liest `contracts/api/openapi.yaml`, prüft Pfade, Methoden, Antworten, Schemas), `ContractExamplesTest` (Jackson mit `FAIL_ON_UNKNOWN_PROPERTIES`, Fall mit zusätzlichem Feld), `SessionResourceTest` (501 je Endpunkt, 400 für die Validierungsfälle).
9. Frontend: `tsconfig.json` mit `resolveJsonModule`, `examples.ts`, `health-api.ts` auf `components['schemas']['HealthStatus']`; Lint- und Prettier-Ausnahmen für die generierte Datei; `.gitattributes`.
10. README „Schnittstellen“: Tabelle der Endpunkte, Nachrichten, Fehlercodes, Ablauf (Befehl per REST, Snapshot per WebSocket), Verweis auf `contracts/api/`. `project-rules` nachziehen.
11. `make check`, `make contracts`, `make e2e` (Startseite unverändert).

Tests:

| Kriterium | Test |
|---|---|
| A1 | `backend/src/test/java/planningpoker/session/api/ContractTest.java`: jede Methode und jeder Pfad aus 4.4 und `/api/health` mit Antworten vorhanden |
| A2 | `backend/src/test/java/planningpoker/session/api/ContractTest.java`: sechs Nachrichten-Schemas, `session.state` verweist auf `SessionView` |
| A3 | `backend/src/test/java/planningpoker/session/api/ContractExamplesTest.java`: sechs Dateien lesbar; Kopie mit Zusatzfeld schlägt fehl |
| A4 | Aufruf: `make typecheck`; Probe mit Zusatzfeld in einer Beispielkopie |
| A5 | Aufruf: `make contracts` zweimal, `git status` leer; DTO-Feld umbenennen, `make drift` schlägt fehl |
| A6 | `backend/src/test/java/planningpoker/session/SessionResourceTest.java`: 501 je Endpunkt mit `errorCode`; 400 `VALIDATION_ERROR` und `INVALID_CARD` |
| A7 | Aufruf: README-Abschnitt |
| A8 | Aufruf: `grep` ohne Treffer, `health-api.ts` importiert aus `./api/schema` |

Testdaten: keine; die Beispiele sind die Testdaten.

Contracts zu regenerieren: `make contracts` nach jeder DTO-Änderung.

## Offene Fragen

- [x] Wer setzt `contracts_generate_target: contracts` in `harness/config.yml`? → Der Implementer, in derselben Änderung wie das Makefile-Ziel; die Person prüft die Zeile im PR vor dem Label (CODEOWNERS). (Morten Möller, 2026-11-16)
- [x] Wie kommen `e2e_in_ci: true` und `worktree_setup: "make install"` auf `main`? → Ebenfalls in dieser Spec, weil das Ruleset einen PR verlangt und ein eigener PR eine Spec bräuchte; die Person prüft die Zeilen im PR. (Morten Möller, 2026-11-16)

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/session/`, `backend/src/test/java/planningpoker/platform/`, `make typecheck` (Frontend-Beispiele), `make e2e`
- Browser: keiner
- Aufrufe: `make contracts` zweimal (A5), Drift-Probe (A5), Typecheck-Probe (A4), README (A7), `grep` (A8)
