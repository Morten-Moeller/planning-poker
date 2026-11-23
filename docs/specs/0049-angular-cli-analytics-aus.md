---
id: "0049"
title: Angular CLI ohne Nutzungsstatistik
status: done
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-23
updated: 2026-11-23
pr: "#57"
note: alle Kriterien erfüllt
---

# Angular CLI ohne Nutzungsstatistik

## Ziel

Die Angular CLI fragt beim ersten Aufruf in einem interaktiven Terminal, ob sie pseudonyme
Nutzungsdaten senden darf, und schreibt die Antwort in `frontend/angular.json`. Die Datei liegt
danach geändert und nicht nach Prettier formatiert im Arbeitsbaum, und `make lint` scheitert
lokal. Nach der Änderung steht die Antwort im Repository: die CLI fragt nicht mehr und sendet
keine Nutzungsdaten.

## Scope

### Enthalten

- `"analytics": false` im Block `cli` von `frontend/angular.json`.

### Nicht enthalten

- Andere Einstellungen der Angular CLI.

## Begriffe

Keine Fachbegriffe aus `docs/domain/glossary.md`.

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `frontend/angular.json` hat `cli.analytics` mit dem Wert `false`. | Aufruf: `jq .cli.analytics frontend/angular.json` gibt `false` aus |
| A2 | `make lint` läuft ohne Fehler; Prettier meldet `angular.json` nicht. | Aufruf: `make lint` |
| A3 | `make typecheck` baut das Frontend ohne Fehler. | Aufruf: `make typecheck` |

## Contracts

keine.

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh`: `frontend/angular.json` hat kein Muster in der
Matrix, das ist medium. Kein Eskalator.
Gates: G2, das Label `human-approved` einer Person vor dem Merge.
ADR nötig: nein, weil die Änderung eine lokale Einstellung eines Werkzeugs ist und keine
Alternative hat, die ein ADR festhalten müsste.

## Umsetzung

Entscheidungen:

- Die Angular CLI sendet aus diesem Projekt keine Nutzungsdaten (`cli.analytics: false`).

Dateien:

- `frontend/angular.json`: ändern, Schlüssel `analytics` im Block `cli`
- `docs/specs/0049-angular-cli-analytics-aus.md`: neu

Schritte:

1. Schlüssel eintragen, Datei mit Prettier formatieren.
2. `make check`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | Aufruf `jq`; Ausgabe im Pull Request |
| A2 | `make lint` |
| A3 | `make typecheck` |

Kein neuer automatischer Test: die Änderung fügt kein Verhalten der Anwendung hinzu.

## Offene Fragen

- [x] Änderung behalten oder verwerfen? → Behalten, eigener Pull Request.
  (Morten Möller, 2026-11-23)

## Verifikationsplan

- make check
- betroffene Tests: die Aufrufe zu A1 bis A3
- Browser: keiner
