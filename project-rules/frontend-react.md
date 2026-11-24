---
sources: [frontend-react/package.json, frontend-react/pnpm-workspace.yaml, frontend-react/vite.config.ts, frontend-react/eslint.config.js, frontend-react/index.html, frontend-react/src/**]
---

# React frontend rules

The second frontend (ADR 0016, roadmap part 2 in `docs/roadmap.md`). It serves the same backend
and the same contract as the Angular frontend (`project-rules/frontend.md`) and reaches the same
screens spec by spec. A rule of `frontend.md` on behaviour, texts, `data-testid`, storage keys and
design holds here as well, unless this file names another way.

## Stack

- React 19, React DOM 19, React Router 8 (declarative mode, `BrowserRouter`), TypeScript 6.0 with
  `strict`; Vite 8 with `@vitejs/plugin-react`. Lookup of 2026-11-24: React 19 is the newest
  supported line (`harness/scripts/stack-check.sh --latest react`); Vite 8.3.8, TypeScript 7.0.2
  and React Router 8.5.2 are the newest versions in the npm registry. TypeScript stays on 6.0
  until `typescript-eslint` names 7 as a peer (ADR 0016).
- UI SDK: `@ui-sdk/react` and `@ui-sdk/core` with the same exact version, no `^`
  (0.1.0-beta.7, a beta; ADR 0016). An update is its own pull request with a green end-to-end run.
  The documentation of the installed version is in `frontend-react/node_modules/@ui-sdk/react/docs/`;
  read it there, not from memory. The agent skills that `@ui-sdk/core` ships are not approved
  (`pnpm approve`).
- Package manager pnpm 12 with its own lockfile; `frontend-react/pnpm-workspace.yaml` sets
  `minimumReleaseAge`, `blockExoticSubdeps` and `trustPolicy` like the Angular frontend and allows
  `eslint-plugin-jsx-a11y` under ESLint 10. Node from `.nvmrc`.
- Dev server: `make frontend-react` (Vite on `FRONTEND_REACT_PORT`, default 4300); the proxy in
  `frontend-react/vite.config.ts` sends `/api` and `/ws` to `BACKEND_PORT` (default 8080).
- No Tailwind, no state library, no i18n library, no `@ui-sdk/core/web.css`. Each of them needs an
  ADR (A1.7).

## Structure

- One folder per feature under `frontend-react/src/`: `start` (start page), `shell` (toolbar,
  theme, main area), `api` (generated types), `i18n` (texts), `styles` (tokens, global rules).
  `join`, `session` and the shared controls in `ui` come with their specs.
- Import boundaries: features and `shell` import from `api`, `i18n` and packages; `api` and `i18n`
  import no feature. No feature imports another feature.
- `main.tsx` is the only file with effects at load: it creates the stores, starts them and renders
  `App`. A store is a factory (`createThemeStore(window)`) and reaches components as a prop or
  through `useSyncExternalStore`, never as a module-level instance (A6.3).
- Routes: `/` (start). `/session/:id/join` and `/session/:id` come with their specs.

## State and data

- Generated API types: `frontend-react/src/api/schema.d.ts`, written by `make contracts` as a copy
  of the Angular file; never edited by hand. A contract type is taken as
  `components['schemas']['<Name>']`.
- HTTP through `fetch`. A test replaces `fetch` (`vi.stubGlobal`), never an own module.
- Theme: `createThemeStore` in `shell/theme-store.ts` keeps the choice `system`, `light` or `dark`
  as `theme` in `localStorage` under `planningpoker.preferences` (the key and format of the
  Angular `PreferencesStore`; other fields of the entry stay), sets `data-theme` on `<html>` before
  the first render and follows `prefers-color-scheme` without a choice. Invalid JSON or an
  exception of `localStorage` gives `system`, never an error.

## UI

- Controls come from the UI SDK where it has the component (`Toggle` for `theme-toggle`, `Button`
  for buttons). Import each component from its own entry (`@ui-sdk/react/toggle`). Table, card and
  chip are own HTML and CSS.
- Styling: one CSS Module per component (`*.module.css`), passed through `className`; states
  through the attributes of the UI SDK (`[data-pressed]`, `[data-disabled]`, `[data-pending]`).
  `frontend-react/src/styles/global.css` starts with `@layer ui-sdk;` so that own rules win over
  the CSS that the UI SDK adds at run time. Global classes are only `app-symbol` and the rules of
  `global.css`.
- Tokens: `frontend-react/src/styles/tokens.css` has every `--mat-sys-*` and `--app-*` variable of
  the Angular frontend with the same name and value, light and dark (taken from the compiled
  Angular stylesheet). Dark values stand for `html[data-theme='dark']` and, under
  `prefers-color-scheme: dark`, for `html:not([data-theme='light'])`. Colors, spacing and type
  come from these variables, never inline values (A7.4). A token change in one frontend is made in
  the other one in the same pull request.
- Fonts: IBM Plex Sans and IBM Plex Mono from Google Fonts in `frontend-react/index.html`.
- Focus: `global.css` draws a 3 px outline in `--mat-sys-primary` with 3 px offset on
  `:focus-visible`. Components do not remove it.
- i18n: every text for users comes from `frontend-react/src/i18n/messages.ts` through `t(key)`;
  the keys are the ids of the Angular templates without `@@` (`start.title`). An unknown key fails
  `make typecheck`, a key without a use fails `make test` (`i18n/messages.spec.ts`), a text with
  letters in JSX or in `aria-label`, `alt`, `title` or `placeholder` fails `make lint` (geprüft:
  eslint `no-restricted-syntax`). Symbols without letters stand in constants.
- Accessibility: keyboard reachable, labelled controls (geprüft: eslint `jsx-a11y` strict). Symbols
  stand in `aria-hidden` spans.
- Elements that end-to-end tests drive carry the `data-testid` of the Angular frontend (A7.6).
- Content-Security-Policy: `index.html` sets `img-src 'self' data:` like the Angular frontend. A
  policy with `style-src` needs the nonce meta tag of the UI SDK
  (`node_modules/@ui-sdk/react/docs/styling-and-animation.md`).

## Quality

- `make typecheck-frontend-react`: `tsc --noEmit` and `vite build`.
- `make lint-frontend-react`: ESLint 10 (`typescript-eslint`, `react-hooks`, `jsx-a11y`,
  `no-warning-comments`) and `prettier --check .`.
- `make test-frontend-react`: vitest with jsdom and React Testing Library, once. Tests stand next
  to the file as `*.spec.ts` or `*.spec.tsx` and drive a component as a user does (role, text,
  `data-testid`, `user-event`).
- End-to-end: the suite in `frontend/e2e/` with `E2E_FRONTEND=react` (`project-rules/testing.md`).
