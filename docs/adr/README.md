# Architecture Decision Records

Wann ein ADR nötig ist: `harness/policies/adr.md`. Format MADR aus `0000-template.md`. Datei
`NNNN-<slug>.md`, nächste freie Nummer. Nach `accepted` ändert sich nur noch die Statuszeile.

| ADR | Titel | Status | Datum |
|---|---|---|---|
| 0001 | Angular-Frontend und Quarkus-Backend (Variante A) | accepted | 2026-11-16 |
| 0002 | Sitzungen nur im Arbeitsspeicher, keine Datenbank | accepted | 2026-11-16 |
| 0003 | Identität ohne Login: Token je Teilnehmer, Session-ID mit 8 Zeichen, UUIDv7 | accepted | 2026-11-16 |
| 0004 | REST für Befehle, WebSocket mit vollständigem Snapshot, Signals-Store im Frontend | accepted | 2026-11-16 |
| 0005 | Obergrenzen und Projekt-Allowlist für die offenen Endpunkte, NOT_IMPLEMENTED entfällt | accepted | 2026-11-16 |
| 0006 | Countdown-Timer als Sitzungseinstellung mit Frist im Snapshot und Auflösung durch den Server | accepted | 2026-11-16 |
| 0007 | Eigener Fehlercode GITLAB_ACCESS_DENIED für 401 und 403 von GitLab | accepted | 2026-11-17 |
| 0008 | Offene Projekt- und Issue-Auswahl vor dem Anlegen einer Sitzung | accepted | 2026-11-17 |
| 0010 | Diskussionsphase vor der Schätzung; der Timer startet mit „Schätzung starten“ | accepted | 2026-11-17 |
