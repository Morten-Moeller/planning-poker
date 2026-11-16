---
id: "0009"
title: Echtzeit (M6)
status: done
risk: high
adrs: ["0003", "0004"]
owner: Morten Möller
created: 2026-11-16
updated: 2026-11-16
pr: "#10"
note: alle Kriterien erfüllt
---

# Echtzeit (M6)

Meilenstein M6 aus `docs/umsetzungsplan.md`. Deckt ab: R-12, R-13, R-22 auf der Serverseite.
Annahmen: A-02 und A-10 (verbundene Entwickler, Wiedereinstieg mit Token), A-08 (Token in der
ersten Nachricht). Grundlage: Abschnitte 4.5 und 4.6 des Plans, der Vertrag aus 0002 (Schemas
`WebSocketAuth`, `WebSocketSessionState`, `WebSocketRoundAllVoted`, `WebSocketError`,
`WebSocketPing`, `WebSocketPong`), die Registry aus 0004, der Mapper aus 0006 und das Ereignis
`RoundCompleted` aus 0008.

## Ziel

Jede Zustandsänderung erreicht alle verbundenen Teilnehmer innerhalb einer Sekunde als
gefilterter Snapshot `session.state`. Der WebSocket-Endpunkt `/ws/sessions/{sessionId}` prüft das
Token in der ersten Nachricht `auth`, setzt `connected` beim Öffnen und Schließen über die
Registry, sendet `round.allVoted` nur an den Scrum Master und antwortet auf `ping` mit `pong`.
Neue Befehle brauchen keinen Code in `realtime`: es hört nur auf `SessionChanged` und
`RoundCompleted`.

## Scope

### Enthalten

- Paket `planningpoker.realtime` mit `quarkus-websockets-next`: Endpunkt `/ws/sessions/{sessionId}`, `auth`-Handshake, Verbindungsregister je Sitzung, Versand der Snapshots, `round.allVoted`, `ping`/`pong`, Schließen nicht authentifizierter Verbindungen nach Ablauf der Frist.
- `connected` über `SessionRegistry.update(…)` beim erfolgreichen `auth` und beim Schließen (A-10); eine verfallene oder unbekannte Sitzung beim Schließen wird ignoriert.
- `Session.participantByToken(token)` als Domänenmethode; `ActorFilter` nutzt sie (eine Stelle für den Tokenvergleich).
- Konfiguration `planningpoker.realtime.auth-timeout` (Standard `5s`) als `@ConfigMapping` mit Standardwert, damit die Frist testbar ist.
- WebSocket-Tests mit zwei Clients (Quarkus-WebSocket-Client), die auf Nachrichten mit Timeout warten.

### Nicht enthalten

- Frontend-Anbindung (0005 liefert den `RealtimeService`, 0012 die Anzeige).
- README-Abschnitt „Schnittstellen“ (0010 ändert das README in dieser Welle; der Hinweis „Umsetzung ab Spec 0009“ fällt mit 0015).
- Vertragsänderungen: die Nachrichten stehen seit 0002 im Vertrag.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Snapshot, Teilnehmer, Scrum Master, Entwickler, Token, Verbindungsstatus, Sitzung, Rundenabschluss, Befehl | wie im Glossar |
| Verbindung | eine offene WebSocket-Verbindung; nach `auth` einem Teilnehmer zugeordnet |
| Verbindungsregister | Zuordnung Sitzungs-ID zu offenen Verbindungen mit Teilnehmer-ID, nur in `realtime` |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Nach einem gültigen `auth` erhält die Verbindung als erste Nachricht `session.state` mit dem für den Teilnehmer gefilterten Snapshot (`me.participantId` ist der Teilnehmer des Tokens); tritt ein weiterer Teilnehmer per REST bei, erhält ein verbundener Client innerhalb einer Sekunde ein neues `session.state` mit dem neuen Teilnehmer. | Test `backend/src/test/java/planningpoker/realtime/SessionSocketTest.java` |
| A2 | Nach einer Stimmabgabe per REST sehen andere verbundene Clients im Snapshot `hasVoted` `true` für den Wähler, `round.votes` `null` und `myVote` `null` beziehungsweise die eigene Karte; der Wähler sieht `myVote` mit seiner Karte. | Test `backend/src/test/java/planningpoker/realtime/SessionSocketTest.java` |
| A3 | Nach der Auflösung erhalten alle Clients dieselben `round.votes` und `round.stats`. | Test `backend/src/test/java/planningpoker/realtime/SessionSocketTest.java` |
| A4 | `round.allVoted` mit `roundNumber` kommt genau einmal beim Scrum Master an, wenn der letzte verbundene Entwickler gewählt hat; ein Entwickler erhält es nie; eine Kartenänderung danach sendet es nicht erneut. | Test `backend/src/test/java/planningpoker/realtime/SessionSocketTest.java` |
| A5 | Eine Verbindung mit unbekanntem Token erhält `error` mit `errorCode` `UNAUTHORIZED` und wird geschlossen; eine unbekannte Sitzung `SESSION_NOT_FOUND`; eine Verbindung ohne `auth` innerhalb der Frist wird ohne Snapshot geschlossen; eine zweite Nachricht vor `auth` außer `auth` wird mit `error` beantwortet. | Test `backend/src/test/java/planningpoker/realtime/SessionSocketTest.java` |
| A6 | `ping` wird mit `pong` beantwortet; nach dem Schließen einer Verbindung sehen die anderen den Teilnehmer mit `connected` `false`; verbindet er sich mit demselben Token neu, sehen alle `connected` `true` und er erhält den aktuellen Snapshot (A-10). | Test `backend/src/test/java/planningpoker/realtime/SessionSocketTest.java` |
| A7 | Das Token steht nie in der URL; der Endpunkt nimmt es nur aus der Nachricht `auth`; die Nachrichten tragen die Hülle `{ "type", "payload" }` mit den Typen aus dem Vertrag. | Test `backend/src/test/java/planningpoker/realtime/SessionSocketTest.java` |

## Contracts

keine. Die Nachrichten entsprechen den Schemas in `contracts/api/openapi.yaml` aus 0002; der
Test prüft die Hülle und die `type`-Werte gegen den Vertrag.

## Risiko

Stufe: high
Begründung: `backend/src/main/java/planningpoker/realtime/` ist medium (kein Muster); der
Eskalator `token` greift über den `auth`-Handshake; Authentifizierung ist nach
`harness/policies/risk.md` high. Keine Contracts, keine Manifeste.
Gates: G0 und G1 in dieser Session. G2: Label `human-approved`. G3: Status `verified`. Reviews:
Code, Sicherheit, Architektur.
ADR nötig: nein, weil ADR 0004 (WebSocket mit vollständigem Snapshot) und ADR 0003 (Token in
der ersten Nachricht) die Entscheidungen festlegen und diese Spec ihnen folgt.

## Umsetzung

Entscheidungen:

- Keine neuen Abhängigkeiten: `quarkus-websockets-next` (Server und Client für Tests) seit 0001.
- Neuer Konfigurationsschlüssel `planningpoker.realtime.auth-timeout` (Standard `5s`, Abschnitt 4.5) im `@ConfigMapping` `RealtimeConfig`; dokumentiert in `project-rules/backend.md`, README-Zeile mit 0015.
- `realtime` beobachtet `SessionChanged` und `RoundCompleted` synchron im Thread des Befehls (ADR 0002); Senden über `WebSocketConnection.sendText` ohne Warten; eine fehlgeschlagene Sendung schließt nur diese Verbindung. Der Snapshot je Verbindung entsteht unter `SessionRegistry.read` mit dem Mapper aus 0006.
- Tokenvergleich in `Session.participantByToken(token)` (konstante Zeit); `ActorFilter` ruft sie statt der eigenen Schleife.
- Die Auth-Frist läuft als Vert.x-Timer je Verbindung; ein erfolgreiches `auth` löscht ihn.

Dateien:

- `backend/src/main/java/planningpoker/realtime/RealtimeConfig.java`: neu, `@ConfigMapping(prefix = "planningpoker.realtime")`, `authTimeout`
- `backend/src/main/java/planningpoker/realtime/WsMessage.java`: neu, Hülle `type`, `payload` und die Payload-Records (`Auth`, `AllVoted`, `Error`)
- `backend/src/main/java/planningpoker/realtime/ConnectionRegistry.java`: neu, Verbindungen je Sitzung mit Teilnehmer-ID und Rolle
- `backend/src/main/java/planningpoker/realtime/SessionSocket.java`: neu, `@WebSocket(path = "/ws/sessions/{sessionId}")`, `@OnOpen`, `@OnTextMessage`, `@OnClose`, `auth`, `ping`
- `backend/src/main/java/planningpoker/realtime/SnapshotBroadcaster.java`: neu, `@Observes SessionChanged` und `@Observes RoundCompleted`
- `backend/src/main/java/planningpoker/session/Session.java`: ändern, `participantByToken`
- `backend/src/main/java/planningpoker/session/ActorFilter.java`: ändern, nutzt `participantByToken`
- `backend/src/test/java/planningpoker/realtime/SessionSocketTest.java`: neu, A1 bis A7
- `backend/src/test/java/planningpoker/realtime/SocketClient.java`: neu, Test-Client mit Nachrichtenwarteschlange und `await(type, timeout)`
- `backend/src/test/java/planningpoker/realtime/RestCalls.java`: neu, Hilfen für Erstellen, Beitreten, Freigeben, Stimme, Auflösen per REST Assured (eigenes Paket, `SessionApiTest` ist paketprivat)
- `project-rules/backend.md`: ändern, Abschnitt zu `realtime` (Register, Beobachter, Frist, Schlüssel)
- `docs/domain/invariants.md`: ändern, Regeln zu Verbindung, `auth` und Versand

Schritte:

1. `RealtimeConfig`, `WsMessage` (Jackson-Serialisierung mit `@JsonInclude(NON_NULL)` für `payload`), `ConnectionRegistry` (`ConcurrentHashMap<String, Set<Entry>>`).
2. `Session.participantByToken` mit `MessageDigest.isEqual`; `ActorFilter` umstellen.
3. `SessionSocket`: `@OnOpen` startet den Timer (`vertx.setTimer`), `@OnTextMessage` liest `type`; `auth` ohne vorherige Zuordnung: Sitzung über `registry.read`, Teilnehmer über `participantByToken`, Fehler als `error` und `close`; Erfolg: Timer löschen, Verbindung registrieren, `registry.update(id, s -> s.connect(pid))` (das Ereignis sendet den ersten Snapshot an alle, auch an die neue Verbindung); `ping` nach `auth` mit `pong`; andere Typen vor `auth` mit `error`. `@OnClose`: Verbindung austragen, `registry.update(id, s -> s.disconnect(pid))`, `SessionException` ignorieren.
4. `SnapshotBroadcaster`: bei `SessionChanged` unter `registry.read` je Verbindung `mapper.toView(session, pid)` und senden; bei `RoundCompleted` `round.allVoted` nur an Verbindungen mit Rolle `SCRUM_MASTER`.
5. Tests: `SocketClient` auf Basis von `BasicWebSocketConnector` (Quarkus) mit `BlockingQueue<JsonNode>`; `RestCalls`; `SessionSocketTest` mit `WireMockGitLab` und Stub für Issue 42 (eigene Stub-Hilfe im Testpaket, weil `GitLabStubs` paketprivat ist), Frist über `@TestProfile` oder Konfigurationsüberschreibung auf `1s`; Fälle A1 bis A7, jedes Warten mit Timeout und Hinweis auf die erwartete Nachricht (T4.3).
6. `project-rules/backend.md` und `invariants.md`; `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `backend/src/test/java/planningpoker/realtime/SessionSocketTest.java`: erster Snapshot nach `auth`, Beitritt innerhalb einer Sekunde beim anderen Client |
| A2 | `backend/src/test/java/planningpoker/realtime/SessionSocketTest.java`: Snapshots nach einer Stimme je Rolle |
| A3 | `backend/src/test/java/planningpoker/realtime/SessionSocketTest.java`: Snapshots nach der Auflösung gleich |
| A4 | `backend/src/test/java/planningpoker/realtime/SessionSocketTest.java`: `round.allVoted` einmal beim Scrum Master, nie beim Entwickler, nicht nach Kartenänderung |
| A5 | `backend/src/test/java/planningpoker/realtime/SessionSocketTest.java`: unbekanntes Token, unbekannte Sitzung, keine `auth` in der Frist, Nachricht vor `auth` |
| A6 | `backend/src/test/java/planningpoker/realtime/SessionSocketTest.java`: `ping`/`pong`, Trennen und Wiedereinstieg |
| A7 | `backend/src/test/java/planningpoker/realtime/SessionSocketTest.java`: Hülle und `type`-Werte gegen `contracts/api/openapi.yaml` |

Testdaten: Sitzungen über REST mit zufälligem Namenszusatz; GitLab-Stub für Issue 42.

Contracts zu regenerieren: keine.

## Offene Fragen

- [ ] keine

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/realtime/`, `backend/src/test/java/planningpoker/session/`, `make e2e` (`health.spec.ts`)
- Browser: keiner
