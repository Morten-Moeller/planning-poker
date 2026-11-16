# Planning Poker

Ein Scrum-Team schätzt GitLab-Issues synchron: Der Scrum Master legt eine Sitzung an, teilt Link
oder Session-ID, wählt ein Issue und gibt es frei. Die Entwickler wählen verdeckt eine Karte, der
Scrum Master löst auf, startet bei Bedarf eine neue Runde und übernimmt den vereinbarten Wert als
Kommentar an das GitLab-Issue. Lösung der Coding Challenge Planning Poker
([Frontend-README](https://github.com/buchner-org/coding-challenge/blob/main/planning-poker/frontend/README.md),
[Backend-README](https://github.com/buchner-org/coding-challenge/blob/main/planning-poker/backend/README.md)).

## Einrichtung und Start

Voraussetzungen: JDK 21 (`JAVA_HOME`; auf macOS findet `make` das JDK 21 selbst), Node in der
Version aus `.nvmrc`, pnpm 12, ein GitLab Personal Access Token mit Scope `api`.

```bash
cp .env.example .env            # GITLAB_TOKEN eintragen
make setup && make install      # Git-Hooks, Abhängigkeiten, Playwright-Browser
set -a && source .env && set +a
(cd backend && ./mvnw quarkus:dev)   # Backend auf http://localhost:8080
pnpm -C frontend start               # Frontend auf http://localhost:4200
```

Das Frontend erreicht das Backend über den Dev-Proxy (`frontend/proxy.conf.mjs`, Pfade `/api`
und `/ws`); es gibt kein CORS. Die Startseite zeigt, ob das Backend erreichbar ist.

Ist Port 8080 oder 4200 belegt: Backend mit `./mvnw quarkus:dev -Dquarkus.http.port=18080`,
Frontend mit `BACKEND_PORT=18080 pnpm -C frontend start --port 14200`. `make e2e` nimmt
dieselben Variablen `BACKEND_PORT` und `FRONTEND_PORT`.

## Variante

Gebaut ist Variante A: ein Angular-Frontend und ein Quarkus-Backend. Der Server erzwingt verdeckte
Karten und Rollen, wie es das Backend-README verlangt („stellt sicher, dass Steuerungsaktionen
ausschließlich dem Scrum Master vorbehalten sind“). Der GitLab-Token bleibt im Backend, und die
Echtzeit-Synchronisation braucht keinen Drittdienst. In Variante B bräuchte jeder Browser einen
Token mit Schreibrecht, und die Synchronisation liefe über einen externen Dienst oder über
Abfragen der GitLab-API. Entscheidung: `docs/adr/0001-angular-und-quarkus-variante-a.md`.

## GitLab

Das Backend spricht die GitLab-REST-API v4 mit dem Header `PRIVATE-TOKEN`. Basis-URL und Token
gelten je Backend-Instanz, nicht je Sitzung.

| Schlüssel | Standard | Bedeutung |
|---|---|---|
| `planningpoker.gitlab.base-url` | `https://gitlab.com` | Basis-URL der GitLab-Instanz |
| `planningpoker.gitlab.token` | keiner, aus `GITLAB_TOKEN` | Personal Access Token mit Scope `api` |
| `planningpoker.gitlab.write-weight` | `false` | Zahlenwerte zusätzlich als `weight` setzen (Premium/Ultimate) |
| `planningpoker.gitlab.timeout` | `10s` | Verbindungs- und Lesezeit je GitLab-Aufruf |
| `planningpoker.session.ttl` | `12h` | Verfall inaktiver Sitzungen |

Das bestätigte Ergebnis wird als Kommentar (Note) am Issue hinterlegt: Endwert, Rundenzahl,
Verteilung der letzten Runde und Durchschnitt. Das funktioniert in jedem GitLab-Tarif. Mit
`write-weight` setzt das Backend Zahlenwerte vorher zusätzlich als `weight`; bei `?` und ☕ wird
nur kommentiert.

Vorlage des Kommentars (Karten in Kartenreihenfolge, Durchschnitt über die Zahlenkarten mit einer
Nachkommastelle; ohne Zahlenkarte endet der Text mit `Kein Durchschnitt.`):

```markdown
**Planning Poker: Ergebnis 5**

Runden: 2. Letzte Runde: 3 (1 Stimme), 5 (3 Stimmen), 8 (1 Stimme). Durchschnitt 5,2.
```

Ablauf von `POST /api/sessions/{id}/round/confirm`:

1. Unter der Sperre der Sitzung: Prüfung von Rolle und Phase `REVEALED`, `round.confirming` wird
   `true`. Ab hier lehnt die Sitzung jede Steuerungsaktion mit 409 `INVALID_STATE` ab; Beitreten
   und Lesen bleiben möglich.
2. Außerhalb der Sperre: mit `write-weight` und Zahlenkarte `PUT …/issues/{iid}` mit `weight`,
   danach `POST …/issues/{iid}/notes` mit dem Kommentar.
3. Erfolg: Endwert im jüngsten Protokolleintrag, Phase `LOBBY` ohne aktives Issue, Antwort 204.
   Fehler oder keine Antwort von GitLab: `confirming` wieder `false`, Phase bleibt `REVEALED`,
   Antwort 502 `GITLAB_ERROR`; ein erneuter Versuch ist möglich. Schlägt das Gewicht fehl, wird
   kein Kommentar geschrieben.

## Schnittstellen

Der Server ist die einzige Quelle der Wahrheit. Der Vertrag liegt generiert in
`contracts/api/openapi.yaml` (Quelle: die Java-DTOs unter `backend/src/main/java/planningpoker/`
und `backend/src/main/resources/META-INF/openapi.yaml`); `make contracts` schreibt ihn und die
TypeScript-Typen `frontend/src/app/api/schema.d.ts`, `make drift` meldet einen veralteten Stand.
Im Dev-Modus zeigt `http://localhost:8080/q/swagger-ui` den Vertrag. Sechs Beispiel-Snapshots je
Phase und Rolle liegen unter `contracts/api/examples/`; Backend-Test und Frontend-Typen prüfen sie.
Bis zum jeweiligen Meilenstein antworten die Sitzungs-Endpunkte 501 `NOT_IMPLEMENTED`.

### Ablauf

Befehle gehen per REST an `/api` und antworten ohne Zustand (204 oder 201 mit den neuen IDs).
Nach jeder Änderung sendet der Server jedem verbundenen Teilnehmer per WebSocket den
vollständigen, je Empfänger gefilterten Snapshot `session.state` (`SessionView`): verdeckte
Karten anderer fehlen bis zur Auflösung, `preselectedIssueIid` sieht nur der Scrum Master, in
`LOBBY` sind `activeIssue` und `round` `null`. Das Frontend ersetzt seinen Zustand mit jedem
Snapshot vollständig (ADR 0004).

### REST-Endpunkte

Außer beim Erstellen und Beitreten trägt jeder Aufruf `Authorization: Bearer <token>`.

| Methode und Pfad | Rolle | Request | Erfolg | Fehler |
|---|---|---|---|---|
| `GET /api/health` | offen | – | 200 `{ status }` | – |
| `POST /api/sessions` | offen | `{ name, gitlabProjectId, issueIid }` | 201 `{ sessionId, participantId, token }` | 400, 404 `ISSUE_NOT_FOUND`, 502 |
| `POST /api/sessions/{id}/participants` | offen | `{ name }` | 201 `{ participantId, token }` | 400, 404, 409 `NAME_TAKEN` |
| `GET /api/sessions/{id}` | beide | – | 200 `SessionView` | 401, 404 |
| `GET /api/sessions/{id}/issues?search=&page=` | Scrum Master | – | 200 `{ items, nextPage }` | 403, 502 |
| `POST /api/sessions/{id}/active-issue` | Scrum Master | `{ issueIid }` | 204 | 400, 403, 404, 409, 502 |
| `PUT /api/sessions/{id}/vote` | Entwickler | `{ card }` | 204 | 400 `INVALID_CARD`, 403, 409 |
| `POST /api/sessions/{id}/round/reveal` | Scrum Master | – | 204 | 403, 409 |
| `POST /api/sessions/{id}/round/restart` | Scrum Master | – | 204 | 403, 409 |
| `POST /api/sessions/{id}/round/confirm` | Scrum Master | `{ card }` | 204 | 400 `INVALID_CARD`, 403, 409, 502 |

Karten im Wire-Format: `"0"`, `"1"`, `"2"`, `"3"`, `"5"`, `"8"`, `"13"`, `"21"`, `"34"`, `"?"`,
`"COFFEE"`. Namen haben 1 bis 30 Zeichen (getrimmt).

### WebSocket-Nachrichten

Endpunkt `/ws/sessions/{sessionId}` (Umsetzung ab Spec 0009). Jede Nachricht hat die Hülle
`{ "type": "…", "payload": { … } }`; das Token steht nie in der URL.

| Richtung | `type` | Payload | Wann |
|---|---|---|---|
| Client an Server | `auth` | `{ token }` | erste Nachricht, innerhalb von 5 Sekunden |
| Server an Client | `session.state` | `SessionView` | nach erfolgreichem `auth` und nach jeder Zustandsänderung |
| Server an Client | `round.allVoted` | `{ roundNumber }` | nur an den Scrum Master, einmal je Vollständigkeit |
| Server an Client | `error` | `{ errorCode, detail }` | bei fehlgeschlagenem `auth`; danach schließt der Server |
| Client an Server | `ping` | keiner | alle 30 Sekunden; der Server antwortet mit `pong` |

### Fehlerformat

Fehler folgen RFC 9457 als `application/problem+json`; Clients entscheiden nur anhand von
`errorCode`, nie anhand von `detail`:

```json
{ "type": "about:blank", "title": "Conflict", "status": 409, "detail": "The round is already revealed.", "errorCode": "INVALID_STATE" }
```

| `errorCode` | Status | Bedeutung |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request-Body oder Parameter ungültig (leerer Name, fehlende Projekt-ID) |
| `INVALID_CARD` | 400 | Karte nicht im Kartensatz |
| `UNAUTHORIZED` | 401 | Token fehlt oder ist unbekannt |
| `FORBIDDEN_ROLE` | 403 | Aktion der anderen Rolle vorbehalten |
| `SESSION_NOT_FOUND` | 404 | Sitzung unbekannt oder verfallen |
| `ISSUE_NOT_FOUND` | 404 | Issue im GitLab-Projekt nicht gefunden |
| `NAME_TAKEN` | 409 | Name in der Sitzung bereits vergeben |
| `INVALID_STATE` | 409 | Aktion in dieser Phase nicht erlaubt oder Bestätigung läuft |
| `NOT_IMPLEMENTED` | 501 | Endpunkt noch nicht umgesetzt; entfällt mit dem letzten Meilenstein |
| `GITLAB_ERROR` | 502 | GitLab nicht erreichbar oder Fehlerantwort; der GitLab-Text wird nicht weitergegeben |

## Entwicklung

Dieses Repository verwendet den AI Development Harness. Einstieg: `AGENTS.md` und
`harness/README.md`. Plan und Specs: `docs/umsetzungsplan.md`, `docs/roadmap.md`,
`docs/specs/`. Stack-Regeln: `project-rules/`.

| Ich will | Befehl |
|---|---|
| alle Gates laufen lassen | `make check` (test, typecheck, lint, sast, deps, drift) |
| End-to-End-Tests | `make e2e` (startet Backend und Frontend selbst; Ports über `BACKEND_PORT`, `FRONTEND_PORT`) |
| Formatierer anwenden | `make format` |
| nur ein Projekt testen | `make test-backend`, `make test-frontend` |
| eine Änderung vorschlagen | `/spec <Thema>` in Claude Code, dann Freigabe durch eine Person |
| eine freigegebene Spec umsetzen | `/implement <Nummer>` |
| alle Ziele sehen | `make help` |

```text
backend/         Quarkus (Java 21): session, gitlab, realtime, platform
frontend/        Angular (pnpm): src/app je Feature, e2e/ Playwright
contracts/api/   generierter OpenAPI-Vertrag und Beispiele (ab Spec 0002)
docs/            Umsetzungsplan, Roadmap, Specs, ADRs, Glossar, Architektur
project-rules/   Stack-Regeln für Frontend, Backend, Tests
harness/         Workflow, Policies, Quality Gates (harness-owned)
```

Harness-Version: `HARNESS_VERSION`. Aktualisierung mit `harness/scripts/update.sh`.
