---
id: "0030"
title: Design Werkbank, Teil D, Bedienfeld, Dialoge und Verbindungsbanner
status: done
risk: high
adrs: ["0004", "0008"]
owner: Morten Möller
created: 2026-11-17
updated: 2026-11-17
pr: "#28"
note: alle Kriterien erfüllt; echtes Projekt 88998176 nicht geprüft (Token aus .env nicht gelesen)
---

# Design Werkbank, Teil D, Bedienfeld, Dialoge und Verbindungsbanner

Teil des Design-Reworks „Werkbank“ nach `docs/design/` (aus Spec 0027, Teil A). Es gilt die Benennung aus 0026 („Diskussion“, „Schätzung starten“), und der Server löst bei Ablauf des Timers weiter automatisch auf (O-01). Die Teile B, C und D ändern getrennte Dateien und laufen nach Teil A parallel. Grundlage ist `docs/design/Raum.dc.html` (Bedienfeld, aktives Issue, Dialoge,
Snackbar, Banner) und `docs/design/Design-System.dc.html` (Abschnitt 9). Die Spec hängt ab
von 0027. Auf Wunsch der Person kommen die Daten dazu, die das Design braucht und das Backend
heute nicht liefert: Projektname, Gesamtzahl der Issues und die Einstellung `write-weight`.

## Ziel

Der Scrum Master sieht im Bedienfeld das Projekt mit Name und Pfad, wie viele Issues es gibt,
und kann Filter zurücksetzen. Die Dialoge „Issue wechseln?“ und „Ergebnis übernehmen“ nennen,
was passiert. Der Übernahmedialog zeigt die Stimmen je Karte und sagt richtig, ob das Gewicht
gesetzt wird. Bricht die Verbindung ab, sagt ein Banner das mit Countdown und „Jetzt verbinden“.

## Scope

### Enthalten

- **Vertrag (additiv, Version `3.0.0` → `3.1.0`):**
  - `SessionView.project`: `{ id, name, pathWithNamespace, webUrl }` oder `null`. Das Backend lädt das Projekt beim Anlegen der Sitzung einmal mit `GitLabClient.loadProject`, nach der Allowlist und dem Laden des Issues. Schlägt das fehl, bleibt `project` `null`, das Anlegen gelingt trotzdem, und das Backend schreibt eine Logzeile.
  - `SessionView.writeWeight`: `boolean`, die Einstellung `planningpoker.gitlab.write-weight` der Instanz.
  - `IssueListResponse.total`: Zahl oder `null` aus dem Header `X-Total` von GitLab. GitLab lässt ihn bei sehr großen Ergebnissen weg, dann ist der Wert `null`. Das gilt für beide Issue-Listen.
  - Die Beispiele unter `contracts/api/examples/` und das Mock-Backend bekommen die Felder.
- **Bedienfeld** (`issue-panel`):
  - „Issue auswählen“ mit „Projekt: webshop/frontend · 1234“ (Name bzw. Pfad aus `project`, sonst nur die ID).
  - Suche, Filter aus 0023 und „Mehr laden“ mit „6 von 23 Issues“. Ohne `total` steht dort „6 Issues“.
  - Zeilen mit „#iid“, Titel und „Gewicht 5“ oder „ohne Gewicht“. Eine Auswahl ist hervorgehoben mit ✓.
  - Unten „Ausgewählt: #42 Titel“ mit „Freigeben“.
  - Leerzustand „Keine Issues gefunden“ mit „Filter zurücksetzen“.
  - Fehlerzustand „Die Issues konnten nicht geladen werden.“, darunter der Text des Fehlercodes und „↻ Erneut versuchen“.
- **Aktives Issue** (`active-issue`): Titel, „#42“ und Link nach GitLab. In `REVEALED` und mobil ist die Beschreibung auf 120 px eingeklappt, mit „▾ Ganze Beschreibung anzeigen“.
- **Dialog „Issue wechseln?“:** „Runde 2 zu #42 läuft noch. Beim Wechsel endet sie ohne Ergebnis, die 3 abgegebenen Schätzungen werden verworfen.“ Dazu „Abbrechen“ und „Issue wechseln“.
- **Dialog „Ergebnis übernehmen“:**
  - „Endwert für #42 Titel“.
  - Die Karten zeigen die Stimmenzahl („2×“), der häufigste Wert ist ohne Konsens hervorgehoben, mit „Häufigster Wert dieser Runde, darunter die Anzahl der Stimmen. Nur zur Orientierung.“ Das `aria-label` jeder Karte nennt Stimmen und „häufigster Wert“.
  - Bei Konsens steht „Konsens: 5 ist vorausgewählt.“, sonst „Kein Konsens, deshalb ist nichts vorausgewählt.“
  - Hinweis „Ins GitLab-Issue #42 wird ein Kommentar mit dem Endwert geschrieben.“ und, je nach `writeWeight`, „Das Gewicht des Issues bleibt unverändert.“ oder „Zahlenwerte werden zusätzlich als Gewicht gesetzt.“
  - Zwischenzustand „Das Ergebnis wird nach GitLab geschrieben …“ mit „Wird übernommen …“.
  - Fehler am Dialog mit dem Text des Codes, „Der Kommentar wurde nicht geschrieben. Prüfe das Token und versuche es erneut.“ und „Erneut versuchen“.
- **Snackbar:** „✓ Endwert 5 in GitLab-Issue #42 gespeichert.“ mit der Aktion „Öffnen“ (Link zum Issue).
- **Verbindungsbanner** (`error-banner` und `RealtimeService`):
  - Bei getrennter WebSocket-Verbindung steht „⚠ Verbindung zum Server unterbrochen.“ und „Neuer Versuch in 5 s. Deine Karte bleibt erhalten.“, mit Countdown aus dem Plan der Wiederholungen.
  - „Jetzt verbinden“ verbindet sofort neu.
  - Das Banner ist `role="alert"` und verschwindet nach dem nächsten `session.state`.
  - Andere Fehler im Banner behalten ihren Text.
- **Dokumentation:** README (Snapshot-Felder, `total`), `docs/umsetzungsplan.md` (Snapshot-Beispiel, 4.4) und `project-rules/backend.md` (Projekt beim Anlegen).

### Nicht enthalten

- Seitenleiste, Motiv, „Zuletzt geschätzt“ (Teil B). Den Link „In GitLab öffnen ↗“ dort ergänzt ein späterer kleiner Nachtrag mit `project.webUrl`.
- Karten, Tisch, Phasenleiste, aufgedeckte Ansicht (Teil C).
- Start- und Beitrittsseite (Teil E). Die Startseite nutzt `total` noch nicht.

## Begriffe

keine neuen

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Nach dem Anlegen enthält der Snapshot `project` mit Name, Pfad und `webUrl` aus `GET /projects/1234`. Antwortet GitLab dort mit 500, ist die Sitzung trotzdem angelegt, und `project` ist `null`. `writeWeight` entspricht der Einstellung. | Test `backend/src/test/java/planningpoker/session/IssueSelectionTest.java`, `backend/src/test/java/planningpoker/session/SessionViewMapperTest.java` |
| A2 | Beide Issue-Listen liefern `total` aus `X-Total`. Ohne den Header ist `total` `null`. | Test `IssueSelectionTest`, `backend/src/test/java/planningpoker/gitlab/GitLabClientTest.java` |
| A3 | Der Vertrag enthält `project`, `writeWeight` und `total`. `info.version` ist `3.1.0`, die Beispiele passen zum Schema, und `make drift` ist grün. | Test `backend/src/test/java/planningpoker/session/api/ContractTest.java`, `ContractExamplesTest.java`; Typprüfung `frontend/src/app/api/examples.ts`; Aufruf `make drift` |
| A4 | Das Bedienfeld zeigt „Projekt: Name · ID“ bzw. nur die ID, „6 von 23 Issues“ bzw. „6 Issues“, die Auswahlzeile mit „Freigeben“, „Filter zurücksetzen“ im Leerzustand, das die Filter auf Standard stellt, und den Fehlerzustand. | Unit `frontend/src/app/session/issue-panel.spec.ts` |
| A5 | Der Übernahmedialog zeigt die Stimmen je Karte und hebt ohne Konsens den häufigsten Wert hervor. Er zeigt den Satz zum Gewicht passend zu `writeWeight` und die Zustände Schreiben und Fehler. | Unit `frontend/src/app/session/confirm-result-dialog.spec.ts` |
| A6 | Der Wechseldialog nennt Runde, Issue und Zahl der abgegebenen Schätzungen. Die Snackbar nennt Endwert und Issue und öffnet mit „Öffnen“ den Link. | Unit `frontend/src/app/session/switch-issue-dialog.spec.ts`, `confirm-success.spec.ts` |
| A7 | Bricht der WebSocket ab, zeigt das Banner den Text mit Countdown. „Jetzt verbinden“ baut sofort neu auf, und nach dem nächsten Snapshot ist das Banner weg. | Unit `frontend/src/app/api/realtime.service.spec.ts`, `frontend/src/app/shell/error-banner.spec.ts` |
| A8 | Das aktive Issue ist in `REVEALED` eingeklappt und lässt sich aufklappen. Markdown geht weiter nur über die Bereinigung von Angular. | Unit `frontend/src/app/session/active-issue.spec.ts` |
| A9 | Im Browser gegen das GitLab-Double zeigt das Bedienfeld Projektname und „von N Issues“. Bei einem Übernahmefehler steht der neue Fehlertext im Dialog. | End-to-End `frontend/e2e/issue-filter.spec.ts`, `frontend/e2e/result-round.spec.ts` (neue Fälle) |
| A10 | `make check` und `make e2e` sind grün, alle bestehenden `data-testid` bleiben. | Aufruf `make check`, `make e2e` |

## Contracts

Generiert werden `contracts/api/openapi.yaml` und `frontend/src/app/api/schema.d.ts`. Die
Beispiele unter `contracts/api/examples/` sind von Hand gepflegt. Die Änderung ist additiv: drei
neue Felder in Antworten. Verbraucher ist nur das Frontend dieses Repositorys. Version `3.0.0`
wird `3.1.0`.

## Risiko

Stufe: high
Begründung: `harness/scripts/risk-level.sh` meldet high für `contracts/**`. Dazu kommt beim
Anlegen ein zusätzlicher GitLab-Aufruf. Code unter `backend/src/main/` und `frontend/src/app/`
ist medium.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`, G3 über den Status
`verified`. Reviews: Code, Sicherheit, Architektur.
ADR nötig: ja wegen high (Punkt 1). Erfüllt durch ADR 0004 (der Snapshot trägt den Zustand,
den das Frontend anzeigt) und ADR 0008 (Projekt laden über `GitLabClient.loadProject`). Die
Felder sind additiv, es gibt keine neue Alternative mit Wirkung über diese Entscheidungen hinaus.

## Umsetzung

Entscheidungen:

- Der Vertrag wird additiv erweitert: `SessionView.project`, `SessionView.writeWeight` und `IssueListResponse.total`. Version `3.1.0`, nur über `make contracts`.
- Datenmodell im Arbeitsspeicher: `Session` bekommt die Projektdaten vom Anlegen.
- Das Frontend zeigt den Verbindungsstatus. `RealtimeService` stellt ihn als Signal bereit, mit nächstem Versuch und `reconnectNow()`. Es gibt keine neuen Abhängigkeiten.

Dateien:

- `backend/src/main/java/planningpoker/gitlab/IssuePage.java`: ändern, `total`
- `backend/src/main/java/planningpoker/gitlab/GitLabClient.java`: ändern, `X-Total` lesen
- `backend/src/main/java/planningpoker/session/Session.java`: ändern, Projektdaten
- `backend/src/main/java/planningpoker/session/SessionRegistry.java`: ändern, Projektdaten an `create`
- `backend/src/main/java/planningpoker/session/SessionResource.java`: ändern, Projekt beim Anlegen laden
- `backend/src/main/java/planningpoker/session/GitLabIssues.java`: ändern, `total`
- `backend/src/main/java/planningpoker/session/GitLabProjects.java`: ändern, `loadForSession` ohne Fehlerabbruch
- `backend/src/main/java/planningpoker/session/SessionViewMapper.java`: ändern, `project`, `writeWeight`
- `backend/src/main/java/planningpoker/session/api/SessionView.java`: ändern, Felder
- `backend/src/main/java/planningpoker/session/api/IssueListResponse.java`: ändern, `total`
- `backend/src/main/resources/application.properties`: ändern, `info-version` 3.1.0
- `backend/src/test/java/planningpoker/session/IssueSelectionTest.java`: ändern, A1, A2
- `backend/src/test/java/planningpoker/session/SessionViewMapperTest.java`: ändern, A1
- `backend/src/test/java/planningpoker/session/SessionBuilder.java`: ändern, Projektdaten
- `backend/src/test/java/planningpoker/session/GitLabStubs.java`: ändern, Projekt und `X-Total`
- `backend/src/test/java/planningpoker/gitlab/GitLabClientTest.java`: ändern, A2
- `backend/src/test/java/planningpoker/session/api/ContractTest.java`: ändern, A3
- `backend/src/test/java/planningpoker/session/api/ContractExamplesTest.java`: ändern, A3
- `contracts/api/openapi.yaml`: ändern, generiert
- `contracts/api/examples/lobby-developer.json`: ändern
- `contracts/api/examples/lobby-scrum-master.json`: ändern
- `contracts/api/examples/discussion-developer.json`: ändern
- `contracts/api/examples/discussion-scrum-master.json`: ändern
- `contracts/api/examples/voting-developer.json`: ändern
- `contracts/api/examples/voting-scrum-master.json`: ändern
- `contracts/api/examples/revealed-developer.json`: ändern
- `contracts/api/examples/revealed-scrum-master.json`: ändern
- `frontend/src/app/api/schema.d.ts`: ändern, generiert
- `frontend/src/app/api/examples.ts`: ändern
- `frontend/src/app/api/mock/mock-backend.interceptor.ts`: ändern, `total`
- `frontend/src/app/api/mock/mock-session.ts`: ändern, `project`, `writeWeight`
- `frontend/src/app/api/realtime.service.ts`: ändern, Verbindungsstatus, `reconnectNow`
- `frontend/src/app/api/realtime.service.spec.ts`: ändern, A7
- `frontend/src/app/shell/error-banner.ts`: ändern
- `frontend/src/app/shell/error-banner.html`: ändern
- `frontend/src/app/shell/error-banner.scss`: ändern
- `frontend/src/app/shell/error-banner.spec.ts`: ändern, A7
- `frontend/src/app/session/issue-panel.ts`: ändern
- `frontend/src/app/session/issue-panel.html`: ändern
- `frontend/src/app/session/issue-panel.scss`: ändern
- `frontend/src/app/session/issue-panel.spec.ts`: ändern, A4
- `frontend/src/app/session/active-issue.ts`: ändern
- `frontend/src/app/session/active-issue.html`: ändern
- `frontend/src/app/session/active-issue.scss`: ändern
- `frontend/src/app/session/active-issue.spec.ts`: ändern, A8
- `frontend/src/app/session/switch-issue-dialog.ts`: ändern
- `frontend/src/app/session/switch-issue-dialog.html`: ändern
- `frontend/src/app/session/switch-issue-dialog.spec.ts`: neu, A6
- `frontend/src/app/session/confirm-result-dialog.ts`: ändern
- `frontend/src/app/session/confirm-result-dialog.html`: ändern
- `frontend/src/app/session/confirm-result-dialog.scss`: ändern
- `frontend/src/app/session/confirm-result-dialog.spec.ts`: ändern, A5
- `frontend/src/app/session/confirm-success.ts`: ändern
- `frontend/src/app/session/confirm-success.html`: ändern
- `frontend/src/app/session/confirm-success.spec.ts`: neu, A6
- `frontend/e2e/issue-filter.spec.ts`: ändern, A9
- `frontend/e2e/result-round.spec.ts`: ändern, A9
- `frontend/e2e/gitlab-double/mappings/project-1234.json`: ändern, falls Name oder Pfad fehlen
- `frontend/e2e/gitlab-double/mappings/issues-search.json`: ändern, `X-Total`
- `README.md`: ändern, Snapshot-Felder, `total`
- `docs/umsetzungsplan.md`: ändern, Snapshot-Beispiel, 4.4
- `project-rules/backend.md`: ändern, Projekt beim Anlegen

Schritte:

1. Backend:
   - `X-Total` aus der GitLab-Antwort lesen.
   - Das Projekt beim Anlegen laden. Fehler sind nicht fatal, das Backend schreibt eine Logzeile ohne Token.
   - `Session` bekommt die Projektdaten, der Mapper die neuen Felder.
2. `info-version`, `make contracts`, Beispiele, `ContractTest` und `ContractExamplesTest`.
3. Frontend:
   - Mock-Backend.
   - `RealtimeService` stellt den Verbindungsstatus bereit, das Banner zeigt ihn.
   - Bedienfeld, aktives Issue, beide Dialoge und Snackbar nach dem Design.
4. Tests, Mappings, E2E-Fälle.
5. README, Umsetzungsplan, `project-rules/backend.md`.
6. `make check`, `make e2e`, dazu Screenshots hell und dunkel im PR.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `IssueSelectionTest` (Projekt geladen, Projekt 500), `SessionViewMapperTest` |
| A2 | `IssueSelectionTest`, `GitLabClientTest` |
| A3 | `ContractTest`, `ContractExamplesTest`, `examples.ts`, `make drift` |
| A4 | `issue-panel.spec.ts` |
| A5 | `confirm-result-dialog.spec.ts` |
| A6 | `switch-issue-dialog.spec.ts`, `confirm-success.spec.ts` |
| A7 | `realtime.service.spec.ts` mit Fake-WebSocket und Fake-Timern, `error-banner.spec.ts` |
| A8 | `active-issue.spec.ts` |
| A9 | `issue-filter.spec.ts`, `result-round.spec.ts` |
| A10 | `make check`, `make e2e` |

Testdaten: GitLab über `GitLabStubs` und WireMock. Für End-to-End das GitLab-Double mit Projekt `1234` und Header `X-Total`.

Contracts zu regenerieren: `make contracts` (`contracts/api/openapi.yaml`,
`frontend/src/app/api/schema.d.ts`).

## Offene Fragen

- [x] Daten, die das Design braucht und das Backend nicht liefert? → Gleich mit einbauen (Projektname, Gesamtzahl, `write-weight`). (Morten Möller, 2026-11-17)

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/session/`, `backend/src/test/java/planningpoker/gitlab/`, `backend/src/test/java/planningpoker/session/api/`, `frontend/src/app/session/*.spec.ts`, `frontend/src/app/api/*.spec.ts`, `frontend/src/app/shell/*.spec.ts`, `make e2e`
- Browser: Bedienfeld, Dialoge, Snackbar und Banner hell und dunkel, 375 px; gegen das echte Projekt 88998176 Projektname und Gesamtzahl
- Aufruf: `make drift`
