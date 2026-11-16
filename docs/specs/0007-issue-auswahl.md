---
id: "0007"
title: Issue-Auswahl (M5, Teil 1)
status: approved
risk: medium
adrs: ["0002"]
owner: Morten Möller
created: 2026-11-16
updated: 2026-11-16
pr: ""
note: freigegeben in der Session
---

# Issue-Auswahl (M5, Teil 1)

Erster Teil von Meilenstein M5 aus `docs/umsetzungsplan.md`. Deckt ab: R-01 (Issue-Prüfung),
R-06, R-07, R-08, R-09 (Nutzung), R-10 (Daten). Annahmen: A-03 (vorausgewähltes Issue), A-04
(Issue-Wechsel), A-14 (GitLab-Konfiguration). Grundlage: Abschnitte 4.3, 4.4 und 4.7 des Plans,
der GitLab-Client aus 0003, die Domäne aus 0004 und die Grenze aus 0006.

## Ziel

Der Scrum Master sucht Issues seines GitLab-Projekts über das Backend, gibt eines frei und
wechselt es; beim Anlegen einer Sitzung prüft das Backend das angegebene Issue gegen GitLab.
GitLab-Fehler erreichen den Client als `ISSUE_NOT_FOUND` oder `GITLAB_ERROR` ohne GitLab-Text.
GitLab-Aufrufe laufen nie unter der Sperre der Sitzung.

## Scope

### Enthalten

- `GET /api/sessions/{id}/issues?search=&page=`: Suche über `GitLabClient.searchIssues`, Antwort `IssueListResponse` (`iid`, `title`, `webUrl`, `nextPage`), nur Scrum Master.
- `POST /api/sessions`: das angegebene Issue wird vor dem Anlegen mit `GitLabClient.loadIssue` geprüft; unbekannt antwortet 404 `ISSUE_NOT_FOUND`, GitLab-Fehler 502 `GITLAB_ERROR`; keine Sitzung entsteht.
- `POST /api/sessions/{id}/active-issue`: Issue vor der Sperre laden, dann `Session.selectIssue` unter der Sperre (Freigabe in `LOBBY`, Wechsel in `VOTING` und `REVEALED` nach A-04; `confirming` antwortet 409).
- Abbildung `GitLabException` auf `ApiException` an der Grenze: `NOT_FOUND` zu `ISSUE_NOT_FOUND`, alles andere zu `GITLAB_ERROR`.
- GitLab-Stubs für die Sitzungstests (`WireMockGitLab` auch für `SessionApiTest` und `SessionResourceTest`, weil Erstellen jetzt GitLab ruft).
- README: Zeile für `planningpoker.gitlab.timeout` in der GitLab-Tabelle (aus 0003 verschoben).

### Nicht enthalten

- Stimmen, Auflösen, neue Runde (0008); Bestätigen und Kommentar (0010); WebSocket (0009).
- Issue-Wechsel in `REVEALED` per HTTP ist erst mit 0008 erreichbar; die Domäne deckt ihn seit 0004 ab.
- GitLab-Double für End-to-End-Tests (0011); `make e2e` bleibt beim Health-Ablauf.
- Vertragsänderungen: die Endpunkte und Antworten stehen seit 0002 und 0006 im Vertrag.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Issue, Vorausgewähltes Issue, Aktives Issue, Freigabe, Issue-Wechsel, Phase, Runde, Scrum Master, Befehl, Snapshot | wie im Glossar |
| Seite | Ergebnisseite der Issue-Suche mit bis zu 20 Einträgen; `nextPage` ist die nächste Seitennummer oder `null` |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `GET …/issues?search=login&page=1` als Scrum Master ruft GitLab mit `state=opened`, `search=login`, `per_page=20`, `page=1` auf und antwortet 200 mit `items` (`iid`, `title`, `webUrl`) und `nextPage` aus `x-next-page`; `page=2` wird durchgereicht; eine leere Antwort liefert `items: []` und `nextPage: null`; ohne `search` fehlt der Parameter oder ist leer. | Test `backend/src/test/java/planningpoker/session/IssueSelectionTest.java` |
| A2 | Antwortet GitLab auf die Suche mit 401, 403, 5xx oder gar nicht (Timeout), antwortet der Endpunkt 502 `GITLAB_ERROR`; `detail` enthält weder den GitLab-Text noch den Token. | Test `backend/src/test/java/planningpoker/session/IssueSelectionTest.java` |
| A3 | `POST /api/sessions` mit einem Issue, das GitLab mit 404 beantwortet, antwortet 404 `ISSUE_NOT_FOUND`; mit GitLab-Fehler 502 `GITLAB_ERROR`; mit vorhandenem Issue 201 wie bisher. GitLab wird mit Projekt-ID und `iid` aus dem Body aufgerufen. | Test `backend/src/test/java/planningpoker/session/IssueSelectionTest.java` |
| A4 | Freigabe in `LOBBY`: `POST …/active-issue` als Scrum Master antwortet 204; danach zeigt der Snapshot beider Rollen `phase` `VOTING`, `activeIssue` mit `iid`, `title`, `description`, `webUrl` aus GitLab und `round.number` 1; vor der Freigabe sieht ein Entwickler `activeIssue` `null`. | Test `backend/src/test/java/planningpoker/session/IssueSelectionTest.java` |
| A5 | Wechsel in `VOTING`: ein zweites `POST …/active-issue` antwortet 204, der Snapshot zeigt das neue Issue, `round.number` 1 und `hasVoted` `false` für alle; ein unbekanntes `issueIid` antwortet 404 `ISSUE_NOT_FOUND` und lässt den Zustand unverändert; ein GitLab-Fehler antwortet 502 und lässt den Zustand unverändert; ein Entwickler erhält 403. | Test `backend/src/test/java/planningpoker/session/IssueSelectionTest.java` |
| A6 | Das Issue wird vor der Sperre geladen: während GitLab die Antwort auf `active-issue` verzögert, gelingt ein Beitritt zur selben Sitzung, bevor die Freigabe antwortet. | Test `backend/src/test/java/planningpoker/session/IssueSelectionTest.java` |
| A7 | Die README-Tabelle unter „GitLab“ nennt `planningpoker.gitlab.timeout` mit Standard `10s`. | Aufruf |
| A8 | Die bisherigen Tests laufen mit GitLab-Stubs weiter: `SessionApiTest` und `SessionResourceTest` legen Sitzungen mit einem gestubbten Issue an. | Test `backend/src/test/java/planningpoker/session/SessionApiTest.java`, `SessionResourceTest.java` |

## Contracts

keine. `contracts/api/openapi.yaml` ändert sich nicht; die Antworten 404 `ISSUE_NOT_FOUND` und
502 `GITLAB_ERROR` sind seit 0002 dokumentiert.

## Risiko

Stufe: medium
Begründung: `backend/src/main/java/planningpoker/session/` ist medium (kein Muster); keine
Contracts, keine Manifeste, keine Authentifizierungsdateien. Der Eskalator `keywords` greift,
falls eine hinzugefügte Zeile das Wort `token` enthält; die Umsetzung vermeidet es in Code und
Tests dieser Spec. Tests, README und `docs/` low.
Gates: G0 und G1 in dieser Session. G2: Label `human-approved`. G3: Status `verified` nur bei
high; bei medium nicht nötig (`verify_required_for: high`), `implement` führt `verify` trotzdem
aus. Reviews: Code, Sicherheit.
ADR nötig: nein, weil ADR 0002 (GitLab-Aufrufe nie unter der Sperre) die Entscheidung festlegt
und diese Spec ihr folgt.

## Umsetzung

Entscheidungen:

- Keine neuen Abhängigkeiten, keine Vertragsänderung.
- `GitLabIssues` (`@ApplicationScoped`, Paket `session`) kapselt die beiden Aufrufe für die Grenze: `loadIssue(projectId, iid)` liefert `Issue` oder wirft `ApiException` (`ISSUE_NOT_FOUND`, `GITLAB_ERROR`), `search(projectId, search, page)` liefert `IssueListResponse`; die Abbildung von `GitLabException.Reason` steht nur dort (A3.5).
- `createSession` lädt das Issue vor `registry.create`; `selectIssue` lädt es vor `registry.update` und übergibt das fertige `Issue` an `Session.selectIssue` (ADR 0002, Abschnitt 4.3).
- `detail` der 502-Antwort ist ein fester Text je Ursache (`GitLab rejected the request.`, `GitLab did not answer.`), nie die GitLab-Meldung.
- Tests: `WireMockGitLab` mit Standard-Scope an den Sitzungstests; `GitLabStubs` im Testpaket `session` stubbt Issue 42 von Projekt 1234 und die Suche.

Dateien:

- `backend/src/main/java/planningpoker/session/GitLabIssues.java`: neu, Laden und Suchen mit Fehlerabbildung
- `backend/src/main/java/planningpoker/session/SessionResource.java`: ändern, `createSession` mit Issue-Prüfung, `listIssues`, `selectIssue` umgesetzt
- `backend/src/test/java/planningpoker/session/GitLabStubs.java`: neu, WireMock-Stubs für Issue 42, Suche, Fehlerfälle, Verzögerung
- `backend/src/test/java/planningpoker/session/IssueSelectionTest.java`: neu, A1 bis A6
- `backend/src/test/java/planningpoker/session/SessionApiTest.java`: ändern, Test-Ressource und Stub, A8
- `backend/src/test/java/planningpoker/session/SessionResourceTest.java`: ändern, Test-Ressource und Stub; `listIssues` und `selectIssue` aus der 501-Liste
- `README.md`: ändern, Zeile `planningpoker.gitlab.timeout`
- `project-rules/backend.md`: ändern, Abschnitt APIs (GitLab-Abbildung an der Grenze)
- `project-rules/testing.md`: ändern, Testdaten (GitLab-Stubs im Testpaket)

Schritte:

1. `GitLabIssues`: `loadIssue` ruft `GitLabClient.loadIssue`, bildet `GitLabIssue` auf `Issue` ab; `search` ruft `searchIssues` und bildet auf `IssueListResponse` ab; `catch (GitLabException)` je Methode mit `NOT_FOUND` zu `ISSUE_NOT_FOUND` (nur beim Laden; bei der Suche ist ein 404 ein unbekanntes Projekt und damit `GITLAB_ERROR`), sonst `GITLAB_ERROR` mit festem `detail`.
2. `SessionResource.createSession`: `gitLabIssues.loadIssue(projectId, issueIid)` vor `registry.create`. `listIssues`: `gitLabIssues.search(session.gitlabProjectId(), search, page)`; die Projekt-ID über `registry.read`. `selectIssue`: Projekt-ID über `read`, Issue laden, dann `registry.update(id, s -> s.selectIssue(actor.participantId(), issue))`, 204.
3. `GitLabStubs`: `issue(server, project, iid, title, description)`, `issueMissing`, `search(server, project, query, page, items, nextPage)`, `failing(server, status)`, `delayed(server, millis)`; `WireMockGitLab` an `SessionApiTest`, `SessionResourceTest`, `IssueSelectionTest` mit `@WithTestResource` (Standard-Scope), `reset()` je Test.
4. `IssueSelectionTest`: Fälle A1 bis A6; A6 mit `withFixedDelay(700)` unter dem Test-Timeout `1s`, Freigabe in einem eigenen Thread, Beitritt gleichzeitig; der Beitritt antwortet, bevor die Freigabe fertig ist (`CompletableFuture`, Vergleich der Endzeiten, keine festen Pausen).
5. `SessionResourceTest`: `stubEndpoints` ohne `listIssues` und `selectIssue`; Rollen- und 401-Fälle für beide bleiben (jetzt 403 beziehungsweise 401 vor dem Aufruf).
6. README-Zeile; `project-rules/backend.md` und `testing.md` nachziehen.
7. `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `backend/src/test/java/planningpoker/session/IssueSelectionTest.java`: Suche mit Treffern und `x-next-page`, Seite 2, leere Liste, ohne `search`; WireMock-`verify` der Query-Parameter |
| A2 | `backend/src/test/java/planningpoker/session/IssueSelectionTest.java`: 401, 403, 500, Timeout auf die Suche; `detail` ohne GitLab-Text |
| A3 | `backend/src/test/java/planningpoker/session/IssueSelectionTest.java`: Erstellen mit 404, mit 500, mit vorhandenem Issue; WireMock-`verify` des Pfads |
| A4 | `backend/src/test/java/planningpoker/session/IssueSelectionTest.java`: Freigabe in `LOBBY`, Snapshot beider Rollen vorher und nachher |
| A5 | `backend/src/test/java/planningpoker/session/IssueSelectionTest.java`: Wechsel, unbekanntes Issue, GitLab-Fehler, Entwickler |
| A6 | `backend/src/test/java/planningpoker/session/IssueSelectionTest.java`: Beitritt während verzögerter Freigabe |
| A7 | Aufruf: README-Tabelle |
| A8 | `backend/src/test/java/planningpoker/session/SessionApiTest.java`, `SessionResourceTest.java`: grün mit Stubs |

Testdaten: GitLab-Stubs aus `GitLabStubs`; Sitzungen über die API mit zufälligem Namenszusatz.

Contracts zu regenerieren: keine.

## Offene Fragen

- [ ] keine

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/session/`, `backend/src/test/java/planningpoker/gitlab/`, `make e2e` (`health.spec.ts`)
- Browser: keiner
- Aufruf: README-Tabelle (A7)
