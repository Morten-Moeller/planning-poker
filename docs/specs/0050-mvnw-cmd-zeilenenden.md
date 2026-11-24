---
id: "0050"
title: Zeilenenden von backend/mvnw.cmd im Repository normalisieren
status: Review
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-24
updated: 2026-11-24
pr: ""
note: ""
---

# Zeilenenden von backend/mvnw.cmd im Repository normalisieren

## Ziel

Der Dependabot-Pull-Request #53 hat `backend/mvnw.cmd` mit CRLF-Zeilenenden in das Repository
geschrieben. `.gitattributes` legt für `*.cmd` fest: LF im Repository, CRLF im Arbeitsbaum. Seit
dem Merge meldet `git status` die Datei in jedem Checkout als geändert (189 Zeilen), ohne dass
jemand sie bearbeitet hat. Nach der Änderung ist ein frischer Checkout von `main` sauber.

## Scope

### Enthalten

- `backend/mvnw.cmd` mit `git add --renormalize` neu in den Index schreiben. Der Inhalt bleibt
  gleich; nur die Zeilenenden im Repository ändern sich von CRLF auf LF.

### Nicht enthalten

- Der Dateimodus (seit #53 `100644` statt `100755`): unter Windows ohne Wirkung.
- Eine Vorkehrung gegen dieselbe Änderung durch ein späteres Wrapper-Update von Dependabot.

## Begriffe

Keine Fachbegriffe aus `docs/domain/glossary.md`.

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `backend/mvnw.cmd` liegt mit LF im Repository und mit CRLF im Arbeitsbaum. | Aufruf: `git ls-files --eol backend/mvnw.cmd` gibt `i/lf w/crlf` aus |
| A2 | Nach dem Commit meldet `git status` die Datei nicht als geändert. | Aufruf: `git status --porcelain backend/mvnw.cmd` ohne Ausgabe |
| A3 | Der Inhalt ist bis auf die Zeilenenden gleich dem Stand von `main`. | Aufruf: `git diff --ignore-space-at-eol origin/main -- backend/mvnw.cmd` ohne Ausgabe |

## Contracts

keine.

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh`: `backend/mvnw.cmd` ist ein Abhängigkeits-Manifest
(`**/mvnw.cmd`), das ist medium. Die Datei steht in `keyword_exempt`, der
Schlüsselwort-Eskalator wertet ihre Zeilen nicht.
Gates: G2, das Label `human-approved` einer Person vor dem Merge.
ADR nötig: nein, weil die Änderung keinen Inhalt ändert und `.gitattributes` folgt.

## Umsetzung

Entscheidungen:

- Keine Entscheidung der Person nötig: die Änderung stellt den Zustand her, den `.gitattributes`
  festlegt.

Dateien:

- `backend/mvnw.cmd`: ändern, nur Zeilenenden im Repository
- `docs/specs/0050-mvnw-cmd-zeilenenden.md`: neu

Schritte:

1. `git add --renormalize backend/mvnw.cmd`.
2. Die Aufrufe zu A1 bis A3, `make check`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | Aufruf `git ls-files --eol`; Ausgabe im Pull Request |
| A2 | Aufruf `git status --porcelain`; Ausgabe im Pull Request |
| A3 | Aufruf `git diff --ignore-space-at-eol`; Ausgabe im Pull Request |

Kein neuer automatischer Test: die Änderung fügt kein Verhalten hinzu.

## Offene Fragen

Keine.

## Verifikationsplan

- make check
- betroffene Tests: die Aufrufe zu A1 bis A3
- Browser: keiner
