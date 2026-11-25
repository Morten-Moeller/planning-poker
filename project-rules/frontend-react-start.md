---
sources: [frontend-react/src/start/**]
---

# React frontend: start page

The start page of the React frontend in `frontend-react/src/start/` (spec 0056). It behaves like
`frontend/src/app/start/` of the Angular frontend. The rules of `project-rules/frontend-react.md`
and `project-rules/frontend-react-ui.md` hold here as well.

## Structure

- `start-page.tsx`: the page `start-page` in this order: `CardHand` in the size `large`, the
  title, the lead `start-lead`, `RecentSessionsList`, `CreateForm`, the footer `start-footer` with
  the status row `health` (`health-status`) and, without backend, `health-down` with
  `health-retry` (`AppButton`, `outlined`, `on-error`). The page asks `GET /api/health` itself
  (`health-api.ts`) and passes `backendDown` to the form.
- Layout (spec 0046): the values of `frontend/src/app/start/start-page.scss`. Title, lead, recent
  sessions and form are centred, the form is at most 600 px wide, the footer is left-aligned and
  stands at the bottom of the window when there is room. The fields are 56 px high with the label
  above the field (`TextField`), so the form is higher than in the Angular frontend.
- `create-form.tsx`: the form `create-form` with its state, the validation and the create call.
- `picker-field.tsx`: one field with suggestions; the only use of `Autocomplete` of the UI SDK
  (A1.3). It renders `TextField` with `renderInput`, so both pickers look like the name field.
- `project-search.ts`: the search of projects and issues without React.
- `recent-sessions-list.tsx`: the section `recent-sessions`.
- `messages.ts`: the texts `start.*` with the ids of the Angular template; `TextKey` is the type
  of the keys without a number form.
- Services come from `useBackend()` only. No file of this folder imports another feature.

## Form

- Fields: `create-name` („Dein Name“, `autocomplete="name"`), `create-project`
  („GitLab-Projekt“) and `create-issue` („Issue (optional)“). Name and project start with the
  values of the `PreferencesStore`.
- Validation runs in the component, not through native constraints (`noValidate`):
  `participantNameError` for the name, a project with at least one character that is no white
  space, an issue that is empty or a whole number from 1. A field shows its error after its first
  blur or after the first submit: `create-name-error`, `create-project-error`,
  `create-issue-error`. A submit with an error sends nothing.
- Create: `POST /api/sessions` with name and project trimmed and `issueIid` only for a filled
  field. After success, in this order: `TokenStore.store` with the role `SCRUM_MASTER` and the
  name, `PreferencesStore.save` with name and project, `PUT …/timer` when the saved timer is not
  off, then the route `/session/<id>`; a failed timer call does not stop the change of the route.
- `create-submit` is an `AppButton` (`filled`, `type="submit"`). It is disabled while the call
  runs and without backend; without backend it reads „Sitzung erstellen (Backend fehlt)“.

## Error path

- `ISSUE_NOT_FOUND`, `PROJECT_NOT_ALLOWED`, `LIMIT_REACHED`, `GITLAB_ACCESS_DENIED`,
  `GITLAB_ERROR` and `VALIDATION_ERROR` of the create call show their text in `create-error`
  (`ErrorNote` above the fields) and clear the `ErrorState`. The next submit removes the text.
- `PROJECT_NOT_FOUND` shows its text in `create-project-error` and clears the `ErrorState`; a
  change of the project field removes it.
- Every other code stays in the `ErrorState` and the banner of the shell shows it. The inputs stay
  and no token is stored after any failure.

## Search

- `createProjectSearch` and `createIssueSearch` (`project-search.ts`) are factories that take the
  `Api`, the `ErrorState` and the timers; the form creates them once and reads the result with
  `useSyncExternalStore`. A result is `{ items, searched, error }`.
- Project: a text with at least one character that is no digit is searched 300 ms after the last
  input (`searchProjects` with `search`); digits only count as an id without a search. The focus
  on the empty field loads the first page without `search` at once.
- Issue: the search runs only when the project field holds a number and the issue text is no
  number, with the same delay, also once when the page opens with a saved project.
- Only the answer to the last input is shown. An input without a search empties the list at once.
- `PROJECT_NOT_ALLOWED`, `GITLAB_ACCESS_DENIED` and `GITLAB_ERROR` of a search show their text in
  `create-project-search-error` or `create-issue-search-error` (`ErrorNote` below the field) and
  clear the `ErrorState`; another failure empties the list without a text.
- `PickerField`: `Autocomplete` with `filter={false}` (the backend filters) and `openOnFocus`.
  An option carries `create-project-option` (name, then path and id) or `create-issue-option`
  („#iid Titel“); its `label` is the id or iid, which a choice writes into the field. An empty
  answer shows one disabled option `create-project-empty` or `create-issue-empty`. The popup is
  hidden while it has no option.
- Unit tests that open the popup call `installPopupAnimations()`
  (`start/testing/popup-animations.ts`), because jsdom has no `Element.getAnimations`.

## Recent sessions

- `RecentSessions.enabled()` `true`: the list checks every entry with `getSession` when the page
  opens. `SESSION_NOT_FOUND` and `UNAUTHORIZED` remove the entry through `TokenStore.remove`;
  another failure keeps the row without project and issue; every failure of the check clears the
  `ErrorState`. `false`: no section, and `RecentSessions.clear()`. `null`: no section.
- A row `recent-session` is a link to `/session/<id>` with `recent-session-project` (name, else
  the project id), `recent-session-issue`, `recent-session-role` (role of the snapshot, else of
  the entry), `recent-session-name`, `recent-session-id` and `recent-session-last-used` (minutes,
  hours or days since `lastUsedAt` at the time of the check, at least 1 minute).
- `recent-session-remove` (`AppButton`, `text`) calls `RecentSessions.remove` only; the token in
  `sessionStorage` stays.
- A token never appears in the row.

## End-to-end

- Flows of this feature with the tag `@react`: `frontend/e2e/health.spec.ts` (all tests),
  `frontend/e2e/create-and-join.spec.ts` (the incomplete form, the unknown issue, the issue that
  GitLab refuses), `frontend/e2e/project-picker.spec.ts` (the empty state of the issue search,
  the lists on a click into the empty fields) and the focus ring test of
  `frontend/e2e/theme.spec.ts`.
- The flows that need the room or the join page get their tag with spec 0059.
