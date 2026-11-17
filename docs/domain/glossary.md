# Glossar

Ein Begriff pro Zeile. "Nicht verwenden" nennt Synonyme, die im Code und in Specs nicht
vorkommen sollen. Quelle: `docs/umsetzungsplan.md`, Abschnitte 4.2 bis 4.6.

| Begriff | Definition | Im Code | Nicht verwenden |
|---|---|---|---|
| Sitzung | Gemeinsamer Schätzraum eines Teams für ein GitLab-Projekt; hat eine Session-ID, eine Phase, Teilnehmer, ein aktives Issue, eine Runde und ein Protokoll. | `Session`, `session` | Raum, Spiel, Meeting |
| Session-ID | Kennung der Sitzung aus 8 Zeichen (Großbuchstaben und Ziffern ohne 0, O, 1, I, L), die Teilnehmer abtippen oder per Link öffnen. | `Session.id`, `sessionId` | Sitzungscode, Raumnummer |
| Teilnehmer | Person in einer Sitzung mit Name, Rolle, Token und Verbindungsstatus. | `Participant` | Nutzer, Spieler, Mitglied |
| Scrum Master | Rolle des Erstellers der Sitzung; steuert Issue-Auswahl, Freigabe, Auflösung, neue Runde und Bestätigung; schätzt nicht mit. | `Role.SCRUM_MASTER` | Moderator, Host, Admin |
| Entwickler | Rolle jedes Beitretenden; wählt in der Runde verdeckt eine Karte. | `Role.DEVELOPER` | Spieler, Voter, Schätzer |
| Rolle | Scrum Master oder Entwickler; wird vom Server aus dem Token bestimmt. | `Role` | Rechte, Berechtigung |
| Token | Zufallswert je Teilnehmer, mit dem der Server Aufrufe und die WebSocket-Verbindung dem Teilnehmer zuordnet; nur serverseitig und im `sessionStorage` des Browsers. | `Participant.token` | Passwort, Session-Cookie, API-Key |
| Issue | GitLab-Issue des Projekts der Sitzung mit `iid`, Titel, Beschreibung (Markdown) und Link. | `Issue` | Ticket, Story, Aufgabe |
| Gewicht | Feld `weight` eines GitLab-Issues (A-07), eine ganze Zahl oder leer; die Bestätigung setzt es mit `write-weight` auf den Endwert. Die Issue-Liste zeigt es je Eintrag und filtert nach „Ohne Gewicht“, „Mit Gewicht“ oder „Alle“ (ADR 0009); GitLab Free kennt kein Gewicht. | `IssueSummary.weight`, `WeightFilter`, `write-weight` | Punkte, Aufwand |
| Vorausgewähltes Issue | Issue aus der Sitzungserstellung, das im Bedienfeld vorbelegt ist, aber noch nicht freigegeben. | `Session.preselectedIssueIid` | Standard-Issue |
| Aktives Issue | Issue, das der Scrum Master freigegeben hat und das alle Teilnehmer sehen. | `Session.activeIssue` | aktuelles Ticket |
| Freigabe | Aktion des Scrum Masters, die ein Issue aktiv macht und Runde 1 ohne Frist startet (Phase `LOBBY` nach `DISCUSSION`, ADR 0010). | `POST …/active-issue` | Start, Öffnen |
| Issue-Wechsel | Freigabe eines anderen Issues, solange die Runde nicht bestätigt ist; verwirft eine laufende Runde und führt nach `DISCUSSION`. | `POST …/active-issue` in `DISCUSSION`, `VOTING` oder `REVEALED` | Umschalten |
| Phase | Zustand der Sitzung: `LOBBY` (kein aktives Issue), `DISCUSSION` (Diskussion), `VOTING` (Runde läuft), `REVEALED` (Runde aufgelöst). | `Phase` | Status, Modus, Schritt |
| Diskussion | Phase `DISCUSSION` nach Freigabe, Issue-Wechsel und Neuer Runde: Alle sehen das aktive Issue, die Karten sind gesperrt, es läuft keine Frist. | `Phase.DISCUSSION`, `discussion-hint` | Besprechung, Vorbereitung |
| Schätzung starten | Aktion des Scrum Masters, die die Karten der Runde öffnet und die Frist aus dem Timer setzt (Phase `DISCUSSION` nach `VOTING`). | `POST …/round/start`, `Session.startVoting`, `round-start` | Timer starten, Runde öffnen |
| Runde | Ein Schätzdurchgang für das aktive Issue mit Rundennummer ab 1, Stimmen und Auflösungsstatus. | `Round` | Abstimmung, Voting, Durchgang |
| Karte | Ein Wert des Kartensatzes 0, 1, 2, 3, 5, 8, 13, 21, 34, ?, ☕; im Wire-Format als String, ☕ als `COFFEE`. | `Card` | Wert, Punkt, Story Points, Schätzung |
| Kartenmotiv | Farbe und Muster der Karten einer Runde (Raster, Punkte, Zeilen, Ringe, Stufen), im Frontend aus Session-ID, Issue-Nummer und Rundennummer berechnet (FNV-1a modulo 5); alle Teilnehmer sehen dasselbe, zwei aufeinanderfolgende Runden nie dasselbe, in `LOBBY` gilt Motiv 0. Das Motiv trägt keine Bedeutung. | `motifFor`, `data-motif`, `--app-card-accent` | Kartenfarbe, Skin, Theme |
| Stimme | Die verdeckt gewählte Karte eines Entwicklers in einer Runde; änderbar bis zur Auflösung. | `Round.votes`, `vote` | Tipp, Schätzung, Abgabe |
| Abstimmungsstatus | Je Teilnehmer, ob er in der laufenden Runde eine Stimme abgegeben hat („Hat geschätzt“ oder „Ausstehend“), ohne den Wert. | `hasVoted` | Fortschritt |
| Auflösung | Aktion des Scrum Masters, die alle Stimmen der Runde aufdeckt und die Auswertung berechnet (Phase `VOTING` nach `REVEALED`); hat die Runde eine Frist, löst der Server sie beim Erreichen der Frist selbst auf. | `POST …/round/reveal`, `revealed`, `Session.revealIfDue` | Aufdecken, Reveal, Flip |
| Auswertung | Verteilung der abgegebenen Karten in Kartenreihenfolge, Durchschnitt über Zahlenkarten und häufigste Werte einer aufgelösten Runde. | `RoundStats` | Statistik, Ergebnis |
| Timer | Einstellung der Sitzung: Dauer in Sekunden (5 bis 3600) für jede ab jetzt gestartete Schätzung, oder aus; setzt nur der Scrum Master, eine laufende Schätzung behält ihre Frist. | `Session.timerSeconds`, `PUT …/timer`, `timerSeconds` | Countdown-Einstellung, Rundenzeit |
| Frist | Zeitpunkt, zu dem der Server eine laufende Runde automatisch auflöst; „Schätzung starten“ plus Timer, ohne Timer und in `DISCUSSION` keine Frist. | `Round.deadline`, `round.deadline` | Deadline, Ablaufzeit, Timeout |
| Ausreißer | Niedrigste oder höchste Zahlenkarte einer aufgelösten Runde, wenn beide mehr als zwei Positionen im Kartensatz auseinanderliegen; die Stimmen mit dieser Karte tragen den Text „Ausreißer“. | `outlierCards`, `result-vote-outlier` | Abweichler, Extremwert |
| Konsens | Aufgelöste Runde mit mindestens zwei Stimmen, die alle dieselbe Zahlenkarte zeigen; lauter `?` oder lauter Kaffeepause ist kein Konsens. Der Konsenswert ist im Dialog „Ergebnis übernehmen“ vorausgewählt. | `consensusCard`, `consensus-hint` | Einigkeit, Einstimmigkeit, Match |
| Neue Runde | Aktion des Scrum Masters, die alle Stimmen löscht und die Rundennummer erhöht (Phase `REVEALED` nach `DISCUSSION`). | `POST …/round/restart` | Neustart, Wiederholung |
| Bestätigung | Aktion des Scrum Masters, die einen Kartenwert als Endwert festlegt, nach GitLab schreibt und die Sitzung in `LOBBY` zurücksetzt. | `POST …/round/confirm`, `confirming` | Abschluss, Commit, Speichern |
| Endwert | Der bestätigte Kartenwert einer Runde; steht im Protokolleintrag. | `HistoryEntry.finalCard` | Ergebnis, finaler Wert |
| Protokoll | Liste der aufgelösten Runden einer Sitzung, neueste zuerst, für alle sichtbar, nur in der Sitzung. | `Session.history` | Verlauf, Log, Historie |
| Protokolleintrag | Eintrag des Protokolls mit Issue, Rundennummer, Stimmen, Auswertung, Endwert (falls bestätigt) und Zeitpunkt der Auflösung. | `HistoryEntry` | Verlaufseintrag |
| Snapshot | Vollständiger, je Empfänger gefilterter Zustand der Sitzung, den der Server nach jeder Änderung per WebSocket sendet. | `SessionView`, `session.state` | Delta, Update, Event |
| Befehl | REST-Aufruf, der den Zustand der Sitzung ändert und ohne Zustand antwortet. | `SessionRegistry.update(…)` | Aktion, Command, Request |
| Verbindungsstatus | Ob der Teilnehmer gerade per WebSocket verbunden ist; ein getrennter Teilnehmer bleibt in der Liste. | `Participant.connected` | online, Präsenz |
| GitLab-Double | WireMock Standalone mit festen Mappings als Ersatz für GitLab in End-to-End-Tests. | `frontend/e2e/gitlab-double/` | Mock-GitLab, Fake |
| Obergrenze | Konfigurierte Höchstzahl lebender Sitzungen der Instanz oder der Teilnehmer einer Sitzung; beim Überschreiten antwortet der Server `LIMIT_REACHED`. | `max-sessions`, `max-participants`, `LIMIT_REACHED` | Quota, Kontingent |
| Projekt-Allowlist | Konfigurierte Liste der GitLab-Projekt-IDs oder -Pfade, für die Sitzungen angelegt werden dürfen; ohne Liste sind alle Projekte erlaubt. Die Projektauswahl setzt die numerische ID; ein Projekt, das nur als Pfad in der Liste steht, lässt sich deshalb nicht auswählen. | `allowed-projects`, `PROJECT_NOT_ALLOWED` | Whitelist, Freigabeliste |
| Projektauswahl | Liste der GitLab-Projekte auf der Startseite, aus der der Scrum Master vor dem Anlegen einer Sitzung das Projekt per Name wählt: die Projekt-Allowlist, wenn gesetzt, sonst die Projekte mit Mitgliedschaft des GitLab-Tokens (ADR 0008). | `GET /api/projects`, `ProjectListResponse`, `GitLabProjects` | Projektliste, Projekt-Picker |
