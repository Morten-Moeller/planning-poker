---
id: "0017"
title: Ausreißer (M14, O-02)
status: Review
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-16
updated: 2026-11-16
pr: ""
note: freigegeben in der Session
---

# Ausreißer (M14, O-02)

Optionales Feature O-02 aus Meilenstein M14 in `docs/umsetzungsplan.md`. R-IDs: keine, das
Feature ist optional, es baut auf R-16 bis R-18 auf (Auflösung und Auswertung). A-IDs: A-02.

## Ziel

Nach der Auflösung sieht jeder Teilnehmer auf einen Blick, wer am niedrigsten und wer am
höchsten geschätzt hat, sobald diese Werte im Kartensatz weit auseinanderliegen. So weiß das
Team, wer seine Schätzung zuerst begründet.

## Scope

### Enthalten

- Regel: Betrachtet werden die Zahlenkarten der aufgedeckten Runde (`0` bis `34`). Liegen die niedrigste und die höchste Zahlenkarte mehr als zwei Positionen im Kartensatz auseinander, sind beide Ausreißer. Beispiele:
  - `3` und `13` liegen drei Positionen auseinander, also ja.
  - `3` und `8` liegen zwei Positionen auseinander, also nein.
  - `?` und Kaffeepause zählen nicht.
  - Mit weniger als zwei verschiedenen Zahlenkarten gibt es keinen Ausreißer.
- Markierung in der aufgedeckten Ansicht: Jede Stimme mit einer Ausreißer-Karte bekommt den sichtbaren Text „Ausreißer“, nicht nur eine Farbe. Darüber steht der Hinweis „Niedrigste und höchste Schätzung liegen weit auseinander.“
- Gleich bei allen Teilnehmern: Das Frontend berechnet die Markierung nur aus `round.votes` des Snapshots, unabhängig von der Rolle.

### Nicht enthalten

- Eine Markierung im Sitzungsprotokoll.
- Änderungen am Backend oder am Vertrag.
- Konsens-Erkennung (0018) und weitere Hinweise aus den Reviews (0019).
- Der Eintrag „Ausreißer“ im Glossar, den 0018 zusammen mit „Konsens“ übernimmt. So ändert 0016 als einzige Spec der Welle das Glossar.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Runde, Auflösung, Stimme, Kartensatz, Snapshot | wie im Glossar |
| Ausreißer | Niedrigste oder höchste Zahlenkarte einer aufgedeckten Runde, wenn beide mehr als zwei Positionen im Kartensatz auseinanderliegen; neu, mit /domain ins Glossar (mit 0018) |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `outlierCards` liefert diese Werte: für `1, 3, 13` die Menge `{1, 13}`; für `3, 5, 8` die leere Menge; für `0, 34, 34` die Menge `{0, 34}`; für `5, ?, COFFEE` die leere Menge; für `2, ?, 21` die Menge `{2, 21}`. Ohne Stimmen ist die Menge leer. | Unit `frontend/src/app/session/outliers.spec.ts` |
| A2 | In der aufgedeckten Ansicht mit den Stimmen Ben `1`, Cem `3` und Dana `13` tragen Ben und Dana „Ausreißer“, Cem nicht, und der Hinweis erscheint. Mit `3, 5, 8` erscheinen weder Markierung noch Hinweis. | Unit `frontend/src/app/session/round-result.spec.ts` |
| A3 | Im Browser stimmen zwei Entwickler `1` und `13`, dann löst der Scrum Master auf. Im Scrum-Master-Kontext und in beiden Entwickler-Kontexten tragen dieselben Stimmen „Ausreißer“, und der Hinweis ist sichtbar. | End-to-End `frontend/e2e/outliers.spec.ts` |
| A4 | Die Markierung ist ein Text in der Zeile der Stimme und wird vorgelesen. Die Lint-Regeln für Template-Barrierefreiheit sind grün. | Unit `round-result.spec.ts` (Text im Zugänglichkeitsbaum der Zeile); Aufruf `make check` |
| A5 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: Wenn `harness/scripts/risk-level.sh` die Dateien von `## Umsetzung` prüft, meldet es
medium für `frontend/src/app/session/` (Anwendungscode). Tests und E2E sind low.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`. `verify` läuft auch bei
medium. Reviews: Code, Sicherheit.
ADR nötig: nein, weil die Regel aus dem Umsetzungsplan stammt, nur im Frontend gilt, ohne
Alternative mit Wirkung auf andere Module, und weil sie ohne neue Abhängigkeit und ohne
Vertragsänderung auskommt.

## Umsetzung

Entscheidungen:

- keine

Dateien:

- `frontend/src/app/session/outliers.ts`: neu, `outlierCards(votes)` auf Basis von `CARDS`
- `frontend/src/app/session/outliers.spec.ts`: neu, A1
- `frontend/src/app/session/round-result.ts`: ändern, `outliers` als `computed`
- `frontend/src/app/session/round-result.html`: ändern, Text „Ausreißer“ je Stimme (`data-testid="result-vote-outlier"`), Hinweis (`data-testid="outlier-hint"`)
- `frontend/src/app/session/round-result.scss`: ändern, Hervorhebung der Zeile
- `frontend/src/app/session/round-result.spec.ts`: ändern, A2 und A4
- `frontend/e2e/outliers.spec.ts`: neu, A3

Schritte:

1. `outlierCards(votes: readonly { card: Card }[]): ReadonlySet<Card>` in `outliers.ts`. Die Funktion filtert die Zahlenkarten, bestimmt deren Positionen in `CARDS`, vergleicht kleinste und größte Position und liefert bei einem Abstand über 2 die beiden Karten.
2. `RoundResult`: `outliers = computed(() => outlierCards(this.votes()))`. Im Template stehen je Stimme mit Ausreißer-Karte der Text „Ausreißer“ (`$localize`) und eine Klasse an der Zeile, dazu der Hinweis über der Liste.
3. Unit-Tests, End-to-End-Test, `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `outliers.spec.ts`: Tabelle mit den Fällen aus A1 |
| A2 | `round-result.spec.ts`: Snapshot mit `1, 3, 13` und mit `3, 5, 8` |
| A3 | `outliers.spec.ts` (E2E): drei Browser-Kontexte, Issue 42 des GitLab-Doubles; Hilfsfunktionen wie in `result-round.spec.ts` |
| A4 | `round-result.spec.ts`: Text in der Zeile; `make check` (angular-eslint) |
| A5 | `make check`, `make e2e` |

Testdaten: Unit-Tests über den Store mit Snapshots wie in `round-result.spec.ts`. End-to-End: Sitzung über die Startseite, Issue 42 des GitLab-Doubles.

Contracts zu regenerieren: keine.

## Offene Fragen

keine

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/session/outliers.spec.ts`, `frontend/src/app/session/round-result.spec.ts`, `make e2e`
- Browser: aufgedeckte Ansicht in drei Kontexten (Scrum Master, zwei Entwickler)
