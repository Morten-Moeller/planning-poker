---
sources: [frontend-react/src/ui/**, frontend-react/src/styles/motifs.css, frontend-react/ui.html]
---

# React frontend: shared controls

The shared controls of the React frontend in `frontend-react/src/ui/` (spec 0055). The rules of
`project-rules/frontend-react.md` hold here as well.

## What goes into `ui/`

- A part comes to `ui/` only when two features use it (A1.3). A part with one user stays in its
  feature: select, autocomplete, segmented control, dialog, toast, collapsible and progress bar are
  made there.
- `ui/` imports packages and `styles/`, no feature and no text from `i18n/`. A control gets its
  texts as props. The gallery in `ui/gallery/` is the only code in `ui/` that imports
  `shell/theme-store`.
- One file per control, with its CSS Module and its test next to it. The variant and the state are
  attributes on the element (`data-variant`, `data-tone`, `data-size` and the state attributes of
  the UI SDK); the CSS Module selects on them.

## `AppButton` (`ui/app-button.tsx`)

- Renders `Button` of `@ui-sdk/react/button` (`data-slot="button"`) and passes every prop of it:
  `type`, `disabled`, `focusableWhenDisabled`, `pendingAnnouncement`, `onClick`, `render`,
  `data-testid`, `aria-*`.
- `variant` (required): `filled`, `outlined` or `text`, the look of `mat-flat-button`,
  `mat-stroked-button` and `mat-button` of the Angular frontend. Height 40 px, radius
  `--app-corner-control` (`text`: `--mat-sys-corner-small`), font `--mat-sys-label-large`.
- `tone`: `default` or `on-error`. `on-error` sets text and border to
  `--mat-sys-on-error-container` for `outlined` and `text` on an error container; it does not
  change `filled`.
- `className` is a string and is added to the class of the control, for layout only (margin,
  width, grid position).
- Link: `render={<Link to="/" />}` for a route. For a plain link `render` is a function,
  `render={(props) => <a {...props} href="…">{props.children}</a>}`, because `jsx-a11y` reports an
  anchor without content.
- Pending: an `onClick` that returns a Promise keeps the button pending until the Promise ends.
  The UI SDK sets `data-pending`, `aria-busy` and `aria-disabled` and drops further clicks; the
  control shows a spinner before the label. The label stays the same while it is pending. A form
  with an async submit handler sets `disabled` itself (UI SDK documentation, button, Forms).
- Disabled: text in `--mat-sys-on-surface` at 38 %, no pointer cursor.
- Focus: the outline of `global.css` stays; `filled` adds a ring of 3 px in `--mat-sys-surface`.

## `TextField` (`ui/text-field.tsx`)

- Built from `Field`, `FieldLabel`, `FieldDescription` and `FieldError` of
  `@ui-sdk/react/field` and `Input` of `@ui-sdk/react/input`. The UI SDK sets the accessible name
  and `aria-describedby`; no own `id` or `htmlFor`.
- Props: `label`, `value`, `onChange(value: string)`, `hint`, `error`, `onBlur`, `name`,
  `autoComplete`, `inputMode`, `maxLength`, `disabled`, `data-testid` (on the input),
  `errorTestId` (on a span with the error text alone, without the symbol, as in the Angular
  frontend), `renderInput`.
- `renderInput(input)` (spec 0056): a feature replaces `Input` by a control of its own that joins
  the field, for example `AutocompleteInput` or `FieldControl` of the UI SDK. `input` has the
  class of the field (`className`) and the props `TextField` gives to `Input`: `value`,
  `onChange`, `onBlur`, `name`, `autoComplete`, `inputMode`, `maxLength`, `data-testid`. The
  control puts `className` on its input element; label, hint, error and the invalid state come
  from the field as before. Without `renderInput` nothing changes.
- The field is controlled: the caller keeps the value and the validation and passes the error
  text. No native constraint (`required`, `pattern`) is used.
- A non-empty `error` sets `aria-invalid="true"` and stands in place of the hint. The error text
  starts with the symbol ⚠ in an `aria-hidden` span.
- Look: label above the field in `--mat-sys-label-large` (it does not move into the border),
  field 56 px high with a border of 1 px in `--mat-sys-outline` and the radius
  `--app-corner-control`; focus 2 px `--mat-sys-primary`; error `--mat-sys-error`; hint and error
  in `--mat-sys-body-small` below the field.
- `size="compact"` (spec 0067) sets `data-size="compact"` on the input and makes the field
  40 px high, for a field next to an `AppButton`. Without `size` the field is 56 px high. Only
  the search field of the issue panel uses it.
- The input has no outline on `:focus-visible`; the border shows the focus, as in the Angular
  frontend. This is the only control without the outline of `global.css`.

## `ErrorNote` (`ui/error-note.tsx`)

- A box with `role="alert"` in `--mat-sys-error-container` and `--mat-sys-on-error-container`,
  radius `--app-corner-control`, font `--mat-sys-label-large` at weight 400 (the classes `note`
  and `note-error` of the Angular frontend). Own HTML and CSS; the UI SDK has no such part.
- The symbol ⚠ stands before the content in an `aria-hidden` span; `icon={false}` leaves it out.
- `data-testid` and `className` go to the box. The base rule has no specificity (`:where`), so a
  class of the caller changes layout and font without regard to the order of the stylesheets.
- The content is the children; the caller puts the `data-testid` of the text on its own span when
  the Angular frontend has it there.

## `CardHand` (`ui/card-hand.tsx`)

- Five cards with the classes `motif-0` to `motif-4`, fanned from −20° to +20°; decoration with
  `aria-hidden="true"`, `data-testid="card-hand"` and `card-hand-card`.
- `size`: `small` (44 × 64 px per card, the default) or `large` (64 × 92 px).

## Card motifs (`styles/motifs.css`)

- The global classes `motif-0` to `motif-4` set `--app-card-accent`, `--app-card-on-accent`,
  `--app-card-pattern` and `--app-card-pattern-size`, light and dark, with the values of
  `frontend/src/styles/_motifs.scss`. A change in one file is made in the other one in the same
  pull request.
- A component that uses a motif class imports `styles/motifs.css` itself.

## Gallery

- `frontend-react/ui.html` with `src/ui/gallery/` shows every control in every variant, tone and
  state with the theme switch: `make frontend-react`, then
  `http://localhost:<FRONTEND_REACT_PORT>/ui.html`.
- The gallery is a second HTML entry of the dev server only. `vite build` does not contain it; no
  route of the application leads to it. Its texts are constants in `ui-gallery.tsx`, not entries
  of `i18n/messages.ts`.
- A new control or a new state of a control gets its example in the gallery in the same pull
  request.
