---
id: "0055"
title: "React-Frontend: gemeinsame Bausteine Button, Textfeld und Kartenhand"
status: done
risk: medium
adrs: ["0016"]
owner: Morten Möller
created: 2026-11-24
updated: 2026-11-24
pr: "#63"
note: alle Kriterien erfüllt
---

# React-Frontend: gemeinsame Bausteine Button, Textfeld und Kartenhand

## Ziel

Startseite, Beitrittsseite und Raum (Specs 0056 bis 0058) laufen in einer Welle und brauchen
dieselben Teile: Buttons in drei Formen, das Textfeld mit Beschriftung, Hinweis und Fehler und die
Kartenhand mit den fünf Motiven. Diese Spec legt sie einmal in `frontend-react/src/ui/` an, im
Aussehen des Angular-Frontends und auf den Komponenten des UI SDK. Gelöst ist es, wenn die
Musterseite `ui.html` jedes Teil in jedem Zustand hell und dunkel zeigt und die Maße mit dem
Angular-Frontend übereinstimmen.

## Scope

### Enthalten

- `AppButton` auf `Button` des UI SDK: Formen `filled`, `outlined`, `text`; Ton `default` und
  `on-error`; als Link nutzbar; Zustände gesperrt und wartend.
- `TextField` auf `Field`, `FieldLabel`, `FieldDescription`, `FieldError` und `Input` des UI SDK.
- `CardHand` in den Größen `small` und `large` und die Motiv-Variablen in
  `frontend-react/src/styles/motifs.css`.
- Musterseite `frontend-react/ui.html` für den Dev-Server; sie ist nicht Teil des Builds.
- `project-rules/frontend-react-ui.md`.

### Nicht enthalten

- Einsatz der Bausteine in Seiten: Startseite (0056), Beitrittsseite und Banner (0057), Raum (0058).
- Select, Autocomplete, Segmented Control, Dialog, Toast, Collapsible, Fortschrittsbalken: jedes
  dieser Teile hat genau ein Feature als Nutzer und entsteht dort (A1.3).
- Karte `app-card`, Kartensatz und Tisch (0060).
- Texte im Katalog; die Bausteine bekommen ihre Texte als Eigenschaften.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Kartenmotiv | eines der fünf Muster Raster, Punkte, Zeilen, Ringe, Stufen mit Akzentfarbe hell und dunkel (`project-rules/frontend.md`, Design Werkbank Teil B); ohne Bedeutung für den Zustand |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `AppButton` rendert `Button` aus `@ui-sdk/react/button` (`data-slot="button"`) und reicht `data-testid`, `type`, `disabled`, `onClick` und `aria-*` durch. `variant` ist `filled`, `outlined` oder `text`, `tone` `default` oder `on-error`. Mit `render={<a href>}` oder einem Router-Link ist das Element ein Link. | vitest: `frontend-react/src/ui/app-button.spec.tsx` |
| A2 | Maße und Farben der drei Formen stimmen mit `mat-flat-button`, `mat-stroked-button` und `mat-button` des Angular-Frontends überein: Höhe 40 px, Radius `--app-corner-control` (Textform `--mat-sys-corner-small`), Schrift `--mat-sys-label-large`, gefüllt `--mat-sys-primary` auf `--mat-sys-on-primary`, Rahmen `--mat-sys-outline`, Text `--mat-sys-primary`; `on-error` nutzt `--mat-sys-on-error-container` für Text und Rahmen. Gesperrt: 38 % Deckkraft des Textes wie Material, kein Zeiger. | Bildschirm: `ui.html` neben Startseite und Banner des Angular-Frontends, berechnete Stile im Vergleich |
| A3 | Ein Button, dessen `onClick` ein Promise liefert, trägt bis zu dessen Ende `data-pending` und `aria-busy="true"`, zeigt einen sichtbaren Wartezustand und nimmt keinen zweiten Klick an. | vitest: `frontend-react/src/ui/app-button.spec.tsx` |
| A4 | Der Fokusring aus `global.css` bleibt auf jedem Button; die gefüllte Form hat zusätzlich einen Ring von 3 px in `--mat-sys-surface` (Design-System, „Fokus und Bewegung“). | Bildschirm: `ui.html`, Tab durch die Buttons |
| A5 | `TextField` verbindet Beschriftung, Eingabe, Hinweis und Fehler über `Field` des UI SDK: die Eingabe hat den zugänglichen Namen der Beschriftung, und Hinweis oder Fehler stehen in `aria-describedby`. Eigenschaften: `label`, `hint`, `error`, `value`, `onChange`, `onBlur`, `name`, `autoComplete`, `inputMode`, `maxLength`, `disabled`, `data-testid` (an der Eingabe), `errorTestId` (am Fehlertext). Mit `error` hat die Eingabe `aria-invalid="true"`, der Fehler ersetzt den Hinweis und beginnt mit dem Symbol ⚠ in einem `aria-hidden`-`span`. | vitest: `frontend-react/src/ui/text-field.spec.tsx` |
| A6 | Aussehen des Textfelds wie das umrandete `mat-form-field` der Startseite: Höhe 56 px, Rahmen 1 px `--mat-sys-outline`, Radius `--app-corner-control`, bei Fokus 2 px `--mat-sys-primary`, im Fehler `--mat-sys-error`; Hinweis und Fehler in `--mat-sys-body-small` unter dem Feld. Die Beschriftung steht über dem Feld in `--mat-sys-label-large` und wandert nicht in den Rahmen. Die Eingabe hat keinen eigenen Umriss bei `:focus-visible`. | Bildschirm: `ui.html` hell und dunkel bei 1280 px und 375 px |
| A7 | `CardHand` rendert `data-testid="card-hand"` mit `aria-hidden="true"` und fünf `card-hand-card` mit den Klassen `motif-0` bis `motif-4` (kein `data-motif`), gefächert von −20° bis +20° um einen Punkt unter der Hand; `size` ist `small` (44 × 64 px je Karte, Standard) oder `large` (64 × 92 px). | vitest: `frontend-react/src/ui/card-hand.spec.tsx`; Bildschirm: `ui.html` |
| A8 | `frontend-react/src/styles/motifs.css` setzt je Motiv `--app-card-accent`, `--app-card-on-accent`, `--app-card-pattern` und `--app-card-pattern-size` mit den Werten aus `frontend/src/styles/_motifs.scss`, hell und dunkel; die Akzentfarben der Kartenhand sind hell `#2f5fd0`, `#0a6f8f`, `#3a7a39`, `#9a2299`, `#8a5f00` und dunkel `#61afef`, `#56b6c2`, `#98c379`, `#c678dd`, `#e5c07b`. | Bildschirm: `ui.html`, berechnete Hintergrundfarben der fünf Karten hell und dunkel, Vergleich mit der Kartenhand der Angular-Startseite |
| A9 | `http://localhost:<FRONTEND_REACT_PORT>/ui.html` zeigt im Dev-Server jede Form, jeden Ton und jeden Zustand der Buttons, das Textfeld leer, gefüllt, mit Hinweis, mit Fehler und gesperrt und die Kartenhand in beiden Größen, mit dem Hell-Dunkel-Umschalter. `vite build` enthält die Seite und ihren Code nicht. | Bildschirm: `ui.html`; Aufruf: `pnpm -C frontend-react build`, dann `ls frontend-react/dist` ohne `ui.html` und `grep -r "ui-gallery" frontend-react/dist` ohne Treffer |
| A10 | `project-rules/frontend-react-ui.md` nennt die Bausteine, ihre Eigenschaften, die Regel „ein Teil kommt erst nach `ui/`, wenn zwei Features es nutzen“ und die Musterseite; `project-rules/README.md` führt die Datei. | Aufruf: `grep -n "frontend-react-ui" project-rules/README.md` |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh`: Dateien unter `frontend-react/` und `project-rules/**`
sind medium; kein Manifest, kein Schlüsselwort.
Gates: G2, das Label `human-approved` nach dem letzten Push; Code- und Sicherheits-Review.
ADR nötig: nein, weil die Änderung ADR 0016 folgt (UI SDK für Bedienelemente, CSS Modules) und
keine Abhängigkeit hinzufügt.

## Umsetzung

Entscheidungen:

- Neues gemeinsames Modul `frontend-react/src/ui/` für Teile, die mindestens zwei Features nutzen
  (A1.3); alles andere bleibt im Feature.
- Die Beschriftung des Textfelds steht fest über dem Feld und wandert nicht wie bei Angular
  Material in den Rahmen. Das Design nennt dazu keine Regel; die Höhe des Formulars wächst je Feld
  um die Zeile der Beschriftung.
- Musterseite als zweiter HTML-Einstieg `frontend-react/ui.html`, nur im Dev-Server; keine Route
  der Anwendung, keine Texte im Katalog.
- Keine neue Abhängigkeit.

Dateien:

- `frontend-react/src/ui/app-button.tsx`: neu
- `frontend-react/src/ui/app-button.module.css`: neu
- `frontend-react/src/ui/app-button.spec.tsx`: neu
- `frontend-react/src/ui/text-field.tsx`: neu
- `frontend-react/src/ui/text-field.module.css`: neu
- `frontend-react/src/ui/text-field.spec.tsx`: neu
- `frontend-react/src/ui/card-hand.tsx`: neu
- `frontend-react/src/ui/card-hand.module.css`: neu
- `frontend-react/src/ui/card-hand.spec.tsx`: neu
- `frontend-react/src/ui/gallery/ui-gallery.tsx`: neu, Musterseite
- `frontend-react/src/ui/gallery/ui-gallery.module.css`: neu
- `frontend-react/src/ui/gallery/main.tsx`: neu, Einstieg der Musterseite
- `frontend-react/src/styles/motifs.css`: neu, Variablen je Motiv hell und dunkel
- `frontend-react/ui.html`: neu
- `project-rules/frontend-react-ui.md`: neu
- `project-rules/README.md`: ändern, Zeile für die neue Datei
- `docs/specs/0055-react-gemeinsame-bausteine.md`: neu

Schritte:

1. Dokumentation der installierten Version lesen:
   `frontend-react/node_modules/@ui-sdk/react/docs/components/button.md`, `field.md`, `input.md`,
   `frontend-react/node_modules/@ui-sdk/react/docs/styling-and-animation.md`. Bietet `Field` oder
   `Input` eine Eigenschaft aus A5 nicht, hält `/implement` an.
2. `motifs.css` aus `frontend/src/styles/_motifs.scss`: Klassen `motif-0` bis `motif-4` mit den
   vier Variablen, dunkel nach dem Muster von `tokens.css`.
3. `card-hand.tsx` nach `frontend/src/app/api/card-hand.ts`, `.html` und `.scss`.
4. `app-button.tsx` mit den Stilen nach den berechneten Werten der Angular-Buttons (Dev-Server des
   Angular-Frontends im Browser auslesen).
5. `text-field.tsx`.
6. Musterseite `ui.html`, `gallery/main.tsx`, `gallery/ui-gallery.tsx` mit dem `ThemeStore`.
7. Unit-Tests zu A1, A3, A5, A7.
8. `project-rules/frontend-react-ui.md`, `project-rules/README.md`.
9. `make check`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `frontend-react/src/ui/app-button.spec.tsx`: Formen, Ton, durchgereichte Attribute, Link |
| A2 | Browser: `ui.html` und Angular-Frontend, berechnete Stile je Form |
| A3 | `frontend-react/src/ui/app-button.spec.tsx`: Promise offen, zweiter Klick, Ende |
| A4 | Browser: `ui.html`, Tastaturfokus |
| A5 | `frontend-react/src/ui/text-field.spec.tsx`: Name, Beschreibung, Fehler, Eingabe, gesperrt |
| A6 | Browser: `ui.html` |
| A7 | `frontend-react/src/ui/card-hand.spec.tsx`; Browser: `ui.html` |
| A8 | Browser: `ui.html` und Angular-Startseite, Hintergrundfarben hell und dunkel |
| A9 | Browser: `ui.html`; Aufruf `pnpm -C frontend-react build` und die zwei Prüfungen |
| A10 | Aufruf `grep` wie im Kriterium |

Testdaten: keine.

## Offene Fragen

- [x] Beschriftung des Textfelds: fest über dem Feld (Vorschlag) oder wandernd im Rahmen wie bei
  Angular Material? → Fest über dem Feld. (Morten Möller, 2026-11-24)

## Verifikationsplan

- make check
- betroffene Tests: `pnpm -C frontend-react test`
- Browser: `ui.html` des React-Dev-Servers hell und dunkel bei 1280 px und 375 px; Angular-Frontend
  daneben für den Vergleich von Buttons, Textfeld und Kartenhand (A2, A4, A6, A8, A9)
