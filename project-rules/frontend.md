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
  `session` (room, cards, result, history). `shell` holds the layout: toolbar, `router-outlet`
  and the `ErrorBanner`. Generated API types and the shared services (`ApiService`,
  `RealtimeService`, `SessionStore`, `TokenStore`, `ErrorState`) live in `frontend/src/app/api/`;
  the mock backend for development in `frontend/src/app/api/mock/`; test doubles for the
  WebSocket in `frontend/src/app/api/testing/` (spec 0005).
- Shared code goes to `frontend/src/app/api/` only when two features use it (A1.3).
- Import boundaries: features and `shell` import from `api/` and from Angular packages; `api/`
  imports no feature. No feature imports another feature.
- Routes: `/` (start), `/session/:id/join`, `/session/:id` (room, `sessionGuard`: without a
  token for the session id the router goes to `/session/:id/join`).

## State and data

- Server state: the `SessionStore` (signals) takes every `session.state` snapshot from the
  WebSocket in full; nothing is reloaded by hand (ADR 0004 replaces A7.1). Single queries such as
  the issue search stay local in their component. The store keeps the offset between
  `serverTime` of the last snapshot and the client clock; the remaining time of a round
  (`RoundTimer`) is `round.deadline` minus `serverNow()`, never the client clock alone (ADR 0006).
- Client state: the token per session id in `sessionStorage`; locale is fixed to `de`.
- Preferences (spec 0036): `PreferencesStore` in `frontend/src/app/api/` keeps the last inputs in
  `localStorage` under one key `planningpoker.preferences` as JSON with `name`, `projectId`,
  `timerSeconds` (one of `TIMER_SECONDS`, `0` = Aus), `weightFilter` and `periodFilter`. They only
  fill in fields, never the state of a session; the entry holds only the values listed above,
  session credentials stay in `sessionStorage`. A missing entry, invalid JSON, an unknown value or
  an exception of `localStorage` gives the default (`''`, `''`, `0`, `NONE`, `ALL`), never an
  error. Written after success only: name and project after a created session (start page), the
  name after a join (one name for both pages, independent of the session id), the timer after a
  successful `PUT …/timer`, the issue filters on every change and the defaults on „Filter
  zurücksetzen“. After creating a session the start page sets a saved timer other than Aus with
  `setTimer` and opens the room also when that call fails.
- API client: `ApiService` with the generated types in `frontend/src/app/api/schema.d.ts`
  (`openapi-typescript` from `contracts/api/openapi.yaml`, `make contracts`); a contract type is
  taken as `components['schemas']['<Name>']`, never as a hand-written copy. Clients branch on
  `errorCode` only.
- Example snapshots: `frontend/src/app/api/examples.ts` imports the eight files of
  `contracts/api/examples/` (`resolveJsonModule`) and checks them with the type `Exact` against
  `SessionView`: an extra or missing field or a wrong primitive type fails `make typecheck`.
  Tests take their snapshots from there.
- HTTP through `HttpClient`, WebSocket through RxJS `webSocket` with `auth` as the first message,
  `ping` every 30 seconds and reconnect with growing delay (1, 2, 4, 8, 16, then 30 seconds). The
  socket comes from the `InjectionToken` `WEB_SOCKET_FACTORY`; tests and the mock replace it.
  `provideBackend()` in `api/backend.providers.ts` wires `HttpClient`, the interceptors and the
  factory; `app.config.ts` calls it.
- Error path: `apiErrorInterceptor` turns every `application/problem+json` response into an
  `ApiError` (`errorCode`, `status`) and reports it to `ErrorState`; the `ErrorBanner` in the
  shell shows the German text of `api/error-messages.ts` (`$localize`, id `@@error.<code>`, a
  general text for an unknown code) and never `detail`. A WebSocket message `error` goes the
  same way and ends the connection without a reconnect. Components branch on `errorCode` only.
- Form errors: a page with a form catches the `ApiError` of its own call and shows the text of
  `formErrorMessage` (`api/error-messages.ts`) at the form for the codes the form names (create:
  `ISSUE_NOT_FOUND`, `PROJECT_NOT_ALLOWED`, `LIMIT_REACHED`, `GITLAB_ACCESS_DENIED`,
  `GITLAB_ERROR`, `VALIDATION_ERROR`; confirm dialog: `GITLAB_ACCESS_DENIED`, `GITLAB_ERROR`;
  join: `SESSION_NOT_FOUND`, `NAME_TAKEN`, `LIMIT_REACHED`, `VALIDATION_ERROR`), then clears
  `ErrorState`; every other code stays in the banner (specs 0011, 0015). The issue search shows
  `GITLAB_ACCESS_DENIED` and `GITLAB_ERROR` in the panel as `issue-results-error` with the text
  of the code (`issue-results-error-message`) and the button `issue-results-retry`,
  which repeats the last query, and clears `ErrorState` (spec 0019).
- Error and empty states of the session page (spec 0019): `SESSION_NOT_FOUND` from `GET` or
  from the WebSocket shows `session-gone` with a link to the start page instead of
  `session-loading`; the page removes the token of the session from the `TokenStore`, leaves
  the `SessionStore` and clears `ErrorState`. An issue search without results shows
  `issue-results-empty`. A failed copy to the clipboard shows a `role="status"` text to copy by
  hand.
- Project and issue choice on the start page (spec 0022, ADR 0008): the fields `create-project`
  and `create-issue` are `mat-autocomplete` inputs. The text goes through `valueChanges` with
  `debounceTime(300)` and `switchMap` to `ApiService.searchProjects` and
  `ApiService.searchProjectIssues`; a text of digits only is taken as id or iid without a search,
  and the issue search runs only when the project field holds a numeric id. The focus on the
  empty project field loads the first page of `searchProjects` without `search` at once and opens
  the autocomplete (spec 0032); after a choice, a focus on the emptied field loads the list
  again. Options carry
  `create-project-option` (name, then path and id) and `create-issue-option` (`#iid Titel`);
  the choice writes the id or iid into the field. Empty results show `create-project-empty` and
  `create-issue-empty`; `PROJECT_NOT_ALLOWED`, `GITLAB_ACCESS_DENIED` and `GITLAB_ERROR` show
  their text in `create-project-search-error` and `create-issue-search-error` and clear
  `ErrorState`.
- Issue field optional (spec 0033, ADR 0011): `create-issue` is labelled „Issue (optional)“ with
  the hint „Optional: Issue, mit dem die Sitzung startet“. An empty field (or spaces) is valid and
  the request has no `issueIid`; a value that is not a whole number from 1 shows
  `create-issue-error`. `PROJECT_NOT_FOUND` sets the error `notFound` on the project control and
  shows its text in `create-project-error`, not in `create-error`; a change of the field clears it.
- Start and join page (spec 0031): an unreachable backend shows `health-down` with the button
  `health-retry`; the join page shows `join-role-hint` and, for `SESSION_NOT_FOUND`,
  `join-not-found` with the link `join-not-found-home` instead of the form. Above the title of the
  join page stands the card hand `card-hand` in the size `large`, centred (spec 0038).
- Card hand (spec 0038): `CardHand` (`app-card-hand`, `frontend/src/app/api/card-hand.ts`, used by
  `session` and `join`) shows the five motif cards `card-hand-card` (Raster, Punkte, Zeilen,
  Ringe, Stufen, `data-motif` 0 to 4) as a hand: close together at the bottom, fanned out at the
  top from −20° to +20° around a common point below the hand. The host carries `aria-hidden`,
  `data-testid="card-hand"` and the size `small` (default, lobby) or `large` (join page). The
  colours come from `_motifs.scss`, light and dark.
- Issue panel filters (spec 0023, ADR 0009): above the list a `mat-button-toggle-group`
  `issue-filter-weight` („Ohne Gewicht“ `issue-filter-weight-none`, „Mit Gewicht“
  `issue-filter-weight-any`, „Alle“ `issue-filter-weight-all`; default „Ohne Gewicht“) and a
  `mat-select` `issue-filter-period` „Geändert in“ (1 Woche, 1 Monat, 1 Jahr, Alle; default
  „Alle“). Every call of `listIssues` sends `weight` and `period`; a filter change loads page 1
  with the last submitted search text. Each entry shows `issue-result-weight` („Gewicht 5“ or
  „ohne Gewicht“). When the phase changes from `REVEALED` to `LOBBY`, the panel loads page 1 again
  with the current filters. The filters live only in the component.
- Discussion (spec 0026, ADR 0010): in `DISCUSSION` the session page shows the active issue and
  `RoundStatus` without counter and remaining time, and `discussion-hint` to both roles in the
  footer `RoundFooter` (spec 0035); the
  developer sees the locked card deck `card-deck-locked` (spec 0029), which sends no vote, and
  `card-deck` exists only in `VOTING`; the phase reads „Diskussion“. The scrum master sees `round-start` („Schätzung starten“,
  `ApiService.startVoting`) and, with a timer, `round-start-timer` („Timer: 1 min“). An issue
  switch in `LOBBY` or `DISCUSSION` opens no dialog. The participant list shows the vote status
  only in `VOTING` and `REVEALED` (spec 0028).
- Erneut schätzen (spec 0034, ADR 0012): in `REVEALED` the scrum master sees `round-restart`
  („↻ Erneut schätzen“; the symbols ↻ and ↗ of „In GitLab öffnen ↗“ stand in their own
  `aria-hidden` span at 1.25em, vertically centred, spec 0038), the developer sees `result-waiting` („Der Scrum Master lässt erneut
  schätzen oder übernimmt das Ergebnis.“). The restart leads straight to `VOTING`: the developer
  sees the open `card-deck` without `discussion-hint`, with a timer also the remaining time. The
  mock backend changes the phase from `REVEALED` to `VOTING` as well.
- Session ids from the route of the join page are taken in capital letters, like the input on
  the start page. The name rule of create and join is `api/participant-name.ts`.
- Authentication: `authInterceptor` adds `Authorization: Bearer <token>` from the `TokenStore`
  (`sessionStorage`, key `planningpoker.session.<id>`, value `{ participantId, token }`) to
  every call under `/api/sessions/{id}` except the join (`POST …/participants`).
- Mock backend: `pnpm -C frontend start:mock` serves the build configuration `mock`
  (`angular.json`, `fileReplacements` of `backend.providers.ts` by `backend.providers.mock.ts`).
  The mock answers REST through an `HttpInterceptorFn` and the WebSocket through a fake socket
  from the example snapshots; tokens carry the role (`mock-scrum-master-…`, `mock-developer-…`),
  the session id is `K7P2QX9M`. The project list and the issues of every project come from fixed
  data (projects 1234 „Planning Poker“, 5678 „Poker Tools“, 9012 „Release Notes“; issues 42 and
  43 without weight, 46 with weight 3), filtered by `search` and, in the session, by `weight`. The
  mock keeps one phase (`mock-session.ts`, start `LOBBY`): release, `round/start`, reveal, restart
  and confirm change it like the server, answer 409 `INVALID_STATE` in a wrong phase and send the
  example snapshot of the new phase to every mock socket. The snapshots carry `project` and
  `writeWeight`, the issue lists `total` (spec 0030). The normal build does not contain the mock.

## UI

- Component library: Angular Material with the Material 3 theme in `frontend/src/styles.scss`.
  Colors, spacing and type come from the `--mat-sys-*` system variables, never inline values
  (A7.4). Token values are the design team's decision; report, do not change, unless a design
  specification names the value.
- Theme „Werkbank“ (spec 0027, design files in `docs/design/`): `mat.theme` with the blue palette
  and `theme-type: color-scheme`; `mat.theme-overrides` sets the fixed values of One Light and,
  for the dark design, of One Dark. Light and dark (spec 0037): the toggle `theme-toggle` at the
  right end of the toolbar (round button with the symbol centred, its distance to the right edge
  equal to the left padding of the toolbar, spec 0038; 🌙 in the light design, ☀️ in the dark one, `aria-pressed` true in the
  dark one) switches from the visible design to the other one; `ThemeService` (`shell`) stores the
  choice as `theme` (`system`, `light`, `dark`) in the `PreferencesStore` and sets
  `data-theme="light|dark"` on `<html>` before the first render (`provideAppInitializer`); without
  a choice the design follows `prefers-color-scheme`. Dark rules never use
  `@media (prefers-color-scheme: dark)` directly but the mixin `dark` of
  `frontend/src/styles/_theme.scss`: it writes the rules for `html[data-theme='dark']` and, under
  `prefers-color-scheme: dark`, for `html:not([data-theme='light'])`; in components through
  `:host-context(…)`, and with `$has` for a condition on the whole page instead of `:host:has(…)`
  (Angular drops `:has` after `:host-context`). Own CSS variables next
  to `--mat-sys-*`: `--app-on-surface-muted`, `--app-success`, `--app-warning` with their
  containers, `--app-font-mono`, `--app-label-section`, `--app-value-card`, `--app-value-id`,
  `--app-space-xs` to `--app-space-3xl` and `--app-corner-control`. Buttons, button toggles and
  dialogs take their shape from component overrides in `styles.scss`.
- Fonts: IBM Plex Sans for text (type scale of the design system in `styles.scss`), IBM Plex
  Mono (`--app-font-mono`) for values such as session id, issue numbers, remaining time and card
  values; both from Google Fonts in `index.html`, next to Material Symbols.
- Focus: a global rule in `styles.scss` draws a 3 px outline in `--mat-sys-primary` with 3 px
  offset on `:focus-visible` (not on inputs and selects inside form fields); filled buttons add a
  ring in `--mat-sys-surface`. Components do not remove the outline.
- Toolbar (`shell`): 56 px, `surface-container-low` with a divider, title; in the room the
  motif field (`toolbar-motif`, 20 × 28 px, left of the title), the session id
  (`toolbar-session-id`, mono) and „Name · Rolle“ (`toolbar-me`, hidden below 600 px) from the
  `SessionStore`.
- Session page grid: a side column of 340 px and a main column (32/48 px padding) from 720 px;
  below that one column with the side column under the main area. Side column and main area
  reserve the space of the scroll bar (`scrollbar-gutter: stable`), so the width of the content
  does not change when a scroll bar appears. The page has no visible heading; the `h1`
  „Sitzung“ has the class `visually-hidden` for screen readers (spec 0038).
- Footer and scroll areas (spec 0035): `RoundFooter` (`round-footer`) stands in the DOM after
  the main area and holds the cards and round actions per phase and role: `DISCUSSION` the
  locked deck with `discussion-hint` (developer) or the box with `discussion-hint` and
  `round-start` (scrum master), `VOTING` the open `card-deck` (developer) or the box with
  `pending-hint` or `all-voted-hint` and `round-reveal` (scrum master), `REVEALED`
  `result-waiting` (developer) or `round-restart` and `result-accept` (scrum master); no footer
  in `LOBBY`. From 720 px the room fills the window under the toolbar (`100dvh`), the page does
  not scroll, side column and main area scroll on their own and the footer is the last row of
  the main column with a divider and `--mat-sys-surface`. Below 720 px the page scrolls and the
  footer sticks to the bottom of the window (`position: sticky`).
  The description of the active issue is collapsed in `REVEALED` and below 720 px; „▾ Ganze
  Beschreibung anzeigen“ (`active-issue-expand`) expands it, then „▴ Beschreibung einklappen“
  (`active-issue-collapse`, `aria-expanded="true"`) collapses it again (spec 0038).
- Design Werkbank (specs 0027 to 0030): the source is `docs/design/` (`Raum.dc.html`,
  `Design-System.dc.html`, `Sitzungsraum.dc.html`; read as source text, deviations in
  `docs/design/README.md`). Part A is theme and grid, B the side column and the card motif, C
  card and table, D control panel, dialogs and banner.
  - Card motif (part B, `session/card-motif.ts`): `motifFor(sessionId, issueIid, round)` is
    FNV-1a of `sessionId:issueIid:round` modulo 5 (Raster, Punkte, Zeilen, Ringe, Stufen); when
    the hash gives the motif of the previous round, the next one is taken. `LOBBY` has motif 0.
    The session page sets `data-motif` on `.room`. The table of the five motifs (accent light
    and dark, pattern, pattern size; design system, section 7) stands only in
    `frontend/src/styles/_motifs.scss` (spec 0032); its mixin `card-variables($motif, $scheme)`
    sets `--app-card-accent`, `--app-card-on-accent`, `--app-card-pattern` and
    `--app-card-pattern-size`. `session-page.scss` uses it per `data-motif` of `.room`,
    `app-shell.scss` for `toolbar-motif` with `:host:has([data-motif='n'])` and
    `card-hand.scss` for the card hand. Components inside the room use these variables, with a
    fallback where they also render outside of it. The motif carries no
    meaning; states always stand as text next to it.
  - Side column (part B): sections with a mono label (`--app-label-section`, upper case by CSS)
    in this order: „Timer“ (scrum master, with the hint „Gilt ab der nächsten Runde.“),
    „Teilnehmer · n“, „Teilen“, „Fakten“ (`session-facts`: Session-ID, Phase, Deine Rolle,
    Teilnehmer „n (m Entwickler)“), „Sitzungsprotokoll“ (`session-history`, collapsed panel;
    head and content with 16 px padding left and right, spec 0038).
    A participant entry (design system, section 8) has a chip (filled with the motif after a
    vote, dashed otherwise; the scrum master has no chip and no empty column, spec 0038), the name with „(du)“ and a highlighted row
    for the own entry, „★ Scrum Master“, a status („Moderiert, schätzt nicht mit“, „Bereit“ in
    `LOBBY`, „Diskutiert“ in `DISCUSSION`, „✓ Hat geschätzt“ in `VOTING` and `REVEALED`,
    „○ Ausstehend“ in `VOTING`, „Nicht geschätzt“ (muted) in `REVEALED`, spec 0032) and „● verbunden“ or „○ getrennt“. Symbols stand in `aria-hidden` spans outside
    the element with the `data-testid`, so the selectors keep their text.
  - Developer in `LOBBY` (part B): the waiting state `lobby-waiting` with the card hand
    `card-hand` (spec 0038), the title and „Die Seite aktualisiert sich von selbst.“; after a confirmation the
    title reads „Das Ergebnis ist übernommen. …“ and `last-result` („Zuletzt geschätzt“, final
    card, issue, round, cards, „✓ Als Kommentar in GitLab gespeichert“) follows until the next
    release. With `project` in the snapshot it links the issue („In GitLab öffnen ↗“,
    `last-result-open`, `project.webUrl/-/issues/<iid>`, new tab, `rel="noopener noreferrer"`;
    spec 0032). The scrum master never sees it.
  - Card and table (part C, spec 0029): `app-card` (`session/card.ts`) is the only card view,
    with the states open, chosen, locked, hidden, pending and revealed and the `aria-label`
    „Karte <Wert>“. The deck is a `role="group"` „Deine Karte“ with arrow keys, Home and End;
    `RoundStatus` holds the phase bar (round, counter, progress bar, `round-timer`, „Kartensatz:
    <Name>“ from `motif-name.ts`), projects the active issue below the bar and shows
    `seat-table` in `VOTING`; `RoundResult` does the same in `REVEALED` and lists the
    distribution as `result-count` with `result-count-card` and `result-count-votes`. The open
    deck `card-deck` and the locked deck `card-deck-locked` are at most 1000 px wide and centred,
    so the cards stay portrait; below 600 px the deck is one row of eleven cards of 48 × 70 px
    that scrolls sideways with `scroll-snap`, and the chosen card and the card with the focus
    are scrolled into the row (spec 0035). The iid of the
    active issue (`active-issue-iid`) has the size of its title, in mono, muted and not bold.
    The seats of `seat-table` align at the top: cards of one row share top and height and
    the names one line; in `REVEALED` a seat without a vote shows „–“ and „nicht geschätzt“,
    in `VOTING` „…“ and „ausstehend“ (spec 0032). „✓ Kopiert“ of `share-session` disappears
    after 3 s; a new click starts the 3 s again; the failure text stays (spec 0032). The glyphs of ? and ☕
    come from `public/question-mark.svg` and `public/coffee-break.svg` through `card-glyphs.ts`
    (`fetch`, parse, remove metadata, scripts, event and link attributes, then
    `bypassSecurityTrustHtml`); this is the only use of `bypassSecurityTrust…`. Confetti and the
    flip of the revealed cards are not rendered under `prefers-reduced-motion: reduce`
    (`reduced-motion.ts`).
  - Control panel, dialogs, snackbar and banner (part D) follow their spec; they take colour and
    pattern of the round only from the `--app-card-*` variables.
  - Motion and focus: transitions follow the section „Fokus und Bewegung“ of the design system and
    stop under `prefers-reduced-motion: reduce`; the focus ring of `styles.scss` stays on every
    control; colour is never the only carrier of a state.
- Styling: SCSS per component, templates in separate `.html` files, new control flow
  (`@if`, `@for`, `@switch`).
- i18n: every user-facing string carries an `i18n` attribute with an id (`@@feature.key`);
  source locale `de` (geprüft: eslint `@angular-eslint/template/i18n`). Error texts come from the
  `errorCode`, never from the API message.
- Markdown from GitLab goes through `marked` and `[innerHTML]` with Angular's built-in
  sanitizer; never `bypassSecurityTrust…` (the only exception are the two own card glyphs of
  part C).
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
