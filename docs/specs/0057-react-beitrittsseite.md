---
id: "0057"
title: "React-Frontend: Beitrittsseite und Sitzung in der Toolbar"
status: Review
risk: high
adrs: ["0003", "0013", "0014", "0016"]
owner: Morten Möller
created: 2026-11-24
updated: 2026-11-24
pr: ""
note: freigegeben in der Session
---

# React-Frontend: Beitrittsseite und Sitzung in der Toolbar

## Ziel

Im React-Frontend führt `/session/<id>/join` heute in einen leeren Hauptbereich. Entwickler und
Zuschauer sollen über einen Einladungslink mit ihrem Namen beitreten wie im Angular-Frontend
(`frontend/src/app/join/`), und die Toolbar soll auf der Beitrittsseite und im Raum die Sitzung
zeigen (`frontend/src/app/shell/`). Gelöst ist es, wenn die Unit-Tests das Verhalten belegen und
ein Beitritt über einen echten Einladungslink im Browser in den Raum führt.

## Scope

### Enthalten

- Route `/session/:id/join` als eigener Chunk mit der Beitrittsseite: Kartenhand, Rollenhinweis,
  Namensfeld, Fehlerzustände (Specs 0031, 0040).
- Toolbar: Platzhalter des Motivs, Session-ID, im Raum „Name · Rolle“ (Specs 0027, 0043).
- Banner mit `AppButton` statt eigenem Button-CSS.
- `project-rules/frontend-react-join.md`.

### Nicht enthalten

- Motiv der Runde im Feld der Toolbar (Farbe und Muster): Spec 0059; bis dahin zeigt das Feld
  immer den gestrichelten Platzhalter.
- Inhalt und Raster des Raums (0058).
- Tags in `frontend/e2e/`: Die Abläufe mit Beitritt brauchen Startseite und Raum und bekommen
  `@react` mit Spec 0059.
- Änderungen an `frontend-react/src/api/`, am Angular-Frontend und an `frontend/e2e/`.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Sitzung, Entwickler, Zuschauer, Scrum Master | wie in `docs/domain/glossary.md` |
| Einladungslink | `…/session/<id>/join?invite=<code>`, für Zuschauer mit `&as=viewer` (ADR 0014) |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `/session/<id>/join` lädt die Beitrittsseite als eigenen Chunk. Sie zeigt `card-hand` in der Größe `large` zentriert über dem `h1` „Mit welchem Namen?“. Die Sitzungs-ID aus dem Pfad gilt in Großbuchstaben. | vitest: `frontend-react/src/join/join-page.spec.tsx`; Aufruf: `pnpm -C frontend-react build` zeigt einen eigenen Chunk für die Seite |
| A2 | Mit `invite` in der Adresse zeigt die Seite `join-role-hint` „Du trittst als Entwickler bei. Der Name ist für alle sichtbar.“, mit `as=viewer` stattdessen `join-viewer-hint` „Du trittst als Zuschauer bei. Du siehst die Runde, schätzt aber nicht mit.“, dazu das Formular `join-form` mit `join-name` „Name“ (Hinweis „Höchstens 30 Zeichen“, `autocomplete="name"`, gefüllt mit dem gemerkten Namen) und `join-submit` „Beitreten“. | vitest: `frontend-react/src/join/join-page.spec.tsx` |
| A3 | Ohne `invite` oder mit einem Wert nur aus Leerzeichen zeigt die Seite `join-invite-missing` „Zum Beitreten brauchst du einen Einladungslink vom Scrum Master.“ als Fehlerhinweis, kein Formular und keinen Rollenhinweis. | vitest: `frontend-react/src/join/join-page.spec.tsx` |
| A4 | „Beitreten“ mit leerem Namen oder nur Leerzeichen zeigt `join-name-error` „Bitte einen Namen eingeben“, mit mehr als 30 Zeichen „Der Name darf höchstens 30 Zeichen haben“, und sendet nichts. | vitest: `frontend-react/src/join/join-page.spec.tsx` |
| A5 | Ein gültiger Name sendet `POST /api/sessions/<ID>/participants` mit `{ name, invite }`, der Name ohne Leerzeichen am Rand; `as` wird nicht gesendet. Nach Erfolg: Zugang im `TokenStore` mit Rolle `VIEWER` bei `as=viewer`, sonst `DEVELOPER`, und Name; Name im `PreferencesStore`; Wechsel zu `/session/<ID>`. Während des Aufrufs ist der Button gesperrt. | vitest: `frontend-react/src/join/join-page.spec.tsx` |
| A6 | Fehler beim Beitritt: `SESSION_NOT_FOUND` ersetzt Formular und Rollenhinweis durch `join-not-found` („Sitzung nicht gefunden“, „Der Link ist abgelaufen oder falsch.“, Link `join-not-found-home` „Zur Startseite“); `INVITE_INVALID` durch `join-invite-invalid` „Der Einladungslink ist ungültig. Bitte den Scrum Master um einen neuen.“; `NAME_TAKEN` zeigt seinen Text am Feld in `join-error`, bis der Name sich ändert; `LIMIT_REACHED` und `VALIDATION_ERROR` zeigen ihren Text in `join-error` als Fehlerhinweis über dem Feld. In allen fünf Fällen ist der `ErrorState` danach leer; jeder andere Code bleibt im Banner. | vitest: `frontend-react/src/join/join-page.spec.tsx`, Tabelle der Codes |
| A7 | Toolbar auf `/session/<id>/join`: links vom Titel das Feld `toolbar-motif` (20 × 28 px, gestrichelter Rahmen, `aria-hidden`), rechts vom Titel `toolbar-session-id` mit der ID in Großbuchstaben in `--app-font-mono`, nur wenn die ID acht Zeichen aus A–Z und 2–9 hat; kein `toolbar-me`. Auf `/` fehlen alle drei. | vitest: `frontend-react/src/shell/app-shell.spec.tsx` |
| A8 | Toolbar im Raum (Snapshot im `SessionStore`): `toolbar-motif`, `toolbar-session-id` mit der ID des Snapshots und `toolbar-me` „<Name> · Scrum Master“, „… · Entwickler“ oder „… · Zuschauer“ mit dem eigenen Namen aus der Teilnehmerliste; unter 600 px Breite ist `toolbar-me` ausgeblendet. Der Umschalter `theme-toggle` bleibt am rechten Rand. | vitest: `frontend-react/src/shell/app-shell.spec.tsx` mit den Beispiel-Snapshots; Bildschirm: Raum bei 1280 px und 375 px |
| A9 | Die Buttons `connection-reconnect` (`outlined`, `on-error`) und `error-close` (`text`, `on-error`) des Banners sind `AppButton`; Texte, `data-testid` und Verhalten sind unverändert, das eigene Button-CSS des Banners entfällt. | vitest: `frontend-react/src/shell/error-banner.spec.tsx` ohne Änderung der Erwartungen |
| A10 | Ein Beitritt über einen echten Einladungslink des Backends führt im Browser in `/session/<ID>`, als Entwickler und als Zuschauer; ein Link mit verändertem Code zeigt `join-invite-invalid`, eine unbekannte Sitzungs-ID `join-not-found`. | Bildschirm: Sitzung über `POST /api/sessions` anlegen, Codes aus `GET /api/sessions/<id>` lesen, Links im React-Frontend öffnen |
| A11 | `project-rules/frontend-react-join.md` beschreibt Seite, Fehlerzustände und Toolbar, mit `sources:` auf `frontend-react/src/join/**`. `project-rules/frontend-react.md` nennt die Route. | Aufruf: `head -5 project-rules/frontend-react-join.md`, `grep -n "session/:id/join" project-rules/frontend-react.md` |

## Contracts

keine Änderung. Genutzt: `POST /api/sessions/{id}/participants`.

## Risiko

Stufe: high
Begründung: Dateien unter `frontend-react/src/` und `project-rules/**` sind medium; die
Schlüsselwort-Regel (`token` in den Zeilen, die den `TokenStore` aufrufen) hebt auf high. Die Seite
nimmt den Einladungscode an und speichert den Zugang (ADR 0003, ADR 0014).
Gates: G2, das Label `human-approved` nach dem letzten Push; G3, der Status `verified`; Code-,
Sicherheits- und Architektur-Review.
ADR nötig: nein, kein neues. Die Änderung folgt ADR 0003, 0013, 0014 und 0016.

## Umsetzung

Entscheidungen:

- Das Feld `toolbar-motif` zeigt in dieser Spec immer den gestrichelten Platzhalter. Farbe und
  Muster der Runde kommen mit Spec 0059, weil die Berechnung des Motivs im Raum entsteht (0058)
  und die Shell kein Feature importiert.
- Die Shell liest den Snapshot mit `useSyncExternalStore` aus `useBackend().sessions`;
  `frontend-react/src/api/` bleibt unverändert.
- Die Route `*` mit leerem Inhalt bleibt für unbekannte Pfade.
- Keine neue Abhängigkeit.

Dateien:

- `frontend-react/src/join/join-page.tsx`: neu
- `frontend-react/src/join/join-page.module.css`: neu
- `frontend-react/src/join/join-page.spec.tsx`: neu
- `frontend-react/src/join/messages.ts`: neu, Schlüssel `join.*`
- `frontend-react/src/app.tsx`: ändern, Route `/session/:id/join` mit `React.lazy`
- `frontend-react/src/shell/app-shell.tsx`: ändern, Motiv-Feld, Session-ID, „Name · Rolle“
- `frontend-react/src/shell/app-shell.module.css`: ändern
- `frontend-react/src/shell/app-shell.spec.tsx`: ändern
- `frontend-react/src/shell/error-banner.tsx`: ändern, `AppButton`
- `frontend-react/src/shell/error-banner.module.css`: ändern, Button-CSS entfällt
- `frontend-react/src/shell/messages.ts`: ändern, Schlüssel `shell.role.*`
- `project-rules/frontend-react-join.md`: neu
- `project-rules/frontend-react.md`: ändern, Routen und Toolbar
- `docs/specs/0057-react-beitrittsseite.md`: neu

Schritte:

1. Lesen: `frontend/src/app/join/join-page.ts`, `.html`, `.scss`,
   `frontend/src/app/shell/app-shell.ts`, `.html`, `.scss`, `project-rules/frontend.md`
   (Abschnitte Toolbar, Start und Beitritt, Einladungslinks), `project-rules/frontend-react.md`,
   `project-rules/frontend-react-ui.md`.
2. `join/messages.ts`; `join-page.tsx` mit `CardHand`, `TextField`, `ErrorNote`, `AppButton` und
   `participantNameError`; Dienste über `useBackend()`.
3. Route in `app.tsx`.
4. Toolbar: ID aus dem Snapshot, sonst aus dem Pfad `/session/<id>/join` (`useLocation`), Muster
   der ID wie im Angular-Frontend; eigener Name und Rolle aus dem Snapshot.
5. Banner auf `AppButton`.
6. Unit-Tests; `project-rules/frontend-react-join.md`, `project-rules/frontend-react.md`.
7. `make check`, React-Lauf der Playwright-Suite.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `frontend-react/src/join/join-page.spec.tsx`; Aufruf `pnpm -C frontend-react build` |
| A2 | `frontend-react/src/join/join-page.spec.tsx`: Entwickler, Zuschauer, gemerkter Name |
| A3 | `frontend-react/src/join/join-page.spec.tsx`: ohne `invite`, nur Leerzeichen |
| A4 | `frontend-react/src/join/join-page.spec.tsx`: Tabelle der ungültigen Namen |
| A5 | `frontend-react/src/join/join-page.spec.tsx`: Anfrage, Ablage je Rolle, Wechsel |
| A6 | `frontend-react/src/join/join-page.spec.tsx`: Tabelle der fünf Codes und eines anderen Codes |
| A7 | `frontend-react/src/shell/app-shell.spec.tsx`: Start, Beitritt mit gültiger und ungültiger ID |
| A8 | `frontend-react/src/shell/app-shell.spec.tsx`: drei Rollen / Browser: Raum |
| A9 | `frontend-react/src/shell/error-banner.spec.tsx` |
| A10 | Browser: Beitritt mit Links des Backends |
| A11 | Aufruf wie im Kriterium |

Testdaten: Unit-Tests mit `createTestBackend` und den Beispiel-Snapshots. Für den Gang durch den
Browser legt `/verify` die Sitzung über die öffentliche REST-API an (`POST /api/sessions` gegen
das Backend im Profil `e2e` mit dem GitLab-Double, Projekt 1234) und liest die Einladungscodes aus
`GET /api/sessions/<id>`; die Startseite des React-Frontends hat auf diesem Branch noch kein
Formular.

## Offene Fragen

keine

## Verifikationsplan

- make check
- betroffene Tests: `pnpm -C frontend-react test`; React-Lauf der Playwright-Suite
- Browser: Beitrittsseite hell und dunkel bei 1280 px und 375 px neben der des Angular-Frontends;
  die vier Fälle aus A10; Toolbar auf Beitrittsseite und im Raum (A7, A8)
