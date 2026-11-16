# Invarianten

Regeln, die in jeder Sitzung gelten, mit der Stelle im Code, die sie durchsetzt. Quelle:
`docs/umsetzungsplan.md`, Abschnitte 4.3 (Zustandsautomat), 6 (Nebenläufigkeit) und die
Annahmen A-02, A-06, A-13. Jede Regel hat einen Test in `backend/src/test/java/planningpoker/`.

## Zustandsautomat (4.3)

| Nr | Regel | Durchgesetzt in | Fehlercode |
|---|---|---|---|
| I1 | Nur der Scrum Master gibt ein Issue frei, löst auf, startet eine neue Runde und bestätigt. | `Session.selectIssue`, `Session.reveal`, `Session.restart`, `Session.beginConfirm` über `requireRole` | `FORBIDDEN_ROLE` |
| I2 | Nur ein Entwickler wählt eine Karte. | `Session.vote` über `requireRole` | `FORBIDDEN_ROLE` |
| I3 | Eine Karte wird nur in `VOTING` gewählt oder geändert (A-12). | `Session.vote` über `requirePhase` | `INVALID_STATE` |
| I4 | Auflösen nur in `VOTING`; die Auswertung entsteht bei der Auflösung, der Protokolleintrag ohne Endwert dazu. | `Session.reveal` | `INVALID_STATE` |
| I5 | Neue Runde und Bestätigung nur in `REVEALED`; die neue Runde trägt Nummer plus 1 und keine Karten. | `Session.restart`, `Session.beginConfirm` über `requirePhase` | `INVALID_STATE` |
| I6 | Die Freigabe eines Issues ist in `LOBBY`, `VOTING` und `REVEALED` möglich und startet Runde 1; eine laufende Runde wird verworfen, ein aufgelöster Eintrag bleibt ohne Endwert im Protokoll (A-04). | `Session.selectIssue` | – |
| I7 | Solange `confirming` gesetzt ist, ist jede Steuerungsaktion abgelehnt. | `Session.selectIssue`, `Session.restart`, `Session.beginConfirm` über `requireNotConfirming`; `Session.vote` und `Session.reveal` über die Phase `REVEALED` | `INVALID_STATE` |
| I8 | `finishConfirm` und `failConfirm` setzen eine laufende Bestätigung voraus. Erfolg: Endwert im jüngsten Protokolleintrag, Phase `LOBBY` ohne aktives Issue, ohne Runde, ohne vorausgewähltes Issue (A-16). Fehler: `confirming` zurück, Phase `REVEALED`. | `Session.finishConfirm`, `Session.failConfirm` über `requireConfirming` | `INVALID_STATE` |
| I9 | Beitreten, Verbinden und Trennen ändern die Phase nicht und sind in jeder Phase möglich (A-11). | `Session.join`, `Session.connect`, `Session.disconnect` | – |
| I10 | Ein unbekannter Teilnehmer führt keinen Befehl aus. | `Session.actor` | `UNAUTHORIZED` |

## Teilnehmer (A-02, A-13)

| Nr | Regel | Durchgesetzt in | Fehlercode |
|---|---|---|---|
| I11 | Der erste Teilnehmer ist der Scrum Master, jeder weitere ein Entwickler. | `Session.join` | – |
| I12 | Namen sind getrimmt, 1 bis 30 Zeichen lang und je Sitzung eindeutig ohne Beachtung der Groß- und Kleinschreibung. Die Grenze prüft die Länge zuerst (`CreateSessionRequest`, `JoinSessionRequest`). | `Session.join` | `VALIDATION_ERROR`, `NAME_TAKEN` |
| I13 | `allVoted` ist wahr, sobald jeder verbundene Entwickler gewählt hat; ohne verbundene Entwickler nie; ein getrennter Entwickler blockiert nicht, seine Stimme bleibt (A-02, A-10). | `Session.allVoted` | – |
| I14 | `Session.vote` meldet genau den Aufruf, der `allVoted` von falsch auf wahr setzt. | `Session.vote` | – |

## Auswertung (A-06)

| Nr | Regel | Durchgesetzt in |
|---|---|---|
| I15 | Die Verteilung nennt nur abgegebene Karten in Kartenreihenfolge. | `RoundStats.of` (`EnumMap` über `Card`) |
| I16 | Der Durchschnitt geht über Zahlenkarten, auf eine Nachkommastelle gerundet; `?` und ☕ zählen nicht; ohne Zahlenkarte ist er leer. | `RoundStats.average` |
| I17 | Die häufigsten Werte nennen bei Gleichstand alle in Kartenreihenfolge. | `RoundStats.of` |

## Nebenläufigkeit (6)

| Nr | Regel | Durchgesetzt in |
|---|---|---|
| I18 | Befehle einer Sitzung laufen nacheinander unter einer Sperre je Sitzung; nur `Session`-Methoden ändern den Zustand (A1.4); Leser gehen über `read` unter dieselbe Sperre. | `SessionRegistry.update`, `SessionRegistry.read` (`ReentrantLock` je `Entry`) |
| I19 | Jeder erfolgreiche Befehl löst genau ein `SessionChanged` aus, nach dem Verlassen der Sperre; ein Befehl mit `SessionException` löst keines aus. | `SessionRegistry.update` |
| I20 | Jeder erfolgreiche Befehl setzt `lastActivityAt` aus der `Clock`; ein abgelehnter Befehl lässt es unverändert. Eine Sitzung ohne Aktivität länger als `planningpoker.session.ttl` verfällt beim Zugriff (`find`, `read`, `update`) oder im Timer (`expire`). | `SessionRegistry.update`, `SessionRegistry.live`, `SessionRegistry.expire`, Timer in `SessionRegistryProducer` |
| I21 | GitLab-Aufrufe laufen nie unter der Sperre: die Bestätigung schützt sich über `confirming` (`beginConfirm` unter der Sperre, GitLab-Aufruf außerhalb, `finishConfirm` oder `failConfirm` unter der Sperre). | `Session.beginConfirm`, `Session.finishConfirm`, `Session.failConfirm`; Aufrufer ab Spec 0010 |

## Grenze (Spec 0006)

| Nr | Regel | Durchgesetzt in | Fehlercode |
|---|---|---|---|
| I25 | Jeder Aufruf außer Erstellen und Beitreten trägt ein Bearer-Token; ohne Token keine Zuordnung. | `platform.BearerTokenFilter` an `@Authenticated` | `UNAUTHORIZED` |
| I26 | Das Token wird dem Teilnehmer der Sitzung aus dem Pfad zugeordnet; ein Token einer anderen Sitzung gilt nicht; eine unbekannte Sitzung antwortet wie eine fehlende. | `session.ActorFilter` über `SessionRegistry.read` | `UNAUTHORIZED`, `SESSION_NOT_FOUND` |
| I27 | Die Rolle des Endpunkts (`@RequiresRole`) wird vor der Methode geprüft; die Domäne prüft sie erneut. | `session.ActorFilter`, `Session.requireRole` | `FORBIDDEN_ROLE` |
| I28 | Kein Snapshot enthält ein Token oder vor der Auflösung eine fremde Karte; `preselectedIssueIid` sieht nur der Scrum Master. | `session.SessionViewMapper` | – |

## Identität (ADR 0003)

| Nr | Regel | Durchgesetzt in |
|---|---|---|
| I22 | Session-IDs haben 8 Zeichen aus `ABCDEFGHJKMNPQRSTUVWXYZ23456789`; eine Kollision wird neu gewürfelt. | `Ids.sessionId`, `SessionRegistry.create` |
| I23 | Tokens haben 24 Bytes aus `SecureRandom` als Base64url ohne Padding. | `Ids.token` |
| I24 | Teilnehmer-IDs sind UUIDv7 mit Version 7, Variante 2 und zeitlicher Ordnung. | `UuidV7.next` |
