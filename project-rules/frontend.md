---
sources: [frontend/angular.json, frontend/package.json, frontend/eslint.config.js, frontend/src/**]
---

# Frontend rules

## Stack

- Angular 22 (current stable), standalone components, signals, zoneless; `@angular/build`.
- Package manager pnpm 12 (`frontend/pnpm-workspace.yaml` sets `minimumReleaseAge`,
  `blockExoticSubdeps`, `trustPolicy`), Node from `.nvmrc`.
- Build and dev server: Angular CLI (`pnpm -C frontend start`, `build`); Dev-Proxy
  `frontend/proxy.conf.mjs` for `/api` and `/ws`; the backend port comes from `BACKEND_PORT` (default 8080).

## Structure

- One folder per feature under `frontend/src/app/`: `start` (start page, create), `join`,
  `session` (room, cards, result, history). Generated API types and the shared services
  (`ApiService`, `RealtimeService`, `SessionStore`) live in `frontend/src/app/api/` (from spec
  0005).
- Shared code goes to `frontend/src/app/api/` only when two features use it (A1.3).
- Import boundaries: features import from `api/` and from Angular packages; `api/` imports no
  feature. No feature imports another feature.

## State and data

- Server state: the `SessionStore` (signals) takes every `session.state` snapshot from the
  WebSocket in full; nothing is reloaded by hand (ADR 0004 replaces A7.1). Single queries such as
  the issue search stay local in their component.
- Client state: the token per session id in `sessionStorage`; locale is fixed to `de`.
- API client: `ApiService` with the generated types in `frontend/src/app/api/schema.d.ts`
  (`openapi-typescript` from `contracts/api/openapi.yaml`, `make contracts`); a contract type is
  taken as `components['schemas']['<Name>']`, never as a hand-written copy. Clients branch on
  `errorCode` only.
- Example snapshots: `frontend/src/app/api/examples.ts` imports the six files of
  `contracts/api/examples/` (`resolveJsonModule`) and checks them with the type `Exact` against
  `SessionView`: an extra or missing field or a wrong primitive type fails `make typecheck`.
  Tests take their snapshots from there.
- HTTP through `HttpClient`, WebSocket through RxJS `webSocket` with `auth` as the first message,
  `ping` every 30 seconds and reconnect with growing delay.

## UI

- Component library: Angular Material with the Material 3 theme in `frontend/src/styles.scss`.
  Colors, spacing and type come from the `--mat-sys-*` system variables, never inline values
  (A7.4). Token values are the design team's decision; report, do not change, unless a design
  specification names the value.
- Styling: SCSS per component, templates in separate `.html` files, new control flow
  (`@if`, `@for`, `@switch`).
- i18n: every user-facing string carries an `i18n` attribute with an id (`@@feature.key`);
  source locale `de` (geprüft: eslint `@angular-eslint/template/i18n`). Error texts come from the
  `errorCode`, never from the API message.
- Markdown from GitLab goes through `marked` and `[innerHTML]` with Angular's built-in
  sanitizer; never `bypassSecurityTrust…`.
- Accessibility: keyboard reachable, labelled controls, contrast checked (geprüft: eslint
  `angular.configs.templateAccessibility`). Findings on colour values are reported, not fixed.
- Controls that developers must not use are not rendered (not only hidden); the backend enforces
  the role.
- Elements that end-to-end tests drive carry a `data-testid` (A7.6).

## Quality

- `make typecheck-frontend`: `ng build --configuration development` with `strict` and
  `strictTemplates`.
- `make lint-frontend`: `ng lint` (angular-eslint, template accessibility, i18n,
  `no-warning-comments`) and `prettier --check .`.
- `make test-frontend`: `ng test` (vitest, jsdom, once). Unit tests for store, services and
  components with logic; none for components that only render.
- Bundle budget: the defaults of `frontend/angular.json` (initial 500 kB warning, 1 MB error).
