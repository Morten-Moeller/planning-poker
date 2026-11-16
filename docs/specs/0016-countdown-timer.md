---
id: "0016"
title: Countdown-Timer (M14, O-01)
status: approved
risk: high
adrs: ["0006"]
owner: Morten Möller
created: 2026-11-16
updated: 2026-11-16
pr: ""
note: freigegeben in der Session
---

# Countdown-Timer (M14, O-01)

Optionales Feature O-01 aus Meilenstein M14 in `docs/umsetzungsplan.md`, R-IDs: keine (optional);
A-IDs: A-02 (der Scrum Master schätzt nicht mit), A-09 (nur Arbeitsspeicher). Grundlage: ADR 0006.

## Ziel

Der Scrum Master kann eine Dauer für die Runden einstellen. Jede Runde, die danach startet, hat
eine Frist, die alle Teilnehmer als gleich laufenden Countdown sehen. Ist die Frist erreicht,
löst der Server die Runde selbst auf, auch wenn der Scrum Master nicht verbunden ist.

## Scope

### Enthalten

- Einstellung der Sitzung `timerSeconds`: `null` (aus, Standard) oder 5 bis 3600 Sekunden. Der Scrum Master setzt sie mit `PUT /api/sessions/{id}/timer` `{ seconds }` in jeder Phase. Antwort 204. Fehler: 400 `VALIDATION_ERROR`, 401, 403 `FORBIDDEN_ROLE`, 404. Die Einstellung wirkt ab dem nächsten Rundenstart.
- Rundenstart (Freigabe, Issue-Wechsel, Neue Runde) mit gesetzter Einstellung: Die Runde bekommt `deadline = Start + timerSeconds`. Ohne Einstellung ist `deadline` `null`.
- Automatische Auflösung: Eine Prüfung alle 250 ms löst jede Sitzung in `VOTING` auf, deren Frist erreicht ist. Das geschieht unter der Sperre der Sitzung, mit derselben Wirkung wie die manuelle Auflösung (Auswertung, Protokolleintrag, Phase `REVEALED`), auch ohne Stimmen. Danach geht ein Snapshot an alle Verbindungen. Eine vorher aufgelöste, neu gestartete oder verworfene Runde wird nicht aufgelöst.
- Snapshot: `timerSeconds` (Zahl oder `null`), `serverTime` (Serverzeit beim Erzeugen, RFC 3339 mit Offset) und `round.deadline` (RFC 3339 mit Offset oder `null`), für beide Rollen gleich.
- Vertrag: neuer Endpunkt und neue Felder, nur additiv, `info.version` `2.1.0`. Die Beispiel-Snapshots unter `contracts/api/examples/` und das Mock-Backend bekommen die Felder.
- Frontend:
  - Der Scrum Master sieht die Auswahl „Timer“ mit „Aus“, „15 s“, „30 s“, „1 min“, „2 min“ und „5 min“. Sie zeigt den Wert aus dem Snapshot und sendet eine Änderung sofort.
  - In `VOTING` mit Frist sehen alle die Restzeit „Noch m:ss“. Sie wird aus `deadline` und der Abweichung zu `serverTime` jede Sekunde neu berechnet und zeigt bei 0 „Zeit abgelaufen“, bis der Snapshot mit `REVEALED` kommt.
- `docs/umsetzungsplan.md`: 4.3 (Zeile „Frist erreicht“), 4.4 (`PUT …/timer`), Snapshot-Beispiel und M14 nach ADR 0006.
- README (Schnittstellen, Zustandsautomat), `docs/domain/glossary.md` (Timer, Frist), `docs/domain/invariants.md` (I38 bis I40).

### Nicht enthalten

- Eine Dauer, die nur für eine einzelne Runde gilt, und ein Ändern der Frist einer laufenden Runde (ADR 0006).
- Pausieren, Verlängern, Ton oder Benachrichtigung bei Ablauf.
- Ausreißer (0017), Konsens (0018), Rundennummer in der Oberfläche und weitere Hinweise aus den Reviews (0019).
- Eine eigene WebSocket-Nachricht für den Ablauf; der Snapshot genügt.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Sitzung, Runde, Auflösung, Scrum Master, Snapshot | wie im Glossar |
| Timer | Einstellung der Sitzung: Dauer in Sekunden für jede ab jetzt startende Runde oder aus; neu, mit /domain ins Glossar |
| Frist | Zeitpunkt, zu dem der Server eine laufende Runde automatisch auflöst (`round.deadline`); neu, mit /domain ins Glossar |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `PUT …/timer` mit `{ "seconds": 30 }` antwortet 204, und der nächste Snapshot hat `timerSeconds: 30`. `{ "seconds": null }` schaltet ab. Für 4 und 3601 antwortet der Endpunkt 400 `VALIDATION_ERROR`, für einen Entwickler 403 `FORBIDDEN_ROLE` und ohne Token 401. | Test `backend/src/test/java/planningpoker/session/RoundTimerTest.java` |
| A2 | Mit `timerSeconds: 30` haben Freigabe, Issue-Wechsel und Neue Runde je `round.deadline` = Startzeit + 30 s. Ohne Einstellung ist `deadline` `null`. Eine Änderung der Einstellung während `VOTING` ändert die laufende Frist nicht. | Unit `backend/src/test/java/planningpoker/session/SessionTest.java`; Test `RoundTimerTest` |
| A3 | Nach Erreichen der Frist (Testuhr) ist die Sitzung ohne weiteren Befehl in `REVEALED`. Das Protokoll hat einen Eintrag, auch ohne Stimmen. Eine vorher manuell aufgelöste oder neu gestartete Runde wird nicht ein zweites Mal aufgelöst. | Unit `backend/src/test/java/planningpoker/session/SessionRegistryTest.java`; Test `RoundTimerTest` |
| A4 | Zwei Entwickler sind über den WebSocket verbunden, der Scrum Master nicht. Beide erhalten nach der Frist innerhalb einer Sekunde einen Snapshot mit `REVEALED`. Vorher tragen ihre Snapshots dieselbe `round.deadline`. | Test `backend/src/test/java/planningpoker/realtime/RoundTimerSocketTest.java` |
| A5 | Der Vertrag enthält `PUT /api/sessions/{id}/timer`, `timerSeconds`, `serverTime` und `round.deadline` (Format `date-time`). `info.version` ist `2.1.0`, `make drift` ist grün, die Beispiel-Snapshots passen zum Schema. | Test `backend/src/test/java/planningpoker/session/api/ContractTest.java`; `frontend/src/app/api/examples.ts` (Typprüfung); Aufruf `make drift` |
| A6 | Die Restzeit hängt nicht von der Uhr des Clients ab. Geht die Client-Uhr 90 s vor und liegt die Frist 42 s nach `serverTime`, zeigt die Anzeige „Noch 0:42“. Bei 0 zeigt sie „Zeit abgelaufen“. | Unit `frontend/src/app/session/round-timer.spec.ts` |
| A7 | Im Browser stellt der Scrum Master „15 s“ ein und gibt ein Issue frei. Scrum Master und Entwickler sehen „Noch 0:1x“. Der Scrum Master schließt seine Seite, und der Entwickler sieht nach Ablauf ohne weitere Aktion „Runde aufgelöst“. Die Auswahl „Timer“ sieht nur der Scrum Master. | End-to-End `frontend/e2e/round-timer.spec.ts`; Unit `frontend/src/app/session/timer-setting.spec.ts` |
| A8 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

`contracts/api/openapi.yaml` (generiert aus `SessionView`, `TimerRequest` und den Annotationen
von `SessionResource`) und `frontend/src/app/api/schema.d.ts` (generiert). Additiv: ein neuer
Endpunkt, neue Pflichtfelder in Antworten (`timerSeconds`, `serverTime`) und ein neues nullbares
Feld `round.deadline`. Die Beispiel-Snapshots unter `contracts/api/examples/` werden von Hand
ergänzt, sie sind keine generierten Dateien. Verbraucher: nur das Frontend dieses Repositorys.
Version `2.0.0` wird zu `2.1.0`.

## Risiko

Stufe: high
Begründung: `harness/scripts/risk-level.sh` meldet high, weil sich `contracts/api/openapi.yaml`
und die Beispiele ändern (`contracts/**`). Die Dateien unter `backend/src/main/` und
`frontend/src/app/` sind medium, Tests und Doku low.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`, G3 über den Status
`verified`. Reviews: Code, Sicherheit, Architektur.
ADR nötig: ja, 0006 (Risiko high; Alternativen mit Wirkung auf Backend und Frontend,
`harness/policies/adr.md` Punkte 1 und 4).

## Umsetzung

Entscheidungen:

- ADR 0006: Der Timer ist eine Einstellung der Sitzung (`PUT …/timer`), die Frist steht im Snapshot, und der Server löst über eine periodische Prüfung alle 250 ms auf (`vertx.setPeriodic` wie beim Verfall).
- Der Vertrag ändert sich nur additiv: `timerSeconds`, `serverTime`, `round.deadline` und ein neuer Endpunkt; Version `2.1.0`; generiert nur über `make contracts`.
- Das Datenmodell im Arbeitsspeicher bekommt `Session.timerSeconds` und `Round.deadline`; es gibt keine Persistenz.
- Es kommen keine neuen Abhängigkeiten und keine neuen Module dazu. `RoundTimer` und `TimerSetting` im Frontend sind neue Komponenten in `session/`.

Dateien:

- `docs/roadmap.md`: ändern, Welle 12 mit ADR 0006
- `docs/adr/0006-countdown-timer-mit-serverfrist.md`: neu
- `docs/adr/README.md`: ändern, Zeile 0006
- `docs/umsetzungsplan.md`: ändern, 4.3, 4.4, Snapshot-Beispiel, M14 O-01
- `backend/src/main/java/planningpoker/session/Session.java`: ändern, `timerSeconds`, `setTimer`, Frist beim Rundenstart, `revealIfDue`
- `backend/src/main/java/planningpoker/session/Round.java`: ändern, `deadline`
- `backend/src/main/java/planningpoker/session/SessionRegistry.java`: ändern, `revealDue(Instant)`
- `backend/src/main/java/planningpoker/session/SessionRegistryProducer.java`: ändern, periodische Prüfung
- `backend/src/main/java/planningpoker/session/SessionResource.java`: ändern, `PUT /{id}/timer`, Startzeit an `selectIssue` und `restart`
- `backend/src/main/java/planningpoker/session/SessionViewMapper.java`: ändern, `timerSeconds`, `serverTime`, `deadline`
- `backend/src/main/java/planningpoker/session/api/SessionView.java`: ändern, Felder und Beschreibungen
- `backend/src/main/java/planningpoker/session/api/TimerRequest.java`: neu
- `backend/src/main/resources/application.properties`: ändern, `info-version` 2.1.0
- `backend/src/test/java/planningpoker/session/SessionTest.java`: ändern, A2
- `backend/src/test/java/planningpoker/session/SessionRegistryTest.java`: ändern, A3
- `backend/src/test/java/planningpoker/session/SessionViewMapperTest.java`: ändern, Felder für beide Rollen
- `backend/src/test/java/planningpoker/session/SessionBuilder.java`: ändern, falls Konstruktor oder Rundenstart die Zeit verlangen
- `backend/src/test/java/planningpoker/session/RoundTimerTest.java`: neu, A1 bis A3 mit alternativer Uhr wie in `SessionLimitsTest`
- `backend/src/test/java/planningpoker/realtime/RoundTimerSocketTest.java`: neu, A4
- `backend/src/test/java/planningpoker/session/api/ContractTest.java`: ändern, A5
- `contracts/api/openapi.yaml`: ändern, generiert
- `contracts/api/examples/lobby-developer.json`: ändern, `timerSeconds`, `serverTime`
- `contracts/api/examples/lobby-scrum-master.json`: ändern, `timerSeconds`, `serverTime`
- `contracts/api/examples/voting-developer.json`: ändern, Felder und `round.deadline`
- `contracts/api/examples/voting-scrum-master.json`: ändern, Felder und `round.deadline`
- `contracts/api/examples/revealed-developer.json`: ändern, Felder und `round.deadline`
- `contracts/api/examples/revealed-scrum-master.json`: ändern, Felder und `round.deadline`
- `frontend/src/app/api/schema.d.ts`: ändern, generiert
- `frontend/src/app/api/api.service.ts`: ändern, `setTimer`
- `frontend/src/app/api/api.service.spec.ts`: ändern, `setTimer`
- `frontend/src/app/api/session-store.ts`: ändern, Abweichung der Uhr aus `serverTime`, `deadline`, `timerSeconds`
- `frontend/src/app/api/session-store.spec.ts`: ändern, Abweichung
- `frontend/src/app/api/mock/mock-session.ts`: ändern, neue Felder
- `frontend/src/app/session/round-timer.ts`: neu
- `frontend/src/app/session/round-timer.html`: neu
- `frontend/src/app/session/round-timer.scss`: neu
- `frontend/src/app/session/round-timer.spec.ts`: neu, A6
- `frontend/src/app/session/timer-setting.ts`: neu
- `frontend/src/app/session/timer-setting.html`: neu
- `frontend/src/app/session/timer-setting.spec.ts`: neu, A7 (Unit)
- `frontend/src/app/session/session-page.html`: ändern, Timer-Auswahl für den Scrum Master und Restzeit in `VOTING`
- `frontend/src/app/session/session-page.ts`: ändern, Imports
- `frontend/e2e/round-timer.spec.ts`: neu, A7
- `README.md`: ändern, Endpunkt, Snapshot-Felder, Zustandsautomat
- `docs/domain/glossary.md`: ändern, Timer, Frist
- `docs/domain/invariants.md`: ändern, I38 bis I40
- `project-rules/backend.md`: ändern, periodische Prüfung neben dem Verfall

Schritte:

1. Domäne:
   - `Round` bekommt `deadline` (`Optional<Instant>`).
   - `Session` bekommt `timerSeconds`, `setTimer(actorId, Integer)` mit Rollenprüfung und `revealIfDue(Instant now)`. Diese Methode liefert wahr, wenn sie in `VOTING` mit erreichter Frist aufgelöst hat, und nutzt denselben Weg wie `reveal` ohne Rollenprüfung.
   - `selectIssue` und `restart` erhalten die Startzeit und setzen die Frist.
2. `SessionRegistry.revealDue(Instant now)`: Für jede lebende Sitzung ruft sie unter der Sperre `revealIfDue` auf. `SessionChanged` feuert nur bei wahr. `lastActivityAt` wird dann wie bei `update` gesetzt.
3. `SessionRegistryProducer`: `vertx.setPeriodic(250 ms, … registry.revealDue(clock.instant()))`.
4. `TimerRequest` (`seconds`, nullable, `@Min(5) @Max(3600)`) und `SessionResource.setTimer` (`@RequiresRole(SCRUM_MASTER)`, 204). Die Annotationen nennen 400, 401, 403 und 404.
5. `SessionView` und `SessionViewMapper`: `timerSeconds`, `serverTime` (aus der `Clock`), `round.deadline` mit UTC-Offset. Dann `info-version` 2.1.0, `make contracts`, Beispiele von Hand ergänzen, `ContractTest`.
6. Frontend:
   - `ApiService.setTimer`.
   - `SessionStore` merkt sich je Snapshot die Abweichung `serverTime - Date.now()`.
   - `RoundTimer` zeigt die Restzeit mit `role="timer"` und Texten über `$localize`.
   - `TimerSetting` ist ein `mat-select` mit Label „Timer“ und den Werten aus dem Scope.
   - Beide kommen in `session-page.html`: die Auswahl nur für den Scrum Master, die Restzeit in `VOTING`, wenn `deadline` gesetzt ist.
7. Mock-Backend, README, Umsetzungsplan, Glossar, Invarianten, `project-rules/backend.md`.
8. `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `RoundTimerTest`: 204 und Snapshot, `null`, 400 für 4 und 3601, 403, 401 |
| A2 | `SessionTest`: Frist bei Freigabe, Wechsel, Neue Runde; Änderung während `VOTING` ohne Wirkung; `RoundTimerTest`: Frist über `GET` |
| A3 | `SessionRegistryTest`: `revealDue` vor, an und nach der Frist; nach manueller Auflösung und nach Neustart nichts; ohne Stimmen Protokolleintrag; `RoundTimerTest`: Testuhr vorstellen, auf `REVEALED` warten |
| A4 | `RoundTimerSocketTest`: zwei Entwickler-Clients, Scrum Master ohne Verbindung, gleiche `deadline`, `REVEALED` mit Timeout statt fester Pause |
| A5 | `ContractTest`: Pfad, Felder, Format, Version; Typprüfung von `examples.ts`; `make drift` |
| A6 | `round-timer.spec.ts`: Client-Uhr verstellt, „Noch 0:42“, „Zeit abgelaufen“, Takt über Fake-Timer |
| A7 | `round-timer.spec.ts` (E2E): Scrum Master und Entwickler in zwei Kontexten, Scrum Master schließt die Seite; `timer-setting.spec.ts`: sendet den Wert, zeigt den Snapshot-Wert |
| A8 | `make check`, `make e2e` |

Testdaten:
- Backend: Sitzungen über den HTTP-Ablauf (`SessionApiTest`, `RestCalls`) und GitLab über `GitLabStubs`.
- Uhr: eine alternative `Clock` mit `TestClock` per `@TestProfile`. Es wird nicht real gewartet, nur auf das Ergebnis der 250-ms-Prüfung mit Timeout.
- End-to-End: Issue 42 des GitLab-Doubles und die reale Dauer von 15 s.

Contracts zu regenerieren: `make contracts` (`contracts/api/openapi.yaml`,
`frontend/src/app/api/schema.d.ts`).

## Offene Fragen

- [x] Timer als Einstellung der Sitzung (ADR 0006, Option B) statt als Dauer im Befehl, der die Runde startet? → Ja, Sitzungseinstellung. (Morten Möller, 2026-11-16)
- [x] Darf diese Spec `docs/umsetzungsplan.md` (4.3, 4.4, Snapshot-Beispiel, M14) selbst nachziehen? → Ja, im PR; die Person prüft dort. (Morten Möller, 2026-11-16)

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/session/`, `backend/src/test/java/planningpoker/realtime/`, `backend/src/test/java/planningpoker/session/api/`, `frontend/src/app/api/*.spec.ts`, `frontend/src/app/session/*.spec.ts`, `make e2e`
- Browser: Sitzungsraum mit zwei Kontexten (Scrum Master und Entwickler), Timer 15 s, Ablauf ohne Scrum Master
- Aufruf: `make drift`
