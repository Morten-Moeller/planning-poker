---
id: "0066"
title: "Angular-Frontend: Test der Issue-Liste nach einem Fehler in drei Fälle teilen"
status: done
risk: low
adrs: []
owner: Morten Möller
created: 2026-11-26
updated: 2026-11-26
pr: "#75"
note: freigegeben in der Session
---

# Angular-Frontend: Test der Issue-Liste nach einem Fehler in drei Fälle teilen

## Ziel

Das Review von Spec 0064 nennt einen Hinweis: In `frontend/src/app/session/issue-panel.spec.ts`
prüft der Test „shows no empty state after a failed load with another code and shows it after an
empty load“ zwei Abläufe, und der Fall „Fehler beim Nachladen einer weiteren Seite“ hat keinen
eigenen Test wie im React-Frontend. Am Ende hat jeder Ablauf einen Test, dessen Name sagt, was
bricht.

## Scope

### Enthalten

- Der Test wird in zwei Tests geteilt; ein dritter Test prüft den Fehler beim Nachladen.

### Nicht enthalten

- Änderungen an `issue-panel.ts`, `issue-panel.html` oder am React-Frontend.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Issue | wie im Glossar |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `frontend/src/app/session/issue-panel.spec.ts` hat drei Tests mit je einem Ablauf: (a) ein Fehler mit `INVALID_STATE` nach geladenen Treffern lässt die Treffer stehen und zeigt weder `issue-results-empty` noch `issue-results-error`; (b) nach einem solchen Fehler zeigt ein Laden ohne Treffer `issue-results-empty`; (c) ein Fehler mit `INVALID_STATE` bei „Mehr laden“ lässt die Treffer stehen und zeigt `issue-results-empty` nicht. | vitest: `pnpm -C frontend test` |
| A2 | Jede Erwartung des bisherigen Tests steht in einem der neuen Tests. Der Test „shows no empty state when the first load fails with another code“ bleibt unverändert. | Aufruf: `git diff` der Datei |
| A3 | Gegenprobe: Bindet `issue-panel.html` den leeren Zustand wieder an `failed()` statt an `loadFailed()`, schlägt der unveränderte Test zum ersten Laden fehl. Löscht `issue-panel.ts` im Fehlerzweig die Treffer, schlagen (a) und (c) fehl. Beide Änderungen werden nach der Gegenprobe zurückgenommen. | Aufruf: lokale Gegenprobe, Ergebnis im Pull Request |

## Contracts

keine Änderung.

## Risiko

Stufe: low
Begründung: `harness/scripts/risk-level.sh` nennt für die Dateiliste low (eine Testdatei,
`docs/**`).
Gates: die Pflicht-Checks und das Code-Review; GitHub merged danach.
ADR nötig: nein, weil keine Bedingung aus `harness/policies/adr.md` zutrifft.

## Umsetzung

Entscheidungen:

- keine

Dateien:

- `frontend/src/app/session/issue-panel.spec.ts`: ändern, ein Test wird zu drei

Schritte:

1. Den Test in (a) und (b) teilen, (c) mit `open(lobbyScrumMaster, FIRST_PAGE, 2)` und
   `issue-load-more` ergänzen.
2. Gegenprobe zu A3, danach zurücknehmen.
3. `make check`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `frontend/src/app/session/issue-panel.spec.ts`: die drei Fälle |
| A2 | Aufruf wie im Kriterium |
| A3 | Aufruf wie im Kriterium |

Testdaten: keine neuen.

## Offene Fragen

keine

## Verifikationsplan

- make check
- betroffene Tests: `pnpm -C frontend test`
- Browser: keiner. Kein Kriterium nennt einen Bildschirm.
