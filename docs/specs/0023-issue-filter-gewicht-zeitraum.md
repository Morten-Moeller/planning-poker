---
id: "0023"
title: Issue-Liste mit Gewicht und Filtern
status: done
risk: high
adrs: ["0009"]
owner: Morten Möller
created: 2026-11-17
updated: 2026-11-17
pr: "#23"
note: alle Kriterien erfüllt; Browser gegen das echte Projekt 88998176 nicht in dieser Session
---

# Issue-Liste mit Gewicht und Filtern

Wunsch der Person. Bezug: R-06 (Issue wählen), R-09 (Issues über die GitLab-API), A-07
(`weight`). Grundlage: ADR 0009. Die Spec hängt ab von 0021 und 0022, weil alle drei
`GitLabClient`, den Vertrag und `IssueListResponse` ändern.

## Ziel

Der Scrum Master sieht in der Issue-Liste des Sitzungsraums das Gewicht jedes Issues. Er filtert
nach „Ohne Gewicht“ (Standard), „Mit Gewicht“ oder „Alle“ und nach dem Zeitraum der letzten
Änderung: 1 Woche, 1 Monat, 1 Jahr oder Alle.

## Scope

### Enthalten

- **`GET /api/sessions/{id}/issues`** bekommt die Parameter `weight` (`NONE`, `ANY`, `ALL`; Standard `ALL`) und `period` (`WEEK` = 7 Tage, `MONTH` = 30 Tage, `YEAR` = 365 Tage, `ALL`; Standard `ALL`).
  - Das Backend übersetzt `weight` in `weight=None` oder `weight=Any`. Bei `ALL` geht kein Parameter an GitLab.
  - `period` wird zu `updated_after` = jetzt minus Zeitraum, als RFC 3339 in UTC.
  - Die Liste ist immer nach `updated_at` absteigend sortiert.
- **`IssueSummary`** bekommt `weight`: eine Zahl oder `null`, wenn kein Gewicht gesetzt oder der Tarif es nicht kennt. Das gilt auch für die Issue-Suche auf der Startseite aus 0022, ohne Filter.
- **Bedienfeld des Scrum Masters:**
  - Je Eintrag steht „Gewicht 5“ oder „ohne Gewicht“ als Text.
  - Über der Liste liegt ein `mat-button-toggle-group` „Ohne Gewicht | Mit Gewicht | Alle“, Standard „Ohne Gewicht“.
  - Daneben liegt ein `mat-select` „Geändert in“ mit „1 Woche“, „1 Monat“, „1 Jahr“ und „Alle“, Standard „Alle“.
  - Eine Änderung eines Filters lädt Seite 1 neu und behält den Suchtext.
- **Neu laden nach der Bestätigung:** Geht die Sitzung nach der Bestätigung zurück in `LOBBY`, lädt das Bedienfeld die Liste mit den aktuellen Filtern neu. Ein gerade geschätztes Issue verschwindet dann aus „Ohne Gewicht“, wenn `write-weight` aktiv ist.
- **Dokumentation:** README (Parameter, Free-Tarif), `docs/umsetzungsplan.md` 4.4 und `project-rules/frontend.md` (Bedienfeld).

### Nicht enthalten

- Filter auf der Startseite (0022).
- Weitere Filter, etwa Labels, Meilenstein oder Zuständige.
- Ein Gewichtsfilter im Free-Tarif. GitLab ignoriert ihn dort, und das README nennt das.
- Das Speichern der Filter über einen Neustart der Seite hinaus.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Gewicht | `weight` eines GitLab-Issues (A-07); neu, mit /domain ins Glossar |
| Issue, Scrum Master, Freigabe | wie im Glossar |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `GET …/issues?weight=NONE` fragt GitLab mit `weight=None`, `ANY` mit `weight=Any`, `ALL` und ohne Parameter ohne `weight`. Jeder Aufruf hat `order_by=updated_at` und `sort=desc`. | Test `backend/src/test/java/planningpoker/session/IssueSelectionTest.java` (WireMock prüft die Query) |
| A2 | Mit der Testuhr auf `2026-11-17T12:00:00Z` ergibt `period=WEEK` `updated_after=2026-11-10T12:00:00Z`, `MONTH` den 2026-10-18 und `YEAR` den 2025-11-17. `ALL` sendet keinen Parameter. Ein unbekannter Wert ergibt 400 `VALIDATION_ERROR`. | Test `IssueSelectionTest` |
| A3 | `items[].weight` enthält das Gewicht aus GitLab oder `null`, wenn das Feld fehlt oder leer ist. | Test `IssueSelectionTest`; `backend/src/test/java/planningpoker/gitlab/GitLabClientTest.java` |
| A4 | Der Vertrag enthält `weight` und `period` als Enums mit Standardwert `ALL` und `IssueSummary.weight` als nullbare Zahl. `info.version` ist `2.4.0`, und `make drift` ist grün. | Test `backend/src/test/java/planningpoker/session/api/ContractTest.java`; Aufruf `make drift` |
| A5 | Das Bedienfeld lädt beim Öffnen mit `weight=NONE` und `period=ALL`. Die Einträge zeigen „Gewicht 5“ oder „ohne Gewicht“. Ein Wechsel auf „Alle“ oder „1 Monat“ lädt Seite 1 mit den neuen Parametern und dem bisherigen Suchtext. | Unit `frontend/src/app/session/issue-panel.spec.ts` |
| A6 | Wechselt die Phase von `REVEALED` nach `LOBBY`, lädt das Bedienfeld die Liste mit den aktuellen Filtern neu. | Unit `issue-panel.spec.ts` |
| A7 | Im Browser gegen das GitLab-Double zeigt die Liste standardmäßig nur die Issues ohne Gewicht. Mit „Alle“ erscheint auch das Issue mit „Gewicht 3“. | End-to-End `frontend/e2e/issue-filter.spec.ts` mit Mappings `frontend/e2e/gitlab-double/mappings/issues-search-weight-none.json` und `issues-search-weight-all.json` |
| A8 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

Generiert werden `contracts/api/openapi.yaml` und `frontend/src/app/api/schema.d.ts`. Die
Änderung ist additiv: zwei optionale Query-Parameter mit Standardwert und ein nullbares Feld.
Version `2.3.0` (nach 0022) wird `2.4.0`. Verbraucher ist nur das Frontend dieses Repositorys.

## Risiko

Stufe: high
Begründung: `harness/scripts/risk-level.sh` meldet high für `contracts/api/openapi.yaml`
(`contracts/**`). Code unter `backend/src/main/` und `frontend/src/app/` ist medium.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`, G3 über den Status
`verified`. Reviews: Code, Sicherheit, Architektur.
ADR nötig: ja, 0009 (Risiko high; Alternative „Filter nach dem Laden“ mit Wirkung auf Backend und
Frontend).

## Umsetzung

Entscheidungen:

- ADR 0009: Die Filter laufen als Parameter an GitLab. Die API-Standardwerte bleiben `ALL`, die Oberfläche nutzt standardmäßig „Ohne Gewicht“.
- Der Vertrag wird additiv erweitert, Version `2.4.0`, nur über `make contracts`.
- Neue Enums `WeightFilter` und `UpdatedPeriod` kommen ins Paket `session.api`. Neue Abhängigkeiten gibt es keine, `MatButtonToggleModule` und `MatSelectModule` stammen aus dem vorhandenen `@angular/material`.

Dateien:

- `docs/adr/0009-issue-filter-ueber-gitlab.md`: neu
- `docs/adr/README.md`: ändern, Zeile 0009
- `backend/src/main/java/planningpoker/gitlab/GitLabApi.java`: ändern, Parameter `weight`, `updated_after`, `order_by`, `sort`
- `backend/src/main/java/planningpoker/gitlab/GitLabIssue.java`: ändern, Feld `weight`
- `backend/src/main/java/planningpoker/gitlab/GitLabClient.java`: ändern, `searchIssues` mit Filtern
- `backend/src/main/java/planningpoker/session/GitLabIssues.java`: ändern, Filter und `weight`
- `backend/src/main/java/planningpoker/session/SessionResource.java`: ändern, Query-Parameter
- `backend/src/main/java/planningpoker/session/api/IssueListResponse.java`: ändern, `weight`
- `backend/src/main/java/planningpoker/session/api/WeightFilter.java`: neu
- `backend/src/main/java/planningpoker/session/api/UpdatedPeriod.java`: neu
- `backend/src/main/resources/application.properties`: ändern, `info-version` 2.4.0
- `backend/src/test/java/planningpoker/session/IssueSelectionTest.java`: ändern, A1 bis A3
- `backend/src/test/java/planningpoker/gitlab/GitLabClientTest.java`: ändern, A3
- `backend/src/test/java/planningpoker/session/GitLabStubs.java`: ändern, Stubs mit Filtern
- `backend/src/test/java/planningpoker/session/api/ContractTest.java`: ändern, A4
- `contracts/api/openapi.yaml`: ändern, generiert
- `frontend/src/app/api/schema.d.ts`: ändern, generiert
- `frontend/src/app/api/api.service.ts`: ändern, Filter in `listIssues`
- `frontend/src/app/api/api.service.spec.ts`: ändern
- `frontend/src/app/api/mock/mock-backend.interceptor.ts`: ändern, `weight` in den Daten, Filter
- `frontend/src/app/session/issue-panel.ts`: ändern, Filterzustand, Neuladen nach `LOBBY`
- `frontend/src/app/session/issue-panel.html`: ändern, Toggle, Select, Gewicht je Eintrag
- `frontend/src/app/session/issue-panel.scss`: ändern, Filterzeile
- `frontend/src/app/session/issue-panel.spec.ts`: ändern, A5 und A6
- `frontend/e2e/issue-filter.spec.ts`: neu, A7
- `frontend/e2e/gitlab-double/mappings/issues-search-weight-none.json`: neu
- `frontend/e2e/gitlab-double/mappings/issues-search-weight-all.json`: neu
- `README.md`: ändern, Parameter, Free-Tarif
- `docs/umsetzungsplan.md`: ändern, 4.4
- `project-rules/frontend.md`: ändern, Bedienfeld
- `project-rules/testing.md`: ändern, `issue-filter.spec.ts`
- `docs/domain/glossary.md`: ändern, Gewicht

Schritte:

1. `gitlab`: `GitLabIssue.weight` (`Integer`) und Parameter in `GitLabApi`. `searchIssues` bekommt Filter und Sortierung.
2. Enums, Parameter in `SessionResource.listIssues` mit Validierung, Berechnung von `updated_after` aus der `Clock` und `weight` in `IssueSummary`.
3. `info-version`, `make contracts`, `ContractTest`.
4. Frontend: `ApiService`, Mock-Backend, Bedienfeld mit Filterzeile, Gewicht je Eintrag und Neuladen bei `LOBBY`.
5. Tests, Mappings, E2E.
6. README, Umsetzungsplan, `project-rules/`, Glossar.
7. `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `IssueSelectionTest`: WireMock mit `withQueryParam` je Wert |
| A2 | `IssueSelectionTest`: Testuhr, drei Zeiträume, `ALL`, ungültiger Wert |
| A3 | `IssueSelectionTest`, `GitLabClientTest`: `weight` gesetzt, `null`, fehlend |
| A4 | `ContractTest`, `make drift` |
| A5 | `issue-panel.spec.ts`: Standardparameter, Anzeige, Filterwechsel |
| A6 | `issue-panel.spec.ts`: Snapshot `REVEALED` nach `LOBBY` |
| A7 | `issue-filter.spec.ts` gegen das Double |
| A8 | `make check`, `make e2e` |

Testdaten:
- Backend: GitLab über `GitLabStubs` und WireMock, die Uhr als `TestClock` wie in `RoundTimerTest`.
- End-to-End: zwei Mappings für Projekt `1234`, eines mit `weight=None` (Issues 42 und 43) und eines ohne Filter (zusätzlich Issue 46 mit Gewicht 3).

Contracts zu regenerieren: `make contracts` (`contracts/api/openapi.yaml`,
`frontend/src/app/api/schema.d.ts`).

## Offene Fragen

- [x] Standard für den Zeitraum in der Oberfläche: „Alle“ oder „1 Monat“? → „Alle“. (Morten Möller, 2026-11-17)

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/session/`, `backend/src/test/java/planningpoker/gitlab/`, `backend/src/test/java/planningpoker/session/api/`, `frontend/src/app/session/issue-panel.spec.ts`, `frontend/src/app/api/*.spec.ts`, `make e2e`
- Browser: Bedienfeld gegen das Double und gegen das echte Projekt 88998176 mit `write-weight`
- Aufruf: `make drift`
