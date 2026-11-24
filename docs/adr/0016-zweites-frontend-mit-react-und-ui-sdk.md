# 0016: Zweites Frontend mit React 19, Vite und UI SDK neben dem Angular-Frontend

Status: accepted
Datum: 2026-11-24
Spec: docs/specs/0053-react-frontend-geruest.md
Ersetzt Grundregeln: A1.7 (für die Oberfläche: zwei Frontends mit je eigenem Komponenten-Satz)

## Kontext

Das Frontend ist nach ADR 0001 ein Angular-Projekt mit Angular Material; Angular ist Vorgabe der
Coding Challenge (R-26) und bleibt bestehen. Die Person will dieselbe Anwendung zusätzlich als
React-Frontend mit den Komponenten des UI SDK (<https://ui-sdk.dev>) haben: gleicher Vertrag
(`contracts/api/openapi.yaml`), gleiches Backend, gleiches Design „Werkbank“ (`docs/design/`),
gleiche End-to-End-Tests. ADR 0001 nennt jede weitere Bibliothek für einen dort genannten Bereich
eine Abweichung von A1.7; ein zweites Frontend ist eine solche Abweichung.

Stand des UI SDK am 2026-11-24 (Quellen: ui-sdk.dev, npm-Registry):

- Pakete `@ui-sdk/react` und `@ui-sdk/core`, Lizenz Apache-2.0, Quelltext `github.com/vercel-labs/ui`.
- Neueste Version `0.1.0-beta.16` vom 2026-11-23. Die erste Beta ist jünger als zwei Wochen, seit
  dem 2026-11-15 erschien fast täglich eine neue. Die Dokumentation nennt auf jeder Seite, dass
  sich APIs noch ändern.
- Peer-Abhängigkeiten: `react` und `react-dom` ab 19, `@types/react` ab 19.2.10.
- Die Komponenten haben kein eigenes Aussehen. Jedes Teil trägt `data-slot`, Zustände stehen als
  Attribute (`data-pressed`, `data-open`, `data-disabled`). Die Bibliothek fügt zur Laufzeit CSS in
  die Cascade Layer `ui-sdk` ein (versteckte Popups, Abdunklung, Rücksetzen des Popover-Rahmens).
  `@ui-sdk/core/web.css` ist ein optionales Standard-Aussehen.
- 56 Komponenten, darunter Button, Toggle, Field, Input, Select, Autocomplete, Segmented Control,
  Dialog, Alert Dialog, Toast, Collapsible, Tooltip, Progress. Es gibt keine Tabelle, kein Badge
  und keine Card; diese Teile sind eigenes HTML und CSS.

Lookups vom 2026-11-24:

| Produkt | Linie | Quelle | Stand |
|---|---|---|---|
| React | 19 | `harness/scripts/stack-check.sh --latest react` (endoflife.date) | keine LTS-Linien, neueste Linie mit Support, neueste Version 19.3.1 |
| Node.js | 26 | `harness/scripts/stack-check.sh --latest nodejs` | LTS seit 2026-10-28, unverändert aus `.nvmrc` |
| pnpm | 12 | `harness/scripts/stack-check.sh --latest pnpm` | neueste Linie, wie im Angular-Frontend |
| ESLint | 10 | `harness/scripts/stack-check.sh --latest eslint` | einzige Linie mit Support |
| Vite | 8 | npm-Registry (`npm view vite`), endoflife.date führt Vite nicht | neueste Version 8.3.8 |
| TypeScript | 6.0 | npm-Registry | neueste Version 7.0.2; `typescript-eslint` 8.74.0 nennt `typescript >=4.8.4 <6.1.0` |
| React Router | 8 | npm-Registry | neueste Version 8.5.2, braucht `react >=19.2.7` |
| UI SDK | 0.1.0-beta | npm-Registry | siehe oben |

## Optionen

### Option A: Zweites Projekt `frontend-react/` mit Vite, React 19 und UI SDK, eigenes CSS

- Vorteile: Das Angular-Frontend, der Vertrag und das Backend bleiben unverändert. Beide Frontends
  laufen gegen dasselbe Backend und dieselbe Playwright-Suite, die Gleichheit ist prüfbar. Die
  Werkbank-Tokens und die SCSS-Regeln lassen sich als CSS-Variablen und CSS Modules fast 1:1
  übernehmen. Keine weitere Styling-Abhängigkeit.
- Nachteile: Zwei Frontends zu pflegen; jede Änderung an der Oberfläche fällt doppelt an. Zweite
  Toolchain im Frontend (Vite neben Angular CLI), längere Gates und doppelte Laufzeit von
  `make e2e`. UI SDK ist eine Beta ohne zugesagte Stabilität.

### Option B: Wie A, mit Tailwind CSS 4

- Vorteile: Der vom UI SDK dokumentierte Weg; kurze Schreibweise für Zustände
  (`data-pressed:…`).
- Nachteile: Eine weitere Abhängigkeit; die Werkbank-Tokens müssten zusätzlich als Tailwind-Theme
  abgebildet werden; die vorhandenen SCSS-Regeln lassen sich nicht direkt übernehmen.

### Option C: Angular-Frontend durch React ersetzen

- Vorteile: Ein Frontend, kein doppelter Aufwand.
- Nachteile: Verstößt gegen die Vorgabe R-26 und ersetzt ADR 0001; bis zur Parität gibt es keine
  vollständige Oberfläche.

### Option D: Nichts tun

- Vorteile: Kein Aufwand, kein Risiko durch eine Beta.
- Nachteile: Der Vergleich mit React und UI SDK findet nicht statt.

## Entscheidung

Option A (Entscheidung der Person in der Session, 2026-11-24). Das React-Frontend liegt in
`frontend-react/` als eigenes pnpm-Projekt mit eigenem Lockfile. Stack: React 19 (neueste Linie
mit Support, Lookup oben), Vite 8, TypeScript 6.0, React Router 8, `@ui-sdk/react` und
`@ui-sdk/core`. Styling mit CSS Modules und CSS-Variablen; die Tokens tragen dieselben Namen wie
im Angular-Frontend (`--mat-sys-*`, `--app-*`), damit die End-to-End-Tests beider Frontends
dieselben Werte lesen. Ohne `@ui-sdk/core/web.css`. Tests: vitest mit jsdom und React Testing
Library, End-to-End mit der vorhandenen Playwright-Suite in `frontend/e2e/`. Lint: ESLint 10 mit
`typescript-eslint`, `eslint-plugin-react-hooks` und `eslint-plugin-jsx-a11y`, dazu Prettier.

Weitere Festlegungen:

- TypeScript 6.0 statt 7.0: `typescript-eslint` 8.74.0 unterstützt TypeScript nur unter 6.1.0
  (Peer-Angabe im npm-Paket). Wechsel auf 7, sobald `typescript-eslint` die Linie nennt.
- `eslint-plugin-jsx-a11y` 6.10.2 nennt ESLint nur bis 9 als Peer, ESLint 9 hat keinen Support
  mehr. Ein Lauf im Scratchpad am 2026-11-24 zeigt, dass die Regeln unter ESLint 10.15.0 melden.
  `frontend-react/pnpm-workspace.yaml` erlaubt diese Peer-Version ausdrücklich.
- Die beiden UI-SDK-Pakete stehen mit exakter Version im Manifest, ohne `^`. `minimumReleaseAge`
  (7 Tage) gilt auch hier: Installiert wird die neueste Beta, die am Tag der Umsetzung mindestens
  7 Tage alt ist. Ein Update ist ein eigener Pull Request mit grüner End-to-End-Suite.
- Kein Zustands- und kein i18n-Paket: der Zustand liegt in einem eigenen Store mit
  `useSyncExternalStore` (ADR 0004 gilt unverändert), die Texte in einem typisierten Katalog mit
  den Schlüsseln des Angular-Frontends.
- Tailwind CSS wird nicht eingeführt.

## Folgen

- ADR 0001 bleibt gültig; das Angular-Frontend bleibt das Frontend der Abgabe. Bis zur letzten
  Spec der Roadmap (Teil 2 in `docs/roadmap.md`) ist das React-Frontend unvollständig.
- Neue Datei `project-rules/frontend-react.md`; `project-rules/testing.md` und
  `docs/architecture/overview.md` nennen das zweite Frontend.
- `harness/config.yml` (Datei der Person): Eintrag `"react 19"` in `stack` und
  `frontend-react/src` in `source_paths`. Vite, TypeScript, React Router und UI SDK führt
  endoflife.date nicht; ihre Linien stehen in `project-rules/frontend-react.md` mit dem Lookup.
- `make test`, `typecheck`, `lint` und `e2e` laufen für beide Frontends; `make contracts` schreibt
  die generierten Typen in beide Projekte. Dependabot bekommt den Eintrag `/frontend-react`.
- Die Playwright-Suite läuft zweimal: gegen Angular und, eingeschränkt auf Tests mit dem Tag
  `@react`, gegen React. Selektoren, die nur im Angular-Frontend existieren (`app-start-page`,
  `mat-button-toggle-checked`), ersetzt die Spec, die den Test für React freischaltet, durch
  `data-testid` oder ARIA-Attribute.
- Risiko Beta: Eine Änderung der UI-SDK-API kann ein Update blockieren. Bedingung für eine neue
  Entscheidung: Eine Komponente, die eine Spec braucht, fehlt oder besteht die Barrierefreiheits-
  oder End-to-End-Prüfung nicht, und eine eigene Umsetzung ist größer als die Komponente selbst.
- Jede Änderung an der Oberfläche nach der Parität braucht eine Aussage in ihrer Spec, ob sie für
  beide Frontends gilt.
