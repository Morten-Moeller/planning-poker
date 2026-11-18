---
id: "0044"
title: Lazy Loading der Routen und geprüfte Budgets
status: done
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-18
updated: 2026-11-18
pr: "#47"
note: alle Kriterien erfüllt; Status nach dem Merge nachgetragen
---

# Lazy Loading der Routen und geprüfte Budgets

## Ziel

Der Produktions-Build des Frontends scheitert an den Budgets in `frontend/angular.json`: das
Initial-Bundle liegt bei 1,00 MB und damit 1 Byte über der Fehlergrenze, `confetti.scss` liegt mit
8,37 kB über der Fehlergrenze von 8 kB. Kein Gate merkt das, weil `make typecheck` nur den
Entwicklungs-Build ohne Budgets ausführt. Nach der Änderung lädt die Startseite die Sitzungsseite
und die Beitrittsseite erst bei Bedarf, der Produktions-Build hält alle Fehlergrenzen ein, und
`make check` und CI scheitern, sobald eine Grenze überschritten ist.

Messung vom 2026-11-18 (Produktions-Build, roh / übertragen):

| Stand | main.js | Initial gesamt | Lazy Chunk Sitzung |
|---|---|---|---|
| heute | 983 kB / 208 kB | 1,00 MB / 211 kB | – |
| Routen lazy (Probe) | 663 kB / 151 kB | 680 kB / 154 kB | 315 kB / 64 kB |

## Scope

### Enthalten

- Routen `/session/:id/join` und `/session/:id` mit `loadComponent`; die Startseite `/` bleibt im
  Initial-Bundle.
- Konfetti: die Werte je Teil (Position, Größe, Farbe, Dauer, Verzögerung, Versatz) kommen aus
  `confetti.ts` als Style-Bindung statt aus 46 generierten SCSS-Regeln. Formeln und Aussehen bleiben
  gleich.
- `pnpm typecheck` führt den Produktions-Build aus; damit prüfen `make typecheck`, `make check`
  und CI die Budgets.
- `project-rules/frontend.md` nennt Lazy Loading der Routen und die Budget-Prüfung.

### Nicht enthalten

- Material-Komponenten ersetzen oder entfernen.
- Budgets ändern. Die Werte in `frontend/angular.json` bleiben (Antwort auf die offene Frage).
- Die Warnungen für Komponenten-Styles über 4 kB (`card.scss`, `session-page.scss`,
  `app-shell.scss` u. a.); sie sind Warnungen, keine Fehler.
- Preloading-Strategie des Routers.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Sitzung | wie im Glossar; hier nur der Name der Route `/session/:id` |
| Initial-Bundle | technischer Begriff, kein Domänenbegriff: alle JS- und CSS-Dateien, die der Browser vor der ersten Anzeige lädt |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `pnpm -C frontend build` endet ohne Budget-Fehler. | Aufruf |
| A2 | Das Initial-Bundle des Produktions-Builds ist kleiner als 700 kB roh; `session-page` und `join-page` erscheinen in der Ausgabe als eigene Lazy Chunks. | Aufruf |
| A3 | Die Routen `session/:id/join` und `session/:id` haben `loadComponent` und kein `component`; `session/:id` behält `sessionGuard`. | Test |
| A4 | Jedes der 46 Konfetti-Teile hat dieselben Werte wie vorher (Formeln aus `confetti.scss` in Spec 0042); die kompilierten Styles von `confetti.scss` sind kleiner als 4 kB. | Test, Aufruf |
| A5 | Der Konfetti-Regen bei Konsens fällt wie vorher: 46 Teile, verschiedene Verzögerungen und Dauern. | Test (e2e) |
| A6 | Ein direkter Aufruf von `/session/:id` mit Token zeigt den Raum, ohne Token die Beitrittsseite; Anlegen und Beitreten funktionieren wie vorher. | Test (e2e), Browser |
| A7 | `make typecheck` scheitert, wenn ein Budget-Fehler auftritt. | Aufruf |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh`: Quellcode ohne Muster (`app.routes.ts`, Konfetti),
`frontend/package.json` als Abhängigkeits-Manifest und `project-rules/**` sind medium; die
Testdateien sind low. Keine Eskalation durch Größe oder Schlüsselwörter.
Gates: G2, das Label `human-approved` einer Person vor dem Merge; `/verify` läuft nach CI, G3
ist für medium nicht verlangt (`verify_required_for: high`).
ADR nötig: nein, weil keine neue Abhängigkeit, kein Contract und keine Abweichung von einer Regel;
Lazy Loading ist eine lokale Entscheidung im Frontend ohne Alternative, die festgehalten werden
muss.

## Umsetzung

Entscheidungen:

- `pnpm typecheck` (Gate `typecheck`) baut künftig mit der Konfiguration `production` statt
  `development`; das Gate wird strenger, nicht schwächer.
- Konfetti-Werte je Teil werden in TypeScript berechnet statt in SCSS.

Dateien:

- `frontend/src/app/app.routes.ts`: ändern, `loadComponent` für Beitritt und Sitzung
- `frontend/src/app/app.routes.spec.ts`: neu, Test der Routen
- `frontend/src/app/session/confetti.ts`: ändern, Werte je Teil berechnen
- `frontend/src/app/session/confetti.html`: ändern, Style-Bindung je Teil
- `frontend/src/app/session/confetti.scss`: ändern, Schleife `@for` entfernen
- `frontend/src/app/session/confetti.spec.ts`: neu, Test der Werte je Teil
- `frontend/package.json`: ändern, Skript `typecheck` auf `ng build`
- `project-rules/frontend.md`: ändern, Lazy Loading und Budget-Prüfung

Schritte:

1. `app.routes.ts`: `JoinPage` und `SessionPage` mit `loadComponent: () => import(...).then(...)`
   laden, statische Importe entfernen.
2. `confetti.ts`: ein Array `pieces` mit Objekten je Teil (`left`, `width`, `height`, `color`,
   `duration`, `delay`, `dx`, `start`) aus denselben Formeln wie in `confetti.scss`; Farben als
   dieselben CSS-Variablen.
3. `confetti.html`: `[style]` je Teil mit diesen Werten; die CSS-Variablen `--dx` und `--start`
   bleiben.
4. `confetti.scss`: `@for`-Schleife und Variablen entfernen; `:host`, `.piece`, `@keyframes fall`
   und die Regel für `prefers-reduced-motion` bleiben.
5. `package.json`: `"typecheck": "ng build"`.
6. `project-rules/frontend.md`: unter Routes Lazy Loading für Beitritt und Sitzung; unter Stack,
   dass `typecheck` den Produktions-Build mit den Budgets aus `angular.json` ausführt.
7. `make check` und `make e2e` (mit `BACKEND_PORT`/`FRONTEND_PORT` laut `project-rules/testing.md`).

Tests:

| Kriterium | Test |
|---|---|
| A1 | Aufruf `pnpm -C frontend build` |
| A2 | Aufruf `pnpm -C frontend build`, Tabelle der Ausgabe |
| A3 | `frontend/src/app/app.routes.spec.ts`: Beitritt und Sitzung laden ihre Komponente lazy, Sitzung mit `sessionGuard` |
| A4 | `frontend/src/app/session/confetti.spec.ts`: Werte von Teil 0, 1 und 45 gleich den Formeln, 46 Teile; Ausgabe des Builds ohne Budget-Meldung für `confetti.scss` |
| A5 | `frontend/e2e/confetti.spec.ts` unverändert |
| A6 | `frontend/e2e/create-and-join.spec.ts`, `frontend/e2e/full-flow.spec.ts` unverändert; Browser: Startseite, Beitrittsseite, Raum |
| A7 | Aufruf: Fehlergrenze in `angular.json` lokal auf 100 kB setzen, `make typecheck` scheitert, Änderung zurücknehmen (nicht committen) |

## Offene Fragen

- [x] Soll die Fehlergrenze des Initial-Bundles von 1 MB auf 800 kB sinken, damit sie den Gewinn
  absichert (heute gemessen 680 kB)? Die Warnung bei 500 kB bleibt. → Nein, 1 MB bleibt
  (Morten Möller, 2026-11-18)

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/app.routes.spec.ts`, `frontend/src/app/session/confetti.spec.ts`,
  `frontend/e2e/confetti.spec.ts`, `frontend/e2e/create-and-join.spec.ts`,
  `frontend/e2e/full-flow.spec.ts`
- Browser: Startseite, Beitrittsseite, Raum mit Konsens-Konfetti
