---
id: "0006"
title: Sitzungs-API und Rollen (M3)
status: Review
risk: high
adrs: ["0003"]
owner: Morten Möller
created: 2026-11-16
updated: 2026-11-16
pr: ""
note: freigegeben in der Session
---

# Sitzungs-API und Rollen (M3)

Meilenstein M3 aus `docs/umsetzungsplan.md`. Deckt ab: R-01 (ohne Issue-Prüfung), R-03, R-05.
Annahmen: A-03 (Issue vorausgewählt, nicht freigegeben), A-08 (Token je Teilnehmer), A-13
(Namen), A-17 (IDs). Grundlage: Abschnitte 4.4 und 4.6 des Plans, der Vertrag aus 0002 und die
Domäne aus 0004.

## Ziel

Sitzungen lassen sich per REST anlegen, betreten und lesen. Der Server ordnet jeden Aufruf über
das Bearer-Token einem Teilnehmer zu und erzwingt die Rolle je Endpunkt; Entwickler erreichen
keine Steuerungsaktion. Der Mapper liefert den `SessionView` nach den Filterregeln aus 4.6, so
dass kein Snapshot fremde Kartenwerte vor der Auflösung und nie ein Token enthält. Die übrigen
Endpunkte bleiben 501, stehen aber schon hinter Token- und Rollenprüfung.

## Scope

### Enthalten

- `POST /api/sessions`: Sitzung über `SessionRegistry.create`, Antwort 201 mit `sessionId`, `participantId`, `token`; das angegebene Issue wird als vorausgewählt gespeichert (Prüfung gegen GitLab folgt in 0007).
- `POST /api/sessions/{id}/participants`: Beitreten über `Session.join`, Antwort 201 mit `participantId`, `token`.
- `GET /api/sessions/{id}`: `SessionView` für den Aufrufer über `SessionRegistry.read` und den Mapper.
- Token-Prüfung: `platform.BearerTokenFilter` (Format, 401 ohne Token) und `session.ActorFilter` (Zuordnung zum Teilnehmer der Sitzung, 401 bei unbekanntem Token, 404 bei unbekannter Sitzung), gebunden über `@Authenticated`.
- Rollenprüfung: `@RequiresRole(Role)` je Endpunkt, 403 `FORBIDDEN_ROLE` im `ActorFilter`; alle Endpunkte aus 4.4 außer Erstellen und Beitreten tragen die Annotationen, die noch nicht umgesetzten antworten danach weiter 501.
- `SessionExceptionMapper`: `SessionException` wird `application/problem+json` mit ihrem `errorCode` und Status.
- `SessionViewMapper` mit den Filterregeln aus 4.6.
- Vertrag: 401 und 404 als dokumentierte Antworten an jedem Endpunkt mit Token; `make contracts`.

### Nicht enthalten

- Issue-Liste, Issue-Prüfung beim Anlegen, Issue-Wechsel (0007); Stimmen, Auflösen, neue Runde (0008); Bestätigen (0010); WebSocket (0009).
- Obergrenzen für Sitzungen und Teilnehmer (offene Frage).
- Frontend-Änderungen; die Platzhalter aus 0005 bleiben.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Sitzung, Session-ID, Teilnehmer, Rolle, Scrum Master, Entwickler, Token, Vorausgewähltes Issue, Phase, Snapshot, Befehl | wie im Glossar |
| Aufrufer | der Teilnehmer, dem der `ActorFilter` das Token des Aufrufs zuordnet; im Code `Actor(sessionId, participantId, role)` |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `POST /api/sessions` mit gültigem Body antwortet 201 mit `sessionId` (8 Zeichen aus dem Alphabet aus A-17), `participantId` (UUID) und `token`; `GET /api/sessions/{id}` mit diesem Token zeigt `me.role` `SCRUM_MASTER`, `phase` `LOBBY`, `preselectedIssueIid` aus dem Body, `activeIssue` und `round` `null`. | Test `backend/src/test/java/planningpoker/session/SessionApiTest.java` |
| A2 | `POST /api/sessions/{id}/participants` antwortet 201 mit `participantId` und `token`; der Beitretende hat die Rolle `DEVELOPER` und sieht `preselectedIssueIid` als `null`; ein vergebener Name (auch in anderer Schreibweise) antwortet 409 `NAME_TAKEN`; eine unbekannte Sitzung 404 `SESSION_NOT_FOUND`; ein Name mit 31 Zeichen 400 `VALIDATION_ERROR`. | Test `backend/src/test/java/planningpoker/session/SessionApiTest.java` |
| A3 | `GET /api/sessions/{id}` ohne `Authorization` antwortet 401 `UNAUTHORIZED`; mit unbekanntem Token 401; mit dem Token eines Teilnehmers einer anderen Sitzung 401; eine unbekannte Sitzung mit beliebigem Token 404 `SESSION_NOT_FOUND`. | Test `backend/src/test/java/planningpoker/session/SessionApiTest.java` |
| A4 | Ein Entwickler erhält auf `GET …/issues`, `POST …/active-issue`, `POST …/round/reveal`, `POST …/round/restart` und `POST …/round/confirm` 403 `FORBIDDEN_ROLE`; der Scrum Master erhält auf `PUT …/vote` 403; mit der richtigen Rolle antworten diese Endpunkte weiter 501 `NOT_IMPLEMENTED`. | Test `backend/src/test/java/planningpoker/session/SessionResourceTest.java` |
| A5 | Der Mapper erfüllt die Filterregeln aus 4.6 in jeder Phase: in `LOBBY` sind `activeIssue` und `round` `null`; in `VOTING` sind `votes` und `stats` `null`, `myVote` nur die eigene Karte, `hasVoted` je Teilnehmer; in `REVEALED` sehen alle dieselben `votes` und `stats`; `preselectedIssueIid` nur beim Scrum Master; `history` neueste zuerst mit `revealedAt` als RFC 3339; das serialisierte JSON eines Entwicklers in `VOTING` enthält keine fremde Karte. | Test `backend/src/test/java/planningpoker/session/SessionViewMapperTest.java` |
| A6 | Kein serialisierter Snapshot enthält ein Token; keine Logzeile des Testprozesses enthält ein in den Tests erzeugtes Token. | Test `backend/src/test/java/planningpoker/session/SessionViewMapperTest.java`, `backend/src/test/java/planningpoker/session/SessionApiTest.java` |
| A7 | `contracts/api/openapi.yaml` dokumentiert 401 und 404 mit `ProblemDetail` an jedem Endpunkt mit `security`; `make contracts` ist gelaufen, `make drift` ist grün. | Test `backend/src/test/java/planningpoker/session/api/ContractTest.java`; Aufruf `make drift` |
| A8 | Jede `SessionException` aus Registry oder Domäne wird an der Grenze zu `application/problem+json` mit ihrem `errorCode` und dessen Status (`NAME_TAKEN` 409, `SESSION_NOT_FOUND` 404, `VALIDATION_ERROR` 400, `FORBIDDEN_ROLE` 403, `UNAUTHORIZED` 401). | Test `backend/src/test/java/planningpoker/session/SessionApiTest.java` |

## Contracts

`contracts/api/openapi.yaml` und `frontend/src/app/api/schema.d.ts` ändern sich kompatibel: die
Antworten 401 und 404 kommen an die Endpunkte `listIssues`, `selectIssue`, `vote`, `revealRound`,
`restartRound`, `confirmRound` hinzu; keine Schemaänderung. Konsument: das Frontend
(`ApiService` aus 0005, keine Anpassung nötig). Regeneriert mit `make contracts`.

## Risiko

Stufe: high
Begründung: `contracts/**` ist high; `backend/src/main/` ist medium, der Eskalator `token`
greift über Token-Prüfung und Antworten. Authentifizierung und Autorisierung sind nach
`harness/policies/risk.md` high.
Gates: G0 und G1 in dieser Session. G2: Label `human-approved`. G3: Status `verified`. Reviews:
Code, Sicherheit, Architektur.
ADR nötig: nein, weil ADR 0003 (Token je Teilnehmer, Rolle aus dem Token) die Entscheidung
festlegt und diese Spec ihr folgt; A5.1 bis A5.3 werden eingehalten.

## Umsetzung

Entscheidungen:

- Keine neuen Abhängigkeiten.
- Zwei Filter statt eines: `platform.BearerTokenFilter` (Name-Binding `@Authenticated`, liest `Authorization: Bearer <token>`, 401 ohne oder mit falsch gebildetem Header, legt das Token als Request-Eigenschaft ab, kennt keine Fachbegriffe) und `session.ActorFilter` (liest Pfadparameter `id` und das Token, `SessionRegistry.read` sucht den Teilnehmer mit diesem Token, 404 bei unbekannter Sitzung, 401 bei unbekanntem Token, prüft `@RequiresRole` über `ResourceInfo`, 403; legt `Actor` als Request-Eigenschaft ab). Die Ressource liest den `Actor` über `@Context ContainerRequestContext`.
- Rollenprüfung an der Grenze zusätzlich zur Domäne: der Filter antwortet 403, bevor die Methode läuft; die Domäne prüft erneut (A1.4).
- `SessionExceptionMapper` im Paket `session` (`ExceptionMapper<SessionException>`), baut `ProblemDetail` wie `ApiExceptionMapper`; eine `SessionException` aus einem Filter wird dort direkt zur Antwort.
- Mapper als Klasse `SessionViewMapper` mit `toView(Session, String receiverId)` ohne CDI-Zustand; `revealedAt` als `OffsetDateTime` in UTC.

Dateien:

- `backend/src/main/java/planningpoker/platform/Authenticated.java`: neu, `@NameBinding`
- `backend/src/main/java/planningpoker/platform/BearerTokenFilter.java`: neu, `ContainerRequestFilter`, Priorität `AUTHENTICATION`, Eigenschaft `planningpoker.bearerToken`
- `backend/src/main/java/planningpoker/session/Actor.java`: neu, Record `sessionId`, `participantId`, `role`
- `backend/src/main/java/planningpoker/session/RequiresRole.java`: neu, Annotation mit `Role`
- `backend/src/main/java/planningpoker/session/ActorFilter.java`: neu, `ContainerRequestFilter`, Priorität `AUTHORIZATION`, Eigenschaft `planningpoker.actor`
- `backend/src/main/java/planningpoker/session/SessionExceptionMapper.java`: neu
- `backend/src/main/java/planningpoker/session/SessionViewMapper.java`: neu, Filterregeln 4.6
- `backend/src/main/java/planningpoker/session/SessionResource.java`: ändern, Erstellen, Beitreten, Lesen umgesetzt; `@Authenticated` und `@RequiresRole` an allen anderen Methoden; `@APIResponse` 401 und 404 ergänzt
- `backend/src/test/java/planningpoker/session/SessionApiTest.java`: neu, A1, A2, A3, A6 (Log), A8
- `backend/src/test/java/planningpoker/session/SessionResourceTest.java`: ändern, 501-Fälle mit echter Sitzung und richtiger Rolle, A4
- `backend/src/test/java/planningpoker/session/SessionViewMapperTest.java`: neu, A5, A6 (Snapshot)
- `backend/src/test/java/planningpoker/session/SessionBuilder.java`: ändern, Zugriff auf Scrum Master und Entwickler für den Mapper-Test, falls nötig
- `backend/src/test/java/planningpoker/session/api/ContractTest.java`: ändern, A7
- `contracts/api/openapi.yaml`: ändern, generiert
- `frontend/src/app/api/schema.d.ts`: ändern, generiert
- `project-rules/backend.md`: ändern, Abschnitt APIs (Filter, Annotationen, Mapper)
- `docs/domain/invariants.md`: ändern, Regeln zur Token-Zuordnung und zur Rolle an der Grenze

Schritte:

1. `Authenticated`, `BearerTokenFilter` (Header fehlt, kein `Bearer`, leeres Token: `ApiException(UNAUTHORIZED)`).
2. `Actor`, `RequiresRole`, `ActorFilter`: Sitzung über `registry.read(id, …)` (unbekannt: `SESSION_NOT_FOUND` aus der Registry), Teilnehmer mit `token.equals(...)` suchen (`MessageDigest.isEqual` auf den Bytes), sonst `UNAUTHORIZED`; Rolle gegen `@RequiresRole` der Methode, sonst `FORBIDDEN_ROLE`.
3. `SessionExceptionMapper`; `SessionViewMapper.toView(session, receiverId)`: `participants` mit `hasVoted` aus `round.hasVoted`; `round` mit `myVote` (nur Empfänger), `allVoted`, `confirming`, `votes` und `stats` nur bei `revealed`; `preselectedIssueIid` nur für `SCRUM_MASTER`; `history` als `HistoryEntryView` mit `finalCard` oder `null`; `average` aus `OptionalDouble` oder `null`.
4. `SessionResource`: `createSession` (201, `Location` optional), `joinSession` (`registry.update(id, s -> s.join(name))`, 201), `getSession` (`registry.read`, Mapper mit `actor.participantId()`); Annotationen an allen anderen Methoden (`listIssues`, `selectIssue`, `revealRound`, `restartRound`, `confirmRound`: `SCRUM_MASTER`; `vote`: `DEVELOPER`); `@APIResponse` 401 und 404 ergänzen.
5. `make contracts`, `ContractTest` um 401 und 404 je gesichertem Endpunkt erweitern.
6. Tests: `SessionApiTest` baut Sitzungen über die API mit zufälligen Namen (T3.1); `SessionResourceTest` 501-Fälle mit echter Sitzung; `SessionViewMapperTest` mit `SessionBuilder` je Phase und Jackson-Serialisierung (`ObjectMapper` aus Quarkus oder eigener mit `Jdk8Module`-freiem Mapping, weil die DTOs keine `Optional` enthalten); Logprüfung wie `LoggingTest` auf die in den Tests erzeugten Tokens.
7. `project-rules/backend.md` (APIs) und `docs/domain/invariants.md` nachziehen; `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `backend/src/test/java/planningpoker/session/SessionApiTest.java`: Erstellen und Lesen als Scrum Master |
| A2 | `backend/src/test/java/planningpoker/session/SessionApiTest.java`: Beitreten, Name vergeben (Groß-/Kleinschreibung), unbekannte Sitzung, zu langer Name |
| A3 | `backend/src/test/java/planningpoker/session/SessionApiTest.java`: ohne Header, unbekanntes Token, Token anderer Sitzung, unbekannte Sitzung |
| A4 | `backend/src/test/java/planningpoker/session/SessionResourceTest.java`: 403 je Endpunkt und Rolle, 501 mit richtiger Rolle |
| A5 | `backend/src/test/java/planningpoker/session/SessionViewMapperTest.java`: je Phase und Rolle, JSON ohne fremde Karte |
| A6 | `backend/src/test/java/planningpoker/session/SessionViewMapperTest.java`: JSON ohne Token; `SessionApiTest.java`: Logdatei ohne die erzeugten Tokens |
| A7 | `backend/src/test/java/planningpoker/session/api/ContractTest.java`: 401 und 404 je gesichertem Endpunkt / Aufruf `make drift` |
| A8 | `backend/src/test/java/planningpoker/session/SessionApiTest.java`: Status und `errorCode` je Fall |

Testdaten: Sitzungen über die API mit zufälligem Namenszusatz; `SessionBuilder` für den Mapper.

Contracts zu regenerieren: `make contracts` nach Schritt 4.

## Offene Fragen

- [x] Obergrenzen für die Zahl der Sitzungen und der Teilnehmer je Sitzung (Review-Hinweis zu 0004)? → Nein, nicht in dieser Spec; 0015 (Härtung) entscheidet mit einem eigenen `errorCode`. (Morten Möller, 2026-11-16)

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/session/`, `backend/src/test/java/planningpoker/platform/`, `make e2e` (`health.spec.ts`)
- Browser: keiner
- Aufruf: `make contracts` und `make drift` (A7)
