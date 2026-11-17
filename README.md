# Planning Poker

Ein Scrum-Team schätzt GitLab-Issues synchron: Der Scrum Master legt eine Sitzung an, teilt Link
oder Session-ID, wählt ein Issue und gibt es frei. Die Entwickler wählen verdeckt eine Karte, der
Scrum Master löst auf, startet bei Bedarf eine neue Runde und übernimmt den vereinbarten Wert als
Kommentar an das GitLab-Issue. Lösung der Coding Challenge Planning Poker
([Frontend-README](https://github.com/buchner-org/coding-challenge/blob/main/planning-poker/frontend/README.md),
[Backend-README](https://github.com/buchner-org/coding-challenge/blob/main/planning-poker/backend/README.md)).

## Schnellstart

Voraussetzungen: JDK 21 (`JAVA_HOME`), Node in der Version aus `.nvmrc`, pnpm 12, Git und ein
GitLab-Token mit Scope `api` (Abschnitt GitLab, Absatz Token). Aus einem frischen Klon starten
fünf Befehle die Anwendung; die letzten beiden laufen je in einem eigenen Terminal:

```bash
git clone https://github.com/Morten-Moeller/planning-poker.git && cd planning-poker
cp .env.example .env                                       # GITLAB_TOKEN eintragen, write-weight prüfen
make install                                               # Abhängigkeiten, Playwright-Browser
(set -a && . ./.env && cd backend && ./mvnw quarkus:dev)   # Backend auf http://localhost:8080
pnpm -C frontend start                                     # Frontend auf http://localhost:4200
```

Danach `http://localhost:4200` öffnen; die Startseite zeigt, ob das Backend erreichbar ist
(`GET /api/health`). Ohne `GITLAB_TOKEN` startet das Backend nicht und nennt den fehlenden
Schlüssel. `.env.example` nennt jeden Schalter des Backends als Umgebungsvariable (Abschnitt
GitLab); eine andere GitLab-Instanz setzt zum Beispiel
`PLANNINGPOKER_GITLAB_BASE_URL=https://gitlab.example.com` in `.env`.

Das Frontend erreicht das Backend über den Dev-Proxy (`frontend/proxy.conf.mjs`, Pfade `/api`
und `/ws`); es gibt kein CORS.

Ist Port 8080 oder 4200 belegt: Backend mit `./mvnw quarkus:dev -Dquarkus.http.port=18080`,
Frontend mit `BACKEND_PORT=18080 pnpm -C frontend start --port 14200`. `make e2e` nimmt
dieselben Variablen `BACKEND_PORT` und `FRONTEND_PORT`, dazu `GITLAB_DOUBLE_PORT` für das
GitLab-Double.

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

Jeder Schlüssel lässt sich als Umgebungsvariable setzen, zum Beispiel in `.env`. Quarkus bildet
den Schlüssel so ab: Großbuchstaben, `.` und `-` werden zu `_`. Ausnahme ist der Token, der aus
`GITLAB_TOKEN` kommt.

| Schlüssel | Umgebungsvariable | Standard | Bedeutung |
|---|---|---|---|
| `planningpoker.gitlab.base-url` | `PLANNINGPOKER_GITLAB_BASE_URL` | `https://gitlab.com` | Basis-URL der GitLab-Instanz |
| `planningpoker.gitlab.token` | `GITLAB_TOKEN` | keiner, Pflicht | GitLab-Token mit Scope `api` (Absatz Token) |
| `planningpoker.gitlab.write-weight` | `PLANNINGPOKER_GITLAB_WRITE_WEIGHT` | `false` | Zahlenwerte zusätzlich als `weight` setzen (Premium/Ultimate) |
| `planningpoker.gitlab.timeout` | `PLANNINGPOKER_GITLAB_TIMEOUT` | `10s` | Verbindungs- und Lesezeit je GitLab-Aufruf |
| `planningpoker.session.ttl` | `PLANNINGPOKER_SESSION_TTL` | `12h` | Verfall inaktiver Sitzungen |
| `planningpoker.session.max-sessions` | `PLANNINGPOKER_SESSION_MAX_SESSIONS` | `1000` | Obergrenze lebender Sitzungen der Instanz; abgelaufene Sitzungen zählen nicht |
| `planningpoker.session.max-participants` | `PLANNINGPOKER_SESSION_MAX_PARTICIPANTS` | `50` | Obergrenze der Teilnehmer je Sitzung, der Scrum Master zählt mit |
| `planningpoker.session.allowed-projects` | `PLANNINGPOKER_SESSION_ALLOWED_PROJECTS` | keiner, alle Projekte erlaubt | Projekt-Allowlist: kommagetrennte Projekt-IDs oder -Pfade, für die Sitzungen angelegt werden dürfen; ein leerer Wert gilt als nicht gesetzt |
| `planningpoker.realtime.auth-timeout` | `PLANNINGPOKER_REALTIME_AUTH_TIMEOUT` | `5s` | Zeit bis zur ersten Nachricht `auth` einer WebSocket-Verbindung |

`.env.example` enthält jede Zeile der Tabelle: `GITLAB_TOKEN` leer als Pflichtzeile,
`PLANNINGPOKER_GITLAB_WRITE_WEIGHT=true` aktiv, alle übrigen auskommentiert mit dem Standardwert,
dazu `QUARKUS_HTTP_PORT` für den Port des Backends.

Token: Ein klassischer Personal Access Token oder ein Project Access Token mit Scope `api` und
mindestens der Rolle Developer im Projekt funktioniert. Das Backend liest damit Issues und schreibt
Kommentar und Gewicht. Ein fine-grained Token ohne Rechte am Projekt bekommt von GitLab 403. Ein
Project Access Token gilt nur für sein Projekt und ist deshalb die engere Wahl; ein Personal
Access Token gilt für jedes Projekt seines Besitzers.

Das bestätigte Ergebnis wird als Kommentar (Note) am Issue hinterlegt: Endwert, Rundenzahl,
Verteilung der letzten Runde und Durchschnitt. Das funktioniert in jedem GitLab-Tarif. Mit
`write-weight` setzt das Backend Zahlenwerte vorher zusätzlich als `weight`; bei `?` und ☕ wird
nur kommentiert. Der Standard in `application.properties` ist `false`, `.env.example` schlägt
`PLANNINGPOKER_GITLAB_WRITE_WEIGHT=true` vor. Ohne GitLab Premium oder Ultimate den Wert in `.env`
auf `false` setzen.

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
Version des Vertrags: `2.1.0` (ADR 0005, ADR 0006).

### Ablauf

Befehle gehen per REST an `/api` und antworten ohne Zustand (204 oder 201 mit den neuen IDs).
Nach jeder Änderung sendet der Server jedem verbundenen Teilnehmer per WebSocket den
vollständigen, je Empfänger gefilterten Snapshot `session.state` (`SessionView`): verdeckte
Karten anderer fehlen bis zur Auflösung, `preselectedIssueIid` sieht nur der Scrum Master, in
`LOBBY` sind `activeIssue` und `round` `null`. Das Frontend ersetzt seinen Zustand mit jedem
Snapshot vollständig (ADR 0004). Jeder Snapshot trägt `timerSeconds` (Timer der Sitzung oder
`null`), `serverTime` (Serverzeit beim Erzeugen) und in `round` die Frist `deadline` (oder
`null`); alle Zeiten in RFC 3339 mit Offset.

### Zustandsautomat

| Phase | Ereignis | Auslöser | Neue Phase |
|---|---|---|---|
| `LOBBY` | Freigabe | Scrum Master | `VOTING`, Runde 1 |
| `VOTING`, `REVEALED` | Issue-Wechsel | Scrum Master | `VOTING`, Runde 1 |
| `VOTING` | Auflösung | Scrum Master | `REVEALED` |
| `VOTING` | Frist erreicht | Server | `REVEALED` |
| `REVEALED` | Neue Runde | Scrum Master | `VOTING`, Rundennummer plus 1 |
| `REVEALED` | Bestätigung | Scrum Master | `LOBBY` |

Timer (ADR 0006): Der Scrum Master setzt mit `PUT …/timer` eine Dauer von 5 bis 3600 Sekunden
oder schaltet ihn mit `null` ab. Jede danach startende Runde (Freigabe, Issue-Wechsel, Neue
Runde) bekommt die Frist Start plus Dauer; eine laufende Runde behält ihre Frist. Eine Prüfung
alle 250 ms löst jede Runde mit erreichter Frist auf, auch ohne Stimmen und ohne verbundenen
Scrum Master. Das Frontend zeigt die Restzeit aus `deadline` und der Abweichung der eigenen Uhr
zu `serverTime`.

### REST-Endpunkte

Außer beim Erstellen und Beitreten trägt jeder Aufruf `Authorization: Bearer <token>`.

| Methode und Pfad | Rolle | Request | Erfolg | Fehler |
|---|---|---|---|---|
| `GET /api/health` | offen | – | 200 `{ status }` | – |
| `POST /api/sessions` | offen | `{ name, gitlabProjectId, issueIid }` | 201 `{ sessionId, participantId, token }` | 400, 403 `PROJECT_NOT_ALLOWED`, 404 `ISSUE_NOT_FOUND`, 409 `LIMIT_REACHED`, 502 |
| `POST /api/sessions/{id}/participants` | offen | `{ name }` | 201 `{ participantId, token }` | 400, 404, 409 `NAME_TAKEN`, `LIMIT_REACHED` |
| `GET /api/sessions/{id}` | beide | – | 200 `SessionView` | 401, 404 |
| `GET /api/sessions/{id}/issues?search=&page=` | Scrum Master | – | 200 `{ items, nextPage }` | 403, 502 |
| `POST /api/sessions/{id}/active-issue` | Scrum Master | `{ issueIid }` | 204 | 400, 403, 404, 409, 502 |
| `PUT /api/sessions/{id}/timer` | Scrum Master | `{ seconds }` (5 bis 3600 oder `null`) | 204 | 400, 403 |
| `PUT /api/sessions/{id}/vote` | Entwickler | `{ card }` | 204 | 400 `INVALID_CARD`, 403, 409 |
| `POST /api/sessions/{id}/round/reveal` | Scrum Master | – | 204 | 403, 409 |
| `POST /api/sessions/{id}/round/restart` | Scrum Master | – | 204 | 403, 409 |
| `POST /api/sessions/{id}/round/confirm` | Scrum Master | `{ card }` | 204 | 400 `INVALID_CARD`, 403, 409, 502 |

Karten im Wire-Format: `"0"`, `"1"`, `"2"`, `"3"`, `"5"`, `"8"`, `"13"`, `"21"`, `"34"`, `"?"`,
`"COFFEE"`. Namen haben 1 bis 30 Zeichen (getrimmt).

### WebSocket-Nachrichten

Endpunkt `/ws/sessions/{sessionId}`. Jede Nachricht hat die Hülle
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
| `PROJECT_NOT_ALLOWED` | 403 | Projekt nicht in der Projekt-Allowlist; GitLab wird nicht gefragt |
| `SESSION_NOT_FOUND` | 404 | Sitzung unbekannt oder verfallen |
| `ISSUE_NOT_FOUND` | 404 | Issue im GitLab-Projekt nicht gefunden |
| `NAME_TAKEN` | 409 | Name in der Sitzung bereits vergeben |
| `INVALID_STATE` | 409 | Aktion in dieser Phase nicht erlaubt oder Bestätigung läuft |
| `LIMIT_REACHED` | 409 | Obergrenze der Sitzungen oder der Teilnehmer der Sitzung erreicht |
| `GITLAB_ERROR` | 502 | GitLab nicht erreichbar oder Fehlerantwort; der GitLab-Text wird nicht weitergegeben |

Eine unbekannte oder verfallene Sitzung antwortet 404 `SESSION_NOT_FOUND`, ein fehlendes oder
fremdes Token für eine bestehende Sitzung 401 `UNAUTHORIZED`. Die Antworten bleiben getrennt,
weil der offene Beitritt die Existenz einer Sitzung ohnehin mit 404 meldet (ADR 0005).

### Verbleibendes Risiko

Erstellen und Beitreten brauchen kein Login (ADR 0003). Das Backend liest jedes Projekt, das der
GitLab-Token der Instanz sieht; ohne Projekt-Allowlist kann jeder, der das Backend erreicht,
Titel, Beschreibung und Link der Issues dieser Projekte lesen. Die Obergrenzen begrenzen den
Speicherbedarf, nicht die Zahl der Aufrufe: es gibt kein Rate-Limit je Client-IP, und
WebSocket-Verbindungen vor `auth` sind nur durch `planningpoker.realtime.auth-timeout` begrenzt,
nicht in ihrer Zahl. Ein Aufrufer kann die Obergrenze der Sitzungen ausschöpfen und so bis zum
Verfall weitere Erstellungen verhindern. Die Anwendung ist deshalb für den Betrieb in einem
internen Netz gedacht (ADR 0005).

Issue-Beschreibungen kommen als Markdown aus GitLab und gehen über die eingebaute Bereinigung
von Angular in die Seite. Zusätzlich setzt `frontend/src/index.html` die Content-Security-Policy
`img-src 'self' data:`: Bilder von fremden Hosts in einer Beschreibung lädt der Browser nicht, so
erfährt kein fremder Server, wer eine Sitzung geöffnet hat.

## Optionale Features

| ID | Feature | Verhalten |
|---|---|---|
| O-01 | Timer | Der Scrum Master stellt in der Sitzung eine Dauer von 5 bis 3600 Sekunden ein. Jede danach startende Runde zeigt allen die Restzeit; bei Ablauf löst der Server die Runde auf, auch ohne verbundenen Scrum Master (ADR 0006). |
| O-02 | Ausreißer | Liegen niedrigste und höchste Zahlenkarte einer aufgelösten Runde mehr als zwei Positionen im Kartensatz auseinander, tragen die Stimmen mit diesen Karten den Text „Ausreißer“. Das Frontend berechnet die Markierung aus dem Snapshot. |
| O-03 | Konsens | Zeigen mindestens zwei Stimmen dieselbe Zahlenkarte und keine andere, sehen alle einen Hinweis mit Konfetti; im Dialog „Ergebnis übernehmen“ ist der Wert vorausgewählt. Unter reduzierter Bewegung entfällt das Konfetti. |

## Abgabe

- `docs/abgabe/anforderungen.md`: jede Anforderung R-01 bis R-26 mit den Tests, die sie belegen.
- `docs/abgabe/checkliste.md`: manuelle Prüfung gegen ein echtes GitLab-Projekt und der
  Barrierefreiheit.
- `make e2e` spielt den Gesamtablauf mit drei Browsern gegen das GitLab-Double durch
  (`frontend/e2e/full-flow.spec.ts`).

## Entwicklung

Dieses Repository verwendet den AI Development Harness. Einstieg: `AGENTS.md` und
`harness/README.md`. Plan und Specs: `docs/umsetzungsplan.md`, `docs/roadmap.md`,
`docs/specs/`. Stack-Regeln: `project-rules/`.

| Ich will | Befehl |
|---|---|
| Git-Hooks einrichten (einmal je Klon) | `make setup` |
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
