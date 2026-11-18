---
id: "0034"
title: Erneut schätzen startet sofort
status: done
risk: high
adrs: ["0012"]
owner: Morten Möller
created: 2026-11-17
updated: 2026-11-17
pr: "#34"
note: alle Kriterien erfüllt
---

# Erneut schätzen startet sofort

Rückmeldung der Person aus dem Test: Nach „Neue Runde“ erschien nur wieder „Schätzung starten“,
das hat verwirrt. Bezug: R-18 (neue Runde für dasselbe Issue), ADR 0012 (ersetzt einen Punkt aus
ADR 0010). Die Spec hängt ab von 0033, weil beide `Session`, `SessionResource` und den Vertrag
ändern.

## Ziel

Nach der Auflösung klickt der Scrum Master „↻ Erneut schätzen“. Die neue Runde startet sofort mit
offenen Karten, und ein eingestellter Timer läuft.

## Scope

### Enthalten

- **Backend:** `Session.restart` in `REVEALED` erhöht die Rundennummer, löscht die Stimmen, setzt die Frist (`timerSeconds` wie bei „Schätzung starten“) und wechselt nach `VOTING`. Alle Prüfungen bleiben: Rolle, `confirming`, Phase.
- **Vertrag:** Die Beschreibung von `POST …/round/restart` ändert sich, die Felder nicht. `info.version` ist `3.3.0`.
- **Frontend:**
  - „↻ Neue Runde“ wird „↻ Erneut schätzen“, die Testid `round-restart` bleibt.
  - Der Hinweis für Entwickler in der aufgedeckten Ansicht wird „Der Scrum Master lässt erneut schätzen oder übernimmt das Ergebnis.“
  - Das Mock-Backend wechselt nach `VOTING`.
- **Doku:**
  - Umsetzungsplan 4.3 („REVEALED → Erneut schätzen → VOTING“).
  - Glossar: „Neue Runde“ wird „Erneut schätzen“, der alte Name ist verboten.
  - Invarianten zur Frist, README (Zustandsautomat), `project-rules/frontend.md`.
  - `docs/adr/README.md` mit Zeile 0012, die auf den ersetzten Punkt aus 0010 verweist.

### Nicht enthalten

- Verwerfen einer Runde ohne Spur im Protokoll. Die aufgedeckte Runde bleibt wie bisher ohne Endwert im Protokoll.
- Erneutes Schätzen nach der Übernahme.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Erneut schätzen | Aktion des Scrum Masters aus `REVEALED`: neue Runde für dasselbe Issue, sofort in `VOTING`; ersetzt im Glossar „Neue Runde“ |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `round/restart` aus `REVEALED` ergibt `VOTING` mit Rundennummer plus 1, ohne Stimmen. Mit `timerSeconds: 30` ist die Frist Startzeit plus 30 s, ohne Timer gibt es keine Frist. Aus anderen Phasen und während `confirming` kommt 409, für Entwickler 403. | Unit `backend/src/test/java/planningpoker/session/SessionTest.java`; Test `backend/src/test/java/planningpoker/session/RoundCommandsTest.java`, `RoundTimerTest.java` |
| A2 | Die automatische Auflösung erfasst eine neu gestartete Runde mit Frist wie jede andere `VOTING`-Runde. | Unit `backend/src/test/java/planningpoker/session/SessionRegistryTest.java` |
| A3 | Der Vertrag beschreibt `restartRound` mit Folgephase `VOTING`. `info.version` ist `3.3.0`, und `make drift` ist grün. | Test `backend/src/test/java/planningpoker/session/api/ContractTest.java`; Aufruf `make drift` |
| A4 | Die aufgedeckte Ansicht zeigt für den Scrum Master „↻ Erneut schätzen“ und für Entwickler den neuen Hinweis. Nach dem Klick zeigen Entwickler den offenen Fächer ohne Diskussionshinweis. | Unit `frontend/src/app/session/round-result.spec.ts`, `session-page.spec.ts` |
| A5 | Im Browser mit Timer 15 s: aufgelöst, „Erneut schätzen“, und der Entwickler kann sofort wählen und sieht „Noch 0:1x“. | End-to-End `frontend/e2e/result-round.spec.ts` (Fall angepasst), `frontend/e2e/full-flow.spec.ts` |
| A6 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

`contracts/api/openapi.yaml` und `frontend/src/app/api/schema.d.ts` werden generiert. Es ändert
sich nur die Beschreibung von `restartRound`, die Schemas nicht. Das Verhalten ändert sich:
Die Folgephase ist jetzt `VOTING` statt `DISCUSSION`. Verbraucher ist nur das Frontend dieses
Repositorys, es zieht in derselben Änderung nach. Version `3.2.0` wird `3.3.0`.

## Risiko

Stufe: high
Begründung: `harness/scripts/risk-level.sh` meldet high für `contracts/**`. Dazu ändert sich
das Verhalten des Zustandsautomaten. Code unter `backend/src/main/` und `frontend/src/app/` ist
medium.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`, G3 über den Status
`verified`. Reviews: Code, Sicherheit, Architektur.
ADR nötig: ja, 0012 (ersetzt einen Punkt aus ADR 0010).

## Umsetzung

Entscheidungen:

- ADR 0012: „Erneut schätzen“ führt aus `REVEALED` direkt nach `VOTING` und setzt die Frist.
- Die Vertragsbeschreibung ändert sich, Version `3.3.0`, nur über `make contracts`.

Dateien:

- `docs/adr/0012-erneut-schaetzen-startet-sofort.md`: neu
- `docs/adr/README.md`: ändern, Zeile 0012
- `backend/src/main/java/planningpoker/session/Session.java`: ändern, `restart` nach `VOTING` mit Frist
- `backend/src/main/java/planningpoker/session/SessionResource.java`: ändern, Startzeit an `restart`, Beschreibung
- `backend/src/main/resources/application.properties`: ändern, `info-version` 3.3.0
- `backend/src/test/java/planningpoker/session/SessionTest.java`: ändern, A1
- `backend/src/test/java/planningpoker/session/RoundCommandsTest.java`: ändern, A1
- `backend/src/test/java/planningpoker/session/RoundTimerTest.java`: ändern, A1
- `backend/src/test/java/planningpoker/session/SessionRegistryTest.java`: ändern, A2
- `backend/src/test/java/planningpoker/session/ConfirmRoundFlow.java`: ändern, falls der Ablauf `startVoting` nach `restart` erwartet
- `backend/src/test/java/planningpoker/session/ConfirmRoundTest.java`: ändern, falls betroffen
- `backend/src/test/java/planningpoker/session/SessionResourceTest.java`: ändern, falls betroffen
- `backend/src/test/java/planningpoker/session/api/ContractTest.java`: ändern, A3
- `contracts/api/openapi.yaml`: ändern, generiert
- `frontend/src/app/api/schema.d.ts`: ändern, generiert
- `frontend/src/app/api/mock/mock-backend.interceptor.ts`: ändern, `restart` nach `VOTING`
- `frontend/src/app/session/round-result.html`: ändern, Text
- `frontend/src/app/session/round-result.spec.ts`: ändern, A4
- `frontend/src/app/session/session-page.spec.ts`: ändern, A4
- `frontend/e2e/result-round.spec.ts`: ändern, A5
- `frontend/e2e/full-flow.spec.ts`: ändern, A5
- `frontend/e2e/design-sidebar.spec.ts`: ändern, falls der Ablauf `startVoting` nach `restart` erwartet
- `README.md`: ändern, Zustandsautomat
- `docs/umsetzungsplan.md`: ändern, 4.3
- `docs/domain/glossary.md`: ändern, Erneut schätzen
- `docs/domain/invariants.md`: ändern, Frist bei Erneut schätzen
- `project-rules/frontend.md`: ändern, Text und Ablauf

Schritte:

1. `Session.restart(actorId, now)` nach `VOTING` mit Frist, `SessionResource` übergibt die Startzeit, die Beschreibung ändert sich.
2. Backend-Tests, `info-version`, `make contracts`, `ContractTest`.
3. Frontend: Text, Hinweis, Mock-Backend. Die E2E-Abläufe verlieren nach `round-restart` den Schritt `startVoting`.
4. Doku, Glossar, Invarianten, ADR-README.
5. `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `SessionTest`, `RoundCommandsTest`, `RoundTimerTest` |
| A2 | `SessionRegistryTest` |
| A3 | `ContractTest`, `make drift` |
| A4 | `round-result.spec.ts`, `session-page.spec.ts` |
| A5 | `result-round.spec.ts`, `full-flow.spec.ts` |
| A6 | `make check`, `make e2e` |

Testdaten: wie bisher (`GitLabStubs`, `TestClock`, GitLab-Double mit Issue 42).

Contracts zu regenerieren: `make contracts` (`contracts/api/openapi.yaml`,
`frontend/src/app/api/schema.d.ts`).

## Offene Fragen

- [x] Was soll nach der Auflösung passieren? → „Erneut schätzen“ statt „Neue Runde“, und die Schätzung startet sofort statt erst wieder „Schätzung starten“ zu zeigen. (Morten Möller, 2026-11-17)

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/session/`, `backend/src/test/java/planningpoker/session/api/`, `frontend/src/app/session/*.spec.ts`, `make e2e`
- Browser: aufgelöste Runde, „Erneut schätzen“ mit Timer, beide Rollen
- Aufruf: `make drift`
