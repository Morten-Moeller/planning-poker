---
id: "0053"
title: "React-Frontend: Gerüst mit Gates, Theme, Shell und Health"
status: Review
risk: high
adrs: ["0016"]
owner: Morten Möller
created: 2026-11-24
updated: 2026-11-24
pr: ""
note: freigegeben in der Session
---

# React-Frontend: Gerüst mit Gates, Theme, Shell und Health

## Ziel

Das Repository hat ein Frontend (Angular, ADR 0001). Die Person will die Anwendung zusätzlich als
React-Frontend mit den Komponenten des UI SDK (Roadmap Teil 2, ADR 0016). Diese Spec legt das
Projekt `frontend-react/` an: Build, Gates, CI, das Design „Werkbank“ als CSS-Variablen, die
Toolbar mit dem Hell-Dunkel-Umschalter und eine Startseite, die den Zustand des Backends zeigt.
Gelöst ist es, wenn `make check` beide Frontends prüft, `make frontend-react` die Seite gegen das
laufende Backend zeigt und die freigeschalteten Playwright-Tests gegen React grün sind.

## Scope

### Enthalten

- Projekt `frontend-react/`: pnpm 12 mit eigenem Lockfile und den Regeln aus
  `frontend/pnpm-workspace.yaml`, Vite 8, React 19, TypeScript 6.0, React Router 8,
  `@ui-sdk/react` und `@ui-sdk/core`, vitest mit jsdom und React Testing Library, ESLint 10 und
  Prettier.
- Tokens der Werkbank hell und dunkel mit denselben Namen wie im Angular-Frontend, Schriften,
  Fokusring.
- Shell: Toolbar mit Titel-Link und Hell-Dunkel-Umschalter, Hauptbereich.
- Startseite mit Titel, Einleitung und dem Footer mit dem Zustand des Backends
  (`GET /api/health`).
- Textkatalog auf Deutsch mit den Schlüsseln des Angular-Frontends.
- Generierte API-Typen für das React-Frontend aus `make contracts`.
- Make-Targets, Playwright-Lauf gegen React, Setup-Action, Dependabot.
- `project-rules/frontend-react.md`, Ergänzungen in `project-rules/testing.md`,
  `docs/architecture/overview.md` und `README.md`.

### Nicht enthalten

- Formular „Sitzung anlegen“, Kartenhand, letzte Sitzungen (Spec 0056).
- Routen `/session/:id/join` und `/session/:id`, `ErrorBanner`, `ApiService` (Specs 0054, 0057,
  0058).
- Sitzung, Motiv und „Name · Rolle“ in der Toolbar.
- Bundle-Grenze (Spec 0062).
- `harness/config.yml`: Die Person setzt `"react 19"` in `stack` und `frontend-react/src` in
  `source_paths` selbst.
- Änderungen am Angular-Frontend, am Backend und an `contracts/`.

## Begriffe

Keine neuen Fachbegriffe. Aus `docs/domain/glossary.md` kommt keiner vor; die Seite zeigt nur den
Zustand des Backends.

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `make install` installiert die Abhängigkeiten von `frontend-react/` mit `--frozen-lockfile`. `make test`, `make typecheck`, `make lint` und `make format` schließen `frontend-react/` ein; es gibt die Targets `test-frontend-react`, `typecheck-frontend-react` und `lint-frontend-react`. | Aufruf: `make install`, `make check` |
| A2 | `make frontend-react` startet den Vite-Server auf `FRONTEND_REACT_PORT` aus `.env` (Standard 4300) und leitet `/api` und `/ws` an `BACKEND_PORT` weiter. Die Startseite zeigt `h1` „Issues gemeinsam schätzen“ und im Footer `start-footer` den Text „Backend erreichbar“ in `health-status`. | Playwright: `frontend/e2e/health.spec.ts`, Test „start page shows that the backend is reachable“ mit Tag `@react`; Bildschirm: Startseite |
| A3 | Ohne erreichbares Backend zeigt der Footer `health-down` (`role="alert"`) mit dem Text des Angular-Frontends und den Button `health-retry`. Ein Klick fragt `/api/health` erneut ab; nach einer Antwort 200 steht „Backend erreichbar“ da und `health-down` ist nicht mehr im DOM. | vitest: `frontend-react/src/start/start-page.spec.tsx` |
| A4 | Die Toolbar `toolbar` zeigt den Link `toolbar-home` „Planning Poker“ auf `/` und rechts den Umschalter `theme-toggle`. Er ist die Komponente `Toggle` aus `@ui-sdk/react/toggle`: `aria-label` „Dunkles Design“ und Symbol 🌙 im hellen Design, „Helles Design“ und ☀️ im dunklen, `aria-pressed` `true` im dunklen. Das Symbol steht in einem `span` mit der Klasse `app-symbol` und `aria-hidden`. | vitest: `frontend-react/src/shell/app-shell.spec.tsx`; Playwright: `frontend/e2e/theme-toggle.spec.ts`, die zwei Tests „a click switches to … and the choice stays after a reload“ mit `@react` |
| A5 | Ein Klick auf `theme-toggle` wechselt vom sichtbaren Design zum anderen, setzt `data-theme="light"` oder `"dark"` auf `<html>` und schreibt `theme` in `localStorage` unter `planningpoker.preferences`; andere Felder des Eintrags bleiben erhalten. Nach einem Neuladen gilt die Wahl vor dem ersten Rendern. Ohne Wahl folgt das Design `prefers-color-scheme`. Ungültiges JSON oder ein Fehler von `localStorage` ergibt `system`, keinen Fehler. | vitest: `frontend-react/src/shell/theme-store.spec.ts`; Playwright wie A4 |
| A6 | Tokens: hell `--mat-sys-surface` `#fafafa`, `--mat-sys-primary` `#2f5fd0`, `--app-success` `#3a7a39`; dunkel `#282c34`, `#61afef`, `#98c379`. Der Hintergrund von `body` ist `--mat-sys-surface`. Jede Variable `--mat-sys-*` und `--app-*`, die `frontend/src/styles.scss` für hell und dunkel setzt, hat in `frontend-react/src/styles/tokens.css` denselben Wert. | Playwright: `frontend/e2e/theme.spec.ts`, die zwei Tests „the start page uses the … theme of the system“ mit `@react`; Aufruf: Vergleich der berechneten Variablen beider Frontends im Browser durch `/verify` |
| A7 | Text steht in IBM Plex Sans. Der Umschalter zeigt nach Tastaturfokus einen Umriss von 3 px in `--mat-sys-primary` mit 3 px Abstand, nach einem Mausklick keinen. | Bildschirm: Startseite, Tab auf `theme-toggle` |
| A8 | `make contracts` schreibt zusätzlich `frontend-react/src/api/schema.d.ts` aus `contracts/api/openapi.yaml`; `make drift` meldet keinen Unterschied. `health-api.ts` nimmt `HealthStatus` aus dieser Datei. | Aufruf: `make drift` |
| A9 | Jeder Text der Oberfläche kommt aus `frontend-react/src/i18n/messages.ts`. Ein Schlüssel, den kein Quelltext verwendet, lässt `make test` scheitern; ein unbekannter Schlüssel `make typecheck`; ein Text mit Buchstaben direkt im JSX `make lint`. | vitest: `frontend-react/src/i18n/messages.spec.ts`; Aufruf: `make lint` mit einer Probe-Datei im Scratchpad |
| A10 | `make e2e` lässt die Suite erst gegen Angular laufen, danach die Tests mit dem Tag `@react` gegen das React-Frontend, beides unter einer Anwendungssperre. `E2E_FRONTEND=react pnpm -C frontend exec playwright test` lässt nur den React-Lauf laufen. Ohne die Variable ändert sich der Angular-Lauf nicht. | Aufruf: `BACKEND_PORT=18080 FRONTEND_PORT=14200 make e2e` |
| A11 | `@ui-sdk/react` und `@ui-sdk/core` stehen mit derselben exakten Version ohne `^` in `frontend-react/package.json`; die Version ist am Tag der Installation mindestens 7 Tage alt. `frontend-react/pnpm-workspace.yaml` hat `minimumReleaseAge: 10080`, `blockExoticSubdeps: true` und `trustPolicy: no-downgrade`. | Aufruf: `npm view @ui-sdk/react time --json`, `pnpm -C frontend-react install --frozen-lockfile` |
| A12 | CI installiert die Abhängigkeiten von `frontend-react/` in der Setup-Action; alle Jobs `gates` des Pull Requests sind grün. `.github/dependabot.yml` hat einen npm-Eintrag für `/frontend-react` mit der Abkühlzeit von 7 Tagen. | CI-Lauf des Pull Requests |
| A13 | `project-rules/frontend-react.md` beschreibt Stack, Struktur, Tokens, Texte, UI-SDK-Regeln und Gates mit `sources:` auf `frontend-react/`. `project-rules/testing.md`, `docs/architecture/overview.md` und `README.md` nennen das zweite Frontend, seinen Port und den React-Lauf der End-to-End-Tests. | Aufruf: `grep -n "frontend-react" project-rules/testing.md docs/architecture/overview.md README.md` |
| A14 | `harness/scripts/stack-check.sh` besteht für eine Konfiguration mit den heutigen Einträgen und `react 19`. | Aufruf mit `--config` auf eine Datei im Scratchpad |

## Contracts

keine Änderung. `frontend-react/src/api/schema.d.ts` ist eine zweite generierte Kopie der Typen
aus `contracts/api/openapi.yaml`; `make contracts` schreibt sie, `make drift` prüft sie.

## Risiko

Stufe: high
Begründung: `harness/scripts/risk-level.sh` (48 Dateien): `.env.example` trifft `**/*.env*`
(high). `frontend-react/**`, `Makefile`, `.github/actions/**`, `.github/dependabot.yml`,
`frontend/playwright.config.ts` und `project-rules/**` sind medium, zwei davon
Abhängigkeits-Manifeste. Dokumente und Testdateien sind low.
Gates: G2, das Label `human-approved` einer Person nach dem letzten Push; G3, der Status
`verified` von `/verify` am Head-Commit; Code-, Sicherheits- und Architektur-Review in `/review`.
ADR nötig: ja, ADR 0016: neues Framework und neue Abhängigkeiten (`harness/policies/adr.md`,
Punkt 2), Abweichung von A1.7 und von ADR 0001 (Punkt 5), hohes Risiko (Punkt 1).

## Umsetzung

Entscheidungen:

- Neues Projekt `frontend-react/` mit React 19, Vite 8, TypeScript 6.0, React Router 8 und UI SDK
  (Beta, exakte Version, mindestens 7 Tage alt) nach ADR 0016; kein Tailwind, kein
  `@ui-sdk/core/web.css`, kein Zustands- und kein i18n-Paket.
- `frontend-react/pnpm-workspace.yaml` erlaubt `eslint-plugin-jsx-a11y` unter ESLint 10
  (`peerDependencyRules.allowedVersions`); das Paket nennt nur ESLint bis 9, ein Lauf am
  2026-11-24 zeigt, dass die Regeln melden.
- Der Hell-Dunkel-Zustand liegt in einem eigenen `theme-store.ts` mit dem Schlüssel und Format des
  Angular-Frontends, nicht in der Komponente `Preferences` des UI SDK.
- Playwright: `E2E_FRONTEND=react` wählt den Vite-Server und `grep: /@react/`. In
  `frontend/e2e/theme.spec.ts` und `frontend/e2e/theme-toggle.spec.ts` warten vier Tests künftig
  auf `theme-toggle` statt auf `create-form`; ihre Prüfungen bleiben gleich. `make e2e` dauert
  durch den zweiten Lauf länger.
- Neue Variable `FRONTEND_REACT_PORT` (Standard 4300) in `.env.example`; das hebt die Stufe auf
  high.

Dateien:

- `frontend-react/package.json`: neu, Skripte `start`, `build`, `test`, `typecheck`, `lint`, `format`; Abhängigkeiten
- `frontend-react/pnpm-lock.yaml`: neu
- `frontend-react/pnpm-workspace.yaml`: neu, Regeln wie im Angular-Frontend, Peer-Regel für `jsx-a11y`
- `frontend-react/.prettierrc`: neu, `printWidth` 100, `singleQuote`
- `frontend-react/.prettierignore`: neu
- `frontend-react/eslint.config.js`: neu, `typescript-eslint`, `react-hooks`, `jsx-a11y`, `no-warning-comments`, Regel gegen Text im JSX
- `frontend-react/tsconfig.json`: neu, `strict`, `resolveJsonModule`
- `frontend-react/vite.config.ts`: neu, React-Plugin, Proxy für `/api` und `/ws` aus `BACKEND_PORT`, vitest mit jsdom
- `frontend-react/index.html`: neu, `lang="de"`, CSP `img-src 'self' data:`, IBM Plex Sans und Mono, Skript, das `data-theme` vor dem ersten Rendern setzt
- `frontend-react/public/favicon.ico`: neu, Kopie aus `frontend/public/`
- `frontend-react/public/favicon.svg`: neu, Kopie aus `frontend/public/`
- `frontend-react/public/apple-touch-icon.png`: neu, Kopie aus `frontend/public/`
- `frontend-react/src/main.tsx`: neu, Einstieg, Import der globalen Styles
- `frontend-react/src/app.tsx`: neu, Router mit der Route `/` wie in `frontend/src/app/app.routes.ts`, ohne die beiden Sitzungsrouten
- `frontend-react/src/vite-env.d.ts`: neu, Typen für CSS Modules
- `frontend-react/src/test-setup.ts`: neu, Aufräumen nach jedem Test
- `frontend-react/src/styles/tokens.css`: neu, `--mat-sys-*` und `--app-*` hell und dunkel
- `frontend-react/src/styles/global.css`: neu, `@layer ui-sdk;` als erste Zeile, Grundstil, Schriften, Fokusring, `visually-hidden`, `app-symbol`
- `frontend-react/src/i18n/messages.ts`: neu, Katalog `de` und `t(key)`
- `frontend-react/src/i18n/messages.spec.ts`: neu, meldet unbenutzte Schlüssel
- `frontend-react/src/shell/app-shell.tsx`: neu, Toolbar, Umschalter, `main`
- `frontend-react/src/shell/app-shell.module.css`: neu
- `frontend-react/src/shell/app-shell.spec.tsx`: neu
- `frontend-react/src/shell/theme-store.ts`: neu, Wahl `system`, `light`, `dark`, `data-theme`, Ablage
- `frontend-react/src/shell/theme-store.spec.ts`: neu
- `frontend-react/src/start/start-page.tsx`: neu, Titel, Einleitung, Footer mit Health
- `frontend-react/src/start/start-page.module.css`: neu
- `frontend-react/src/start/start-page.spec.tsx`: neu
- `frontend-react/src/start/health-api.ts`: neu, `GET /api/health` mit `fetch`
- `frontend-react/src/api/schema.d.ts`: neu, generiert von `make contracts`
- `Makefile`: ändern, Targets für `frontend-react`, `contracts`, `install`, `e2e`, `format`
- `.gitignore`: ändern, `frontend-react/dist/`
- `.env.example`: ändern, `FRONTEND_REACT_PORT`
- `README.md`: ändern, Start des React-Frontends, Verzeichnisübersicht, Befehle
- `.github/actions/setup/action.yml`: ändern, Installation für `frontend-react/`, Cache-Pfad des zweiten Lockfiles
- `.github/dependabot.yml`: ändern, npm-Eintrag `/frontend-react`
- `frontend/playwright.config.ts`: ändern, `E2E_FRONTEND`
- `frontend/e2e/health.spec.ts`: ändern, Tag `@react` am ersten Test
- `frontend/e2e/theme.spec.ts`: ändern, Tag `@react` und Warten auf `theme-toggle` in zwei Tests
- `frontend/e2e/theme-toggle.spec.ts`: ändern, Tag `@react` und Warten auf `theme-toggle` in zwei Tests
- `project-rules/frontend-react.md`: neu
- `project-rules/README.md`: ändern, Zeile für `frontend-react.md`
- `project-rules/testing.md`: ändern, Ebenen, Bereiche, React-Lauf
- `docs/architecture/overview.md`: ändern, Container „Frontend (React)“
- `docs/adr/0016-zweites-frontend-mit-react-und-ui-sdk.md`: neu
- `docs/adr/README.md`: ändern, Zeile für ADR 0016
- `docs/roadmap.md`: ändern, Teil 2
- `docs/specs/0053-react-frontend-geruest.md`: neu

Schritte:

1. Versionen am Tag der Umsetzung nachschlagen (`npm view <paket> version time`,
   `harness/scripts/stack-check.sh --latest react`). UI SDK: die neueste Version beider Pakete,
   die mindestens 7 Tage alt ist. Weicht eine Linie von ADR 0016 ab (neue Hauptversion), hält
   `/implement` an.
2. `frontend-react/` anlegen: Manifest, `pnpm-workspace.yaml`, TypeScript-, Vite-, ESLint- und
   Prettier-Konfiguration; `pnpm -C frontend-react install`. Lehnt pnpm ein Paket wegen
   `minimumReleaseAge` ab, wird die ältere Version genommen, nie die Regel geändert.
3. Dokumentation der verwendeten UI-SDK-Teile lesen (`https://ui-sdk.dev/docs/react/installation`,
   `…/styling-and-animation`, `…/components/toggle`, `…/components/button`). Reicht `Toggle` oder
   `Button` `data-testid`, `aria-label` oder `className` nicht an das Element durch, hält
   `/implement` an.
4. `tokens.css` aus `frontend/src/styles.scss` und `frontend/src/styles/_theme.scss`: jeden Wert
   hell und dunkel übernehmen; dunkel für `html[data-theme='dark']` und, unter
   `prefers-color-scheme: dark`, für `html:not([data-theme='light'])`. `global.css` mit
   `@layer ui-sdk;`, Grundstil, Fokusring.
5. `messages.ts` mit den Schlüsseln `shell.title`, `shell.theme.*`, `start.title`, `start.lead`,
   `start.backend*` und den Texten aus den Angular-Templates; Test für unbenutzte Schlüssel.
6. `theme-store.ts` und `app-shell.tsx` mit `Toggle`; Skript in `index.html`, das die gespeicherte
   Wahl vor dem ersten Rendern auf `<html>` setzt.
7. `make contracts` erweitern, `schema.d.ts` erzeugen; `health-api.ts` und `start-page.tsx` mit
   `Button` für `health-retry`.
8. Unit-Tests zu A3, A4, A5 und A9.
9. `Makefile`: `PNPM_REACT`, Targets `test-frontend-react`, `typecheck-frontend-react` (`tsc
   --noEmit` und `vite build`), `lint-frontend-react`, `frontend-react`; `install`, `format`,
   `contracts` und `e2e` erweitern.
10. `frontend/playwright.config.ts`: mit `E2E_FRONTEND=react` startet der dritte `webServer`
    `pnpm -C ../frontend-react exec vite --port <FRONTEND_PORT> --strictPort`, und `grep` ist
    `/@react/`. Tags und Wartebedingung in den drei Testdateien.
11. Setup-Action und Dependabot.
12. `project-rules/frontend-react.md`, `project-rules/README.md`, `project-rules/testing.md`,
    `docs/architecture/overview.md`, `README.md`, `.env.example`, `.gitignore`.
13. `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | Aufruf: `make install`, `make check` |
| A2 | `frontend/e2e/health.spec.ts`: „start page shows that the backend is reachable“ (`@react`) / Browser: Startseite |
| A3 | `frontend-react/src/start/start-page.spec.tsx`: Backend nicht erreichbar zeigt `health-down`; Klick auf `health-retry` mit Antwort 200 zeigt „Backend erreichbar“ |
| A4 | `frontend-react/src/shell/app-shell.spec.tsx`: Link, Beschriftung, Symbol und `aria-pressed` je Design; `frontend/e2e/theme-toggle.spec.ts` (`@react`) |
| A5 | `frontend-react/src/shell/theme-store.spec.ts`: Wechsel, `data-theme`, Ablage mit erhaltenen Feldern, ungültiges JSON, Fehler von `localStorage`, Systemwechsel ohne Wahl |
| A6 | `frontend/e2e/theme.spec.ts`: „the start page uses the dark/light theme of the system“ (`@react`) / Browser: Vergleich der Variablen beider Frontends |
| A7 | Browser: Startseite, Fokus mit Tab und mit Maus |
| A8 | Aufruf: `make drift` |
| A9 | `frontend-react/src/i18n/messages.spec.ts`: unbenutzter Schlüssel; Aufruf: `make lint` mit Probe-Datei |
| A10 | Aufruf: `make e2e`, `E2E_FRONTEND=react pnpm -C frontend exec playwright test` |
| A11 | Aufruf: `npm view @ui-sdk/react time --json`, `pnpm -C frontend-react install --frozen-lockfile` |
| A12 | CI-Lauf des Pull Requests |
| A13 | Aufruf: `grep` wie im Kriterium |
| A14 | Aufruf: `harness/scripts/stack-check.sh --config <Datei im Scratchpad>` |

Testdaten: keine. Die Tests zu A3 ersetzen `fetch` (Netzgrenze); die End-to-End-Tests laufen gegen
das Backend im Profil `e2e`.

## Offene Fragen

- [x] Wann setzt die Person `"react 19"` in `stack` und `frontend-react/src` in `source_paths` von
  `harness/config.yml`: vor oder nach dem Merge dieser Spec? → Nach dem Merge von 0053, in einem
  eigenen Pull Request auf `main`. (Morten Möller, 2026-11-24)

## Verifikationsplan

- make check
- betroffene Tests: `pnpm -C frontend-react test`; `make e2e` (Angular-Lauf vollständig,
  React-Lauf mit fünf Tests: `health.spec.ts` 1, `theme.spec.ts` 2, `theme-toggle.spec.ts` 2)
- Browser: Startseite des React-Frontends hell und dunkel bei 1280 px und 375 px (A2, A6, A7);
  Vergleich der berechneten Variablen `--mat-sys-*` und `--app-*` mit dem Angular-Frontend (A6)
