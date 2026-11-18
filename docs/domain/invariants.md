# Invarianten

Regeln, die in jeder Sitzung gelten, mit der Stelle im Code, die sie durchsetzt. Quelle:
`docs/umsetzungsplan.md`, Abschnitte 4.3 (Zustandsautomat), 6 (Nebenläufigkeit) und die
Annahmen A-02, A-06, A-13. Jede Regel hat einen Test in `backend/src/test/java/planningpoker/`.

## Zustandsautomat (4.3)

| Nr | Regel | Durchgesetzt in | Fehlercode |
|---|---|---|---|
| I1 | Nur der Scrum Master gibt ein Issue frei, startet die Schätzung, löst auf, lässt erneut schätzen und bestätigt. | `Session.selectIssue`, `Session.startVoting`, `Session.reveal`, `Session.restart`, `Session.beginConfirm` über `requireRole` | `FORBIDDEN_ROLE` |
| I2 | Nur ein Entwickler wählt eine Karte; ein Zuschauer wählt keine und gibt keinen Befehl des Scrum Masters (ADR 0014). | `Session.vote` über `requireRole` | `FORBIDDEN_ROLE` |
| I3 | Eine Karte wird nur in `VOTING` gewählt oder geändert (A-12). | `Session.vote` über `requirePhase` | `INVALID_STATE` |
| I4 | Auflösen nur in `VOTING`; die Auswertung entsteht bei der Auflösung, der Protokolleintrag ohne Endwert dazu. | `Session.reveal` | `INVALID_STATE` |
| I5 | Erneut schätzen und Bestätigung nur in `REVEALED`; die neue Runde trägt Nummer plus 1, keine Karten und beginnt in `VOTING` (ADR 0012). | `Session.restart`, `Session.beginConfirm` über `requirePhase` | `INVALID_STATE` |
| I6 | Die Freigabe eines Issues ist in `LOBBY`, `DISCUSSION`, `VOTING` und `REVEALED` möglich und startet Runde 1 in `DISCUSSION`; eine laufende Runde wird verworfen, ein aufgelöster Eintrag bleibt ohne Endwert im Protokoll (A-04). | `Session.selectIssue` | – |
| I7 | Solange `confirming` gesetzt ist, ist jede Steuerungsaktion abgelehnt. | `Session.selectIssue`, `Session.restart`, `Session.beginConfirm` über `requireNotConfirming`; `Session.vote` und `Session.reveal` über die Phase `REVEALED` | `INVALID_STATE` |
| I8 | `finishConfirm` und `failConfirm` setzen eine laufende Bestätigung voraus. Erfolg: Endwert im jüngsten Protokolleintrag, Phase `LOBBY` ohne aktives Issue, ohne Runde, ohne vorausgewähltes Issue (A-16). Fehler: `confirming` zurück, Phase `REVEALED`. | `Session.finishConfirm`, `Session.failConfirm` über `requireConfirming` | `INVALID_STATE` |
| I9 | Beitreten, Verbinden und Trennen ändern die Phase nicht und sind in jeder Phase möglich (A-11). | `Session.join`, `Session.connect`, `Session.disconnect` | – |
| I10 | Ein unbekannter Teilnehmer führt keinen Befehl aus. | `Session.actor` | `UNAUTHORIZED` |

## Teilnehmer (A-02, A-13)

| Nr | Regel | Durchgesetzt in | Fehlercode |
|---|---|---|---|
| I11 | Der Ersteller ist der Scrum Master. Die Rolle jedes weiteren Teilnehmers folgt nur aus dem Einladungscode: der Code für Entwickler gibt `DEVELOPER`, der Code für Zuschauer `VIEWER`, jeder andere Code wird abgelehnt, bevor Obergrenze und Name geprüft werden. Der Vergleich hat konstante Laufzeit (ADR 0014). | `Session.joinAsScrumMaster`, `Session.join` | `INVITE_INVALID` |
| I12 | Namen sind getrimmt, 1 bis 30 Zeichen lang und je Sitzung eindeutig ohne Beachtung der Groß- und Kleinschreibung. Die Grenze prüft die Länge zuerst (`CreateSessionRequest`, `JoinSessionRequest`). | `Session.join` | `VALIDATION_ERROR`, `NAME_TAKEN` |
| I13 | `allVoted` ist wahr, sobald jeder verbundene Entwickler gewählt hat; ohne verbundene Entwickler nie; ein getrennter Entwickler blockiert nicht, seine Stimme bleibt (A-02, A-10). Zuschauer zählen weder hier noch bei „Nicht geschätzt“ (ADR 0014). | `Session.allVoted` | – |
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
| I28 | Kein Snapshot enthält ein Token oder vor der Auflösung eine fremde Karte; `preselectedIssueIid` und `invites` sieht nur der Scrum Master. Kein Log enthält einen Einladungscode. | `session.SessionViewMapper` | – |
| I29 | `RoundCompleted` feuert genau einmal je Vollständigkeit, wenn der letzte verbundene Entwickler gewählt hat (I13, I14); eine spätere Kartenänderung feuert nicht erneut. | `session.SessionResource.vote` über den Rückgabewert von `Session.vote` | – |

## Obergrenzen und Projekt-Allowlist (Spec 0015, ADR 0005)

| Nr | Regel | Durchgesetzt in | Fehlercode |
|---|---|---|---|
| I35 | Die Instanz hält höchstens `planningpoker.session.max-sessions` lebende Sitzungen; abgelaufene Sitzungen zählen nicht. Die Zählung und das Anlegen laufen unter einer Sperre. | `SessionRegistry.create` | `LIMIT_REACHED` |
| I36 | Eine Sitzung hat höchstens `planningpoker.session.max-participants` Teilnehmer, der Scrum Master und die Zuschauer zählen mit; die Grenze wird vor der Namensprüfung geprüft, ein abgelehnter Beitritt ändert nichts und löst kein `SessionChanged` aus (I19). | `Session.join` | `LIMIT_REACHED` |
| I37 | Ist `planningpoker.session.allowed-projects` gesetzt, entsteht eine Sitzung nur für eine Projekt-ID der Liste (exakter Vergleich nach dem Trimmen); die Prüfung läuft vor dem GitLab-Aufruf. Ohne den Schlüssel ist jedes Projekt erlaubt. | `SessionResource.createSession` | `PROJECT_NOT_ALLOWED` |

## Timer und Frist (Spec 0016, Spec 0026, Spec 0034, ADR 0010, ADR 0012)

| Nr | Regel | Durchgesetzt in | Fehlercode |
|---|---|---|---|
| I38 | Der Timer ist `null` oder 5 bis 3600 Sekunden; nur der Scrum Master setzt ihn, in jeder Phase. Er wirkt erst ab dem nächsten „Schätzung starten“ oder „Erneut schätzen“; eine Änderung in `DISCUSSION` gilt für diesen Start, eine laufende Schätzung behält ihre Frist. | `TimerRequest` (`@Min`, `@Max`), `Session.setTimer` | `VALIDATION_ERROR`, `FORBIDDEN_ROLE` |
| I39 | Freigabe und Issue-Wechsel starten eine Runde ohne Frist. „Schätzung starten“ und „Erneut schätzen“ setzen die Frist auf Start plus Timer; ohne Timer hat die Runde keine Frist (ADR 0012). | `Session.selectIssue`, `Session.startVoting`, `Session.restart` | – |
| I40 | Eine Sitzung in `VOTING` mit erreichter Frist löst der Server unter der Sperre der Sitzung auf, mit derselben Wirkung wie die manuelle Auflösung (Auswertung, Protokolleintrag, auch ohne Stimmen) und genau einem `SessionChanged`. Eine Runde in `DISCUSSION` und eine schon aufgelöste, neu gestartete oder verworfene Runde wird nicht aufgelöst. | `SessionRegistry.revealDue`, `Session.revealIfDue`, Prüfung alle 250 ms in `SessionRegistryProducer` | – |
| I41 | „Schätzung starten“ ist nur in `DISCUSSION` möglich und führt nach `VOTING` mit derselben Runde. In `DISCUSSION` sind Stimme, Auflösung und Bestätigung abgelehnt; der Snapshot zeigt das aktive Issue, aber keine Stimmen, keine Auswertung und keine Frist (ADR 0010). | `Session.startVoting` über `requirePhase`, `Session.vote`, `Session.reveal`, `Session.beginConfirm`, `SessionViewMapper` | `INVALID_STATE` |

## Echtzeit (Spec 0009, ADR 0003, ADR 0004)

| Nr | Regel | Durchgesetzt in | Fehlercode |
|---|---|---|---|
| I30 | Eine Verbindung erhält das Token nur in der ersten Nachricht `auth`, nie aus der URL; vor `auth` erhält sie keinen Snapshot, eine andere Nachricht vor `auth` beantwortet `error`. | `realtime.SessionSocket` | `UNAUTHORIZED` |
| I31 | Ein unbekanntes Token oder eine unbekannte Sitzung beantwortet `auth` mit `error` und schließt die Verbindung; ohne `auth` innerhalb von `planningpoker.realtime.auth-timeout` schließt der Server sie ohne Snapshot. | `realtime.SessionSocket` | `UNAUTHORIZED`, `SESSION_NOT_FOUND` |
| I32 | Der Tokenvergleich für REST und WebSocket ist eine Stelle mit konstanter Laufzeit. | `Session.participantByToken` | – |
| I33 | `connected` ändert sich nur über `SessionRegistry.update`: wahr nach `auth`, falsch beim Schließen der letzten Verbindung des Teilnehmers; eine verfallene Sitzung beim Schließen wird übergangen (A-10). | `realtime.SessionSocket`, `Session.connect`, `Session.disconnect` | – |
| I34 | Nach jedem `SessionChanged` erhält jede Verbindung der Sitzung `session.state` mit dem für ihren Teilnehmer gefilterten Snapshot (I28); `round.allVoted` geht je `RoundCompleted` nur an Verbindungen des Scrum Masters. | `realtime.SnapshotBroadcaster` | – |

## Identität (ADR 0003)

| Nr | Regel | Durchgesetzt in |
|---|---|---|
| I22 | Session-IDs haben 8 Zeichen aus `ABCDEFGHJKMNPQRSTUVWXYZ23456789`; eine Kollision wird neu gewürfelt. | `Ids.sessionId`, `SessionRegistry.create` |
| I23 | Tokens und die zwei Einladungscodes je Sitzung haben 24 Bytes aus `SecureRandom` als Base64url ohne Padding. | `Ids.token`, `Session` |
| I24 | Teilnehmer-IDs sind UUIDv7 mit Version 7, Variante 2 und zeitlicher Ordnung. | `UuidV7.next` |
