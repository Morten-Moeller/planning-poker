---
id: "0051"
title: Wiederholte i18n-Texte je Template nur einmal
status: done
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-24
updated: 2026-11-24
pr: "#59"
note: alle Kriterien erfüllt
---

# Wiederholte i18n-Texte je Template nur einmal

## Ziel

`angular-eslint` 22.7.0 (Dependabot-Pull-Request #55) prüft in der Regel
`@angular-eslint/template/i18n`, dass eine i18n-ID in einem Template nur einmal vorkommt.
`round-status.html` und `share-session.html` nennen vier Texte mit ihrer ID je zweimal;
`ng lint` scheitert dort mit acht Meldungen `Duplicate custom ID`. Nach der Änderung steht jeder
dieser Texte einmal im Template, und `ng lint` läuft mit `angular-eslint` 22.6.0 und 22.7.0 ohne
Fehler.

## Scope

### Enthalten

- `round-status.html`: der Text `@@roundStatus.number` steht einmal in einem `ng-template`; die
  zwei Stellen binden es mit `ngTemplateOutlet` ein.
- `share-session.html`: die Texte `@@share.copy`, `@@share.copied` und `@@share.copyFailed`
  stehen je einmal in einem `ng-template`; die je zwei Stellen binden sie ein.
- `NgTemplateOutlet` in den Imports der zwei Komponenten.

### Nicht enthalten

- Das Update der Frontend-Abhängigkeiten selbst (#55).
- Die Formatierung von `confirm-result-dialog.html`, `round-result.html` und
  `session-facts.html`: Prettier 3.10 aus #55 formatiert sie anders als Prettier 3.8 auf `main`;
  keine Fassung besteht beide Versionen. Sie gehört zum Update von Prettier.
- Neue IDs, geänderte Texte, eine Änderung an der Lint-Regel.

## Begriffe

Keine Fachbegriffe aus `docs/domain/glossary.md`.

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | In `round-status.html` und `share-session.html` kommt jede i18n-ID genau einmal vor. | Aufruf: `grep -ohE '@@[A-Za-z.]+' <datei> \| sort \| uniq -d` ohne Ausgabe, je Datei |
| A2 | `make lint` läuft auf dem Branch ohne Fehler (`angular-eslint` 22.6.0). | Aufruf: `make lint` |
| A3 | `ng lint` läuft mit den Abhängigkeiten aus #55 (`angular-eslint` 22.7.0) und den geänderten Dateien ohne Fehler. | Aufruf: `ng lint` in einem Worktree auf dem Head von #55 mit den vier Dateien dieser Änderung |
| A4 | Die sichtbaren Texte, die Elemente mit `data-testid` und ihre Attribute `role` und `class` sind an den acht Stellen unverändert; die Tests des Frontends und die End-to-End-Specs laufen ohne Fehler. | `make test`, `make e2e` |

## Contracts

keine.

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh`: die vier Dateien unter `frontend/src/` haben kein
Muster in der Matrix, das ist medium. Kein Eskalator.
Gates: G2, das Label `human-approved` einer Person vor dem Merge.
ADR nötig: nein, weil die Änderung lokal in zwei Komponenten bleibt und
`project-rules/frontend.md` (i18n-ID je Text, Templates in `.html`) folgt.

## Umsetzung

Entscheidungen:

- Die doppelten Textstellen werden zusammengelegt; IDs und Lint-Regel bleiben, wie sie sind
  (Entscheidung der Person vom 2026-11-24, gegen eigene IDs je Stelle).
- Mittel: `ng-template` am Ende des Templates und `ngTemplateOutlet` an den Stellen. Die
  umgebenden Elemente mit `data-testid`, `role` und `class` bleiben an ihrem Ort.
- `@@roundStatus.number` liest die Rundennummer aus `store.round()?.number` statt aus der
  Variablen des umgebenden `@if`; so braucht das `ng-template` keinen Kontext ohne Typ.
- Bei `@@share.copied`, `@@share.copyFailed` und `@@roundStatus.number` wandert das Attribut
  `i18n` vom `span` auf einen `ng-container` im `ng-template`; das `span` bleibt als Hülle.

Dateien:

- `frontend/src/app/session/round-status.html`: ändern
- `frontend/src/app/session/round-status.ts`: ändern, Import `NgTemplateOutlet`
- `frontend/src/app/session/share-session.html`: ändern
- `frontend/src/app/session/share-session.ts`: ändern, Import `NgTemplateOutlet`
- `docs/specs/0051-i18n-texte-einmal-im-template.md`: neu

Schritte:

1. Templates und Imports ändern, mit Prettier formatieren.
2. `make check`, `make e2e`.
3. A3: Worktree auf dem Head von #55, die vier Dateien hineinkopieren,
   `pnpm install --frozen-lockfile`, `ng lint`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | Aufruf `grep`; Ausgabe im Pull Request |
| A2 | `make lint` |
| A3 | Aufruf `ng lint` im Worktree; Ausgabe im Pull Request |
| A4 | Bestehende Tests `frontend/src/app/session/round-status.spec.ts`, `frontend/src/app/session/share-session.spec.ts` und die End-to-End-Specs unter `frontend/e2e/` |

Kein neuer automatischer Test: das Verhalten bleibt gleich, und die bestehenden Tests prüfen
Texte und `data-testid` der acht Stellen.

## Offene Fragen

- [x] Eigene IDs je Stelle, Templates umbauen oder die Prüfung abschalten? → Templates umbauen.
  (Morten Möller, 2026-11-24)

## Verifikationsplan

- make check
- betroffene Tests: `make test`, `make e2e`, die Aufrufe zu A1 und A3
- Browser: keiner
