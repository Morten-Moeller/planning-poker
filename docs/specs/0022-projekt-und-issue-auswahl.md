---
id: "0022"
title: Projekt- und Issue-Auswahl beim Anlegen
status: done
risk: high
adrs: ["0008"]
owner: Morten Möller
created: 2026-11-17
updated: 2026-11-17
pr: "#22"
note: alle Kriterien erfüllt; Browser gegen das echte Projekt 88998176 nicht geprüft (kein Token in der Session)
---

# Projekt- und Issue-Auswahl beim Anlegen

Wunsch der Person nach der manuellen Prüfung. Bezug: R-01 (Projekt-ID und Issue beim Anlegen),
R-09 (Issues über die GitLab-API). Grundlage: ADR 0008, ADR 0005 (Allowlist). Hängt ab von 0021,
weil beide `ErrorCode`, Vertrag, Startseite und README ändern.

## Ziel

Wer eine Sitzung anlegt, wählt das GitLab-Projekt per Name aus einer Liste. Die Liste zeigt Name,
Pfad und ID. Danach wählt er das Issue per Titel aus den offenen Issues des Projekts. Die Eingabe
von ID und iid von Hand bleibt möglich.

## Scope

### Enthalten

- **`GET /api/projects?search=&page=`** (offen, ohne Token): liefert `{ items: [{ id, name, pathWithNamespace, webUrl }], nextPage }`.
  - Mit Allowlist: nur deren Einträge. Jeder wird mit `GET /projects/{id}` geladen, die Suche filtert Name und Pfad ohne Rücksicht auf Groß- und Kleinschreibung, und es gibt keine Folgeseite. Ein Eintrag, den GitLab mit 404 oder 403 ablehnt, fehlt in der Liste und erzeugt eine Logzeile. Ein 401 ergibt 502 `GITLAB_ACCESS_DENIED` für die ganze Liste, `page>1` liefert eine leere Liste ohne GitLab-Aufruf. Ein Pfad-Eintrag der Allowlist erscheint mit seiner numerischen ID; die Auswahl endet dann mit `PROJECT_NOT_ALLOWED` (dokumentierte Einschränkung).
  - Ohne Allowlist: `GET /projects?membership=true&simple=true&search=&order_by=last_activity_at&per_page=20&page=`.
- **`GET /api/projects/{projectId}/issues?search=&page=`** (offen): liefert offene Issues wie `GET /api/sessions/{id}/issues` (`IssueListResponse`).
  - Ist das Projekt nicht in der Allowlist, antwortet der Endpunkt 403 `PROJECT_NOT_ALLOWED`, ohne GitLab zu fragen.
- **Fehler** beider Endpunkte: 400 `VALIDATION_ERROR` (Seite kleiner 1), 403 `PROJECT_NOT_ALLOWED`, 502 `GITLAB_ACCESS_DENIED` und `GITLAB_ERROR` (aus 0021).
- **Startseite:**
  - „GitLab-Projekt“ ist ein Autocomplete. Es sucht 300 ms nach der letzten Eingabe und zeigt je Eintrag „Name“ mit „Pfad · ID“ darunter. Die Auswahl übernimmt die ID.
  - „Issue“ ist ein Autocomplete für das gewählte Projekt und zeigt „#iid Titel“. Die Auswahl übernimmt die iid.
  - Beide Felder nehmen weiter eine von Hand getippte ID oder iid an.
  - Leere Ergebnisse zeigen „Keine Projekte gefunden“ und „Keine Issues gefunden“.
  - Fehler erscheinen am jeweiligen Feld mit den Texten aus `error-messages.ts`.
- **Mock-Backend** des Frontends: Es liefert beide Listen aus festen Daten.
- **Dokumentation:** README (Endpunkte, Ablauf, Risiko), `docs/umsetzungsplan.md` 4.4, `project-rules/backend.md` („Accepted risk“, Allowlist-Klasse) und `project-rules/frontend.md` (Startseite).

### Nicht enthalten

- Ein Login oder eine Rechteprüfung je Benutzer (ADR 0003).
- Caching der GitLab-Antworten und ein Rate-Limit (ADR 0005).
- Eine Änderung der Issue-Suche im Sitzungsraum.
- Geschlossene Issues.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Projekt-Allowlist, Issue, Scrum Master | wie im Glossar |
| Projektauswahl | Liste der GitLab-Projekte auf der Startseite; neu, mit /domain ins Glossar |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Ohne Allowlist ruft `GET /api/projects?search=poker` GitLab mit `membership=true`, `simple=true`, `search=poker` und `per_page=20` auf. Die Antwort ist 200 mit `id`, `name`, `pathWithNamespace` und `webUrl`, und `nextPage` stammt aus `X-Next-Page`. | Test `backend/src/test/java/planningpoker/session/ProjectCatalogTest.java` |
| A2 | Mit `allowed-projects=1234,5678` liefert `GET /api/projects` genau diese Projekte, mit Namen aus `GET /projects/{id}`. `search` filtert nach Name und Pfad ohne Rücksicht auf Groß- und Kleinschreibung. Lehnt GitLab `5678` mit 404 oder 403 ab, fehlt das Projekt, und das Backend schreibt eine Logzeile. Ein 401 für einen Eintrag ergibt 502 `GITLAB_ACCESS_DENIED`. `page=2` liefert eine leere Liste ohne GitLab-Aufruf. Ein Aufruf an `GET /projects?membership` findet nicht statt. | Test `backend/src/test/java/planningpoker/session/ProjectCatalogAllowlistTest.java` |
| A3 | `GET /api/projects/1234/issues?search=login` liefert offene Issues wie die Suche im Sitzungsraum. Mit Allowlist ohne `1234` antwortet der Endpunkt 403 `PROJECT_NOT_ALLOWED`, und WireMock hat keinen Aufruf erhalten. | Tests `ProjectCatalogTest`, `ProjectCatalogAllowlistTest` |
| A4 | Ein 403 von GitLab ergibt 502 `GITLAB_ACCESS_DENIED`, ein 500 ergibt 502 `GITLAB_ERROR`, `page=0` ergibt 400. Beide Endpunkte brauchen keinen `Authorization`-Header. | Test `ProjectCatalogTest` |
| A5 | Der Vertrag enthält beide Endpunkte mit Schemas und Fehlerantworten. `info.version` ist `2.3.0`, und `make drift` ist grün. | Test `backend/src/test/java/planningpoker/session/api/ContractTest.java`; Aufruf `make drift` |
| A6 | Auf der Startseite zeigt die Eingabe „pok“ nach 300 ms die Projekte des Mock-Backends mit Name, Pfad und ID. Die Auswahl setzt die ID. Danach zeigt das Issue-Feld „#42 Login page“, und die Auswahl setzt 42. Eine getippte ID und iid werden ohne Auswahl übernommen. | Unit `frontend/src/app/start/start-page.spec.ts` |
| A7 | Leere Ergebnisse zeigen „Keine Projekte gefunden“ und „Keine Issues gefunden“. Bei `PROJECT_NOT_ALLOWED`, `GITLAB_ACCESS_DENIED` und `GITLAB_ERROR` steht der Text am Feld, und das Banner bleibt leer. | Unit `start-page.spec.ts` |
| A8 | Im Browser gegen das GitLab-Double: Projekt per Name wählen, Issue per Titel wählen, Sitzung anlegen. Die Sitzungsseite zeigt das gewählte Issue als Vorauswahl. | End-to-End `frontend/e2e/project-picker.spec.ts` |
| A9 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

Generiert werden `contracts/api/openapi.yaml` und `frontend/src/app/api/schema.d.ts`. Die
Änderung ist additiv: zwei neue Endpunkte und das neue Schema `ProjectListResponse`. Version
`2.2.0` (nach 0021) wird `2.3.0`. Verbraucher ist nur das Frontend dieses Repositorys.

## Risiko

Stufe: high
Begründung: `harness/scripts/risk-level.sh` meldet high für `contracts/api/openapi.yaml`
(`contracts/**`). Inhaltlich kommen zwei neue offene Endpunkte dazu, die Projektnamen offenlegen
(ADR 0008). Code unter `backend/src/main/` und `frontend/src/app/` ist medium.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`, G3 über den Status
`verified`. Reviews: Code, Sicherheit, Architektur.
ADR nötig: ja, 0008 (Risiko high, neue offene Endpunkte, Alternativen mit Wirkung auf Backend,
Vertrag und Frontend).

## Umsetzung

Entscheidungen:

- ADR 0008: Die Liste zeigt die Allowlist, sonst die Projekte, in denen der Token Mitglied ist. Beide Endpunkte sind offen und lesen nur.
- Der Vertrag ändert sich additiv, Version `2.3.0`, nur über `make contracts`.
- Neue Klassen: `ProjectResource`, `GitLabProjects`, `ProjectAllowlist` im Paket `session`, `GitLabProjectApi`, `GitLabProject` und `ProjectPage` im Paket `gitlab`. Es kommt keine neue Abhängigkeit dazu.
- Im Frontend kommt `MatAutocompleteModule` aus dem schon vorhandenen `@angular/material` dazu.

Dateien:

- `docs/adr/0008-projekt-und-issue-auswahl-vor-der-sitzung.md`: neu
- `docs/adr/README.md`: ändern, Zeile 0008
- `backend/src/main/java/planningpoker/gitlab/GitLabProjectApi.java`: neu, `GET /api/v4/projects` und `GET /api/v4/projects/{id}`
- `backend/src/main/java/planningpoker/gitlab/GitLabProject.java`: neu
- `backend/src/main/java/planningpoker/gitlab/ProjectPage.java`: neu
- `backend/src/main/java/planningpoker/gitlab/GitLabClient.java`: ändern, `searchProjects`, `loadProject`
- `backend/src/main/java/planningpoker/session/ProjectAllowlist.java`: neu, Prüfung und Liste aus `SessionConfig`
- `backend/src/main/java/planningpoker/session/GitLabProjects.java`: neu, Liste je nach Allowlist, Fehlerabbildung wie `GitLabIssues`
- `backend/src/main/java/planningpoker/session/ProjectResource.java`: neu, beide Endpunkte
- `backend/src/main/java/planningpoker/session/api/ProjectListResponse.java`: neu
- `backend/src/main/java/planningpoker/session/SessionResource.java`: ändern, `ProjectAllowlist` statt eigener Prüfung
- `backend/src/main/resources/application.properties`: ändern, `info-version` 2.3.0
- `backend/src/test/java/planningpoker/session/ProjectCatalogTest.java`: neu, A1, A3, A4
- `backend/src/test/java/planningpoker/session/ProjectCatalogAllowlistTest.java`: neu, A2, A3 mit `@TestProfile`
- `backend/src/test/java/planningpoker/session/GitLabStubs.java`: ändern, Stubs für Projekte
- `backend/src/test/java/planningpoker/gitlab/GitLabClientTest.java`: ändern, neue Aufrufe
- `backend/src/test/java/planningpoker/session/api/ContractTest.java`: ändern, A5
- `contracts/api/openapi.yaml`: ändern, generiert
- `frontend/src/app/api/schema.d.ts`: ändern, generiert
- `frontend/src/app/api/api.service.ts`: ändern, `searchProjects`, `searchProjectIssues`
- `frontend/src/app/api/api.service.spec.ts`: ändern
- `frontend/src/app/api/mock/mock-backend.interceptor.ts`: ändern, beide Listen
- `frontend/src/app/start/start-page.ts`: ändern, Autocomplete, Suche mit 300 ms Wartezeit
- `frontend/src/app/start/start-page.html`: ändern, `mat-autocomplete` für Projekt und Issue
- `frontend/src/app/start/start-page.scss`: ändern, Einträge mit zwei Zeilen
- `frontend/src/app/start/start-page.spec.ts`: ändern, A6 und A7
- `frontend/e2e/project-picker.spec.ts`: neu, A8
- `frontend/e2e/gitlab-double/mappings/projects-search.json`: neu
- `frontend/e2e/gitlab-double/mappings/project-1234.json`: neu
- `README.md`: ändern, Endpunkte, Ablauf, Risiko
- `docs/umsetzungsplan.md`: ändern, 4.4 zwei Endpunkte
- `project-rules/backend.md`: ändern, „Accepted risk“, `ProjectAllowlist`
- `project-rules/frontend.md`: ändern, Startseite
- `project-rules/testing.md`: ändern, `project-picker.spec.ts`
- `docs/domain/glossary.md`: ändern, Projektauswahl

Schritte:

1. `gitlab`: `GitLabProjectApi`, `GitLabProject` (`id`, `name`, `path_with_namespace`, `web_url`) und `ProjectPage`. In `GitLabClient` kommen `searchProjects` und `loadProject` dazu, mit Fehlerabbildung und Log wie bei den Issues aus 0021.
2. `ProjectAllowlist` aus `SessionResource.requireAllowedProject` herauslösen. `GitLabProjects` liefert die Liste je nach Allowlist.
3. `ProjectResource` mit beiden Endpunkten, ohne `@Authenticated`, mit Annotationen für den Vertrag. Danach `info-version` setzen, `make contracts` ausführen und `ContractTest` anpassen.
4. Frontend: `ApiService`, Mock-Backend und Startseite mit zwei Autocompletes. Die Eingabe läuft über `valueChanges` mit `debounceTime(300)` und `switchMap`. Die Issue-Suche startet erst, wenn eine Projekt-ID im Feld steht.
5. Tests, Mappings und E2E.
6. README, Umsetzungsplan, `project-rules/` und Glossar.
7. `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `ProjectCatalogTest`: WireMock prüft Query-Parameter, Antwortfelder und `nextPage` |
| A2 | `ProjectCatalogAllowlistTest`: zwei Einträge, Suche, 404 und 403 für einen, 401 ergibt 502, `page=2` leer ohne Aufruf, kein `membership`-Aufruf |
| A3 | `ProjectCatalogTest`: Issue-Suche; `ProjectCatalogAllowlistTest`: 403 ohne GitLab-Aufruf |
| A4 | `ProjectCatalogTest`: 403 und 500 von GitLab, `page=0`, ohne Header |
| A5 | `ContractTest`, `make drift` |
| A6 | `start-page.spec.ts` mit Fake-Timern: Suche, Auswahl, manuelle Eingabe |
| A7 | `start-page.spec.ts`: leere Listen, drei Fehlercodes |
| A8 | `project-picker.spec.ts` gegen das Double mit `projects-search.json`, `project-1234.json` und `issues-search.json` |
| A9 | `make check`, `make e2e` |

Testdaten:
- Backend: GitLab über `GitLabStubs` und WireMock, die Allowlist über `@TestProfile`.
- End-to-End: Projekt `1234` mit dem Namen „Planning Poker Test“ in den neuen Mappings und die vorhandenen Issue-Mappings.

Contracts zu regenerieren: `make contracts` (`contracts/api/openapi.yaml`,
`frontend/src/app/api/schema.d.ts`).

## Offene Fragen

- [x] Welche Projekte darf der offene Endpunkt auflisten? → Die Allowlist, wenn gesetzt, sonst die Projekte mit Mitgliedschaft des Tokens. (Morten Möller, 2026-11-17)
- [x] Soll auch das Issue beim Anlegen aus einer Liste gewählt werden? → Ja. (Morten Möller, 2026-11-17)
- [x] Was gilt für Pfad-Einträge der Allowlist, wenn die Auswahl die numerische ID setzt? → Umsetzen wie geplant und die Einschränkung in README, `project-rules/backend.md` und Glossar dokumentieren: Für die Auswahl braucht die Allowlist numerische IDs; ein Pfad-Eintrag erscheint in der Liste, die Auswahl endet mit `PROJECT_NOT_ALLOWED`. (Morten Möller, 2026-11-17)
- [x] Was liefert die Liste mit Allowlist für `page>1`, und was gilt bei einem GitLab-401 für einen Eintrag? → `page>1` liefert eine leere Liste ohne GitLab-Aufruf. Ein 401 ergibt 502 `GITLAB_ACCESS_DENIED` für die ganze Liste; nur 403 und 404 lassen den Eintrag weg. (Morten Möller, 2026-11-17)

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/session/`, `backend/src/test/java/planningpoker/gitlab/`, `backend/src/test/java/planningpoker/session/api/`, `frontend/src/app/start/*.spec.ts`, `frontend/src/app/api/*.spec.ts`, `make e2e`
- Browser: Startseite gegen das Double und gegen das echte Projekt 88998176
- Aufruf: `make drift`
