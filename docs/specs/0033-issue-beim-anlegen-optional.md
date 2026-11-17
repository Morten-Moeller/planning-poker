---
id: "0033"
title: Issue beim Anlegen optional
status: approved
risk: high
adrs: ["0011"]
owner: Morten Möller
created: 2026-11-17
updated: 2026-11-17
pr: ""
note: freigegeben in der Session
---

# Issue beim Anlegen optional

Wunsch der Person: Das Issue wählt der Scrum Master bequemer im Sitzungsraum. Beim Anlegen soll es
deshalb optional sein. Bezug: R-01, ADR 0011. Die Spec hängt ab von 0032, weil beide die
Startseite ändern.

## Ziel

Eine Sitzung lässt sich mit Name und Projekt allein anlegen. Ein angegebenes Issue wird wie
bisher geprüft und vorausgewählt. Ohne Issue prüft das Backend, dass es das Projekt gibt.

## Scope

### Enthalten

- **Vertrag (additiv, `3.1.0` → `3.2.0`):**
  - `CreateSessionRequest.issueIid` darf fehlen oder `null` sein. Ist es gesetzt, muss es positiv sein.
  - Neuer `errorCode` `PROJECT_NOT_FOUND` (404) für `createSession`.
- **Backend:**
  - Mit `issueIid` gilt das Verhalten wie heute: Issue laden, Projekt nachsichtig laden (0030).
  - Ohne `issueIid` folgt nach der Allowlist `GitLabClient.loadProject`:
    - 404 ergibt `PROJECT_NOT_FOUND`.
    - 401 oder 403 ergibt `GITLAB_ACCESS_DENIED`.
    - Andere Fehler ergeben `GITLAB_ERROR`.
    - Bei Erfolg trägt die Sitzung die Projektdaten.
  - `Session` und `SessionRegistry.create` nehmen eine fehlende Vorauswahl an. `preselectedIssueIid` ist dann `null`.
- **Frontend:**
  - Das Feld heißt „Issue (optional)“ mit dem Hinweis „Optional: Issue, mit dem die Sitzung startet“.
  - Bleibt es leer, gilt es als gültig, und die Anfrage enthält kein `issueIid`. Ein Wert, der keine Zahl ab 1 ist, zeigt den bisherigen Fehler.
  - Text für `PROJECT_NOT_FOUND`: „Das GitLab-Projekt wurde nicht gefunden.“, am Projektfeld.
  - Das Mock-Backend nimmt Anfragen ohne Issue an.
- **Doku:**
  - Umsetzungsplan: R-01 bekommt den Verweis auf A-18, die neue Annahme A-18 steht in der Tabelle der Annahmen, dazu 4.4.
  - README: Tabelle der Endpunkte und Fehlercodes.
  - `docs/design/README.md`: Die Abweichung „Issue bleibt Pflicht“ entfällt.

### Nicht enthalten

- Entfernen des Issue-Felds.
- Änderungen am Sitzungsraum. Er zeigt ohne Vorauswahl schon heute die Liste.

## Begriffe

keine neuen

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `POST /api/sessions` ohne `issueIid` legt die Sitzung an (201) und ruft `GET /projects/{id}` auf, nicht `GET …/issues/{iid}`. Der Snapshot des Scrum Masters hat `preselectedIssueIid: null`, `project` ist gesetzt, und die Phase ist `LOBBY`. | Test `backend/src/test/java/planningpoker/session/IssueSelectionTest.java` |
| A2 | Ohne `issueIid` ergibt ein 404 für das Projekt 404 `PROJECT_NOT_FOUND`, 403 ergibt 502 `GITLAB_ACCESS_DENIED`, 500 ergibt 502 `GITLAB_ERROR`. Es entsteht keine Sitzung. Mit Allowlist ohne das Projekt gilt 403 `PROJECT_NOT_ALLOWED` vor jedem GitLab-Aufruf. | Test `IssueSelectionTest`, `backend/src/test/java/planningpoker/session/ProjectAllowlistTest.java` |
| A3 | Mit `issueIid` bleibt alles wie bisher, inklusive `ISSUE_NOT_FOUND`. `issueIid: 0` ergibt 400. | Test `IssueSelectionTest` |
| A4 | Der Vertrag zeigt `issueIid` nicht mehr als Pflichtfeld und enthält `PROJECT_NOT_FOUND`. `info.version` ist `3.2.0`, und `make drift` ist grün. | Test `backend/src/test/java/planningpoker/session/api/ContractTest.java`; Aufruf `make drift` |
| A5 | Die Startseite sendet mit leerem Issue-Feld kein `issueIid`. Mit „42“ sendet sie 42. Mit „abc“ zeigt sie den Feldfehler. `PROJECT_NOT_FOUND` steht am Projektfeld. | Unit `frontend/src/app/start/start-page.spec.ts` |
| A6 | Im Browser gegen das GitLab-Double: Sitzung nur mit Projekt anlegen, im Raum ein Issue wählen und freigeben. | End-to-End `frontend/e2e/project-picker.spec.ts` (neuer Fall) |
| A7 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

`contracts/api/openapi.yaml` und `frontend/src/app/api/schema.d.ts` werden generiert. Die
Änderung ist additiv: Ein Pflichtfeld der Anfrage wird optional, und es gibt einen neuen
Enum-Wert in `ErrorCode`. Verbraucher ist nur das Frontend dieses Repositorys. Version `3.1.0`
wird `3.2.0`.

## Risiko

Stufe: high
Begründung: `harness/scripts/risk-level.sh` meldet high für `contracts/**`. Code unter
`backend/src/main/` und `frontend/src/app/` ist medium.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`, G3 über den Status
`verified`. Reviews: Code, Sicherheit, Architektur.
ADR nötig: ja, 0011 (Risiko high, Abweichung von der bisherigen Lesart von R-01 mit Alternativen).

## Umsetzung

Entscheidungen:

- ADR 0011: Das Issue beim Anlegen ist optional. Ohne Issue ist die Projektprüfung Pflicht, mit dem neuen Code `PROJECT_NOT_FOUND`.
- Vertrag additiv `3.2.0`, nur über `make contracts`.
- Datenmodell: Die Vorauswahl der Sitzung ist optional (`Long` statt `long`).

Dateien:

- `docs/adr/0011-issue-beim-anlegen-optional.md`: neu
- `docs/adr/README.md`: ändern, Zeile 0011
- `backend/src/main/java/planningpoker/platform/ErrorCode.java`: ändern, `PROJECT_NOT_FOUND(404)`
- `backend/src/main/java/planningpoker/session/api/CreateSessionRequest.java`: ändern, `issueIid` optional
- `backend/src/main/java/planningpoker/session/SessionResource.java`: ändern, zwei Wege beim Anlegen, Annotationen
- `backend/src/main/java/planningpoker/session/GitLabProjects.java`: ändern, strenges Laden für den Weg ohne Issue
- `backend/src/main/java/planningpoker/session/SessionRegistry.java`: ändern, optionale Vorauswahl
- `backend/src/main/java/planningpoker/session/Session.java`: ändern, optionale Vorauswahl
- `backend/src/main/resources/application.properties`: ändern, `info-version` 3.2.0
- `backend/src/test/java/planningpoker/session/IssueSelectionTest.java`: ändern, A1 bis A3
- `backend/src/test/java/planningpoker/session/ProjectAllowlistTest.java`: ändern, A2
- `backend/src/test/java/planningpoker/session/SessionBuilder.java`: ändern, optionale Vorauswahl
- `backend/src/test/java/planningpoker/session/SessionRegistryTest.java`: ändern, falls die Signatur sich ändert
- `backend/src/test/java/planningpoker/session/SessionTest.java`: ändern, falls die Signatur sich ändert
- `backend/src/test/java/planningpoker/session/api/ContractTest.java`: ändern, A4
- `contracts/api/openapi.yaml`: ändern, generiert
- `frontend/src/app/api/schema.d.ts`: ändern, generiert
- `frontend/src/app/api/error-messages.ts`: ändern, Text für `PROJECT_NOT_FOUND`
- `frontend/src/app/api/mock/mock-backend.interceptor.ts`: ändern, Anlegen ohne Issue
- `frontend/src/app/start/start-page.ts`: ändern, Feld optional, Anfrage ohne `issueIid`
- `frontend/src/app/start/start-page.html`: ändern, Label und Hinweis
- `frontend/src/app/start/start-page.spec.ts`: ändern, A5
- `frontend/e2e/project-picker.spec.ts`: ändern, A6
- `README.md`: ändern, Endpunkt und Fehlercode
- `docs/umsetzungsplan.md`: ändern, R-01, A-18, 4.4
- `docs/design/README.md`: ändern, Abweichung gestrichen
- `project-rules/backend.md`: ändern, Anlegen ohne Issue
- `project-rules/frontend.md`: ändern, Issue-Feld optional

Schritte:

1. `ErrorCode`, `CreateSessionRequest`, `Session` und `SessionRegistry` mit optionaler Vorauswahl.
2. `SessionResource.createSession` mit zwei Wegen und `GitLabProjects` mit strengem Laden. Dann die Annotationen, `info-version`, `make contracts` und `ContractTest`.
3. Frontend: Feld optional, Text, Mock-Backend.
4. Tests, E2E, Doku, ADR-Zeile.
5. `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `IssueSelectionTest`: ohne Issue, WireMock prüft die Aufrufe |
| A2 | `IssueSelectionTest`: 404, 403 und 500 für das Projekt; `ProjectAllowlistTest` |
| A3 | `IssueSelectionTest`: bestehende Fälle, `issueIid: 0` |
| A4 | `ContractTest`, `make drift` |
| A5 | `start-page.spec.ts` |
| A6 | `project-picker.spec.ts` |
| A7 | `make check`, `make e2e` |

Testdaten: GitLab über `GitLabStubs` und WireMock; GitLab-Double mit Projekt `1234`.

Contracts zu regenerieren: `make contracts` (`contracts/api/openapi.yaml`,
`frontend/src/app/api/schema.d.ts`).

## Offene Fragen

- [x] Issue beim Anlegen: optional, entfernen oder Pflicht? → Optional, R-01 bleibt erfüllbar. (Morten Möller, 2026-11-17)

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/session/`, `backend/src/test/java/planningpoker/session/api/`, `frontend/src/app/start/*.spec.ts`, `make e2e`
- Browser: Sitzung ohne Issue anlegen, im Raum wählen; gegen das echte Projekt 88998176
- Aufruf: `make drift`
