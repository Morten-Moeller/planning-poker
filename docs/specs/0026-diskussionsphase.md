---
id: "0026"
title: Diskussionsphase vor der Schätzung
status: Review
risk: high
adrs: ["0010"]
owner: Morten Möller
created: 2026-11-17
updated: 2026-11-17
pr: ""
note: freigegeben in der Session
---

# Diskussionsphase vor der Schätzung

Wunsch der Person: Erst wird das Issue besprochen, dann wird geschätzt, und erst dann läuft der
Timer. Bezug: R-06 und R-07 (Freigabe, danach sehen alle das Issue), R-11, R-14, R-18, O-01.
Grundlage: ADR 0010, das ADR 0006 ablöst. Die Spec hängt ab von 0022 bis 0025, weil sie
`SessionResource`, den Vertrag, die Rundenansichten und alle E2E-Abläufe ändert.

## Ziel

Nach der Freigabe sehen alle das Issue, die Karten sind aber noch gesperrt, und das Team
diskutiert. Mit „Schätzung starten“ öffnet der Scrum Master die Karten. Ist ein Timer
eingestellt, beginnt die Frist erst jetzt. „Neue Runde“ führt wieder in die Diskussion.

## Scope

### Enthalten

- **Phase `DISCUSSION`:**
  - Freigabe und Issue-Wechsel führen nach `DISCUSSION`, mit Runde 1 und ohne Frist.
  - „Neue Runde“ führt nach `DISCUSSION`, mit Rundennummer plus 1 und gelöschten Stimmen.
  - In `DISCUSSION` lehnt der Server `vote` und `reveal` mit 409 `INVALID_STATE` ab.
  - Ein Issue-Wechsel in `DISCUSSION` ist erlaubt, `confirm` nicht.
  - Während `confirming` gilt die bestehende Sperre.
- **`POST /api/sessions/{id}/round/start`** (Scrum Master):
  - Führt von `DISCUSSION` nach `VOTING` und setzt `deadline = jetzt + timerSeconds`, wenn ein Timer eingestellt ist.
  - Antwortet 204.
  - Fehler: 401, 403 `FORBIDDEN_ROLE`, 404 und 409 `INVALID_STATE` außerhalb von `DISCUSSION`.
- **Snapshot in `DISCUSSION`:** `activeIssue` ist gesetzt. `round` hat `number`, `myVote` `null`, `allVoted` `false`, `votes` und `stats` `null` sowie `deadline` `null`.
- **Timer (ADR 0006 → 0010):**
  - Die Einstellung bleibt, wie sie ist.
  - Die Frist entsteht nur mit „Schätzung starten“.
  - Eine Änderung der Einstellung in `DISCUSSION` wirkt auf den folgenden Start.
- **Vertrag:**
  - `Phase.DISCUSSION` und der neue Endpunkt kommen dazu.
  - Die Beschreibungen von Freigabe und Neuer Runde ändern sich.
  - `info.version` ist `3.0.0`, Bruch nach ADR 0010.
  - Neue Beispiel-Snapshots `discussion-developer.json` und `discussion-scrum-master.json`.
- **Frontend:**
  - Die Phase heißt in der Oberfläche „Diskussion“.
  - In `DISCUSSION` sehen alle das aktive Issue und den Hinweis „Diskussion: Die Karten werden geöffnet, wenn der Scrum Master die Schätzung startet.“ (`data-testid="discussion-hint"`).
  - Entwickler sehen keinen Kartenfächer.
  - Der Scrum Master sieht „Schätzung starten“ (`data-testid="round-start"`) und, falls ein Timer eingestellt ist, „Timer: 1 min“ daneben.
  - Ein Issue-Wechsel in `DISCUSSION` braucht keinen Bestätigungsdialog, weil es noch keine Stimmen gibt.
  - Das Mock-Backend kennt die Phase und den Endpunkt.
- **E2E:** Jeder bestehende Ablauf mit Freigabe bekommt den Schritt „Schätzung starten“ über eine gemeinsame Hilfsfunktion.
- **Dokumentation:**
  - `docs/umsetzungsplan.md`: 4.3, 4.4, das Snapshot-Beispiel und M14 O-01.
  - README: Zustandsautomat, Endpunkte und Ablauf.
  - Glossar: Phase, Freigabe, Neue Runde und Schätzung starten.
  - Invarianten I38 bis I40, `project-rules/frontend.md` und `project-rules/testing.md`.
  - ADR 0006 bekommt `superseded by 0010`.

### Nicht enthalten

- Eine Uhr für die Diskussion selbst.
- Eine Rückkehr von `VOTING` nach `DISCUSSION`. Dafür gibt es Auflösen und Neue Runde.
- Ein Kompatibilitätsmodus für alte Clients. Das Frontend ist der einzige Verbraucher.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Diskussion | Phase `DISCUSSION`: Das Issue ist sichtbar, die Karten sind gesperrt, es läuft keine Frist. Neu, mit dieser Spec ins Glossar |
| Schätzung starten | Aktion des Scrum Masters von `DISCUSSION` nach `VOTING`, startet die Frist. Neu, mit dieser Spec ins Glossar |
| Freigabe, Neue Runde, Frist, Timer | wie im Glossar, mit neuer Folgephase `DISCUSSION` |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Freigabe, Issue-Wechsel und Neue Runde führen nach `DISCUSSION` ohne Frist. `round/start` führt nach `VOTING`. In `DISCUSSION` geben `vote` und `reveal` 409. `round/start` außerhalb von `DISCUSSION` gibt 409, für einen Entwickler 403. Jede Zeile des neuen Zustandsautomaten hat einen Test. | Unit `backend/src/test/java/planningpoker/session/SessionTest.java`; Test `backend/src/test/java/planningpoker/session/RoundCommandsTest.java` |
| A2 | Mit `timerSeconds: 30` hat die Runde nach der Freigabe keine Frist. Nach `round/start` ist die Frist Startzeit plus 30 s. Die automatische Auflösung erfasst keine Runde in `DISCUSSION`. | Unit `SessionTest`, `backend/src/test/java/planningpoker/session/SessionRegistryTest.java`; Test `backend/src/test/java/planningpoker/session/RoundTimerTest.java` |
| A3 | Snapshots in `DISCUSSION` enthalten für beide Rollen das aktive Issue, `round.number`, keine Stimmen und keine Frist. Kein Snapshot enthält vor der Auflösung fremde Kartenwerte. | Test `backend/src/test/java/planningpoker/session/SessionViewMapperTest.java`; `backend/src/test/java/planningpoker/realtime/SessionSocketTest.java` |
| A4 | Der Vertrag enthält `DISCUSSION`, `POST …/round/start` mit 204, 401, 403, 404 und 409 sowie die Beispiele für `DISCUSSION`. `info.version` ist `3.0.0`, und `make drift` ist grün. | Test `backend/src/test/java/planningpoker/session/api/ContractTest.java`, `ContractExamplesTest.java`; Typprüfung `frontend/src/app/api/examples.ts`; Aufruf `make drift` |
| A5 | In `DISCUSSION` sehen Entwickler das Issue und `discussion-hint` ohne Kartenfächer. Der Scrum Master sieht `round-start` mit der eingestellten Dauer. Ein Klick sendet `round/start`. Ein Issue-Wechsel in `DISCUSSION` öffnet keinen Dialog. | Unit `frontend/src/app/session/round-status.spec.ts`, `session-page.spec.ts`, `issue-panel.spec.ts` |
| A6 | Im Browser gibt der Scrum Master mit Timer 15 s frei. Der Entwickler sieht das Issue ohne Karten und ohne Restzeit. Nach „Schätzung starten“ sehen beide „Noch 0:1x“, und der Entwickler kann wählen. | End-to-End `frontend/e2e/round-timer.spec.ts` |
| A7 | Alle bestehenden E2E-Abläufe sind mit „Schätzung starten“ grün. | Aufruf `make e2e` |
| A8 | `make check` ist grün. | Aufruf `make check` |

## Contracts

Generiert werden `contracts/api/openapi.yaml` und `frontend/src/app/api/schema.d.ts`. Die
Beispiele unter `contracts/api/examples/` sind von Hand gepflegt. Der Bruch: ein neuer Enum-Wert
in einer Antwort und eine andere Folgephase der Freigabe. Neu: der Endpunkt `round/start`.
Verbraucher ist nur das Frontend dieses Repositorys, es zieht in derselben Änderung nach. Version
`2.4.0` wird `3.0.0` (ADR 0010).

## Risiko

Stufe: high
Begründung: `harness/scripts/risk-level.sh` meldet high für `contracts/**`. Inhaltlich bricht der
Vertrag, und der Zustandsautomat ändert sich. Code unter `backend/src/main/` und
`frontend/src/app/` ist medium.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`, G3 über den Status
`verified`. Reviews: Code, Sicherheit, Architektur.
ADR nötig: ja, 0010 (Vertragsbruch, Risiko high, ersetzt ADR 0006).

## Umsetzung

Entscheidungen:

- ADR 0010: neue Phase `DISCUSSION`, `POST …/round/start`, Frist erst mit dem Start. ADR 0006 wird abgelöst.
- Vertragsbruch auf Version `3.0.0`, generiert nur über `make contracts`.
- Datenmodell im Arbeitsspeicher: `Phase.DISCUSSION`. `Round` bekommt die Frist erst beim Start.
- Keine neuen Abhängigkeiten, keine neuen Module.

Dateien:

- `docs/adr/0010-diskussionsphase-vor-der-schaetzung.md`: neu
- `docs/adr/0006-countdown-timer-mit-serverfrist.md`: ändern, nur die Statuszeile
- `docs/adr/README.md`: ändern, Zeilen 0006 und 0010
- `backend/src/main/java/planningpoker/session/Phase.java`: ändern, `DISCUSSION`
- `backend/src/main/java/planningpoker/session/Session.java`: ändern, Übergänge, `startVoting`
- `backend/src/main/java/planningpoker/session/Round.java`: ändern, Frist beim Start
- `backend/src/main/java/planningpoker/session/SessionResource.java`: ändern, `POST /{id}/round/start`, Beschreibungen
- `backend/src/main/resources/application.properties`: ändern, `info-version` 3.0.0
- `backend/src/test/java/planningpoker/session/SessionTest.java`: ändern, A1, A2
- `backend/src/test/java/planningpoker/session/SessionBuilder.java`: ändern, Zustände mit `DISCUSSION`
- `backend/src/test/java/planningpoker/session/RoundCommandsTest.java`: ändern, A1
- `backend/src/test/java/planningpoker/session/SessionRegistryTest.java`: ändern, A2
- `backend/src/test/java/planningpoker/session/RoundTimerTest.java`: ändern, A2
- `backend/src/test/java/planningpoker/session/SessionViewMapperTest.java`: ändern, A3
- `backend/src/test/java/planningpoker/session/ConfirmRoundFlow.java`: ändern, Start der Schätzung im Ablauf
- `backend/src/test/java/planningpoker/realtime/SessionSocketTest.java`: ändern, A3
- `backend/src/test/java/planningpoker/realtime/RoundTimerSocketTest.java`: ändern, Start der Schätzung
- `backend/src/test/java/planningpoker/realtime/RestCalls.java`: ändern, `startVoting`
- `backend/src/test/java/planningpoker/session/api/ContractTest.java`: ändern, A4
- `backend/src/test/java/planningpoker/session/api/ContractExamplesTest.java`: ändern, A4
- `contracts/api/openapi.yaml`: ändern, generiert
- `contracts/api/examples/discussion-developer.json`: neu
- `contracts/api/examples/discussion-scrum-master.json`: neu
- `frontend/src/app/api/schema.d.ts`: ändern, generiert
- `frontend/src/app/api/examples.ts`: ändern, neue Beispiele
- `frontend/src/app/api/api.service.ts`: ändern, `startVoting`
- `frontend/src/app/api/api.service.spec.ts`: ändern
- `frontend/src/app/api/mock/mock-backend.interceptor.ts`: ändern, Phase und Endpunkt
- `frontend/src/app/api/mock/mock-session.ts`: ändern, Phase
- `frontend/src/app/session/session-page.html`: ändern, Phase „Diskussion“, Ansicht in `DISCUSSION`
- `frontend/src/app/session/session-page.spec.ts`: ändern, A5
- `frontend/src/app/session/round-status.ts`: ändern, Start der Schätzung
- `frontend/src/app/session/round-status.html`: ändern, Hinweis und Button
- `frontend/src/app/session/round-status.spec.ts`: ändern, A5
- `frontend/src/app/session/issue-panel.ts`: ändern, kein Dialog in `DISCUSSION`
- `frontend/src/app/session/issue-panel.spec.ts`: ändern, A5
- `frontend/src/app/session/participant-list.ts`: ändern, Status nur in `VOTING`
- `frontend/e2e/helpers.ts`: neu, `startVoting(page)`
- `frontend/e2e/round-timer.spec.ts`: ändern, A6
- `frontend/e2e/session-room.spec.ts`: ändern, Schritt Schätzung starten
- `frontend/e2e/voting-round.spec.ts`: ändern, Schritt Schätzung starten
- `frontend/e2e/result-round.spec.ts`: ändern, Schritt Schätzung starten
- `frontend/e2e/outliers.spec.ts`: ändern, Schritt Schätzung starten
- `frontend/e2e/consensus.spec.ts`: ändern, Schritt Schätzung starten
- `frontend/e2e/full-flow.spec.ts`: ändern, Schritt Schätzung starten
- `frontend/e2e/layout.spec.ts`: ändern, Phase `DISCUSSION` im Layout-Test
- `README.md`: ändern, Zustandsautomat, Endpunkte, Ablauf
- `docs/umsetzungsplan.md`: ändern, 4.3, 4.4, Snapshot, M14 O-01
- `docs/domain/glossary.md`: ändern, Phase, Freigabe, Neue Runde, Diskussion, Schätzung starten
- `docs/domain/invariants.md`: ändern, I38 bis I40, neue Invariante für `DISCUSSION`
- `project-rules/frontend.md`: ändern, Ansicht in `DISCUSSION`
- `project-rules/testing.md`: ändern, Hilfsfunktion `startVoting`

Schritte:

1. Domäne:
   - Neue Phase `DISCUSSION`.
   - `selectIssue` und `restart` führen nach `DISCUSSION`, ohne Frist.
   - `startVoting(actorId, now)` setzt die Frist, `vote` und `reveal` verlangen `VOTING`.
   - `revealIfDue` betrifft nur `VOTING`.
2. `SessionResource.startVoting` mit `@RequiresRole(SCRUM_MASTER)` und den Annotationen. Danach `info-version`, `make contracts`, neue Beispiele, `ContractTest` und `ContractExamplesTest`.
3. Backend-Tests auf den neuen Ablauf umstellen. Hilfen wie `ConfirmRoundFlow` und `RestCalls` bekommen den Start.
4. Frontend:
   - `ApiService.startVoting` und das Mock-Backend.
   - Die Sitzungsseite zeigt die Ansicht in `DISCUSSION`.
   - `RoundStatus` zeigt Hinweis und Button.
   - Das Bedienfeld öffnet beim Issue-Wechsel in `DISCUSSION` keinen Dialog.
   - Die Teilnehmerliste zeigt den Abstimmungsstatus nur in `VOTING`.
5. E2E: die Hilfsfunktion `startVoting` und den Schritt in jedem Ablauf, dazu A6.
6. Dokumentation, Glossar, Invarianten, ADR-Status.
7. `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `SessionTest` (Tabelle des Zustandsautomaten), `RoundCommandsTest` (HTTP-Status je Übergang) |
| A2 | `SessionTest`, `SessionRegistryTest`, `RoundTimerTest` mit Testuhr |
| A3 | `SessionViewMapperTest`, `SessionSocketTest` |
| A4 | `ContractTest`, `ContractExamplesTest`, `examples.ts`, `make drift` |
| A5 | `round-status.spec.ts`, `session-page.spec.ts`, `issue-panel.spec.ts` |
| A6 | `round-timer.spec.ts` |
| A7 | `make e2e` |
| A8 | `make check` |

Testdaten: wie bisher (`GitLabStubs`, `TestClock`, GitLab-Double mit Issue 42).

Contracts zu regenerieren: `make contracts` (`contracts/api/openapi.yaml`,
`frontend/src/app/api/schema.d.ts`).

## Offene Fragen

- [x] Führt „Neue Runde“ nach `DISCUSSION` (Ausreißer besprechen, dann neu schätzen) oder direkt nach `VOTING`? → Nach `DISCUSSION`. (Morten Möller, 2026-11-17)
- [x] Timer von Hand starten oder eigene Diskussionsphase? → Eigene Diskussionsphase (ADR 0010, Option B). (Morten Möller, 2026-11-17)

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/session/`, `backend/src/test/java/planningpoker/realtime/`, `backend/src/test/java/planningpoker/session/api/`, `frontend/src/app/session/*.spec.ts`, `frontend/src/app/api/*.spec.ts`, `make e2e`
- Browser: Sitzungsraum mit zwei Kontexten, Freigabe mit Timer, Diskussion, Schätzung starten, Auflösung, Neue Runde
- Aufruf: `make drift`
