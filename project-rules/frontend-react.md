---
sources:
  [
    frontend-react/package.json,
    frontend-react/pnpm-workspace.yaml,
    frontend-react/vite.config.ts,
    frontend-react/eslint.config.js,
    frontend-react/index.html,
    frontend-react/src/**,
  ]
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

- One folder per feature under `frontend-react/src/`: `start` (start page), `join` (join page,
  `project-rules/frontend-react-join.md`), `session` (page of the room,
  `project-rules/frontend-react-session.md`), `shell` (toolbar, theme, error banner, main
  area), `api` (generated types, calls, stores, realtime,
  error texts, route guard, card motif of a snapshot), `i18n` (texts), `styles` (tokens, global rules). The later
  parts of the room come with their specs. The shared controls are in `ui`
  (`project-rules/frontend-react-ui.md`), the card motifs in `styles/motifs.css`; `i18n` holds
  `defineMessages` and the error texts per `errorCode`.
- Rules per feature: a feature writes its rules into `project-rules/frontend-react-<feature>.md`
  with `sources:` on its folder (`frontend-react/src/<feature>/**`), after the pattern of
  `frontend-react-ui.md`. This file holds only what every feature follows.
- Import boundaries: features and `shell` import from `api`, `ui`, `i18n` and packages; `api`
  imports `i18n` and no feature; `ui` imports `styles` and no feature; `i18n` imports nothing. No
  feature imports another feature.
- `main.tsx` is the only file with effects at load: it calls `createBackend(window)`
  (`api/backend.tsx`) once, creates and starts the theme store, waits for
  `backend.loadSetting()` (at most 3 s) and renders `App`. Every service is a factory
  (`createApi`, `createTokenStore`, `createRealtime`, …) that takes its platform parts (`fetch`,
  socket factory, `Storage` access, clock) as parameters. Components reach the services through
  `BackendProvider` and `useBackend()` and read stores with `useSyncExternalStore`
  (`useLastError()`, `useConnection()`), never a module-level instance (A6.3).
- Routes: `/` (start) and `/session/:id` (room, `React.lazy`, its own chunk) inside
  `RequireSession` (`api/require-session.tsx`): without a stored token for the session it leads to
  `/session/:id/join`. The check runs once per session id when the route is entered. The route
  `/session/:id/join` (join page, `React.lazy`, its own chunk, spec 0057) stands outside
  `RequireSession`. An unknown path shows the shell with an empty main area.
- Toolbar (`shell/app-shell.tsx`, spec 0057): with a snapshot in the `SessionStore` it shows the
  motif field `toolbar-motif` left of the title, the session id `toolbar-session-id` of the
  snapshot and `toolbar-me` „Name · Rolle“ with the own name from the participant list (hidden
  below 600 px). Without a snapshot, on `/session/:id/join`, it shows the motif field and the id
  from the path in capital letters, only when the id has eight characters of the alphabet of the
  session id, and no `toolbar-me`. The shell reads the snapshot with `useSyncExternalStore` from
  `useBackend().sessions` and the path with `useLocation`. With a snapshot the motif field has
  `data-filled="true"` and the class `motif-<n>` of `motifOf(session)` (`api/card-motif.ts`), so
  it shows the accent colour and the pattern of the room; on the join page it is the dashed
  placeholder (spec 0059). `theme-toggle` stays at the right end.

## State and data

- Generated API types: `frontend-react/src/api/schema.d.ts`, written by `make contracts` as a copy
  of the Angular file; never edited by hand. A contract type is taken as
  `components['schemas']['<Name>']`.
- HTTP: `createApi` in `api/api.ts` has every call of the contract over `fetch`; a component never
  calls `fetch` itself (the health call of the start page in `start/health-api.ts` is the one
  exception from spec 0053). A call under `/api/sessions/{id}`, except `POST …/participants`,
  sends `Authorization: Bearer <token>` from the `TokenStore`. An answer 204 gives `undefined`.
- Error path: an answer with `errorCode` in the body is thrown as `ApiError` (`errorCode`,
  `status`, `detail`) and reported to the `ErrorState` (`api/error-state.ts`); another failed
  answer and a network failure throw an `Error` that is no `ApiError` and report nothing.
  `ErrorBanner` in `shell/error-banner.tsx` shows the text of `errorMessage(errorCode)` under the
  toolbar, never `detail`. The texts stand in the catalog as `error.<CODE>`;
  `api/error-messages.ts` maps every `ErrorCode` in a `Record<ErrorCode, MessageKey>`, so a new
  code without a text fails `make typecheck`. A form shows its own codes with
  `formErrorMessage(error, codes)`.
- Session state (ADR 0004): `createSessionStore` in `api/session-store.ts` loads the snapshot
  with `getSession`, then takes every snapshot of the WebSocket as a whole; `leave`, a failed load
  and the end of the connection set it to `null`. No component keeps a copy of a part of the
  snapshot, and no command reloads it. `serverNow()` is the client clock plus the distance to
  `serverTime` of the last snapshot.
- Realtime: `createRealtime` in `api/realtime.ts` opens `ws(s)://<host>/ws/sessions/<id>`, sends
  `auth` with the token as the first message (the token is never part of the URL, ADR 0003) and
  `ping` every 30 s. After a lost connection it connects again after 1, 2, 4, 8, 16 and then 30 s
  each; a snapshot starts the sequence again. `connection()` is `OPEN`, `WAITING` with `retryAt`
  or `CONNECTING`; the banner `connection-banner` shows every state but `OPEN`. A message `error`
  is reported to the `ErrorState` and ends the connection without a new attempt. A message that
  is no JSON, or has no `payload` where its type needs one, counts as a lost connection.
- Session gone: when `getSession` or the WebSocket reports `SESSION_NOT_FOUND`, the session page
  removes the token, leaves the `SessionStore`, clears the `ErrorState` in the same step (the
  banner does not appear) and shows `session-gone`.
- Token (ADR 0003, ADR 0013): `createTokenStore` in `api/token-store.ts` keeps
  `{ participantId, token }` in `sessionStorage` under `planningpoker.session.<id>`. With
  `RecentSessions.enabled()` `true` it also writes the entry of the recent sessions
  (`planningpoker.recent-sessions` in `localStorage`, at most five, newest first) and reads it
  back when `sessionStorage` has no value. `enabled()` comes from `GET /api/config` and stays
  `null` after a failure or 3 s; that failure is not reported to the `ErrorState`. A token never
  appears in a log, a URL or a text for users.
- Preferences: `createPreferencesStore` in `api/preferences-store.ts` reads and saves
  `planningpoker.preferences` in `localStorage` with the fields, values and defaults of the
  Angular `PreferencesStore`; `save` keeps the other stored fields. Invalid JSON or an exception
  of `localStorage` gives the defaults, never an error.
- Theme: `createThemeStore` in `shell/theme-store.ts` reads and saves the choice `system`, `light`
  or `dark` as `theme` only through the `PreferencesStore`, sets `data-theme` on `<html>` before
  the first render and follows `prefers-color-scheme` without a choice.
- Participant name: `participantNameError` in `api/participant-name.ts` (empty or only white
  space, more than 30 characters) is the one rule for every form with a name.
- Tests of this layer build the services with `createTestBackend` (`api/testing/test-backend.tsx`):
  the real services over a recorded `fetch` and the socket double of
  `api/testing/fake-web-socket.ts`; the clock is the fake clock of vitest. Example snapshots come
  from `api/examples.ts`, which checks the eight files of `contracts/api/examples/` against
  `SessionView` at compile time. No double of an own module (T1.4).

## UI

- Controls come from the UI SDK where it has the component (`Toggle` for `theme-toggle`, `Button`
  for buttons). A button is an `AppButton` of `ui/` (`project-rules/frontend-react-ui.md`), also
  `error-close` (`text`, `on-error`) and `connection-reconnect` (`outlined`, `on-error`) of the
  banner; the banner has no own button CSS. Import each component from its own entry (`@ui-sdk/react/toggle`). Table, card and
  chip are own HTML and CSS.
- Styling: one CSS Module per component (`*.module.css`), passed through `className`; states
  through the attributes of the UI SDK (`[data-pressed]`, `[data-disabled]`, `[data-pending]`).
  `frontend-react/src/styles/global.css` starts with `@layer ui-sdk;` so that own rules win over
  the CSS that the UI SDK adds at run time. Global classes are only `app-symbol`, the rules of
  `global.css` and the motif classes `motif-0` to `motif-4` of `styles/motifs.css`.
- Tokens: `frontend-react/src/styles/tokens.css` has every `--mat-sys-*` and `--app-*` variable of
  the Angular frontend with the same name and value, light and dark (taken from the compiled
  Angular stylesheet). Dark values stand for `html[data-theme='dark']` and, under
  `prefers-color-scheme: dark`, for `html:not([data-theme='light'])`. Colors, spacing and type
  come from these variables, never inline values (A7.4). A token change in one frontend is made in
  the other one in the same pull request.
- Fonts: IBM Plex Sans and IBM Plex Mono from Google Fonts in `frontend-react/index.html`.
- Focus: `global.css` draws a 3 px outline in `--mat-sys-primary` with 3 px offset on
  `:focus-visible`. Components do not remove it.
- i18n (spec 0063): every text for users comes from a catalog through `t(key)`. Each feature
  folder has its own catalog `messages.ts`: `export const MESSAGES = { … } as const` and
  `export const t = defineMessages(MESSAGES)` (`i18n/messages.ts`); a component imports `t` from
  the catalog of its own folder. `frontend-react/src/i18n/messages.ts` holds only the texts
  `error.<CODE>` and `error.unknown` for `api/error-messages.ts`. The keys are the ids of the
  Angular templates without `@@` (`start.title`). A value is written as `{name}` in the text and
  passed as `t(key, { name })`. A text with a number form is an entry `{ one, other }`;
  `t(key, { count })` takes `one` for 1 and `other` for every other number. An unknown key, and a
  number form without `count`, fail `make typecheck`. `i18n/messages.spec.ts` finds every
  `messages.ts` under `src/` and fails `make test` for a key without a use, a key in two catalogs
  and a file without `MESSAGES`. A text with letters in JSX or in `aria-label`, `alt`, `title` or
  `placeholder` fails `make lint` (geprüft: eslint `no-restricted-syntax`). Symbols without
  letters stand in constants.
- Accessibility: keyboard reachable, labelled controls (geprüft: eslint `jsx-a11y` strict). Symbols
  stand in `aria-hidden` spans.
- Elements that end-to-end tests drive carry the `data-testid` of the Angular frontend (A7.6).
- Content-Security-Policy: `index.html` sets `img-src 'self' data:` like the Angular frontend. A
  policy with `style-src` needs the nonce meta tag of the UI SDK
  (`node_modules/@ui-sdk/react/docs/styling-and-animation.md`).

## Quality

- `make typecheck-frontend-react`: `tsc --noEmit`, `vite build` and the bundle budget.
- `make lint-frontend-react`: ESLint 10 (`typescript-eslint`, `react-hooks`, `jsx-a11y`,
  `no-warning-comments`) and `prettier --check .`.
- `make test-frontend-react`: vitest with jsdom and React Testing Library, once. Tests stand next
  to the file as `*.spec.ts` or `*.spec.tsx` and drive a component as a user does (role, text,
  `data-testid`, `user-event`).
- `make typecheck-frontend-react` also checks the bundle budget after the build
  (`scripts/bundle-budget.ts`, from the manifest of Vite): the entry with its static imports and
  their styles, unpacked, warns above 500 kB and fails above 1 MB, the values of the Angular
  frontend. The room and the join page are own chunks and do not count.
- End-to-end: the whole suite in `frontend/e2e/` with `E2E_FRONTEND=react`, against the build
  served by `vite preview` (`project-rules/testing.md`).
- `index.html` has `<base href="/" />` and relative links to the three favicon files, like the
  Angular frontend.
