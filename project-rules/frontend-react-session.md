---
sources: [frontend-react/src/session/**]
---

# React frontend: session room

The room of the React frontend in `frontend-react/src/session/` (spec 0058: grid, card motif, side
column, lobby; spec 0059: issue panel, active issue, switch dialog; spec 0060: round status, timer,
seat table, card deck, footer; spec 0061: round result, confirm dialog, success message, history). The rules of `project-rules/frontend-react.md` hold here as well; texts,
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
  last result (developer and viewer in `LOBBY`), then the active issue: inside `RoundStatus` in
  `DISCUSSION` and `VOTING`, inside `RoundResult` in `REVEALED`, alone in `LOBBY`.
- Footer: outside `LOBBY` the room has a third child after the main area, the second row of the
  grid (`RoundFooter`, `round-footer`). From 720 px it stays in the window; below that it is
  sticky at the bottom of the window.
- The side column ends with `SessionHistory` when the snapshot has history entries.

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
  in the `PreferencesStore` after success only. The look is the outlined select of the React
  frontend alone (spec 0067; the Angular room keeps the filled field): a box of 212 × 42 px
  with a border of 1 px in `--mat-sys-outline`, the radius `--app-corner-control` and no
  background; the border is `--mat-sys-on-surface` on hover and 2 px in `--mat-sys-primary`
  while open or focused (an inset shadow, so the content does not move); a disabled select has
  border and text at 38 % of `--mat-sys-on-surface`. The list has the width of the trigger,
  4 px below it, and a check mark at the chosen option. The label „Timer“ is not visible
  (`labelHidden`) and stays the accessible name; the heading of the section stands above. These
  rules stand in `outlined-select.module.css`; the period filter of the issue panel uses them as
  well.
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
  `outlined-select.module.css`, 148 px wide and as high as the weight filter, with the visible
  label „Geändert in“ to its left. The search field has `size="compact"` (40 px, the height of
  „Suchen“; spec 0067). Buttons are `AppButton`.
- Errors: `GITLAB_ACCESS_DENIED` and `GITLAB_ERROR` of the list are shown in
  `issue-results-error` with `issue-results-retry`, and the `ErrorState` is cleared so the banner
  stays empty. Every other error stays with the banner.
- `issue-results-empty` is shown only after a load that succeeded without results. After a
  failed load (`loadFailed` of `issue-list.ts`) it is not shown until the next load succeeds;
  results of an earlier load stay (spec 0064).
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
  `h2`, the link `active-issue-link` (new tab, `rel="noopener noreferrer"`) and the description.
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
  `last-result-open`). The four links to GitLab (these three and `confirm-success-open`) open a
  new tab and have `rel="noopener noreferrer"` (spec 0064).

## Round

- `RoundStatus` (`round-status.tsx`, `round-status`) takes the snapshot, the motif and the
  active issue as children. The bar shows in `DISCUSSION` `round-phase`, `round-number` and, with
  a timer of the session, `discussion-timer`; in `VOTING` `round-number`, `vote-counter`,
  `vote-progress` and, with `round.deadline`, `RoundTimer`; always `motif-name` (`motifName`,
  hidden below 600 px). The seat table follows the children in `VOTING`.
- `voteProgress` (`vote-progress.ts`) counts the connected developers and their votes; the
  scrum master, viewers and disconnected developers are not counted. `vote-progress` is
  `Progress` of `@ui-sdk/react/progress` with `value` and `max` as counts and `ProgressTrack`;
  the fill is an own element with the rounded percent as width, because `ProgressIndicator`
  sets an unrounded width and shows a full bar for `max` 0.
- `RoundTimer` (`round-timer.tsx`) counts every second with `sessions.serverNow()`, never with
  the client clock alone. The last 10 s have the class `final`, 0 shows „Zeit abgelaufen“.
  `round-timer-live` changes only at the first state, every 15 s and in the last 10 s, so a
  screen reader does not read every second.
- `SeatTable` (`seat-table.tsx`) shows one seat per developer. Before the reveal a seat has no
  card value in the DOM: a hidden card after a vote, „…“ or „getrennt“ without one. In
  `REVEALED` a vote is `result-vote` with `result-vote-card`, also for a developer who left; a
  developer without a vote keeps `seat`. `outlierCards` (`outliers.ts`) gives the lowest and the
  highest number card when they are more than two places apart; the rule is the one of
  `frontend/src/app/session/outliers.ts` and changes in both files together. The cards turn one
  after another (40 ms steps).
- `PokerCard` (`card.tsx`) is a `button` in the states `open`, `chosen` and `locked` and an
  element with `role="img"` in `hidden` and `revealed`; `pending` has no role. The button has
  `data-state`, `aria-pressed` and, locked or while a vote is sent, `aria-disabled="true"`
  (never `disabled`, so it keeps the focus). The value stands in an `aria-hidden` span; the name
  is the `aria-label` „Karte …“. `?` and `COFFEE` are drawn by `CardGlyph` (`card-glyph.tsx`),
  React components with the paths of `frontend/public/question-mark.svg` and
  `coffee-break.svg`; a change of a drawing is made in both frontends. The wrapper of a card in the
  deck has 8 px padding on top from 600 px, the wrapper of a card at a seat a gap of 6 px: in the
  Angular frontend the host of the card takes these values from the rules `.deck` and `.seat` of
  the parent component, and the measures of both frontends are equal only with them.
- `CardDeck` (`card-deck.tsx`) is `card-deck` in `VOTING` and `card-deck-locked` in
  `DISCUSSION`. A click, Enter or Space sends `PUT …/vote`; until the answer no card takes a
  click. The chosen card is `round.myVote` of the snapshot, never a local value. Arrow keys,
  Home and End move the focus; the card with the focus and the chosen card are scrolled into
  the row. Below 600 px the deck is one row that scrolls sideways.
- Motion: a locked card wiggles on a click and on the first mouse move; the cards unlock one
  after another (`data-unlock`, `--unlock-index`) when the same deck changes from locked to
  open; revealed cards turn over. `prefersReducedMotion()` (`reduced-motion.ts`) switches all
  three off, and the CSS has the same media query.
- `RoundFooter` (`round-footer.tsx`): the scrum master has `discussion-hint` with `round-start`
  in `DISCUSSION` and `pending-hint` or `all-voted-hint` (with `absent-hint`) with
  `round-reveal` in `VOTING`; a developer has the deck; a viewer has `viewer-hint`. A command
  button is disabled until the answer.

## Result and confirmation

- `RoundResult` (`round-result.tsx`, `round-result`) takes the snapshot, the motif and the
  active issue as children: the bar (`round-number`, `result-counter`, `motif-name`; the classes
  of `round-status.module.css`), the children, `confirming-hint` while `round.confirming`, the
  consensus, the note for outliers, `result-empty`, the revealed `SeatTable`, `not-voted` and
  the statistics (`result-distribution`, `result-facts`). No part of the result has a button.
- `consensusCard` (`consensus.ts`): at least two votes and all the same number card; the rule is
  the one of `frontend/src/app/session/consensus.ts`. With a consensus `Confetti`
  (`confetti.tsx`, `consensus-confetti`) shows 46 pieces; `pieceStyle(index)` gives the values
  of the Angular function. No confetti under `prefersReducedMotion()`, and the CSS hides it for
  the same media query.
- `averageText` (`round-stats.ts`) formats the average with one decimal and a comma
  (`Intl.NumberFormat('de')`). `CardValue` (`card-value.tsx`) shows a card as text, with
  `role="img"` and its name for `?` and `COFFEE`.
- Footer in `REVEALED`: the scrum master has `round-restart` and `result-accept`, both disabled
  while `round.confirming`, until the answer to the restart and while the dialog is open;
  everybody else has `result-waiting`.
- `ConfirmResultDialog` (`confirm-result-dialog.tsx`, `confirm-dialog`) is `Dialog` of the UI
  SDK, mounted only while it is open, so its choice starts new every time. It reads issue,
  `writeWeight` and the distribution from the snapshot on every render and keeps no copy; the
  issue for the success message is read when the request is sent. The cards are
  `RadioGroup` and `Radio` of `@ui-sdk/react/radio` inside the labels `confirm-card`; the name
  of a radio is the name of the card, its description the count of votes. The consensus is
  preselected; without one the most frequent values are marked. While the request runs the
  dialog is not dismissible, the radios and both buttons are disabled and `confirm-writing`
  shows a `Progress` without a value. `GITLAB_ACCESS_DENIED` and `GITLAB_ERROR` stay in the
  dialog as `confirm-error` and clear the `ErrorState`; every other error stays with the banner.
- Success: the dialog calls `onConfirmed`, and `session-page.tsx` shows the message with
  `showConfirmSuccess` (`confirm-success.tsx`): a `Toast` of `@ui-sdk/react/toast` for 5 s in the
  `ToastRegion` of the room, with `confirm-success` and, for an address that passes
  `externalUrl`, the link `confirm-success-open`. The toaster is created once per room and
  dismissed when the room is left. Only the browser that confirmed shows the message.
- `SessionHistory` (`session-history.tsx`, `history-panel`) is `Collapsible` of
  `@ui-sdk/react/collapsible`, closed at first, with `keepMounted`: the entries stay in the DOM
  while it is closed, as in the Angular frontend. An entry shows issue, round, votes, average,
  most frequent values and the final value or „ohne Endwert“.

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
- A test of a part that takes the snapshot as a prop renders it inside `SessionPart`
  (`testing/session-snapshots.tsx`), which reads the snapshot of the store; `withRound`,
  `withParticipant` and `withDeveloper` build the snapshots the examples do not have. A test of
  a timer uses the fake clock of vitest with `shouldAdvanceTime`.
- jsdom sends the end of an animation to React only as `webkitAnimationEnd`; `card.spec.tsx`
  sends both event names.
- A test with a toast calls `installResizeObserver()` (`testing/popup-animations.ts`); jsdom has
  no `ResizeObserver`. jsdom does not move the choice of the `RadioGroup` with the arrow keys;
  `result-round.spec.ts` covers that in the browser. A test finds the radios by
  `data-slot="radio"`, because every `Radio` also has a hidden native input.
- End-to-end: every flow of the room runs against both frontends (`project-rules/testing.md`).
