---
sources: [frontend-react/src/session/**]
---

# React frontend: session room

The room of the React frontend in `frontend-react/src/session/` (spec 0058: grid, card motif, side
column, lobby). The rules of `project-rules/frontend-react.md` hold here as well; texts,
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
- In `DISCUSSION`, `VOTING` and `REVEALED`, and for the scrum master in `LOBBY`, the main area is
  empty until specs 0059 to 0061.

## Card motif

- `motifFor(sessionId, issueIid, round)` in `card-motif.ts` gives the values of
  `frontend/src/app/session/card-motif.ts`: FNV-1a of `sessionId:issueIid:round` modulo 5, and the
  next motif when the hash gives the motif of the previous round. `card-motif.spec.ts` has fixed
  values of the Angular function. A change is made in both files in the same pull request.
- The room has `data-motif` and the class `motif-<n>` of `styles/motifs.css`, which sets the
  `--app-card-*` variables for everything inside: motif 0 in `LOBBY`, without an active issue and
  without a round, else the motif of the round. The motif has no meaning; a state always stands as
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
  outline of `global.css`.
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

## Tests

- Every part has its test next to it. `testing/session-snapshots.tsx` renders a part inside a
  session of `createTestBackend` (`renderInSession`), sends a later snapshot through the socket
  double (`receiveSnapshot`) and builds the snapshots that the examples do not have: viewers
  (`withViewers`, `asViewer`), history entries (`confirmedEntry`, `unconfirmedEntry`,
  `withHistory`) and a round number (`inRound`).
- `timer-setting.spec.tsx` adds `Element.prototype.getAnimations` for its run, because jsdom has
  no such function and the popup of the UI SDK calls it. `share-session.spec.tsx` replaces
  `navigator.clipboard` and uses the fake clock of vitest.
- End-to-end: no flow of the room has the tag `@react` yet. The start and join page of the React
  frontend are missing, so a flow cannot create or join a session; spec 0059 tags the first
  flows. `session-access.spec.ts` covers `session-gone` and the way to the join page.
