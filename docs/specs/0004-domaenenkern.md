---
id: "0004"
title: Domänenkern (M2)
status: Review
risk: high
adrs: ["0002", "0003"]
owner: Morten Möller
created: 2026-11-16
updated: 2026-11-16
pr: ""
note: freigegeben in der Session
---

# Domänenkern (M2)

Meilenstein M2 aus `docs/umsetzungsplan.md`. Deckt ab: die Logik zu R-11, R-14, R-16 bis R-18.
Annahmen: A-02 (Scrum Master schätzt nicht; „alle“ sind die verbundenen Entwickler), A-04
(Issue-Wechsel), A-05 (Protokolleintrag je Auflösung), A-06 (Auswertung), A-08 (Token je
Teilnehmer), A-09 (Verfall nach 12 Stunden), A-10 (getrennte Teilnehmer), A-11 (Nachzügler), A-12
(Karte ändern), A-13 (Namen), A-16 (nach der Bestätigung), A-17 (IDs). Grundlage: Abschnitte 4.2
und 4.3 des Plans.

## Ziel

Die gesamte Fachlogik der Sitzung läuft als reines Java ohne HTTP und ohne GitLab: Sitzung,
Teilnehmer, Runde, Auswertung und Protokoll nach 4.2, jeder Zustandsübergang aus 4.3 als Methode
der Sitzung, die `SessionRegistry` im Arbeitsspeicher mit Sperre je Sitzung, Änderungs-Event und
Verfall, dazu die Erzeugung von Session-ID, Token und Teilnehmer-ID. 0006 bis 0010 rufen nur
noch diese Methoden auf.

## Scope

### Enthalten

- Domänentypen `Session`, `Participant`, `Issue`, `Round`, `RoundStats`, `Vote`, `HistoryEntry` im Paket `planningpoker.session`; `Card`, `Phase`, `Role` bestehen seit 0002.
- Zustandsübergänge aus 4.3 als Methoden von `Session`: Beitreten, Verbinden und Trennen, Issue freigeben und wechseln, Karte wählen, Auflösen, neue Runde, Bestätigung beginnen, abschließen und abbrechen; Rollen- und Phasenprüfung in der Methode; ungültige Übergänge werfen `SessionException` mit dem `ErrorCode` aus 4.4.
- Auswertung nach A-06 in `RoundStats.of(votes)`.
- `allVoted` nach A-02 und A-10: alle verbundenen Entwickler haben gewählt; ohne verbundene Entwickler nie.
- `SessionRegistry` im Arbeitsspeicher: `create`, `find`, `update(sessionId, befehl)` mit Sperre je Sitzung, genau ein Änderungs-Event je erfolgreichem Befehl, Verfall nach `planningpoker.session.ttl`.
- Erzeugung von Session-ID (A-17), Token (mindestens 128 Bit aus `SecureRandom`) und UUIDv7 im Paket `platform`.
- `docs/domain/invariants.md` mit den Regeln und der Stelle im Code, die sie durchsetzt.

### Nicht enthalten

- REST-Endpunkte, Token-Prüfung, Rollen-Interceptor, Mapper auf `SessionView` (0006).
- Laden von Issues aus GitLab (0007); `Session.selectIssue` nimmt ein fertiges `Issue`.
- Versand der Snapshots (0009); hier nur das Event.
- Schreiben nach GitLab (0010); hier nur `beginConfirm`, `finishConfirm`, `failConfirm`.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Sitzung, Teilnehmer, Scrum Master, Entwickler, Rolle, Token, Issue, Vorausgewähltes Issue, Aktives Issue, Freigabe, Issue-Wechsel, Phase, Runde, Karte, Stimme, Abstimmungsstatus, Auflösung, Auswertung, Neue Runde, Bestätigung, Endwert, Protokoll, Protokolleintrag, Befehl, Verbindungsstatus | wie im Glossar |
| Änderungs-Event | CDI-Event `SessionChanged(sessionId)`, das die Registry nach dem Verlassen der Sperre je erfolgreichem Befehl auslöst; `realtime` beobachtet es ab 0009 |
| Verfall | Entfernen einer Sitzung, deren letzte Aktivität länger als `planningpoker.session.ttl` zurückliegt |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Jede Zeile der Tabelle in 4.3 ist ein Test: Freigabe in `LOBBY`, Karte wählen und ändern in `VOTING`, Auflösen, Issue-Wechsel in `VOTING` (Runde verworfen, Runde 1) und in `REVEALED` (Eintrag ohne Endwert bleibt), neue Runde (Nummer plus 1, Karten leer), Bestätigung (`confirming`, dann `LOBBY` ohne aktives Issue, Endwert im Protokoll), Bestätigung fehlgeschlagen (`REVEALED`, `confirming` zurück), Beitreten, Verbinden, Trennen in jeder Phase. | Test `backend/src/test/java/planningpoker/session/SessionTest.java` |
| A2 | Je Phase mindestens ein ungültiger Übergang wirft `SessionException` mit `INVALID_STATE`: Karte in `LOBBY`, Auflösen in `LOBBY`, neue Runde in `VOTING`, Bestätigen in `VOTING`, Karte in `REVEALED`; während `confirming` jede Steuerungsaktion. Rollenverstöße werfen `FORBIDDEN_ROLE`: Entwickler gibt frei, Scrum Master wählt eine Karte. | Test `backend/src/test/java/planningpoker/session/SessionTest.java` |
| A3 | Beitreten: der Ersteller ist `SCRUM_MASTER`, jeder weitere `DEVELOPER`; ein Name, der ohne Beachtung der Groß- und Kleinschreibung vergeben ist, wirft `NAME_TAKEN`; Namen werden getrimmt; Beitreten ist in jeder Phase möglich und in `VOTING` darf der Neue wählen. | Test `backend/src/test/java/planningpoker/session/SessionTest.java` |
| A4 | Auswertung nach A-06: nur `?` und ☕ ergibt leeren Durchschnitt; Gleichstand nennt alle häufigsten Werte in Kartenreihenfolge; gemischte Karten runden den Durchschnitt auf eine Nachkommastelle; eine einzige Stimme; Verteilung nennt nur abgegebene Werte in Kartenreihenfolge. | Test `backend/src/test/java/planningpoker/session/RoundStatsTest.java` |
| A5 | `allVoted` wird wahr, sobald der letzte verbundene Entwickler gewählt hat; ein getrennter Entwickler ohne Stimme blockiert nicht; seine abgegebene Stimme bleibt; ohne verbundene Entwickler bleibt `allVoted` falsch. `Session.vote` meldet, ob der Aufruf `allVoted` von falsch auf wahr gesetzt hat. | Test `backend/src/test/java/planningpoker/session/SessionTest.java` |
| A6 | 50 Entwickler geben gleichzeitig über `SessionRegistry.update(…)` ihre Stimme ab; danach enthält die Runde 50 Stimmen. | Test `backend/src/test/java/planningpoker/session/SessionRegistryTest.java` |
| A7 | Jeder erfolgreiche Befehl über `update(…)` löst genau ein `SessionChanged` aus, nach dem Verlassen der Sperre; ein Befehl, der eine `SessionException` wirft, löst keines aus und lässt den Zustand unverändert. | Test `backend/src/test/java/planningpoker/session/SessionRegistryTest.java` |
| A8 | Eine Sitzung ohne Aktivität seit mehr als `planningpoker.session.ttl` ist nach dem Verfall nicht mehr auffindbar (`find` leer); jeder Befehl setzt `lastActivityAt` aus der `Clock`. | Test `backend/src/test/java/planningpoker/session/SessionRegistryTest.java` |
| A9 | Session-IDs haben 8 Zeichen aus `ABCDEFGHJKMNPQRSTUVWXYZ23456789`; Tokens haben mindestens 128 Bit Zufall (32 Zeichen Base64url ohne Padding aus 24 Bytes `SecureRandom` oder mehr); UUIDv7 trägt Version 7 und Variante 2, zwei kurz nacheinander erzeugte sind zeitlich geordnet. | Test `backend/src/test/java/planningpoker/platform/IdsTest.java` |
| A10 | `docs/domain/invariants.md` nennt die Regeln aus 4.3, A-02, A-06, A-13 und 6 (Nebenläufigkeit) mit Klasse und Methode. | Aufruf |

## Contracts

keine. Die DTOs und `contracts/api/openapi.yaml` ändern sich nicht; der Mapper von `Session` auf
`SessionView` kommt mit 0006.

## Risiko

Stufe: high
Begründung: `backend/src/main/java/planningpoker/session/` und `platform/` sind medium (kein
Muster); der Eskalator `token` greift über die Token-Erzeugung und `Participant.token`. Keine
Contracts, keine Manifeste. Tests und `docs/` low.
Gates: G0 und G1 in dieser Session. G2: Label `human-approved`. G3: Status `verified`. Reviews:
Code, Sicherheit, Architektur.
ADR nötig: nein, weil ADR 0002 (Arbeitsspeicher, Sperre je Sitzung) und ADR 0003 (Token, IDs) die
Entscheidungen festlegen und diese Spec ihnen folgt.

## Umsetzung

Entscheidungen:

- Keine neuen Abhängigkeiten. Verfall ohne `quarkus-scheduler`: `find` entfernt eine verfallene Sitzung beim Zugriff, ein Vert.x-Timer (`io.vertx.mutiny.core.Vertx`, alle 10 Minuten) räumt die übrigen auf.
- `SessionException(ErrorCode, detail)` im Paket `session` verwendet `planningpoker.platform.ErrorCode` (Antwort auf den Review-Hinweis zu 0002: die Codes bleiben in `platform`, weil sie Teil des Fehlerformats sind; `session` darf `platform` nutzen). 0006 bildet `SessionException` auf `ApiException` ab.
- `Session` ist das veränderliche Aggregat; nur seine Methoden ändern den Zustand (A1.4). Die Registry hält je Sitzung einen `ReentrantLock`; `update` führt den Befehl unter der Sperre aus, setzt `lastActivityAt`, gibt die Sperre frei und löst dann `SessionChanged` aus. Zeit kommt aus einer `Clock`-Bean (`platform.ClockProducer`, `Clock.systemUTC()`), Tests bauen die Registry mit `Clock.fixed`.
- Bestätigung in drei Schritten (4.3): `beginConfirm(scrumMasterId, card)` setzt `confirming` und liefert die Daten für GitLab (Issue, Rundennummer, Auswertung); `finishConfirm(card)` schreibt den Endwert und geht nach `LOBBY` (`activeIssue`, `round`, `preselectedIssueIid` leer); `failConfirm()` setzt `confirming` zurück.
- UUIDv7 eigene Implementierung in `platform.UuidV7` (48 Bit Millisekunden, 12 Bit Zähler je Millisekunde, 62 Bit Zufall), weil Java 21 keine liefert.

Dateien:

- `backend/src/main/java/planningpoker/session/Session.java`: neu, Aggregat mit den Methoden aus 4.3, `allVoted()`, `touch(Instant)`
- `backend/src/main/java/planningpoker/session/Participant.java`: neu, `id`, `name`, `role`, `token`, `connected`
- `backend/src/main/java/planningpoker/session/Issue.java`: neu, Record `iid`, `title`, `description`, `webUrl`
- `backend/src/main/java/planningpoker/session/Round.java`: neu, `number`, `votes`, `revealed`, `confirming`, `stats`
- `backend/src/main/java/planningpoker/session/Vote.java`: neu, Record `participantId`, `name`, `card`
- `backend/src/main/java/planningpoker/session/RoundStats.java`: neu, Record `distribution` (Liste `CardCount`), `average` (`OptionalDouble`), `mostFrequent`; `of(List<Vote>)`
- `backend/src/main/java/planningpoker/session/HistoryEntry.java`: neu, `issueIid`, `issueTitle`, `roundNumber`, `votes`, `stats`, `finalCard` (`Optional<Card>`), `revealedAt`
- `backend/src/main/java/planningpoker/session/SessionException.java`: neu, `ErrorCode` und `detail`
- `backend/src/main/java/planningpoker/session/SessionChanged.java`: neu, Record `sessionId`
- `backend/src/main/java/planningpoker/session/SessionConfig.java`: neu, `@ConfigMapping(prefix = "planningpoker.session")`, `ttl`
- `backend/src/main/java/planningpoker/session/SessionRegistry.java`: neu, `create`, `find`, `update`, `expire`, Sperre je Sitzung, Event
- `backend/src/main/java/planningpoker/session/SessionRegistryProducer.java`: neu, CDI-Producer mit `Clock`, `SessionConfig`, `Event<SessionChanged>`, Vert.x-Timer
- `backend/src/main/java/planningpoker/platform/Ids.java`: neu, `sessionId()`, `token()`
- `backend/src/main/java/planningpoker/platform/UuidV7.java`: neu, `next()`
- `backend/src/main/java/planningpoker/platform/ClockProducer.java`: neu, `Clock.systemUTC()`
- `backend/src/test/java/planningpoker/session/SessionBuilder.java`: neu, Builder mit Standardwerten (Scrum Master, zwei Entwickler, Issue), nur Werte des Tests
- `backend/src/test/java/planningpoker/session/SessionTest.java`: neu, A1, A2, A3, A5
- `backend/src/test/java/planningpoker/session/RoundStatsTest.java`: neu, A4, tabellengetrieben
- `backend/src/test/java/planningpoker/session/SessionRegistryTest.java`: neu, A6, A7, A8
- `backend/src/test/java/planningpoker/platform/IdsTest.java`: neu, A9
- `docs/domain/invariants.md`: neu, A10
- `project-rules/backend.md`: ändern, Abschnitt Data (Registry, Event, Verfall, `SessionException`)

Schritte:

1. Records `Issue`, `Vote`, `RoundStats` mit `of(...)` nach A-06 (Durchschnitt über Zahlenkarten auf eine Nachkommastelle, `OptionalDouble`; häufigste Werte bei Gleichstand alle, in Kartenreihenfolge; Verteilung nur abgegebene Karten in Kartenreihenfolge).
2. `Participant`, `Round`, `HistoryEntry`, `SessionException`, `SessionChanged`.
3. `Session` mit `join(name, role)`, `connect(id)`, `disconnect(id)`, `selectIssue(actorId, issue)`, `vote(actorId, card)` (liefert `boolean allVotedNow`), `reveal(actorId)`, `restart(actorId)`, `beginConfirm(actorId, card)`, `finishConfirm(card)`, `failConfirm()`, `allVoted()`, `touch(now)`; Rollenprüfung über den Teilnehmer zu `actorId` (`FORBIDDEN_ROLE`), Phasenprüfung (`INVALID_STATE`), Namensregel (`NAME_TAKEN`), `confirming` sperrt jede Steuerungsaktion.
4. `Ids`, `UuidV7`, `ClockProducer`; `SessionConfig`; `SessionRegistry` mit `ConcurrentHashMap<String, Entry(session, lock)>`, `create(gitlabProjectId, issueIid, creatorName)` liefert Sitzung und Teilnehmer mit Token, `find(id)` mit Verfallsprüfung, `update(id, Function<Session, R>)` mit Sperre, `touch`, Event nach `unlock`; `expire(now)`; `SessionRegistryProducer` mit Vert.x-Timer.
5. Tests: `SessionBuilder`; `SessionTest` je Tabellenzeile und je ungültigem Übergang; `RoundStatsTest` tabellengetrieben; `SessionRegistryTest` mit `ExecutorService` (50 Stimmen), Event-Zähler als `Consumer<SessionChanged>`, `Clock.fixed` und Verfall; `IdsTest`.
6. `docs/domain/invariants.md`; `project-rules/backend.md` Abschnitt Data nachziehen.
7. `make check`; `make e2e` unverändert.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `backend/src/test/java/planningpoker/session/SessionTest.java`: eine Methode je Zeile der Tabelle 4.3 |
| A2 | `backend/src/test/java/planningpoker/session/SessionTest.java`: ungültige Übergänge je Phase, `confirming`, Rollenverstöße |
| A3 | `backend/src/test/java/planningpoker/session/SessionTest.java`: Rollen beim Beitreten, Namensregeln, Nachzügler |
| A4 | `backend/src/test/java/planningpoker/session/RoundStatsTest.java`: nur `?` und ☕, Gleichstand, gemischt, eine Stimme, Reihenfolge |
| A5 | `backend/src/test/java/planningpoker/session/SessionTest.java`: `allVoted` mit getrenntem Entwickler, ohne Entwickler, Rückgabewert von `vote` |
| A6 | `backend/src/test/java/planningpoker/session/SessionRegistryTest.java`: 50 parallele Stimmen |
| A7 | `backend/src/test/java/planningpoker/session/SessionRegistryTest.java`: Event-Zähler je Befehl, keines bei Ausnahme, Zustand unverändert |
| A8 | `backend/src/test/java/planningpoker/session/SessionRegistryTest.java`: Verfall mit `Clock.fixed` |
| A9 | `backend/src/test/java/planningpoker/platform/IdsTest.java`: Alphabet und Länge, Token-Länge und Zufall, UUIDv7-Bits und Ordnung |
| A10 | Aufruf: Datei vorhanden, jede Regel mit Klasse und Methode |

Testdaten: `SessionBuilder` im Testpaket; keine Sitzungen über HTTP.

Contracts zu regenerieren: keine.

## Offene Fragen

- [ ] keine

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/session/`, `backend/src/test/java/planningpoker/platform/`
- Browser: keiner
- Aufruf: `docs/domain/invariants.md` (A10)
