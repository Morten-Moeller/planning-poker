---
id: "0020"
title: Umgebungsvariablen in .env.example
status: Review
risk: high
adrs: ["0001"]
owner: Morten Möller
created: 2026-11-17
updated: 2026-11-17
pr: ""
note: freigegeben in der Session
---

# Umgebungsvariablen in .env.example

Nachtrag nach der manuellen Prüfung gegen das echte GitLab-Projekt (Checkliste aus 0019). Bezug:
R-09 (konfigurierbarer Token), R-21 (Ergebnis am Issue), R-23 (Einrichtung und Start), A-07
(`weight`).

## Ziel

Wer das Projekt einrichtet, sieht in `.env.example` jeden Schalter des Backends als
Umgebungsvariable. `write-weight` ist mit `true` vorgeschlagen. Das README sagt, welcher
GitLab-Token funktioniert. Bei der manuellen Prüfung fiel beides auf: Ein fine-grained Token
bekam von GitLab 403, und das Gewicht wurde nicht gesetzt, weil der Schalter nur im README stand.

## Scope

### Enthalten

- `.env.example`:
  - `GITLAB_TOKEN=` bleibt die einzige Pflichtzeile.
  - `PLANNINGPOKER_GITLAB_WRITE_WEIGHT=true` ist aktiv, mit dem Kommentar „nur GitLab Premium oder Ultimate, Token mit Rolle Developer; auf `false` setzen, wenn `weight` nicht verfügbar ist“.
  - Alle übrigen Schlüssel aus der Konfigurationstabelle des README stehen auskommentiert mit Standardwert und Kurzbeschreibung: `PLANNINGPOKER_GITLAB_BASE_URL`, `PLANNINGPOKER_GITLAB_TIMEOUT`, `PLANNINGPOKER_SESSION_TTL`, `PLANNINGPOKER_SESSION_MAX_SESSIONS`, `PLANNINGPOKER_SESSION_MAX_PARTICIPANTS`, `PLANNINGPOKER_SESSION_ALLOWED_PROJECTS`, `PLANNINGPOKER_REALTIME_AUTH_TIMEOUT` und `QUARKUS_HTTP_PORT`.
- README:
  - Abschnitt GitLab: Die Spalte „Umgebungsvariable“ in der Konfigurationstabelle zeigt die Abbildungsregel von Quarkus (Großbuchstaben, `.` und `-` werden zu `_`).
  - Absatz „Token“: Ein klassischer Personal Access Token oder ein Project Access Token mit Scope `api` und mindestens der Rolle Developer funktioniert. Ein fine-grained Token ohne Projektrechte bekommt 403.
  - `write-weight`: Hinweis, dass `.env.example` den Schalter mit `true` vorschlägt.
  - Schnellstart: Der Kommentar bei `cp .env.example .env` nennt `GITLAB_TOKEN` und `write-weight`. Es bleibt bei fünf Befehlen.
- `docs/abgabe/checkliste.md`: Der Punkt zu `weight` verweist auf die Variable statt auf `-D…`.

### Nicht enthalten

- Code des Backends. Die Standardwerte in `application.properties` bleiben, `write-weight` bleibt dort `false` (A-07). Nur der Vorschlag in `.env.example` ist `true`.
- Eigene Fehlermeldung bei 403 von GitLab und Log-Zeile mit dem GitLab-Status. Das kommt in eine eigene Spec, siehe Offene Fragen.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Token, Ergebnisübernahme | wie im Glossar (Teilnehmer-Token ist hier nicht gemeint, sondern der GitLab-Token der Instanz) |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `.env.example` enthält `GITLAB_TOKEN=`, aktiv `PLANNINGPOKER_GITLAB_WRITE_WEIGHT=true` und jede weitere Zeile der README-Konfigurationstabelle als auskommentierte Variable mit dem Standardwert aus dem README. | Aufruf: Skript im PR-Body vergleicht die Schlüssel der README-Tabelle mit `.env.example` (Abbildungsregel) |
| A2 | `set -a && . ./.env.example && set +a` läuft in `bash` und `zsh` ohne Fehler, und danach ist `PLANNINGPOKER_GITLAB_WRITE_WEIGHT` gleich `true`. | Aufruf in beiden Shells |
| A3 | Mit einer `.env` aus `.env.example` (Token ersetzt durch den Platzhalter `test`) startet das Backend nach dem Schnellstart. `GET /api/health` antwortet 200, und Quarkus liest `write-weight=true`. | Aufruf durch `/verify`: Backend gegen das GitLab-Double, Confirm mit Zahlenkarte, Double erhält `PUT …/issues/{iid}` mit `weight` |
| A4 | Das README nennt die Spalte „Umgebungsvariable“, den Absatz zum Token (klassisch oder Project Access Token, Scope `api`, Rolle Developer, fine-grained führt zu 403) und den Hinweis zu `write-weight`. Der Schnellstart hat höchstens fünf Befehle. | Browser: README im PR |
| A5 | `make check` ist grün. | Aufruf `make check` |

## Contracts

keine

## Risiko

Stufe: high
Begründung: `harness/scripts/risk-level.sh` stuft `.env.example` über das Muster `**/*.env*` als
high ein. Der Eskalator `token` greift zusätzlich, weil die Doku den GitLab-Token beschreibt.
`README.md` und `docs/` sind low. Inhaltlich enthält die Datei nur Platzhalter und Standardwerte,
keine Geheimnisse.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`, G3 über den Status
`verified`. Reviews: Code, Sicherheit, Architektur.
ADR nötig: ja wegen high (Punkt 1), erfüllt durch ADR 0001. Die Änderung folgt dieser Entscheidung:
Der GitLab-Token und die GitLab-Konfiguration liegen nur im Backend und kommen aus der Umgebung.

## Umsetzung

Entscheidungen:

- keine

Dateien:

- `.env.example`: ändern, alle Variablen, `write-weight` als `true` vorgeschlagen
- `README.md`: ändern, Spalte „Umgebungsvariable“, Absatz Token, Hinweis `write-weight`, Kommentar im Schnellstart
- `docs/abgabe/checkliste.md`: ändern, Punkt `weight` mit Variable

Schritte:

1. `.env.example` schreiben, nur Platzhalter, kein Wert aus einer lokalen `.env`.
2. README und Checkliste nachziehen.
3. A1 und A2 prüfen. Für A3 die Prüfung mit dem Double im Scratchpad, ohne echten Token.
4. `make check`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | Vergleichsskript im PR-Body |
| A2 | `bash -c` und `zsh -c` mit `set -a && . ./.env.example` |
| A3 | `/verify` mit dem GitLab-Double, `/__admin/requests` zeigt `PUT` mit `weight` |
| A4 | README im PR |
| A5 | `make check` |

Testdaten: GitLab-Double aus `frontend/e2e/gitlab-double/`, Token-Platzhalter `test`.

Contracts zu regenerieren: keine.

## Offene Fragen

- [x] Fehlermeldung bei 403 von GitLab („GitLab hat nicht geantwortet.“ ist irreführend) und eine Log-Zeile mit dem GitLab-Status: in eine eigene Spec 0021 (Risiko medium, Fehlercode im Vertrag möglich) oder in diese Spec aufnehmen? → Eigene Spec 0021. (Morten Möller, 2026-11-17)

## Verifikationsplan

- make check
- betroffene Tests: keine Code-Tests; Vergleichsskript, Shell-Aufrufe
- Browser: README im PR
- Aufruf: Backend mit `.env` aus `.env.example` gegen das GitLab-Double
