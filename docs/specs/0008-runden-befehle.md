---
id: "0008"
title: Runden-Befehle (M5, Teil 2)
status: approved
risk: medium
adrs: ["0002"]
owner: Morten Möller
created: 2026-11-16
updated: 2026-11-16
pr: ""
note: freigegeben in der Session
---

# Runden-Befehle (M5, Teil 2)

Zweiter Teil von Meilenstein M5 aus `docs/umsetzungsplan.md`. Deckt ab: R-11 bis R-19 auf der
Serverseite (Karte wählen, Fortschritt, Hinweis an den Scrum Master als Ereignis, Auflösen,
Auswertung, neue Runde, Protokoll). Annahmen: A-02 (nur verbundene Entwickler zählen), A-04
(Issue-Wechsel nach der Auflösung), A-05 (Protokoll), A-10 (getrennte Teilnehmer), A-11
(Nachzügler), A-12 (Karte ändern). Grundlage: Abschnitte 4.3 und 4.4 des Plans, die Domäne aus
0004 und die Grenze aus 0006.

## Ziel

Der vollständige Ablauf von der Freigabe bis zur neuen Runde ist per REST steuerbar: Entwickler
wählen und ändern ihre Karte, der Scrum Master löst jederzeit auf und startet eine neue Runde,
jede Auflösung landet im Protokoll. Wählt der letzte verbundene Entwickler, löst der Server das
Ereignis `RoundCompleted` aus, das 0009 als `round.allVoted` an den Scrum Master sendet.

## Scope

### Enthalten

- `PUT /api/sessions/{id}/vote`: `Session.vote` unter der Sperre; 204; liefert `Session.vote` wahr, feuert die Ressource `RoundCompleted(sessionId, roundNumber)`.
- `POST /api/sessions/{id}/round/reveal`: `Session.reveal` unter der Sperre; 204.
- `POST /api/sessions/{id}/round/restart`: `Session.restart` unter der Sperre; 204.
- Fehlerfälle über die Domäne: 409 `INVALID_STATE` in der falschen Phase oder während `confirming`, 403 `FORBIDDEN_ROLE` über den Filter.
- Integrationstests für den Ablauf freigeben, drei Stimmen, auflösen, neue Runde, auflösen; Auflösen mit einer von drei Stimmen; Issue-Wechsel nach der Auflösung.

### Nicht enthalten

- Bestätigen und Kommentar nach GitLab (0010).
- WebSocket, `connected` über die Verbindung, Versand von `session.state` und `round.allVoted` (0009); die Tests dieser Spec setzen `connected` über die Registry, bis 0009 die Verbindung liefert.
- Frontend (0012 bis 0014); Vertragsänderungen (Endpunkte und Antworten stehen seit 0002 und 0006).

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Runde, Karte, Stimme, Abstimmungsstatus, Auflösung, Auswertung, Neue Runde, Protokoll, Protokolleintrag, Phase, Scrum Master, Entwickler, Verbindungsstatus, Befehl, Snapshot | wie im Glossar |
| Rundenabschluss | CDI-Ereignis `RoundCompleted(sessionId, roundNumber)`, genau einmal, wenn der letzte verbundene Entwickler gewählt hat; 0009 sendet daraus `round.allVoted` |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Ein Entwickler wählt in `VOTING` eine Karte: 204; sein Snapshot zeigt `round.myVote` mit der Karte, der Snapshot des Scrum Masters und anderer Entwickler zeigt für ihn `hasVoted` `true` und keinen Wert (`votes` `null`, `myVote` `null` oder die eigene Karte); eine zweite Wahl ersetzt die Karte (A-12). | Test `backend/src/test/java/planningpoker/session/RoundCommandsTest.java` |
| A2 | Eine Karte in `LOBBY` oder `REVEALED` antwortet 409 `INVALID_STATE`; der Scrum Master erhält 403; eine Karte außerhalb des Kartensatzes 400 `INVALID_CARD` (bestehender Test). | Test `backend/src/test/java/planningpoker/session/RoundCommandsTest.java`, `SessionResourceTest.java` |
| A3 | Auflösen in `VOTING` als Scrum Master: 204; danach sehen alle `phase` `REVEALED`, `round.votes` mit `participantId`, `name`, `card` je abgegebener Stimme und `round.stats` (Verteilung in Kartenreihenfolge, Durchschnitt, häufigste Werte); mit einer von drei Stimmen enthält `votes` nur diese, die anderen haben `hasVoted` `false`; Auflösen in `LOBBY` oder `REVEALED` antwortet 409; ein Entwickler erhält 403. | Test `backend/src/test/java/planningpoker/session/RoundCommandsTest.java` |
| A4 | Neue Runde in `REVEALED`: 204; danach `phase` `VOTING`, `round.number` um 1 erhöht, `myVote` `null`, `hasVoted` `false` für alle, `votes` und `stats` `null`; in `VOTING` oder `LOBBY` antwortet 409; ein Entwickler erhält 403. | Test `backend/src/test/java/planningpoker/session/RoundCommandsTest.java` |
| A5 | Protokoll: nach der Auflösung steht `history[0]` mit `issueIid`, `issueTitle`, `roundNumber`, `votes`, `stats`, `finalCard` `null` und `revealedAt` (RFC 3339); nach neuer Runde und zweiter Auflösung zwei Einträge, neueste zuerst; ein Issue-Wechsel in `REVEALED` behält den Eintrag ohne Endwert und startet Runde 1 ohne Stimmen (A-04). | Test `backend/src/test/java/planningpoker/session/RoundCommandsTest.java` |
| A6 | `round.allVoted` wird `true`, sobald der letzte verbundene Entwickler gewählt hat; genau dann feuert `RoundCompleted` einmal mit der Rundennummer; ohne verbundene Entwickler bleibt `allVoted` `false` und kein Ereignis feuert; eine Kartenänderung nach der Vollständigkeit feuert nicht erneut. | Test `backend/src/test/java/planningpoker/session/RoundCommandsTest.java` (Beobachter im Testpaket) |
| A7 | Ablauf: freigeben, drei Stimmen, auflösen, neue Runde, drei Stimmen, auflösen: `round.number` 2, zwei Protokolleinträge, Auswertung je Runde korrekt. | Test `backend/src/test/java/planningpoker/session/RoundCommandsTest.java` |

## Contracts

keine. `contracts/api/openapi.yaml` ändert sich nicht.

## Risiko

Stufe: medium
Begründung: `backend/src/main/java/planningpoker/session/` ist medium (kein Muster); keine
Contracts, keine Manifeste; der Code dieser Spec vermeidet die Eskalator-Wörter. Tests und
`docs/` low.
Gates: G0 und G1 in dieser Session. G2: Label `human-approved`. G3 bei medium nicht gefordert;
`implement` führt `verify` trotzdem aus. Reviews: Code, Sicherheit.
ADR nötig: nein, weil ADR 0002 (Befehle unter der Sperre, Ereignis danach) die Entscheidung
festlegt und diese Spec ihr folgt.

## Umsetzung

Entscheidungen:

- Keine neuen Abhängigkeiten, keine Vertragsänderung.
- Neues CDI-Ereignis `RoundCompleted(sessionId, roundNumber)` im Paket `session`, gefeuert von `SessionResource.vote` nach `registry.update`, wenn `Session.vote` wahr liefert (A1.4: die Domäne entscheidet, die Grenze meldet); `SessionChanged` bleibt unverändert.
- Die Tests setzen `connected` der Entwickler über `SessionRegistry.update(id, s -> s.connect(...))`, weil die Verbindung erst mit 0009 per WebSocket entsteht; ein Beobachter im Testpaket zählt `RoundCompleted`.

Dateien:

- `backend/src/main/java/planningpoker/session/RoundCompleted.java`: neu, Record `sessionId`, `roundNumber`
- `backend/src/main/java/planningpoker/session/SessionResource.java`: ändern, `vote`, `revealRound`, `restartRound` umgesetzt, `Event<RoundCompleted>`
- `backend/src/test/java/planningpoker/session/RoundCommandsTest.java`: neu, A1 bis A7
- `backend/src/test/java/planningpoker/session/RoundCompletedObserver.java`: neu, `@ApplicationScoped` Beobachter mit Zähler je Sitzung
- `backend/src/test/java/planningpoker/session/SessionResourceTest.java`: ändern, `vote`, `revealRound`, `restartRound` aus der 501-Liste
- `project-rules/backend.md`: ändern, Abschnitt Data (Ereignis `RoundCompleted`)
- `docs/domain/invariants.md`: ändern, Regel zum Rundenabschluss

Schritte:

1. `RoundCompleted`; `SessionResource.vote`: `Actor` aus dem Kontext, `boolean completed = registry.update(id, s -> s.vote(actor.participantId(), request.card()))`, bei `completed` `roundCompleted.fire(new RoundCompleted(id, roundNumber))` mit der Rundennummer aus `registry.read`; 204. `revealRound` und `restartRound` analog mit `s.reveal(...)` und `s.restart(...)`.
2. `RoundCompletedObserver` im Testpaket (`@Observes RoundCompleted`, `ConcurrentHashMap` Sitzung zu Liste der Rundennummern, `reset()`).
3. `RoundCommandsTest` mit `WireMockGitLab` und `GitLabStubs`: Sitzung mit Scrum Master und drei Entwicklern über die API, Freigabe über `active-issue`; Fälle A1 bis A7; `connected` über die injizierte `SessionRegistry`.
4. `SessionResourceTest`: `stubEndpoints` nur noch `confirm`; `securedEndpoints` um `vote`, `reveal`, `restart` ergänzt (403 und 401 bleiben).
5. `project-rules/backend.md` und `invariants.md` nachziehen; `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `backend/src/test/java/planningpoker/session/RoundCommandsTest.java`: Karte wählen, Snapshots beider Rollen, Karte ändern |
| A2 | `backend/src/test/java/planningpoker/session/RoundCommandsTest.java`: `LOBBY`, `REVEALED`, Scrum Master; `SessionResourceTest.java`: `INVALID_CARD` |
| A3 | `backend/src/test/java/planningpoker/session/RoundCommandsTest.java`: Auflösen mit drei und mit einer Stimme, falsche Phase, Entwickler |
| A4 | `backend/src/test/java/planningpoker/session/RoundCommandsTest.java`: neue Runde, falsche Phase, Entwickler |
| A5 | `backend/src/test/java/planningpoker/session/RoundCommandsTest.java`: Protokoll nach einer und zwei Auflösungen, Issue-Wechsel in `REVEALED` |
| A6 | `backend/src/test/java/planningpoker/session/RoundCommandsTest.java`: `allVoted` und `RoundCompleted` mit verbundenen, ohne verbundene Entwickler, Kartenänderung danach |
| A7 | `backend/src/test/java/planningpoker/session/RoundCommandsTest.java`: Gesamtablauf |

Testdaten: Sitzungen über die API mit zufälligem Namenszusatz; GitLab-Stubs aus `GitLabStubs`.

Contracts zu regenerieren: keine.

## Offene Fragen

- [ ] keine

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/session/`, `make e2e` (`health.spec.ts`)
- Browser: keiner
