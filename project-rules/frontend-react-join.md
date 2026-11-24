---
sources: [frontend-react/src/join/**]
---

# React frontend: join page

The join page of the React frontend in `frontend-react/src/join/` (spec 0057). The rules of
`project-rules/frontend-react.md` hold here as well; behaviour, texts and `data-testid` are those
of the Angular join page (`project-rules/frontend.md`, Start and join page, Invite links).

## Page

- Route `/session/:id/join`, loaded with `React.lazy` as its own chunk, outside `RequireSession`.
  The session id of the path is taken in capital letters.
- Layout: one column of at most 440 px, centred. The card hand `CardHand` in the size `large`
  stands centred above the `h1` „Mit welchem Namen?“. Below 720 px the title uses
  `--mat-sys-headline-small` and the page has less padding.
- Invite link (ADR 0014): the page reads `invite` (trimmed) and `as` from the query. With
  `invite` it shows `join-role-hint`, with `as=viewer` `join-viewer-hint` instead, and the form
  `join-form`. `as` only selects the hint and the stored role; it is never sent.
- Form: `TextField` `join-name` (label „Name“, hint „Höchstens 30 Zeichen“,
  `autocomplete="name"`, filled with the name of the `PreferencesStore`) and the `AppButton`
  `join-submit` (`filled`, `type="submit"`, 48 px high). The form has `noValidate`; the one name
  rule is `participantNameError` of `api/participant-name.ts`.
- Name errors show in `join-name-error` at the field after the first submit or after the field
  lost the focus. A submit with an invalid name sends nothing.
- Submit: `api.joinSession(<ID>, { name, invite })` with the trimmed name. The button is
  `disabled` while the call runs, and a second submit in that time sends nothing. After success
  the page stores the access with `tokens.store(<ID>, { participantId, token }, { role, name })`
  (role `VIEWER` with `as=viewer`, else `DEVELOPER`), saves the name in the `PreferencesStore` and
  goes to `/session/<ID>`.
- The token of the answer goes only to the `TokenStore`: never into a text, a URL, a log or
  component state (ADR 0003).

## Error states

- Without `invite`, or with a value of white space only: `join-invite-missing` in an `ErrorNote`,
  no form, no role hint, no call.
- The page shows five codes of the join call itself (`formErrorMessage` with the set
  `JOIN_FORM_ERRORS`) and clears the `ErrorState` for them, so the banner does not appear:
  - `SESSION_NOT_FOUND`: `join-not-found` (title, text, link `join-not-found-home` to `/`) in
    place of the form and the role hint.
  - `INVITE_INVALID`: `join-invite-invalid` in place of the form and the role hint.
  - `NAME_TAKEN`: its text at the field in `join-error` (the error text of `TextField`), until
    the name changes.
  - `LIMIT_REACHED`, `VALIDATION_ERROR`: its text in `join-error` in an `ErrorNote` above the
    field, until the next submit.
- Every other code stays in the `ErrorState` for the banner; a failure of the network shows
  nothing. In both cases the form stays and the button is free again.
- The state of the form belongs to one link: another session id, `invite` or `as` in the address
  starts the form again (`key`).

## Tests

- `join-page.spec.tsx` drives the page through `createTestBackend` and a `MemoryRouter` with the
  route of the page and a route that shows the path after the change of the page.
- End-to-end: the flows with a join (`frontend/e2e/create-and-join.spec.ts`,
  `frontend/e2e/full-flow.spec.ts`, `frontend/e2e/preferences.spec.ts`,
  `frontend/e2e/viewer.spec.ts`) need the start page and the room and get the tag `@react` with
  spec 0059.
