---
id: "0059"
title: "React-Frontend: Raum Teil 2 mit Issue-Auswahl und aktivem Issue"
status: approved
risk: high
adrs: ["0004", "0016"]
owner: Morten Möller
created: 2026-11-25
updated: 2026-11-25
pr: ""
note: freigegeben in der Session
---

# React-Frontend: Raum Teil 2 mit Issue-Auswahl und aktivem Issue

## Ziel

Der Raum des React-Frontends hat nach Spec 0058 die Seitenleiste und die Lobby; der Hauptbereich
des Scrum Masters ist leer, und ein freigegebenes Issue ist nicht zu sehen. Diese Spec baut die
Issue-Auswahl des Scrum Masters, das aktive Issue mit Beschreibung und den Dialog zum Wechsel wie
im Angular-Frontend (`frontend/src/app/session/issue-panel.*`, `active-issue.*`,
`switch-issue-dialog.*`), zeigt das Kartenmotiv in der Toolbar und schaltet die Playwright-Tests
frei, die Startseite, Beitrittsseite und Raum bis zur Freigabe eines Issues brauchen. Gelöst ist
es, wenn diese Tests mit dem Tag `@react` gegen beide Frontends grün sind.

## Scope

### Enthalten

- Issue-Auswahl (`issue-panel`) für den Scrum Master in jeder Phase: Suche, Filter nach Gewicht
  und Zeitraum, Liste, „Mehr laden“, Vorschau, „Freigeben“ und „Issue wechseln“ (Specs 0012, 0017,
  0029, 0033, 0036).
- Dialog `switch-dialog` vor dem Wechsel in `VOTING` und `REVEALED`.
- Aktives Issue (`active-issue`) für alle Rollen: Kopf, Beschreibung aus Markdown, Einklappen
  (Specs 0012, 0031, 0032).
- Motiv der Runde im Feld `toolbar-motif`.
- Prüfung des Schemas der Links aus GitLab, auch für `last-result-open` aus Spec 0058.
- Tag `@react` für die unten genannten Tests; `data-testid` `room`, `room-side` und `room-main` im
  Angular-Frontend.

### Nicht enthalten

- Rundenstatus mit `discussion-hint` und `round-number`, Kartensatz, Tisch, Timer, Footer (0060);
  Ergebnis, Bestätigen, Sitzungsprotokoll (0061). Das aktive Issue steht in dieser Spec ohne den
  Rahmen des Rundenstatus im Hauptbereich.
- Die Tests, die diese Teile brauchen, bleiben ohne Tag: `session-room.spec.ts` (Freigabe mit
  `discussion-hint`, Wechsel in `VOTING`), `project-picker.spec.ts` (`round-number`),
  `design-sidebar.spec.ts`, `layout.spec.ts` bis auf die Breite der Seitenleiste.
- Test der Favicon-Verweise in `theme.spec.ts` (0062).
- Änderungen am Verhalten des Angular-Frontends, am Backend und am Vertrag.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Sitzung, Issue, aktives Issue, Runde, Phase, Scrum Master, Entwickler, Zuschauer, Schätzung, Endwert | wie in `docs/domain/glossary.md` |
| Kartenmotiv | wie in `project-rules/frontend-react-session.md` |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Der Scrum Master sieht in jeder Phase oben im Hauptbereich `issue-panel` mit der Überschrift „Issue auswählen“ und `issue-panel-project` „Projekt: Name · ID“ (mit `project` im Snapshot) oder „Projekt: ID“. Entwickler und Zuschauer sehen `issue-panel` und `issue-release` nie. | vitest: `frontend-react/src/session/issue-panel.spec.tsx`, `frontend-react/src/session/session-page.spec.tsx`; e2e: `frontend/e2e/issue-filter.spec.ts` |
| A2 | Beim Öffnen lädt die Auswahl `GET …/issues` mit den gespeicherten Filtern des `PreferencesStore`. Die Liste zeigt je Issue einen Button `issue-result` mit „#iid“, Titel und `issue-result-weight` („ohne Gewicht“ oder „Gewicht n“); das gewählte Issue hat `aria-pressed="true"` und ein ✓. `issue-count` zeigt „n von m Issues“ oder, ohne Gesamtzahl, „1 Issue“ und „n Issues“. `issue-load-more` „Mehr laden“ steht nur mit einer nächsten Seite da und hängt deren Issues an. Ohne Treffer steht `issue-results-empty` „Keine Issues gefunden“ mit `issue-filter-reset` „Filter zurücksetzen“ (`role="status"`). | vitest: `frontend-react/src/session/issue-panel.spec.tsx`; e2e: `frontend/e2e/issue-filter.spec.ts`, `frontend/e2e/session-room.spec.ts` |
| A3 | Suche: Feld `issue-search-input` (`type="search"`, Beschriftung „Issues suchen“) und Button `issue-search-submit` „Suchen“; Absenden lädt mit dem Text ohne Leerzeichen am Rand, ein leeres Feld ohne `search`. Filter: `issue-filter-weight` (Komponente `SegmentedControl` des UI SDK, `aria-label` „Filter nach Gewicht“) mit `issue-filter-weight-none` „Ohne Gewicht“, `-any` „Mit Gewicht“, `-all` „Alle“; `issue-filter-period` (Komponente `Select`, Beschriftung „Geändert in“) mit `issue-filter-period-week` „1 Woche“, `-month` „1 Monat“, `-year` „1 Jahr“, `-all` „Alle“. Eine Wahl speichert `weightFilter` oder `periodFilter` im `PreferencesStore` und lädt die erste Seite. „Filter zurücksetzen“ setzt beide Filter auf die Vorgabe, leert die Suche und lädt. | vitest: `frontend-react/src/session/issue-panel.spec.tsx`; e2e: `frontend/e2e/preferences.spec.ts`, `frontend/e2e/issue-filter.spec.ts` |
| A4 | Antwortet die Liste mit `GITLAB_ACCESS_DENIED` oder `GITLAB_ERROR`, steht `issue-results-error` (`role="alert"`) mit „Die Issues konnten nicht geladen werden.“, dem Text des Fehlers in `issue-results-error-message` und `issue-results-retry` „↻ Erneut versuchen“ da; das Banner bleibt leer, „Mehr laden“ fehlt. „Erneut versuchen“ wiederholt die letzte Anfrage (auch eine Folgeseite). Eine Antwort auf eine überholte Anfrage ändert die Liste nicht. | vitest: `frontend-react/src/session/issue-panel.spec.tsx` |
| A5 | Gewählt ist zu Beginn das aktive Issue, sonst `preselectedIssueIid`, sonst keines; ein neues aktives Issue im Snapshot setzt die Wahl darauf. `issue-preview` zeigt „Ausgewählt:“, `issue-preview-iid` „#iid“ und, wenn das Issue in der Liste steht, den Link `issue-preview-link` mit `issue-preview-title` (neuer Tab, `rel="noopener"`). | vitest: `frontend-react/src/session/issue-panel.spec.tsx`; e2e: `frontend/e2e/session-room.spec.ts`, `frontend/e2e/project-picker.spec.ts` |
| A6 | `issue-release` heißt „Freigeben“ in `LOBBY`, sonst „Issue wechseln“. Der Button ist gesperrt ohne Wahl, wenn das gewählte Issue das aktive ist, während die Runde bestätigt wird (`round.confirming`) und bis zur Antwort auf die Freigabe. In `LOBBY` und `DISCUSSION` sendet ein Klick `PUT …/issue` mit `issueIid`. | vitest: `frontend-react/src/session/issue-panel.spec.tsx` |
| A7 | In `VOTING` und `REVEALED` öffnet der Klick `switch-dialog` (Komponente `Dialog` des UI SDK) mit dem Titel „Issue wechseln?“ und `switch-text`: aufgedeckt „Runde n zu #iid ist aufgedeckt und hat keinen Endwert. Beim Wechsel bleibt sie ohne Endwert im Protokoll.“; laufend „Runde n zu #iid läuft noch. Beim Wechsel endet sie ohne Ergebnis, …“ mit „es gibt noch keine abgegebene Schätzung.“, „die 1 abgegebene Schätzung wird verworfen.“ oder „die k abgegebenen Schätzungen werden verworfen.“. `switch-cancel` „Abbrechen“ und Escape schließen ohne Anfrage; `switch-confirm` „Issue wechseln“ sendet die Freigabe, außer der Button ist in der Zwischenzeit gesperrt. Der Fokus liegt nach dem Schließen wieder auf `issue-release`. | vitest: `frontend-react/src/session/switch-issue-dialog.spec.tsx`, `frontend-react/src/session/issue-panel.spec.tsx` |
| A8 | Wechselt die Phase von `REVEALED` nach `LOBBY`, lädt die Auswahl die erste Seite neu. | vitest: `frontend-react/src/session/issue-panel.spec.tsx` |
| A9 | Mit aktivem Issue zeigt der Hauptbereich für jede Rolle `active-issue`: `active-issue-iid` „#iid“ (Größe und Zeilenhöhe des Titels, `--app-font-mono`, Gewicht 400, `--app-on-surface-muted`), `active-issue-title` als `h2`, den Link `active-issue-link` „In GitLab öffnen ↗“ (neuer Tab, `rel="noopener"`) und die Beschreibung `active-issue-description`. | vitest: `frontend-react/src/session/active-issue.spec.tsx`; e2e: `frontend/e2e/session-room.spec.ts` (Test zur Größe der Issue-Nummer) |
| A10 | Die Beschreibung ist das Markdown des Issues als HTML, bereinigt: kein `script`, kein Attribut `on…`, kein `href` mit `javascript:`. Ein Bild behält sein `src`; die Content-Security-Policy der Seite lässt die Anfrage nicht zu. | vitest: `frontend-react/src/session/markdown.spec.ts`; e2e: `frontend/e2e/session-room.spec.ts` (Tests zu Script und externem Bild) |
| A11 | Eine nicht leere Beschreibung ist in `REVEALED` und unter 720 px Breite eingeklappt (120 px mit Verlauf) mit `active-issue-expand` „▾ Ganze Beschreibung anzeigen“ (`aria-expanded="false"`, `aria-controls`); ausgeklappt steht `active-issue-collapse` „▴ Beschreibung einklappen“ da. Ein anderes Issue oder eine andere Phase klappt wieder ein. | vitest: `frontend-react/src/session/active-issue.spec.tsx` (`matchMedia` als Doppel) |
| A12 | Ein Link mit einer Adresse aus GitLab (`active-issue-link`, `issue-preview-link`, `last-result-open`) hat ein `href` nur mit dem Schema `http:` oder `https:`; sonst fehlt der Link. | vitest: `frontend-react/src/session/external-link.spec.ts`, `frontend-react/src/session/last-result.spec.tsx` |
| A13 | Im Raum hat `toolbar-motif` die Akzentfarbe und das Muster des Motivs am Raum (`data-motif`), ohne gestrichelten Rand, hell und dunkel; auf der Beitrittsseite bleibt der gestrichelte Platzhalter. | vitest: `frontend-react/src/shell/app-shell.spec.tsx`; e2e: `frontend/e2e/theme-toggle.spec.ts` |
| A14 | Diese Tests tragen `@react` und sind in beiden Läufen von `make e2e` grün: `create-and-join.spec.ts` (alle), `theme.spec.ts` (Schrift, Toolbar im Raum), `theme-toggle.spec.ts` (Motiv im Raum), `issue-filter.spec.ts` (alle), `preferences.spec.ts`, `recent-sessions.spec.ts` (alle), `project-picker.spec.ts` (Projekt nach Name und Issue nach Titel), `layout.spec.ts` (Seitenleiste 340 px), `session-room.spec.ts` (Teilnehmer, Script, externes Bild, Größe der Issue-Nummer), `viewer.spec.ts` (Hinweise zu Links). Die Erwartungen der Tests bleiben gleich; geändert sind nur das Tag und die Selektoren aus den Entscheidungen. | e2e: `BACKEND_PORT=… FRONTEND_PORT=… make e2e` |
| A15 | Die Issue-Auswahl, das aktive Issue und der Dialog sehen im Browser aus wie im Angular-Frontend, hell und dunkel, bei 1440 × 900 und 375 × 800. | Bildschirm: Raum als Scrum Master und als Entwickler neben dem Angular-Frontend, Issue 42 freigegeben |

## Contracts

keine Änderung. Genutzt: `GET /api/sessions/{id}/issues`, `PUT /api/sessions/{id}/issue`, der
Snapshot `SessionView`.

## Risiko

Stufe: high
Begründung: `harness/scripts/risk-level.sh` nennt für die Dateiliste medium (Quelltext unter
`frontend-react/src/`, Abhängigkeitsmanifest, `project-rules/**`). `session-page.tsx` und
`app-shell.tsx` enthalten Zeilen mit `token`; trifft die Schlüsselwort-Regel eine geänderte Zeile,
ist die Stufe high. Dazu kommt HTML aus fremdem Text (Beschreibung des Issues). Die Spec ist
deshalb mit high freigegeben.
Gates: G2, das Label `human-approved` nach dem letzten Push; G3, der Status `verified`; Code-,
Sicherheits- und Architektur-Review.
ADR nötig: nein, kein neues. `marked` ist die Bibliothek des Angular-Frontends für denselben
Zweck; DOMPurify ist eine Hilfsbibliothek ohne Wirkung auf die Struktur
(`harness/policies/adr.md`). Die Änderung folgt ADR 0004 und ADR 0016.

## Umsetzung

Entscheidungen:

- Neue Abhängigkeiten in `frontend-react/package.json`: `marked` `^18.2.1` (wie im
  Angular-Frontend) und `dompurify` `^3.4.18` (npm-Registry am 2026-11-25: 3.5.0 vom 2026-11-22
  ist jünger als 7 Tage, 3.4.18 vom 2026-11-14 nicht; Lizenz MPL-2.0 oder Apache-2.0). Das
  Angular-Frontend bereinigt mit dem Sanitizer von Angular; React hat keinen, deshalb DOMPurify
  mit den Standardregeln.
- Bedienelemente aus dem UI SDK, lokal in `session/`: `SegmentedControl` (Gewicht), `Select`
  (Zeitraum), `Dialog` (Wechsel). `Dialog` statt `AlertDialog`, weil der Dialog des
  Angular-Frontends bei einem Klick daneben schließt. Das Suchfeld ist `TextField` aus `ui/`.
- `card-motif.ts` zieht von `session/` nach `api/` und bekommt `motifOf(session)`; die Shell
  berechnet das Motiv aus dem Snapshot und setzt die Klasse `motif-<n>` am Feld der Toolbar. Die
  Shell importiert nichts aus `session/`.
- Selektoren der Suite: `app-session-page .room`, `.side` und `.main` werden zu `room`,
  `room-side` und `room-main` (`data-testid`, im Angular-Frontend neu). Der gewählte Filter in
  `preferences.spec.ts` wird statt über `mat-button-toggle-checked` über
  `getByRole('radio', { name: 'Mit Gewicht', checked: true })` in `issue-filter-weight` gelesen.
- Das Aussehen des gefüllten Felds aus `timer-setting.module.css` zieht in
  `session/filled-select.module.css`, weil die Auswahl des Zeitraums es auch nutzt.

Dateien:

- `frontend-react/package.json`: ändern, `marked`, `dompurify`
- `frontend-react/pnpm-lock.yaml`: ändern, durch `pnpm install`
- `frontend-react/src/api/card-motif.ts`: neu, verschoben aus `session/`, dazu `motifOf`
- `frontend-react/src/api/card-motif.spec.ts`: neu, verschoben
- `frontend-react/src/session/card-motif.ts`: löschen
- `frontend-react/src/session/card-motif.spec.ts`: löschen
- `frontend-react/src/shell/app-shell.tsx`: ändern, Motiv am Feld
- `frontend-react/src/shell/app-shell.module.css`: ändern
- `frontend-react/src/shell/app-shell.spec.tsx`: ändern
- `frontend-react/src/session/session-page.tsx`: ändern, Issue-Auswahl und aktives Issue im Hauptbereich
- `frontend-react/src/session/session-page.module.css`: ändern
- `frontend-react/src/session/session-page.spec.tsx`: ändern
- `frontend-react/src/session/issue-panel.tsx`: neu
- `frontend-react/src/session/issue-panel.module.css`: neu
- `frontend-react/src/session/issue-panel.spec.tsx`: neu
- `frontend-react/src/session/switch-issue-dialog.tsx`: neu
- `frontend-react/src/session/switch-issue-dialog.module.css`: neu
- `frontend-react/src/session/switch-issue-dialog.spec.tsx`: neu
- `frontend-react/src/session/active-issue.tsx`: neu
- `frontend-react/src/session/active-issue.module.css`: neu
- `frontend-react/src/session/active-issue.spec.tsx`: neu
- `frontend-react/src/session/markdown.ts`: neu, `marked` und DOMPurify
- `frontend-react/src/session/markdown.spec.ts`: neu
- `frontend-react/src/session/external-link.ts`: neu, Prüfung des Schemas
- `frontend-react/src/session/external-link.spec.ts`: neu
- `frontend-react/src/session/filled-select.module.css`: neu
- `frontend-react/src/session/timer-setting.tsx`: ändern, Klassen aus `filled-select.module.css`
- `frontend-react/src/session/timer-setting.module.css`: ändern
- `frontend-react/src/session/last-result.tsx`: ändern, A12
- `frontend-react/src/session/last-result.spec.tsx`: ändern
- `frontend-react/src/session/messages.ts`: ändern, Schlüssel `issuePanel.*`, `switchIssue.*`, `activeIssue.*`
- `frontend-react/src/session/testing/session-snapshots.tsx`: ändern, Snapshots mit aktivem Issue je Phase
- `frontend/src/app/session/session-page.html`: ändern, drei `data-testid`
- `frontend/e2e/create-and-join.spec.ts`: ändern, Tags
- `frontend/e2e/theme.spec.ts`: ändern, Tags
- `frontend/e2e/theme-toggle.spec.ts`: ändern, Tag und Selektor
- `frontend/e2e/issue-filter.spec.ts`: ändern, Tags
- `frontend/e2e/preferences.spec.ts`: ändern, Tag und Selektor
- `frontend/e2e/recent-sessions.spec.ts`: ändern, Tags
- `frontend/e2e/project-picker.spec.ts`: ändern, Tag
- `frontend/e2e/layout.spec.ts`: ändern, Tag und Selektoren
- `frontend/e2e/session-room.spec.ts`: ändern, Tags
- `frontend/e2e/viewer.spec.ts`: ändern, Tag
- `project-rules/frontend-react-session.md`: ändern
- `project-rules/frontend-react.md`: ändern, Zeile zum Stand von `session`, `card-motif.ts` in `api/`
- `project-rules/frontend.md`: ändern, `data-testid` des Rasters
- `project-rules/testing.md`: ändern, Tests mit `@react`
- `docs/roadmap.md`: ändern, Stand und Hinweis zu Welle 5
- `docs/specs/0059-react-raum-teil-2.md`: neu

Schritte:

1. Lesen: die Vorlagen `frontend/src/app/session/issue-panel.*`, `active-issue.*`,
   `switch-issue-dialog.*`, `frontend/src/app/shell/app-shell.scss`,
   `project-rules/frontend-react*.md` und in
   `frontend-react/node_modules/@ui-sdk/react/docs/components/` die Seiten `segmented-control.md`,
   `select.md`, `dialog.md`. Hat ein Eintrag von `SegmentedControl` nicht die Rolle `radio` mit
   `aria-checked`, oder bietet `Dialog` kein gesteuertes Öffnen mit Rückgabe des Fokus, hält
   `/implement` an.
2. `pnpm -C frontend-react add marked dompurify`; `markdown.ts`, `external-link.ts` mit Tests.
3. `card-motif.ts` nach `api/`, Toolbar-Motiv in der Shell.
4. `session/messages.ts`, `active-issue.tsx`, `switch-issue-dialog.tsx`, `issue-panel.tsx`,
   `filled-select.module.css`.
5. `session-page.tsx`: Issue-Auswahl für den Scrum Master, darunter das aktive Issue für alle.
6. `data-testid` im Angular-Frontend, Selektoren und Tags in `frontend/e2e/`.
7. Regeldateien, `docs/roadmap.md`.
8. `make check`, `BACKEND_PORT=18080 FRONTEND_PORT=14200 make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `frontend-react/src/session/issue-panel.spec.tsx`; `frontend-react/src/session/session-page.spec.tsx` je Rolle und Phase |
| A2 | `frontend-react/src/session/issue-panel.spec.tsx`: Liste, Zahl, Mehr laden, leer |
| A3 | `frontend-react/src/session/issue-panel.spec.tsx`: Suche, Filter, Zurücksetzen; `frontend/e2e/preferences.spec.ts` |
| A4 | `frontend-react/src/session/issue-panel.spec.tsx`: Fehler, Wiederholen, überholte Antwort |
| A5 | `frontend-react/src/session/issue-panel.spec.tsx`: Vorwahl, Vorschau |
| A6 | `frontend-react/src/session/issue-panel.spec.tsx`: Text und Sperre je Phase |
| A7 | `frontend-react/src/session/switch-issue-dialog.spec.tsx`: Texte; `frontend-react/src/session/issue-panel.spec.tsx`: Abbrechen, Bestätigen |
| A8 | `frontend-react/src/session/issue-panel.spec.tsx` |
| A9 | `frontend-react/src/session/active-issue.spec.tsx`; `frontend/e2e/session-room.spec.ts` |
| A10 | `frontend-react/src/session/markdown.spec.ts`; `frontend/e2e/session-room.spec.ts` |
| A11 | `frontend-react/src/session/active-issue.spec.tsx` |
| A12 | `frontend-react/src/session/external-link.spec.ts`; `frontend-react/src/session/last-result.spec.tsx` |
| A13 | `frontend-react/src/shell/app-shell.spec.tsx`; `frontend/e2e/theme-toggle.spec.ts` |
| A14 | beide Läufe von `make e2e` |
| A15 | Browser: Raum neben dem Angular-Frontend |

Testdaten: Unit-Tests mit `createTestBackend`, den Beispiel-Snapshots und den Hilfen in
`frontend-react/src/session/testing/session-snapshots.tsx`; die Antworten von `listIssues` und
`selectIssue` kommen vom Doppel der API. Die Playwright-Tests legen ihre Sitzungen über die
Startseite an (Projekt 1234, Issues 42 bis 46 des GitLab-Doubles).

## Offene Fragen

keine

## Verifikationsplan

- make check
- betroffene Tests: `pnpm -C frontend-react test`; beide Läufe von `make e2e`
- Browser: Raum des React-Frontends neben dem des Angular-Frontends als Scrum Master (Auswahl,
  Filter, leere Liste) und als Entwickler mit Issue 42 in `DISCUSSION`, hell und dunkel, bei
  1440 × 900 und 375 × 800 (A15). Für den Dialog startet `/verify` die Runde über die REST-API
  (`POST /api/sessions/<id>/round`), weil der Footer im React-Frontend erst mit 0060 kommt.
