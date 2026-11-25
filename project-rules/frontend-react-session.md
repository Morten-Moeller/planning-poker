---
sources: [frontend-react/src/session/**]
---

# React frontend: session room

The room of the React frontend in `frontend-react/src/session/` (spec 0058: grid, card motif, side
column, lobby; spec 0059: issue panel, active issue, switch dialog). The rules of `project-rules/frontend-react.md` hold here as well; texts,
`data-testid` and the look follow the Angular room (`project-rules/frontend.md`, Session page grid
and Design Werkbank part B).

## Page and states

- `SessionPage` (`session-page.tsx`) enters the session of the route in the `SessionStore` and
  leaves it when the page is left. It shows `session-loading` without a snapshot, `session-gone`
  after `SESSION_NOT_FOUND` (`project-rules/frontend-react.md`, Session gone) and the room
  (`data-testid="room"`) with a snapshot.
- The `h1` „Sitzung“ stands before every state and is visible to screen readers only (class
  `visuallyHidden` of `session-page.module.css`).
- Snapshot: every part reads it with `useSession()` (`use-session.ts`, `useSyncExternalStore` on
  `useBackend().sessions`). No part keeps a copy of a field of the snapshot, and no command writes
  into it (ADR 0004); the next snapshot of the WebSocket changes the view.

## Grid

- From 720 px the room is a grid of a side column of 340 px (`room-side`,
  `--mat-sys-surface-container-low`, divider on the right) and the main area (`room-main`,
  padding 32/48 px). Both scroll on their own with `scrollbar-gutter: stable`; the page does not
  scroll. Below 720 px the room is one column, the side column stands under the main area with a
  divider on top, and the page scrolls.
- The room sets the layout of the shell itself with `:has()` in `session-page.module.css`: the
  `main` element that holds the room loses its padding and becomes a flex column, and from 720 px
  the element around `main` is `100dvh` high (with `flex: none`, because its `flex: 1` would take
  the height of the content) and `main` hides its overflow. `shell/` has no rule
  for the room. A change of the elements around `main` in `shell/app-shell.tsx` needs a look at
  these two selectors.
- Main area, in this order: `IssuePanel` (scrum master, every phase), the waiting state with the
  last result (developer and viewer in `LOBBY`), `ActiveIssue` (every role, with an active issue
  in the snapshot). The round status, the deck, the footer and the result come with specs 0060
  and 0061; until then the active issue stands in the main area without a frame.

## Card motif

- `motifFor(sessionId, issueIid, round)` in `frontend-react/src/api/card-motif.ts` (in `api`,
  because the toolbar of `shell/` shows the motif as well) gives the values of
  `frontend/src/app/session/card-motif.ts`: FNV-1a of `sessionId:issueIid:round` modulo 5, and the
  next motif when the hash gives the motif of the previous round. `card-motif.spec.ts` has fixed
  values of the Angular function. A change is made in both files in the same pull request.
- The room has `data-motif` and the class `motif-<n>` of `styles/motifs.css`, which sets the
  `--app-card-*` variables for everything inside: `motifOf(session)` is motif 0 in `LOBBY`,
  without an active issue and without a round, else the motif of the round. The motif has no meaning; a state always stands as
  text next to it.
- `cards.ts` has the symbol (`cardSymbol`, ☕ for `COFFEE`) and the name (`cardName`, „Unklar“ for
  `?`, „Kaffeepause“ for `COFFEE`, `null` for a number) of a card. A card with a name is shown
  with `role="img"` and the name as `aria-label`.

## Side column

- Sections in this order, each with an `h2` in `--app-label-section` (upper case by CSS): „Timer“
  (scrum master only), „Teilnehmer · n“, „Teilen“ (only with `invites` in the snapshot), „Fakten“.
- `TimerSetting` (`timer-setting.tsx`): `Select` of `@ui-sdk/react/select` inside `Field`, with
  `FieldLabel` „Timer“ and `FieldDescription` `timer-setting-hint`. The trigger is
  `timer-setting`, the options are `timer-option-<seconds>` (`0` is „Aus“). The values are strings
  and the options are also passed as `items`, so the trigger shows the label of a value that
  comes with a later snapshot. The value is `timerSeconds` of the snapshot. A choice sends
  `PUT …/timer` (`null` for „Aus“), disables the select until the answer and saves `timerSeconds`
  in the `PreferencesStore` after success only. The look is the filled field of the Angular
  room: a box of 212 × 60 px in `--mat-sys-surface-variant` with the label inside at the top, a
  line of 1 px below (2 px in `--mat-sys-primary` while open or focused), the list of the same
  width directly under it and a check mark at the chosen option. The trigger keeps the focus
  outline of `global.css`. These rules stand in `filled-select.module.css`; the period filter
  of the issue panel uses them as well.
- `ParticipantList` (`participant-list.tsx`): scrum master and developers first, viewers after
  them. The own row has „(du)“ and `data-me="true"`. Only a developer has `participant-chip`
  (`data-filled="true"` after a vote in `VOTING` and `REVEALED`); the scrum master and a viewer
  have no chip and no empty column. The state per role and phase is the table of spec 0058 (A6).
- `ShareSession` (`share-session.tsx`): the links are
  `<origin>/session/<id>/join?invite=<code>`, for the viewer with `&as=viewer`, id and code
  through `encodeURIComponent`. The copy buttons exist only when `navigator.clipboard` exists.
  „Kopiert“ disappears after 3 s and a new click starts the 3 s again; the failure text stays. An
  invite code stands only in the link of the scrum master, never in a log or a request of this
  frontend.
- `SessionFacts` (`session-facts.tsx`): session id in `--app-font-mono`, phase, own role and the
  counts of participants, developers and, when there is one, viewers.
- A symbol (★, 👁, ✓, ○, ●, ⧉, ⚠, ＋, ↗) stands in an `aria-hidden` span outside the element
  with the `data-testid`, so a selector reads the text alone.

## Lobby

- A developer and a viewer in `LOBBY` see `lobby-waiting` (`role="status"`) with the small
  `CardHand`, `lobby-waiting-title` and the hint. The scrum master never sees it.
- `lastConfirmed(session)` (`last-result.tsx`) is the newest history entry when it has a
  `finalCard`, the phase is `LOBBY` and the role is not scrum master. With it the title names the
  confirmed result and `LastResult` (`last-result`) follows under the waiting state. The link
  `last-result-open` exists only with `project` in the snapshot, opens
  `<webUrl>/-/issues/<iid>` in a new tab and has `rel="noopener noreferrer"`.

## Issue panel

- `IssuePanel` (`issue-panel.tsx`, `issue-panel`) takes the snapshot as a prop. The list is the
  store `createIssueList` (`issue-list.ts`), created once per panel and read with
  `useSyncExternalStore`: `load(query)` loads the first page, `loadMore()` appends the next page,
  `retry()` repeats the last request (also a next page). Only the answer to the newest request
  changes the state.
- The panel loads on mount with `weightFilter` and `periodFilter` of the `PreferencesStore`, and
  again when the phase changes from `REVEALED` to `LOBBY`. A choice of a filter saves it and loads
  the first page; the search text is sent trimmed and only after the form is submitted;
  „Filter zurücksetzen“ sets both filters to `DEFAULT_PREFERENCES`, clears the search and loads.
- Controls: the search field is `TextField` of `ui/` with an `Input` of `type="search"`; the
  weight filter is `SegmentedControl` of `@ui-sdk/react/segmented-control` (`radiogroup` with
  three `radio` items, `aria-label`); the period filter is `Select` with the look of
  `filled-select.module.css`. Buttons are `AppButton`.
- Errors: `GITLAB_ACCESS_DENIED` and `GITLAB_ERROR` of the list are shown in
  `issue-results-error` with `issue-results-retry`, and the `ErrorState` is cleared so the banner
  stays empty. Every other error stays with the banner.
- Selection: the chosen issue is the active issue, else `preselectedIssueIid`, else none; a click
  on a row changes it, and a new active issue in the snapshot sets it again. The choice is held as
  `{ base, iid }` and compared with the default during render, not copied in an effect.
- `issue-release` reads „Freigeben“ in `LOBBY`, else „Issue wechseln“. It is disabled without a
  choice, when the choice is the active issue, while `round.confirming` and until the answer to
  `POST …/active-issue`. In `VOTING` and `REVEALED` the click opens `SwitchIssueDialog`; the
  command is sent after „Issue wechseln“ only when the button is still enabled.
- `SwitchIssueDialog` (`switch-issue-dialog.tsx`, `switch-dialog`) is `Dialog` of
  `@ui-sdk/react/dialog`, controlled by `open`; Escape and a press outside close it without the
  command, and the focus returns to `issue-release`. `switchIssueText(data)` gives the text for a
  revealed round and for a running round with no, one or several votes.

## Active issue

- `ActiveIssue` (`active-issue.tsx`, `active-issue`) shows `active-issue-iid` (size and line
  height of the title, `--app-font-mono`, weight 400, `--app-on-surface-muted`), the title as
  `h2`, the link `active-issue-link` (new tab, `rel="noopener"`) and the description.
- Description: `renderMarkdown` (`markdown.ts`) turns the Markdown into HTML with `marked` and
  cleans it with DOMPurify (HTML profile; no `form`, `input`, `button`, `textarea`, `select`,
  `style` and no `style` attribute). It is the only place of this frontend with
  `dangerouslySetInnerHTML`, and it never gets a text that did not pass `renderMarkdown`. An
  image keeps its `src`; the Content-Security-Policy of `index.html` blocks the request.
- A description that is not empty is collapsed (120 px with a fade) in `REVEALED` and below
  720 px (`useNarrow`, `use-narrow.ts`, `matchMedia` of `(max-width: 719.98px)`), with
  `active-issue-expand` and `active-issue-collapse` (`aria-expanded`, `aria-controls`). Another
  issue or another phase collapses it again.
- Links to GitLab: an address from GitLab (`webUrl` of an issue or of the project) passes
  `externalUrl` (`external-link.ts`) before it becomes an `href`; only `http:` and `https:` pass,
  otherwise the link is not shown (`active-issue-link`, `issue-preview-link`,
  `last-result-open`).

## Tests

- Every part has its test next to it. `testing/session-snapshots.tsx` renders a part inside a
  session of `createTestBackend` (`renderInSession`), sends a later snapshot through the socket
  double (`receiveSnapshot`) and builds the snapshots that the examples do not have: viewers
  (`withViewers`, `asViewer`), history entries (`confirmedEntry`, `unconfirmedEntry`,
  `withHistory`) and a round number (`inRound`).
- `timer-setting.spec.tsx` adds `Element.prototype.getAnimations` for its run, because jsdom has
  no such function and the popup of the UI SDK calls it. `share-session.spec.tsx` replaces
  `navigator.clipboard` and uses the fake clock of vitest.
- A test of a part that loads issues passes the answer to `GET …/issues` as the fourth argument
  of `renderInSession` (`issuePage(items, nextPage, total)`); without it the list is empty.
  `sessionAnswer` gives the same answers for a test with its own render. Tests with a popup of
  the UI SDK call `installPopupAnimations()` (`testing/popup-animations.ts`).
- End-to-end (spec 0059): the flows that reach the room up to the release of an issue have the
  tag `@react`: `create-and-join`, `issue-filter`, `preferences`, `recent-sessions`, and the
  tests of `session-room`, `theme`, `theme-toggle`, `layout`, `project-picker` and `viewer` that
  need no round. The tests that need the round status, the deck, the footer or a result get the
  tag with specs 0060 and 0061 (`project-rules/testing.md`).
