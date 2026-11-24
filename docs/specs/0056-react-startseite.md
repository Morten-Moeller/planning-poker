---
id: "0056"
title: "React-Frontend: Startseite mit Sitzung anlegen und letzten Sitzungen"
status: approved
risk: high
adrs: ["0003", "0008", "0011", "0013", "0016"]
owner: Morten Möller
created: 2026-11-24
updated: 2026-11-24
pr: ""
note: freigegeben in der Session
---

# React-Frontend: Startseite mit Sitzung anlegen und letzten Sitzungen

## Ziel

Die Startseite des React-Frontends zeigt heute nur Titel und Zustand des Backends. Der Scrum
Master soll dort wie im Angular-Frontend eine Sitzung anlegen: Name, GitLab-Projekt mit Suche,
optionales Issue mit Suche, dazu die Liste „Letzte Sitzungen“ und die gemerkten Eingaben. Gelöst
ist es, wenn die Seite sich wie `frontend/src/app/start/` verhält, die Unit-Tests das belegen und
die Playwright-Tests, die nur die Startseite brauchen, gegen beide Frontends grün sind.

## Scope

### Enthalten

- Kartenhand über dem Titel, Formular „Sitzung erstellen“ mit Name, GitLab-Projekt und Issue.
- Projekt- und Issue-Auswahl mit der Komponente Autocomplete des UI SDK (Specs 0022, 0032, 0033).
- Anlegen der Sitzung mit Fehlern am Formular, Zugang im `TokenStore`, gemerkte Eingaben,
  gespeicherter Timer, Wechsel in den Raum.
- Liste „Letzte Sitzungen“ mit Prüfung je Eintrag (Spec 0039).
- Buttons der Seite als `AppButton`; Layout nach Spec 0046.
- `data-testid` für die Stellen, die `frontend/e2e/health.spec.ts` heute über Elementnamen und
  Klassen des Angular-Frontends findet, in beiden Frontends.
- Tag `@react` an den Tests, die nur die Startseite brauchen.
- `project-rules/frontend-react-start.md`.

### Nicht enthalten

- Beitrittsseite, Toolbar mit Sitzung (0057); Inhalt des Raums (0058 und folgende). Nach dem
  Anlegen zeigt der Raum, was auf `main` vorhanden ist.
- Tests, die den Raum oder den Beitritt brauchen (`recent-sessions.spec.ts`,
  `preferences.spec.ts`, die übrigen Tests von `create-and-join.spec.ts` und
  `project-picker.spec.ts`): Tags mit Spec 0059.
- Der Test der Favicon-Verweise in `frontend/e2e/theme.spec.ts` (Spec 0062).
- Änderungen am Verhalten des Angular-Frontends.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Sitzung, Scrum Master, Entwickler, Zuschauer, Issue | wie in `docs/domain/glossary.md` |
| Letzte Sitzungen | die höchstens fünf Sitzungen, deren Zugang der Browser behält, wenn das Backend `rememberSessions` meldet (ADR 0013) |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Die Seite zeigt in dieser Folge: `card-hand` in der Größe `large`, `h1` „Issues gemeinsam schätzen“, die Einleitung, mit Einträgen den Abschnitt `recent-sessions`, das Formular `create-form` („Sitzung erstellen“, „Für den Scrum Master“) und den Footer `start-footer`. Titel, Einleitung, Liste und Formular (höchstens 600 px breit) sind zentriert; der Footer steht linksbündig am Ende, in einem hohen Fenster am unteren Rand. | Playwright: `frontend/e2e/health.spec.ts`, die drei Tests zu Footer und Kartenhand (`@react`) |
| A2 | Felder: `create-name` „Dein Name“ (`autocomplete="name"`), `create-project` „GitLab-Projekt“ mit dem Hinweis „Name, Pfad oder ID. Eingabe von Hand möglich.“, `create-issue` „Issue (optional)“ mit dem Hinweis „Optional: Issue, mit dem die Sitzung startet“. Name und Projekt sind mit den gemerkten Werten aus dem `PreferencesStore` gefüllt. | vitest: `frontend-react/src/start/create-form.spec.tsx` |
| A3 | „Sitzung erstellen“ (`create-submit`) mit ungültigen Eingaben sendet nichts und zeigt die Fehler mit dem Wortlaut des Angular-Frontends: `create-name-error` (leer oder nur Leerzeichen; mehr als 30 Zeichen), `create-project-error` (leer), `create-issue-error` (keine ganze Zahl ab 1). Ein leeres Issue-Feld ist gültig. | vitest: `frontend-react/src/start/create-form.spec.tsx`; Playwright: `frontend/e2e/create-and-join.spec.ts` „blocks an incomplete create form and keeps the start page“ (`@react`) |
| A4 | Ein gültiges Formular sendet `POST /api/sessions` mit Name und Projekt ohne Leerzeichen am Rand und `issueIid` nur bei gefülltem Feld. Nach Erfolg: Zugang im `TokenStore` mit Rolle `SCRUM_MASTER` und Name, Name und Projekt im `PreferencesStore`, bei einem gemerkten Timer ungleich Aus `PUT …/timer`, dann Wechsel zu `/session/<id>`, auch wenn der Timer-Aufruf scheitert. Während des Aufrufs ist der Button gesperrt. | vitest: `frontend-react/src/start/create-form.spec.tsx` |
| A5 | Fehler beim Anlegen: `ISSUE_NOT_FOUND`, `PROJECT_NOT_ALLOWED`, `LIMIT_REACHED`, `GITLAB_ACCESS_DENIED`, `GITLAB_ERROR` und `VALIDATION_ERROR` zeigen ihren Text in `create-error` (Fehlerhinweis über den Feldern) und leeren den `ErrorState`; `PROJECT_NOT_FOUND` zeigt seinen Text in `create-project-error`, bis das Feld sich ändert; jeder andere Code bleibt im Banner. Die Eingaben bleiben stehen, kein Zugang wird gespeichert. | vitest: `frontend-react/src/start/create-form.spec.tsx`; Playwright: `frontend/e2e/create-and-join.spec.ts` „an unknown issue shows the message at the form and creates no session“ und „an issue that GitLab refuses shows the access denied text at the form“ (`@react`) |
| A6 | Projektsuche: Text mit mindestens einem Zeichen, das keine Ziffer ist, ruft nach 300 ms ohne weitere Eingabe `searchProjects` auf; nur Ziffern gelten als ID ohne Suche. Der Fokus auf das leere Feld lädt die erste Seite ohne `search` sofort und öffnet die Liste. Optionen `create-project-option` zeigen den Namen, darunter Pfad und ID; die Wahl schreibt die ID ins Feld. Eine leere Antwort zeigt `create-project-empty` „Keine Projekte gefunden“. Nur die Antwort auf die letzte Eingabe wird gezeigt. | vitest: `frontend-react/src/start/project-search.spec.ts` (falsche Uhr); Playwright: `frontend/e2e/project-picker.spec.ts` „opens the project list on a click into the empty field and then the issue list“ (`@react`) |
| A7 | Issue-Suche: Sie läuft nur, wenn das Projektfeld eine Zahl enthält und der Issue-Text keine reine Zahl ist, mit derselben Wartezeit. Optionen `create-issue-option` zeigen „#iid Titel“; die Wahl schreibt die iid ins Feld. Eine leere Antwort zeigt `create-issue-empty` „Keine Issues gefunden“. | vitest: `frontend-react/src/start/project-search.spec.ts`; Playwright: `frontend/e2e/project-picker.spec.ts` „shows the empty state of the issue search and keeps a typed issue number“ (`@react`) |
| A8 | `PROJECT_NOT_ALLOWED`, `GITLAB_ACCESS_DENIED` und `GITLAB_ERROR` einer Suche zeigen ihren Text in `create-project-search-error` oder `create-issue-search-error` und leeren den `ErrorState`; ein anderer Fehler leert die Liste ohne Text an der Suche. | vitest: `frontend-react/src/start/project-search.spec.ts` |
| A9 | Ohne erreichbares Backend ist `create-submit` gesperrt und heißt „Sitzung erstellen (Backend fehlt)“; `health-down` und `health-retry` verhalten sich wie bisher, `health-retry` ist ein `AppButton` (`outlined`, `on-error`). | vitest: `frontend-react/src/start/start-page.spec.tsx` |
| A10 | Letzte Sitzungen: Mit `enabled` `true` prüft die Seite jeden Eintrag mit `getSession`. `SESSION_NOT_FOUND` und `UNAUTHORIZED` entfernen den Eintrag aus dem `TokenStore`; ein anderer Fehler behält ihn ohne Projekt und Issue; jeder Fehler der Prüfung leert den `ErrorState`. Eine Zeile `recent-session` ist ein Link auf `/session/<id>` mit `recent-session-project` (Name, sonst Projekt-ID), `recent-session-issue` („#iid Titel“ oder „Kein Issue aktiv“), `recent-session-role` (Rolle aus dem Snapshot, sonst aus dem Eintrag), `recent-session-name`, `recent-session-id` und `recent-session-last-used` („zuletzt vor 1 Minute“, „… n Minuten“, „… 1 Stunde“, „… n Stunden“, „… 1 Tag“, „… n Tagen“, mindestens 1 Minute). `recent-session-remove` „Aus Liste entfernen“ entfernt nur den Eintrag im Browser. Mit `false` gibt es keinen Abschnitt und die Liste wird gelöscht; mit `null` gibt es keinen Abschnitt. | vitest: `frontend-react/src/start/recent-sessions-list.spec.tsx` |
| A11 | `create-submit` zeigt nach Tastaturfokus den Umriss von 3 px in `--mat-sys-primary`, nach einem Mausklick keinen. | Playwright: `frontend/e2e/theme.spec.ts` „a button shows the focus ring for keyboard focus only“ (`@react`) |
| A12 | `frontend/e2e/health.spec.ts` findet Seite, Einleitung, Formular und Zustandszeile über `data-testid` (`start-page`, `start-lead`, `create-form`, `health`) statt über `app-start-page`, `.lead`, `.panel-create` und `.health`; beide Frontends tragen diese Attribute. Die Erwartungen der Tests sind unverändert. | Aufruf: `make e2e` (Angular-Lauf und React-Lauf) |
| A13 | `project-rules/frontend-react-start.md` beschreibt Aufbau, Suche, Fehlerpfad, letzte Sitzungen und die freigeschalteten Abläufe, mit `sources:` auf `frontend-react/src/start/**`. | Aufruf: `head -5 project-rules/frontend-react-start.md` |

## Contracts

keine Änderung. Genutzt: `POST /api/sessions`, `GET /api/projects`,
`GET /api/projects/{id}/issues`, `GET /api/sessions/{id}`, `PUT /api/sessions/{id}/timer`.

## Risiko

Stufe: high
Begründung: Dateien unter `frontend-react/src/` und `project-rules/**` sind medium; die
Schlüsselwort-Regel (`token` in den Zeilen, die den `TokenStore` aufrufen) hebt auf high. Die Seite
speichert den Zugang zur Sitzung (ADR 0003, ADR 0013).
Gates: G2, das Label `human-approved` nach dem letzten Push; G3, der Status `verified`; Code-,
Sicherheits- und Architektur-Review.
ADR nötig: nein, kein neues. Die Änderung folgt ADR 0003, 0008 (Projekt- und Issue-Auswahl), 0011
(Issue optional), 0013 (letzte Sitzungen) und 0016.

## Umsetzung

Entscheidungen:

- Die Auswahl von Projekt und Issue nutzt `Autocomplete` aus `@ui-sdk/react/autocomplete`, lokal
  in `start/` (ein Feature als Nutzer). Damit beide Felder aussehen wie `TextField`, bekommt
  `TextField` in `ui/` eine Eigenschaft, über die ein Feature die Eingabe ersetzt; Aussehen und
  Verhalten ohne diese Eigenschaft bleiben gleich.
- Die Felder sind 56 px hoch mit der Beschriftung über dem Feld (Spec 0055); das Formular ist
  dadurch höher als im Angular-Frontend. Scheitert deshalb ein Layout-Test aus
  `frontend/e2e/health.spec.ts`, hält `/implement` an.
- Das Angular-Frontend bekommt vier `data-testid` (`start-page`, `start-lead`, `health`; `create-form`
  ist vorhanden) und sonst keine Änderung.
- Keine neue Abhängigkeit.

Dateien:

- `frontend-react/src/start/start-page.tsx`: ändern, Aufbau der Seite, `AppButton`
- `frontend-react/src/start/start-page.module.css`: ändern, Layout nach `frontend/src/app/start/start-page.scss`
- `frontend-react/src/start/start-page.spec.tsx`: ändern
- `frontend-react/src/start/create-form.tsx`: neu, Formular, Prüfung, Anlegen
- `frontend-react/src/start/create-form.module.css`: neu
- `frontend-react/src/start/create-form.spec.tsx`: neu
- `frontend-react/src/start/project-search.ts`: neu, Suchlogik mit Wartezeit, letzte Eingabe gewinnt
- `frontend-react/src/start/project-search.spec.ts`: neu
- `frontend-react/src/start/picker-field.tsx`: neu, Feld mit Autocomplete des UI SDK
- `frontend-react/src/start/picker-field.module.css`: neu
- `frontend-react/src/start/picker-field.spec.tsx`: neu
- `frontend-react/src/start/recent-sessions-list.tsx`: neu
- `frontend-react/src/start/recent-sessions-list.module.css`: neu
- `frontend-react/src/start/recent-sessions-list.spec.tsx`: neu
- `frontend-react/src/start/messages.ts`: ändern, Schlüssel `start.create.*`, `start.recent.*`
- `frontend-react/src/ui/text-field.tsx`: ändern, Eigenschaft für eine eigene Eingabe
- `frontend-react/src/ui/text-field.spec.tsx`: ändern
- `frontend-react/src/ui/gallery/ui-gallery.tsx`: ändern, Beispiel für die neue Eigenschaft
- `frontend/src/app/start/start-page.html`: ändern, `data-testid` `start-lead` und `health`
- `frontend/src/app/start/start-page.ts`: ändern, `data-testid` `start-page` am Host
- `frontend/e2e/health.spec.ts`: ändern, Selektoren, Tag `@react` an drei Tests
- `frontend/e2e/create-and-join.spec.ts`: ändern, Tag `@react` an drei Tests
- `frontend/e2e/project-picker.spec.ts`: ändern, Tag `@react` an zwei Tests
- `frontend/e2e/theme.spec.ts`: ändern, Tag `@react` am Test des Fokusrings
- `project-rules/frontend-react-start.md`: neu
- `project-rules/frontend-react-ui.md`: ändern, neue Eigenschaft von `TextField`
- `docs/roadmap.md`: ändern, Stand der Welle 4
- `docs/specs/0056-react-startseite.md`: neu

Schritte:

1. Lesen: `frontend/src/app/start/start-page.ts`, `.html`, `.scss` (Vorlage für Verhalten, Texte
   und Maße), `project-rules/frontend.md` (Abschnitte zu Start, Auswahl, letzten Sitzungen),
   `project-rules/frontend-react.md`, `project-rules/frontend-react-ui.md`,
   `frontend-react/node_modules/@ui-sdk/react/docs/components/autocomplete.md` und `field.md`.
   Bietet `Autocomplete` eine Anforderung aus A6 oder A7 nicht (Optionen mit `data-testid`,
   gesperrte Option für den Leerzustand, Öffnen bei Fokus), hält `/implement` an.
2. Katalog `start/messages.ts` mit den Texten der Angular-Vorlage; Zahlformen für „zuletzt vor“.
3. `project-search.ts` ohne React: Eingaben, Wartezeit, Abbruch überholter Antworten; Tests mit
   den falschen Timern von vitest.
4. `TextField` erweitern, `picker-field.tsx`, `create-form.tsx`.
5. `recent-sessions-list.tsx`; `start-page.tsx` mit `CardHand`, `ErrorNote`, `AppButton`.
6. Dienste nur über `useBackend()`; `frontend-react/src/api/` und `frontend-react/src/shell/`
   bleiben unverändert.
7. `data-testid` im Angular-Frontend, Selektoren und Tags in `frontend/e2e/`.
8. `project-rules/frontend-react-start.md`, `project-rules/frontend-react-ui.md`.
9. `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `frontend/e2e/health.spec.ts` (`@react`), drei Tests zu Footer und Kartenhand |
| A2 | `frontend-react/src/start/create-form.spec.tsx`: Felder, Hinweise, gemerkte Werte |
| A3 | `frontend-react/src/start/create-form.spec.tsx`: Tabelle der ungültigen Eingaben; `frontend/e2e/create-and-join.spec.ts` (`@react`) |
| A4 | `frontend-react/src/start/create-form.spec.tsx`: Anfrage, Ablage, Timer mit Erfolg und Fehler, Wechsel |
| A5 | `frontend-react/src/start/create-form.spec.tsx`: Tabelle der Codes; `frontend/e2e/create-and-join.spec.ts` (`@react`) |
| A6 | `frontend-react/src/start/project-search.spec.ts`; `frontend/e2e/project-picker.spec.ts` (`@react`) |
| A7 | `frontend-react/src/start/project-search.spec.ts`; `frontend/e2e/project-picker.spec.ts` (`@react`) |
| A8 | `frontend-react/src/start/project-search.spec.ts` |
| A9 | `frontend-react/src/start/start-page.spec.tsx` |
| A10 | `frontend-react/src/start/recent-sessions-list.spec.tsx`: Prüfung je Eintrag, Zeile, Zeitangaben, Entfernen, `false`, `null` |
| A11 | `frontend/e2e/theme.spec.ts` (`@react`) |
| A12 | Aufruf `make e2e` |
| A13 | Aufruf wie im Kriterium |

Testdaten: Unit-Tests bauen die Dienste mit `createTestBackend`
(`frontend-react/src/api/testing/test-backend.tsx`) und die Snapshots aus
`frontend-react/src/api/examples.ts`. Die Playwright-Tests nutzen die festen Mappings des
GitLab-Doubles (Projekt 1234, Issues 42 und 43, 403, 404, „kein Treffer“).

## Offene Fragen

keine

## Verifikationsplan

- make check
- betroffene Tests: `pnpm -C frontend-react test`; `make e2e` (Angular vollständig, React mit den
  Tests mit `@react`)
- Browser: Startseite des React-Frontends neben der des Angular-Frontends, hell und dunkel bei
  1280 px und 375 px: Kartenhand, Formular, geöffnete Projektliste, Fehlerhinweis, letzte
  Sitzungen mit einem Eintrag (Sitzung über die Seite anlegen, Seite neu öffnen)
