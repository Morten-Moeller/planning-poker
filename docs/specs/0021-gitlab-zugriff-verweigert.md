---
id: "0021"
title: GitLab-Zugriff verweigert (403)
status: done
risk: high
adrs: ["0007"]
owner: Morten Möller
created: 2026-11-17
updated: 2026-11-17
pr: "#21"
note: alle Kriterien erfüllt
---

# GitLab-Zugriff verweigert (403)

Nachtrag nach der manuellen Prüfung gegen das echte GitLab-Projekt. Bezug: R-09 (Token), R-01,
R-06 und R-21 (Aufrufe an GitLab), A-14. Grundlage: ADR 0007.

## Ziel

Lehnt GitLab einen Aufruf mit 401 oder 403 ab, sieht die Person an der Oberfläche, dass der
GitLab-Token des Backends keinen Zugriff hat und was zu tun ist. Bisher steht dort
„GitLab hat nicht geantwortet.“. Das Backend-Log nennt jede Fehlerantwort von GitLab mit
Operation und Status.

## Scope

### Enthalten

- Neuer `errorCode` `GITLAB_ACCESS_DENIED` (502) für 401 und 403 von GitLab, bei allen Aufrufen:
  - Issue laden beim Erstellen und bei der Freigabe,
  - Issue-Suche,
  - Kommentar und Gewicht bei der Bestätigung.
- `GITLAB_ERROR` bleibt für 5xx, 429, Zeitüberschreitung und fehlende Antwort.
- Log: Für jede Fehlerantwort und jede fehlende Antwort schreibt das Backend eine Zeile auf `WARN` mit Operation (`loadIssue`, `searchIssues`, `addNote`, `setWeight`), Projekt-ID, Status und Grund. Token, Header und Antworttext von GitLab erscheinen nicht.
- Vertrag: `ErrorCode` mit `GITLAB_ACCESS_DENIED`, die 502-Antworten von `createSession`, `listIssues`, `selectIssue` und `confirmRound` nennen beide Codes, `info.version` `2.2.0`, `make contracts`.
- Frontend:
  - Text für `GITLAB_ACCESS_DENIED`: „GitLab verweigert den Zugriff. Der GitLab-Token des Backends braucht Scope api und Rechte im Projekt.“
  - Neuer Text für `GITLAB_ERROR`: „GitLab ist gerade nicht erreichbar. Bitte später erneut versuchen.“
  - Startseite, Issue-Suche und Dialog „Ergebnis übernehmen“ zeigen den neuen Code am Formular, so wie heute `GITLAB_ERROR`.
  - In der Issue-Suche zeigt der Fehlerzustand den Text des Codes statt fest „GitLab ist nicht erreichbar.“.
- README (Fehlercodes, Ablauf der Bestätigung, ein Satz zum privaten Projekt mit 404), `docs/umsetzungsplan.md` 4.4 (Codes), `project-rules/backend.md` (Abbildung und Log) und `project-rules/frontend.md` (Codes der Formulare).

### Nicht enthalten

- 404 bei einem privaten Projekt, das der Token nicht sieht. GitLab antwortet hier bewusst mit 404, das bleibt `ISSUE_NOT_FOUND`, und das README nennt den Fall.
- Prüfung des Tokens beim Start des Backends.
- `.env.example` und Token-Absatz im README (Spec 0020).

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| GitLab-Token | Token der Backend-Instanz für GitLab (`GITLAB_TOKEN`), nicht das Teilnehmer-Token |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Antwortet GitLab (WireMock) auf `GET …/issues/{iid}` mit 403, liefert `POST /api/sessions` 502 `GITLAB_ACCESS_DENIED`. Mit 401 ist es dasselbe, mit 500 und bei Zeitüberschreitung bleibt es `GITLAB_ERROR`. | Test `backend/src/test/java/planningpoker/session/IssueSelectionTest.java` |
| A2 | Issue-Suche und Freigabe mit 403 von GitLab liefern `GITLAB_ACCESS_DENIED`. Die Bestätigung mit 403 auf `notes` (und mit `write-weight` auf `PUT …/issues/{iid}`) liefert `GITLAB_ACCESS_DENIED`. Danach ist `confirming` zurückgesetzt und die Phase bleibt `REVEALED`. | Test `IssueSelectionTest`; `backend/src/test/java/planningpoker/session/ConfirmRoundTest.java`; `ConfirmRoundWriteWeightTest.java` |
| A3 | Zu jeder Fehlerantwort steht genau eine Logzeile auf `WARN` mit Operation, Projekt-ID und Status. Der Token-Wert und der Antworttext von GitLab erscheinen in keiner Logzeile. | Test `backend/src/test/java/planningpoker/gitlab/GitLabClientTest.java` (Log erfassen) |
| A4 | Der Vertrag enthält `GITLAB_ACCESS_DENIED`, die vier Endpunkte nennen ihn bei 502, `info.version` ist `2.2.0`, und `make drift` ist grün. | Test `backend/src/test/java/planningpoker/session/api/ContractTest.java`; Aufruf `make drift` |
| A5 | Startseite, Issue-Suche und Dialog „Ergebnis übernehmen“ zeigen bei `GITLAB_ACCESS_DENIED` den neuen Text am Formular bzw. im Fehlerzustand. Bei `GITLAB_ERROR` zeigen sie den neuen Text „GitLab ist gerade nicht erreichbar. …“, und das Banner bleibt leer. | Unit `frontend/src/app/start/start-page.spec.ts`, `frontend/src/app/session/issue-panel.spec.ts`, `frontend/src/app/session/confirm-result-dialog.spec.ts`, `frontend/src/app/shell/error-banner.spec.ts` |
| A6 | Im Browser lehnt das GitLab-Double das Issue mit 403 ab, und die Startseite zeigt „GitLab verweigert den Zugriff. …“ am Formular. | End-to-End `frontend/e2e/create-and-join.spec.ts` mit Mapping `frontend/e2e/gitlab-double/mappings/issue-403.json` |
| A7 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

`contracts/api/openapi.yaml` und `frontend/src/app/api/schema.d.ts` werden generiert. Die
Änderung ist additiv: ein neuer Enum-Wert und erweiterte Beschreibungen der 502-Antworten.
Version `2.1.0` wird `2.2.0`. Verbraucher ist nur das Frontend dieses Repositorys.

## Risiko

Stufe: high
Begründung: `harness/scripts/risk-level.sh` meldet high für `contracts/api/openapi.yaml`
(`contracts/**`). Zusätzlich greift der Eskalator `token` durch die Texte zum GitLab-Token. Code
unter `backend/src/main/` und `frontend/src/app/` ist medium.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`, G3 über den Status
`verified`. Reviews: Code, Sicherheit, Architektur.
ADR nötig: ja, 0007 (Risiko high, Alternative mit Wirkung auf Backend, Vertrag und Frontend).

## Umsetzung

Entscheidungen:

- ADR 0007: neuer Code `GITLAB_ACCESS_DENIED` (502) für 401 und 403 von GitLab.
- Vertrag additiv, `2.2.0`, nur über `make contracts`.
- Log mit `WARN` im Paket `gitlab`, ohne Token und ohne Antworttext.

Dateien:

- `docs/adr/0007-eigener-fehlercode-fuer-verweigerten-gitlab-zugriff.md`: neu
- `docs/adr/README.md`: ändern, Zeile 0007
- `backend/src/main/java/planningpoker/platform/ErrorCode.java`: ändern, `GITLAB_ACCESS_DENIED(502)`
- `backend/src/main/java/planningpoker/gitlab/GitLabClient.java`: ändern, Logzeile in `fromStatus` und bei `ProcessingException`
- `backend/src/main/java/planningpoker/session/GitLabIssues.java`: ändern, `UNAUTHORIZED` auf den neuen Code
- `backend/src/main/java/planningpoker/session/ResultPublisher.java`: ändern, dasselbe
- `backend/src/main/java/planningpoker/session/SessionResource.java`: ändern, Beschreibungen der 502-Antworten
- `backend/src/main/resources/application.properties`: ändern, `info-version` 2.2.0
- `backend/src/test/java/planningpoker/session/IssueSelectionTest.java`: ändern, A1 und A2
- `backend/src/test/java/planningpoker/session/ConfirmRoundTest.java`: ändern, A2
- `backend/src/test/java/planningpoker/session/ConfirmRoundWriteWeightTest.java`: ändern, A2
- `backend/src/test/java/planningpoker/gitlab/GitLabClientTest.java`: ändern, A3
- `backend/src/test/java/planningpoker/session/api/ContractTest.java`: ändern, A4
- `contracts/api/openapi.yaml`: ändern, generiert
- `frontend/src/app/api/schema.d.ts`: ändern, generiert
- `frontend/src/app/api/error-messages.ts`: ändern, zwei Texte
- `frontend/src/app/shell/error-banner.spec.ts`: ändern, Texte
- `frontend/src/app/start/start-page.ts`: ändern, Code am Formular
- `frontend/src/app/start/start-page.spec.ts`: ändern, A5
- `frontend/src/app/session/issue-panel.ts`: ändern, Code und Text im Fehlerzustand
- `frontend/src/app/session/issue-panel.html`: ändern, Text aus dem Code
- `frontend/src/app/session/issue-panel.spec.ts`: ändern, A5
- `frontend/src/app/session/confirm-result-dialog.ts`: ändern, Code am Formular
- `frontend/src/app/session/confirm-result-dialog.spec.ts`: ändern, A5
- `frontend/e2e/create-and-join.spec.ts`: ändern, A6
- `frontend/e2e/gitlab-double/mappings/issue-403.json`: neu
- `README.md`: ändern, Fehlercodes, Ablauf, privates Projekt
- `docs/umsetzungsplan.md`: ändern, 4.4 Codes
- `project-rules/backend.md`: ändern, Abbildung und Log
- `project-rules/frontend.md`: ändern, Codes der Formulare

Schritte:

1. `ErrorCode` erweitern. `GitLabIssues` und `ResultPublisher` bilden `Reason.UNAUTHORIZED` auf den neuen Code ab.
2. Logzeile in `GitLabClient` (JBoss `Logger`, `WARN`, Operation, Projekt-ID, Status, Grund).
3. Annotationen, `info-version`, `make contracts`, `ContractTest`.
4. Frontend: Texte, Formularcodes, Fehlerzustand der Suche.
5. Tests, Mapping `issue-403.json`, E2E.
6. README, Umsetzungsplan, `project-rules/`.
7. `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `IssueSelectionTest`: 403, 401, 500, Zeitüberschreitung beim Erstellen |
| A2 | `IssueSelectionTest`: Suche und Freigabe 403; `ConfirmRoundTest`, `ConfirmRoundWriteWeightTest`: 403, `confirming` zurück, `REVEALED` |
| A3 | `GitLabClientTest`: Log-Handler erfasst die Zeile, prüft Felder und das Fehlen von Token und Antworttext |
| A4 | `ContractTest`, `make drift` |
| A5 | `start-page.spec.ts`, `issue-panel.spec.ts`, `confirm-result-dialog.spec.ts`, `error-banner.spec.ts` |
| A6 | `create-and-join.spec.ts` mit `issue-403.json` |
| A7 | `make check`, `make e2e` |

Testdaten:
- Backend: GitLab über `GitLabStubs` und WireMock, Sitzungen über den HTTP-Ablauf.
- End-to-End: ein neues Mapping, in dem Issue 403 mit Status 403 antwortet.

Contracts zu regenerieren: `make contracts` (`contracts/api/openapi.yaml`,
`frontend/src/app/api/schema.d.ts`).

## Offene Fragen

- [x] Eigener Code `GITLAB_ACCESS_DENIED` mit Vertragsänderung (ADR 0007, Option A) oder nur neutraler Text und Log ohne Vertragsänderung (Option B, Risiko medium)? → Eigener Code, Option A. (Morten Möller, 2026-11-17)

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/session/`, `backend/src/test/java/planningpoker/gitlab/`, `backend/src/test/java/planningpoker/session/api/`, `frontend/src/app/start/*.spec.ts`, `frontend/src/app/session/*.spec.ts`, `frontend/src/app/shell/*.spec.ts`, `make e2e`
- Browser: Startseite mit 403 vom Double; optional gegen das echte Projekt mit einem Token ohne Rechte
- Aufruf: `make drift`
