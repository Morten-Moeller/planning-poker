---
id: "0058"
title: "React-Frontend: Raum Teil 1 mit Seitenleiste und Lobby"
status: approved
risk: high
adrs: ["0004", "0014", "0016"]
owner: Morten Möller
created: 2026-11-24
updated: 2026-11-24
pr: ""
note: freigegeben in der Session
---

# React-Frontend: Raum Teil 1 mit Seitenleiste und Lobby

## Ziel

Die Sitzungsseite des React-Frontends zeigt nach dem Laden nur „Sitzung wird geladen“. Diese Spec
baut den Raum bis zur Lobby wie im Angular-Frontend (`frontend/src/app/session/`): das Raster mit
Seitenleiste und Hauptbereich, in der Seitenleiste Timer, Teilnehmer, Teilen und Fakten, im
Hauptbereich den Wartezustand von Entwickler und Zuschauer mit dem letzten Ergebnis. Gelöst ist
es, wenn die Unit-Tests jede Rolle und Phase der Seitenleiste belegen und der Raum im Browser mit
einer Sitzung des Backends neben dem Angular-Frontend gleich aussieht.

## Scope

### Enthalten

- Raster des Raums: Seitenleiste 340 px und Hauptbereich ab 720 px, darunter eine Spalte
  (Specs 0027, 0028, 0035, 0038).
- Kartenmotiv der Runde als `data-motif` am Raum (Spec 0028).
- Seitenleiste: Timer-Einstellung (Scrum Master), Teilnehmerliste, Teilen mit Einladungslinks und
  „Neue Sitzung“ (Scrum Master), Fakten (Specs 0016, 0028, 0032, 0039, 0040).
- Lobby für Entwickler und Zuschauer: Wartezustand mit Kartenhand, letztes Ergebnis.
- `project-rules/frontend-react-session.md`.

### Nicht enthalten

- Issue-Auswahl des Scrum Masters, aktives Issue (0059); Schätzrunde, Footer (0060); Ergebnis,
  Sitzungsprotokoll (0061). In `DISCUSSION`, `VOTING` und `REVEALED` und für den Scrum Master in
  `LOBBY` bleibt der Hauptbereich in dieser Spec leer.
- Motiv im Feld der Toolbar und Tags in `frontend/e2e/` (0059).
- Änderungen an `frontend-react/src/api/`, `frontend-react/src/shell/`, am Angular-Frontend und an
  `frontend/e2e/`.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Sitzung, Teilnehmer, Scrum Master, Entwickler, Zuschauer, Runde, Phase | wie in `docs/domain/glossary.md` |
| Kartenmotiv | eines der fünf Muster mit Akzentfarbe; ohne Bedeutung für den Zustand (`project-rules/frontend-react-ui.md`) |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Mit Snapshot zeigt die Seite den Raum (`data-testid="room"`) statt `session-loading`: ab 720 px Breite eine Seitenleiste von 340 px (`--mat-sys-surface-container-low`, Trennlinie rechts) und den Hauptbereich; der Raum füllt das Fenster unter der Toolbar, die Seite scrollt nicht, beide Spalten scrollen für sich mit `scrollbar-gutter: stable`. Unter 720 px steht die Seitenleiste unter dem Hauptbereich und die Seite scrollt. Der `h1` „Sitzung“ ist nur für Screenreader sichtbar. Die Zustände `session-loading` und `session-gone` bleiben wie bisher. | vitest: `frontend-react/src/session/session-page.spec.tsx`; Bildschirm: Raum bei 1440 × 900 und 375 × 800 neben dem Angular-Frontend |
| A2 | `motifFor(sessionId, issueIid, round)` liefert dieselben Werte wie `frontend/src/app/session/card-motif.ts` (FNV-1a modulo 5, kein Motiv zweimal in Folge). Der Raum trägt `data-motif` 0 in `LOBBY`, ohne aktives Issue und ohne Runde, sonst das Motiv der Runde, und setzt damit die Variablen `--app-card-*`. | vitest: `frontend-react/src/session/card-motif.spec.ts` mit den Fällen aus `frontend/src/app/session/card-motif.spec.ts`; `frontend-react/src/session/session-page.spec.tsx` |
| A3 | Die Abschnitte der Seitenleiste haben Überschriften in `--app-label-section` (Großbuchstaben per CSS) in dieser Folge: „Timer“ (nur Scrum Master), „Teilnehmer · n“, „Teilen“ (nur mit `invites` im Snapshot), „Fakten“. | vitest: `frontend-react/src/session/session-page.spec.tsx` je Rolle |
| A4 | Timer: Auswahl `timer-setting` (Komponente `Select` des UI SDK) mit der Beschriftung „Timer“, den Optionen `timer-option-0` „Aus“, `-15` „15 s“, `-30` „30 s“, `-60` „1 min“, `-120` „2 min“, `-300` „5 min“ und dem Hinweis `timer-setting-hint` „Gilt ab der nächsten Runde.“. Gewählt ist `timerSeconds` des Snapshots, ohne Wert „Aus“. Eine Wahl sendet `PUT …/timer` mit `seconds` (für „Aus“ `null`), sperrt die Auswahl bis zur Antwort und schreibt nach Erfolg `timerSeconds` in den `PreferencesStore`. | vitest: `frontend-react/src/session/timer-setting.spec.tsx` |
| A5 | Teilnehmerliste `participant-list`: Entwickler und Scrum Master zuerst, Zuschauer danach. Je Eintrag `participant`: `participant-name`, beim eigenen Eintrag „(du)“ (`participant-me`) und eine hervorgehobene Zeile, „★ Scrum Master“ oder „👁 Zuschauer“ (`participant-role`), `participant-status` „verbunden“ mit ● oder „getrennt“ mit ○. Entwickler haben einen Chip `participant-chip` (gefüllt mit dem Motiv nach einer Schätzung in `VOTING` und `REVEALED`, sonst gestrichelt); Scrum Master und Zuschauer haben keinen Chip und keine leere Spalte. Symbole stehen in `aria-hidden`-Spans außerhalb des Elements mit dem `data-testid`. | vitest: `frontend-react/src/session/participant-list.spec.tsx` mit den Beispiel-Snapshots |
| A6 | Zustand je Teilnehmer: Scrum Master „Moderiert, schätzt nicht mit“ (`participant-activity`); Zuschauer ohne Zustand; Entwickler „Bereit“ in `LOBBY`, „Diskutiert“ in `DISCUSSION` (`participant-activity`), in `VOTING` „✓ Hat geschätzt“ oder „○ Ausstehend“, in `REVEALED` „✓ Hat geschätzt“ oder „Nicht geschätzt“ (`participant-vote-status`). | vitest: `frontend-react/src/session/participant-list.spec.tsx`, Tabelle Rolle × Phase |
| A7 | Teilen (`session-share`): „Einladung Entwickler“ mit `share-link-developer` (`<origin>/session/<id>/join?invite=<code>`) und „Einladung Zuschauer“ mit `share-link-viewer` (zusätzlich `&as=viewer`), ID und Code URL-kodiert. Mit Zwischenablage je ein Button `copy-link-developer` und `copy-link-viewer` („⧉ Kopieren“, `aria-label` „Einladung Entwickler kopieren“ und „Einladung Zuschauer kopieren“). Nach Erfolg steht „✓ Kopiert“ (`copy-link-…-done`, `role="status"`) 3 s lang da, ein neuer Klick beginnt die 3 s neu; bei einem Fehler bleibt „⚠ Kopieren nicht möglich, bitte von Hand kopieren“ (`copy-link-…-failed`). Am Ende der Link `new-session` „＋ Neue Sitzung“ auf `/` als umrandeter Button. | vitest: `frontend-react/src/session/share-session.spec.tsx` (falsche Uhr, Zwischenablage als Doppel) |
| A8 | Fakten (`session-facts`): „Session-ID“ `session-id` in `--app-font-mono`; „Phase“ `session-phase` („Wartet auf ein Issue“, „Diskussion“, „Runde läuft“, „Runde aufgelöst“); „Deine Rolle“ `session-role` („Scrum Master“, „Entwickler“, „Zuschauer“); „Teilnehmer“ mit `session-participant-count` und `session-developer-count` „(m Entwickler)“ oder, mit Zuschauern, „(m Entwickler, k Zuschauer)“. | vitest: `frontend-react/src/session/session-facts.spec.tsx` |
| A9 | Entwickler und Zuschauer sehen in `LOBBY` `lobby-waiting` (`role="status"`) mit `card-hand` (klein), `lobby-waiting-title` „Warten, bis der Scrum Master ein Issue freigibt“ und „Die Seite aktualisiert sich von selbst.“. Ist der neueste Eintrag des Protokolls bestätigt, lautet der Titel „Das Ergebnis ist übernommen. Warten, bis der Scrum Master das nächste Issue freigibt.“. Der Scrum Master sieht den Wartezustand nie. | vitest: `frontend-react/src/session/session-page.spec.tsx` |
| A10 | Unter dem Wartezustand zeigt `last-result` „Zuletzt geschätzt“ für diesen Eintrag: „Endwert“ `last-result-final-card`, `last-result-issue` „#iid Titel“, `last-result-round` „Runde n“, `last-result-cards` mit den Karten durch „·“ getrennt, `last-result-saved` „✓ Als Kommentar in GitLab gespeichert“ und, mit `project` im Snapshot, den Link `last-result-open` „In GitLab öffnen ↗“ auf `<webUrl>/-/issues/<iid>` in einem neuen Tab mit `rel="noopener noreferrer"`. Die Karten `?` und `☕` haben `role="img"` mit dem Namen aus `frontend/src/app/session/cards.ts`. | vitest: `frontend-react/src/session/last-result.spec.tsx` |
| A11 | Der Raum sieht im Browser mit einer Sitzung des Backends aus wie im Angular-Frontend: Seitenleiste mit allen Abschnitten als Scrum Master, als Entwickler und als Zuschauer in `LOBBY`, hell und dunkel; Abstände, Schriften und Farben der Abschnitte stimmen überein. | Bildschirm: zwei Browser-Kontexte je Frontend, Sitzung und Beitritt über die REST-API, Zugang in `sessionStorage` |
| A12 | `project-rules/frontend-react-session.md` beschreibt Raster, Motiv, die Teile der Seitenleiste und die Lobby, mit `sources:` auf `frontend-react/src/session/**`. | Aufruf: `head -5 project-rules/frontend-react-session.md` |

## Contracts

keine Änderung. Genutzt: der Snapshot `SessionView`, `PUT /api/sessions/{id}/timer`.

## Risiko

Stufe: high
Begründung: Dateien unter `frontend-react/src/` und `project-rules/**` sind medium. Der Code zeigt
die Einladungscodes und ruft den `TokenStore` in der vorhandenen Behandlung von `session-gone`
auf; trifft die Schlüsselwort-Regel (`token`) eine geänderte Zeile, ist die Stufe high. Die Spec
ist deshalb mit high freigegeben.
Gates: G2, das Label `human-approved` nach dem letzten Push; G3, der Status `verified`; Code-,
Sicherheits- und Architektur-Review.
ADR nötig: nein, kein neues. Die Änderung folgt ADR 0004 (Zustand nur aus dem Snapshot), ADR 0014
(Einladungen je Rolle) und ADR 0016.

## Umsetzung

Entscheidungen:

- Die Auswahl des Timers nutzt `Select` aus `@ui-sdk/react/select`, lokal in `session/`.
- Der Raum setzt Höhe und Innenabstand des Hauptbereichs der Shell selbst, mit `:has()` in
  `session-page.module.css` (wie das Angular-Frontend mit `:host:has(.room)`);
  `frontend-react/src/shell/` bleibt unverändert, weil Spec 0057 die Shell in derselben Welle
  ändert.
- `card-motif.ts` und `cards.ts` liegen in `session/`. Spec 0059 verschiebt `card-motif.ts` nach
  `api/`, wenn die Toolbar das Motiv zeigt.
- Komponenten lesen den Snapshot mit `useSyncExternalStore` aus `useBackend().sessions`;
  `frontend-react/src/api/` bleibt unverändert.
- Keine neue Abhängigkeit.

Dateien:

- `frontend-react/src/session/session-page.tsx`: ändern, Raum, Raster, Lobby
- `frontend-react/src/session/session-page.module.css`: ändern
- `frontend-react/src/session/session-page.spec.tsx`: ändern
- `frontend-react/src/session/card-motif.ts`: neu
- `frontend-react/src/session/card-motif.spec.ts`: neu
- `frontend-react/src/session/cards.ts`: neu, Symbol und Name je Karte
- `frontend-react/src/session/cards.spec.ts`: neu
- `frontend-react/src/session/timer-setting.tsx`: neu
- `frontend-react/src/session/timer-setting.module.css`: neu
- `frontend-react/src/session/timer-setting.spec.tsx`: neu
- `frontend-react/src/session/participant-list.tsx`: neu
- `frontend-react/src/session/participant-list.module.css`: neu
- `frontend-react/src/session/participant-list.spec.tsx`: neu
- `frontend-react/src/session/share-session.tsx`: neu
- `frontend-react/src/session/share-session.module.css`: neu
- `frontend-react/src/session/share-session.spec.tsx`: neu
- `frontend-react/src/session/session-facts.tsx`: neu
- `frontend-react/src/session/session-facts.module.css`: neu
- `frontend-react/src/session/session-facts.spec.tsx`: neu
- `frontend-react/src/session/last-result.tsx`: neu
- `frontend-react/src/session/last-result.module.css`: neu
- `frontend-react/src/session/last-result.spec.tsx`: neu
- `frontend-react/src/session/messages.ts`: ändern, Schlüssel `session.*`, `participants.*`, `share.*`, `facts.*`, `timerSetting.*`, `lastResult.*`
- `project-rules/frontend-react-session.md`: neu
- `docs/specs/0058-react-raum-teil-1.md`: neu

Schritte:

1. Lesen: `frontend/src/app/session/session-page.ts`, `.html`, `.scss`, `participant-list.*`,
   `session-facts.*`, `share-session.*`, `timer-setting.*`, `last-result.*`, `card-motif.ts`,
   `cards.ts`, `project-rules/frontend.md` (Abschnitte Session page grid, Design Werkbank Teil B),
   `project-rules/frontend-react.md`, `project-rules/frontend-react-ui.md`,
   `frontend-react/node_modules/@ui-sdk/react/docs/components/select.md`. Bietet `Select` eine
   Anforderung aus A4 nicht (Optionen mit `data-testid`, gesperrter Zustand), hält `/implement`
   an.
2. `card-motif.ts`, `cards.ts` mit den Tests der Angular-Vorlage.
3. `session/messages.ts` mit den Texten der Vorlagen.
4. `session-facts.tsx`, `participant-list.tsx`, `share-session.tsx`, `timer-setting.tsx`,
   `last-result.tsx`; Buttons als `AppButton`.
5. `session-page.tsx`: Raster, `data-motif` mit der Klasse `motif-<n>` aus `styles/motifs.css`,
   Lobby mit `CardHand`.
6. `project-rules/frontend-react-session.md`.
7. `make check`, React-Lauf der Playwright-Suite.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `frontend-react/src/session/session-page.spec.tsx` / Browser: Raum bei zwei Größen |
| A2 | `frontend-react/src/session/card-motif.spec.ts`; `frontend-react/src/session/session-page.spec.tsx` |
| A3 | `frontend-react/src/session/session-page.spec.tsx`: Scrum Master, Entwickler, Zuschauer |
| A4 | `frontend-react/src/session/timer-setting.spec.tsx` |
| A5 | `frontend-react/src/session/participant-list.spec.tsx` |
| A6 | `frontend-react/src/session/participant-list.spec.tsx`: Tabelle Rolle × Phase |
| A7 | `frontend-react/src/session/share-session.spec.tsx` |
| A8 | `frontend-react/src/session/session-facts.spec.tsx` |
| A9 | `frontend-react/src/session/session-page.spec.tsx` |
| A10 | `frontend-react/src/session/last-result.spec.tsx` |
| A11 | Browser: Raum in drei Rollen neben dem Angular-Frontend |
| A12 | Aufruf wie im Kriterium |

Testdaten: Unit-Tests mit `createTestBackend`, den Beispiel-Snapshots aus
`frontend-react/src/api/examples.ts` und daraus abgeleiteten Snapshots (Zuschauer, bestätigter
Eintrag im Protokoll) in einer Hilfsdatei neben den Tests. Für den Gang durch den Browser legt
`/verify` die Sitzung über die öffentliche REST-API an (`POST /api/sessions`,
`POST /api/sessions/<id>/participants` gegen das Backend im Profil `e2e`, Projekt 1234) und setzt
den Zugang unter `planningpoker.session.<id>` in `sessionStorage`; Startseite und Beitrittsseite
des React-Frontends fehlen auf diesem Branch.

## Offene Fragen

keine

## Verifikationsplan

- make check
- betroffene Tests: `pnpm -C frontend-react test`; React-Lauf der Playwright-Suite
- Browser: Raum des React-Frontends neben dem des Angular-Frontends als Scrum Master, Entwickler
  und Zuschauer in `LOBBY`, hell und dunkel, bei 1440 × 900 und 375 × 800 (A1, A11); Kopieren
  eines Einladungslinks; Wahl eines Timers
