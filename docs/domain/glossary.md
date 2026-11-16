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
| Vorausgewähltes Issue | Issue aus der Sitzungserstellung, das im Bedienfeld vorbelegt ist, aber noch nicht freigegeben. | `Session.preselectedIssueIid` | Standard-Issue |
| Aktives Issue | Issue, das der Scrum Master freigegeben hat und das alle Teilnehmer sehen. | `Session.activeIssue` | aktuelles Ticket |
| Freigabe | Aktion des Scrum Masters, die ein Issue aktiv macht und Runde 1 startet (Phase `LOBBY` nach `VOTING`). | `POST …/active-issue` | Start, Öffnen |
| Issue-Wechsel | Freigabe eines anderen Issues, solange die Runde nicht bestätigt ist; verwirft eine laufende Runde. | `POST …/active-issue` in `VOTING` oder `REVEALED` | Umschalten |
| Phase | Zustand der Sitzung: `LOBBY` (kein aktives Issue), `VOTING` (Runde läuft), `REVEALED` (Runde aufgelöst). | `Phase` | Status, Modus, Schritt |
| Runde | Ein Schätzdurchgang für das aktive Issue mit Rundennummer ab 1, Stimmen und Auflösungsstatus. | `Round` | Abstimmung, Voting, Durchgang |
| Karte | Ein Wert des Kartensatzes 0, 1, 2, 3, 5, 8, 13, 21, 34, ?, ☕; im Wire-Format als String, ☕ als `COFFEE`. | `Card` | Wert, Punkt, Story Points, Schätzung |
| Stimme | Die verdeckt gewählte Karte eines Entwicklers in einer Runde; änderbar bis zur Auflösung. | `Round.votes`, `vote` | Tipp, Schätzung, Abgabe |
| Abstimmungsstatus | Je Teilnehmer, ob er in der laufenden Runde eine Stimme abgegeben hat („Hat geschätzt“ oder „Ausstehend“), ohne den Wert. | `hasVoted` | Fortschritt |
| Auflösung | Aktion des Scrum Masters, die alle Stimmen der Runde aufdeckt und die Auswertung berechnet (Phase `VOTING` nach `REVEALED`). | `POST …/round/reveal`, `revealed` | Aufdecken, Reveal, Flip |
| Auswertung | Verteilung der abgegebenen Karten in Kartenreihenfolge, Durchschnitt über Zahlenkarten und häufigste Werte einer aufgelösten Runde. | `RoundStats` | Statistik, Ergebnis |
| Neue Runde | Aktion des Scrum Masters, die alle Stimmen löscht und die Rundennummer erhöht (Phase `REVEALED` nach `VOTING`). | `POST …/round/restart` | Neustart, Wiederholung |
| Bestätigung | Aktion des Scrum Masters, die einen Kartenwert als Endwert festlegt, nach GitLab schreibt und die Sitzung in `LOBBY` zurücksetzt. | `POST …/round/confirm`, `confirming` | Abschluss, Commit, Speichern |
| Endwert | Der bestätigte Kartenwert einer Runde; steht im Protokolleintrag. | `HistoryEntry.finalCard` | Ergebnis, finaler Wert |
| Protokoll | Liste der aufgelösten Runden einer Sitzung, neueste zuerst, für alle sichtbar, nur in der Sitzung. | `Session.history` | Verlauf, Log, Historie |
| Protokolleintrag | Eintrag des Protokolls mit Issue, Rundennummer, Stimmen, Auswertung, Endwert (falls bestätigt) und Zeitpunkt der Auflösung. | `HistoryEntry` | Verlaufseintrag |
| Snapshot | Vollständiger, je Empfänger gefilterter Zustand der Sitzung, den der Server nach jeder Änderung per WebSocket sendet. | `SessionView`, `session.state` | Delta, Update, Event |
| Befehl | REST-Aufruf, der den Zustand der Sitzung ändert und ohne Zustand antwortet. | `SessionRegistry.update(…)` | Aktion, Command, Request |
| Verbindungsstatus | Ob der Teilnehmer gerade per WebSocket verbunden ist; ein getrennter Teilnehmer bleibt in der Liste. | `Participant.connected` | online, Präsenz |
| GitLab-Double | WireMock Standalone mit festen Mappings als Ersatz für GitLab in End-to-End-Tests. | `frontend/e2e/gitlab-double/` | Mock-GitLab, Fake |
| Obergrenze | Konfigurierte Höchstzahl lebender Sitzungen der Instanz oder der Teilnehmer einer Sitzung; beim Überschreiten antwortet der Server `LIMIT_REACHED`. | `max-sessions`, `max-participants`, `LIMIT_REACHED` | Quota, Kontingent |
| Projekt-Allowlist | Konfigurierte Liste der GitLab-Projekt-IDs, für die Sitzungen angelegt werden dürfen; ohne Liste sind alle Projekte erlaubt. | `allowed-projects`, `PROJECT_NOT_ALLOWED` | Whitelist, Freigabeliste |
