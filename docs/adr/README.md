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
| 0006 | Countdown-Timer als Sitzungseinstellung mit Frist im Snapshot und Auflösung durch den Server | superseded by 0010 | 2026-11-16 |
| 0007 | Eigener Fehlercode GITLAB_ACCESS_DENIED für 401 und 403 von GitLab | accepted | 2026-11-17 |
| 0008 | Offene Projekt- und Issue-Auswahl vor dem Anlegen einer Sitzung | accepted | 2026-11-17 |
| 0009 | Gewicht und Zeitraum der Issue-Liste filtert GitLab | accepted | 2026-11-17 |
| 0010 | Diskussionsphase vor der Schätzung; der Timer startet mit „Schätzung starten“ | accepted | 2026-11-17 |
| 0011 | Das Issue beim Anlegen einer Sitzung ist optional | accepted | 2026-11-17 |
| 0012 | „Erneut schätzen“ startet die neue Runde sofort (ersetzt den Punkt „Neue Runde führt nach DISCUSSION“ aus 0010) | accepted | 2026-11-17 |
| 0013 | Letzte Sitzungen mit Zugang im localStorage, abschaltbar (ändert für das eingeschaltete Feature die Token-Ablage aus 0003) | accepted | 2026-11-18 |
| 0014 | Dritte Rolle „Zuschauer“, Beitreten nur über Einladungscodes je Rolle | accepted | 2026-11-18 |
| 0015 | Java 25 (Temurin) als Laufzeit und Sprachstand des Backends (ändert den Punkt „Java 21“ aus 0001) | accepted | 2026-11-23 |
| 0016 | Zweites Frontend mit React 19, Vite und UI SDK neben dem Angular-Frontend (weicht für die Oberfläche von A1.7 ab) | accepted | 2026-11-24 |
| 0017 | Markdown im React-Frontend mit marked, bereinigt mit DOMPurify | accepted | 2026-11-25 |
| 0018 | Demo-Modus ohne GitLab-Token mit eingebautem GitLab-Ersatz im Backend (ändert „ohne Token kein Start“ aus Spec 0003) | accepted | 2026-11-26 |
