---
id: "0060"
title: "React-Frontend: Raum Teil 3 mit Diskussion und Schätzrunde"
status: approved
risk: medium
adrs: ["0004", "0016"]
owner: Morten Möller
created: 2026-11-25
updated: 2026-11-25
pr: ""
note: freigegeben in der Session
---

# React-Frontend: Raum Teil 3 mit Diskussion und Schätzrunde

## Ziel

Im React-Frontend ist nach Spec 0059 ein Issue freigegeben und zu sehen, aber niemand kann die
Schätzung starten oder eine Karte wählen. Diese Spec baut die Diskussion und die Schätzrunde wie im
Angular-Frontend (`frontend/src/app/session/round-status.*`, `round-timer.*`, `round-footer.*`,
`card-deck.*`, `card.*`, `seat-table.*`): Rundenstatus mit Zähler, Fortschritt und Timer, den Tisch
mit den Plätzen, den Footer mit Kartensatz oder den Aktionen des Scrum Masters. Gelöst ist es, wenn
die Playwright-Tests der Schätzrunde bis zur Auflösung mit dem Tag `@react` gegen beide Frontends
grün sind.

## Scope

### Enthalten

- Rundenstatus `round-status` in `DISCUSSION` und `VOTING` um das aktive Issue (Specs 0013, 0021,
  0028, 0031).
- Timer der Runde `round-timer` (Specs 0016, 0021).
- Tisch `seat-table` verdeckt in `VOTING` und aufgedeckt in `REVEALED`, mit Ausreißern
  (Specs 0013, 0015, 0028).
- Karte in allen Zuständen und Kartensatz `card-deck` mit Tastatur, gesperrt in `DISCUSSION`
  (Specs 0013, 0021, 0028, 0034, 0041).
- Footer `round-footer` in `DISCUSSION` und `VOTING` je Rolle (Specs 0035, 0039).
- Tag `@react` für die unten genannten Tests.

### Nicht enthalten

- Ergebnis der Runde (Kennzahlen, Verteilung, Konsens, Konfetti), Footer in `REVEALED`
  (`round-restart`, `result-accept`, `result-waiting`), Dialog zum Bestätigen, Sitzungsprotokoll
  (0061). In `REVEALED` zeigt der Hauptbereich bis dahin das aktive Issue und den aufgedeckten
  Tisch, ohne Footer.
- Tests, die diese Teile brauchen, bleiben ohne Tag.
- Änderungen am Verhalten des Angular-Frontends, am Backend und am Vertrag.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Sitzung, Runde, Phase, Schätzung, Karte, Kartensatz, Scrum Master, Entwickler, Zuschauer, Ausreißer | wie in `docs/domain/glossary.md` |
| Kartenmotiv | wie in `project-rules/frontend-react-session.md` |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | In `DISCUSSION` und `VOTING` steht das aktive Issue in `round-status`. Die Leiste zeigt in `DISCUSSION` `round-phase` „Diskussion“, „·“ und `round-number` „Runde n“, mit Timer der Sitzung dazu `discussion-timer` „◷ m:ss · startet mit der Schätzung“; in `VOTING` `round-number`, `vote-counter` (`role="status"`) „v von t haben geschätzt“ und `vote-progress`. Am Ende steht `motif-name` „Kartensatz: Raster“ (Punkte, Zeilen, Ringe, Stufen) mit einem Farbfeld des Motivs. | vitest: `frontend-react/src/session/round-status.spec.tsx`; e2e: `frontend/e2e/session-room.spec.ts`, `frontend/e2e/project-picker.spec.ts` |
| A2 | Gezählt werden verbundene Entwickler (`voteProgress`); `vote-progress` ist die Komponente `Progress` des UI SDK mit `role="progressbar"`, `aria-label` „Fortschritt der Schätzung“, `aria-valuemin` 0, `aria-valuemax` t und `aria-valuenow` v; die Füllung ist v/t der Breite, 0 ohne Entwickler. | vitest: `frontend-react/src/session/vote-progress.spec.ts`, `frontend-react/src/session/round-status.spec.tsx`; e2e: `frontend/e2e/voting-round.spec.ts` |
| A3 | Mit `round.deadline` zeigt `round-timer` (`role="timer"`) „◷ Noch m:ss“, gerechnet mit `serverNow()` und jede Sekunde neu; in den letzten 10 s hervorgehoben; bei 0 „⏱ Zeit abgelaufen“. `round-timer-live` (`aria-live="polite"`) nennt den Stand beim ersten Mal, alle 15 s und in den letzten 10 s jede Sekunde. Ohne Deadline fehlt beides. | vitest: `frontend-react/src/session/round-timer.spec.tsx` (falsche Uhr); e2e: `frontend/e2e/round-timer.spec.ts` |
| A4 | `seat-table` (`aria-label` „Karten am Tisch“) steht in `VOTING` unter dem Issue mit `seat-table-title` „AM TISCH · VERDECKT“ und je Entwickler `seat` mit `seat-name`, `seat-card` und `seat-status`: nach der Schätzung eine verdeckte Karte (Name „Karte verdeckt“) und „✓ geschätzt“; verbunden ohne Schätzung „…“ und „ausstehend“; getrennt ohne Schätzung „getrennt“. Scrum Master und Zuschauer haben keinen Platz. Kein Wert einer fremden Karte steht vor der Auflösung im DOM. | vitest: `frontend-react/src/session/seat-table.spec.tsx`; e2e: `frontend/e2e/voting-round.spec.ts` |
| A5 | In `REVEALED` zeigt `seat-table` „AUFGEDECKT“ und je Schätzung `result-vote` mit `result-vote-name` und `result-vote-card` (Name „Karte 8“, „Karte Unklar“, „Karte Kaffeepause“), auch für Entwickler, die die Sitzung verlassen haben; ein Ausreißer (`outlierCards`, wie `frontend/src/app/session/outliers.ts`) hat `result-vote-outlier` „Ausreißer“. Ein Entwickler ohne Schätzung behält `seat` mit „–“ und „nicht geschätzt“ oder „getrennt“. Die Karten drehen sich nacheinander um (40 ms Abstand), nicht bei `prefers-reduced-motion`. | vitest: `frontend-react/src/session/seat-table.spec.tsx`, `frontend-react/src/session/outliers.spec.ts`; e2e: `frontend/e2e/voting-round.spec.ts` |
| A6 | Der Footer `round-footer` ist die letzte Zeile des Raums, in `LOBBY` und `REVEALED` fehlt er. Ab 720 px bleibt er im Fenster; darunter klebt er am unteren Rand des Fensters. | vitest: `frontend-react/src/session/session-page.spec.tsx`; e2e: `frontend/e2e/layout.spec.ts` (Footer bei 375 × 667) |
| A7 | Scrum Master in `DISCUSSION`: `discussion-hint` (`role="status"`) „Das Team diskutiert das Issue.“, „Die Karten sind gesperrt, bis du die Schätzung startest.“, mit Timer `round-start-timer` „Timer: 30 s“, und `round-start` „Schätzung starten“; der Klick sendet `POST …/round/start` und sperrt den Button bis zur Antwort. | vitest: `frontend-react/src/session/round-footer.spec.tsx`; e2e: `frontend/e2e/session-room.spec.ts` |
| A8 | Scrum Master in `VOTING`: ohne `round.allVoted` `pending-hint` „Noch 1 Schätzung ausstehend. Du kannst auch vorher auflösen.“ oder „Noch n Schätzungen ausstehend. …“ und `round-reveal` „Auflösen“ umrandet; mit `allVoted` `all-voted-hint` „✓ Alle verbundenen Entwickler haben geschätzt.“, dazu `absent-hint` „Cem ist getrennt und wird nicht abgewartet.“ oder „Cem, Dana sind getrennt und werden nicht abgewartet.“, und `round-reveal` gefüllt. Der Klick sendet `POST …/round/reveal` und sperrt den Button bis zur Antwort. | vitest: `frontend-react/src/session/round-footer.spec.tsx`; e2e: `frontend/e2e/voting-round.spec.ts` |
| A9 | Zuschauer sehen im Footer `viewer-hint` „Du schaust zu.“ (`role="status"`), keinen Kartensatz und keine Aktion. | vitest: `frontend-react/src/session/round-footer.spec.tsx` |
| A10 | Entwickler in `VOTING`: `card-deck` mit der Überschrift „Deine Karte“, `card-deck-hint` „Du kannst sie ändern, bis aufgelöst wird.“ und der Gruppe „Deine Karte“ mit elf Buttons `card-0` bis `card-COFFEE` in der Reihenfolge des Kartensatzes, Name „Karte 5“, „Karte Unklar“, „Karte Kaffeepause“. Die Karte aus `round.myVote` hat `aria-pressed="true"` und „✓ GEWÄHLT“. Ein Klick sendet `PUT …/vote` mit der Karte; bis zur Antwort nimmt keine Karte einen Klick an. `?` und `☕` sind die Zeichnungen aus `frontend/public/question-mark.svg` und `coffee-break.svg`. | vitest: `frontend-react/src/session/card-deck.spec.tsx`, `frontend-react/src/session/card.spec.tsx`; e2e: `frontend/e2e/voting-round.spec.ts` |
| A11 | Tastatur im Kartensatz: Pfeil rechts und unten zur nächsten, links und oben zur vorigen Karte (am Ende weiter am Anfang), Pos1 und Ende zur ersten und letzten, Enter und Leertaste wählen. Die Karte mit Fokus und die gewählte Karte werden in die Zeile gescrollt. Unter 720 px ist der Kartensatz eine Zeile, die seitlich scrollt, mit Karten ab 44 px; ab 1920 px höchstens 1000 px breit und mittig. | vitest: `frontend-react/src/session/card-deck.spec.tsx`; e2e: `frontend/e2e/voting-round.spec.ts` (Tastatur, 375 px, 1920 px), `frontend/e2e/layout.spec.ts` |
| A12 | Entwickler in `DISCUSSION`: `card-deck-locked` mit „Deine Karte · gesperrt“ und `discussion-hint` „Diskussion: Die Karten werden geöffnet, wenn der Scrum Master die Schätzung startet.“; die Karten haben `aria-disabled="true"`, den Zeiger `not-allowed`, senden nichts und wackeln bei Klick und beim ersten Überfahren. Beim Wechsel nach `VOTING` öffnen sie sich nacheinander von links (`data-unlock`), nicht beim ersten Anzeigen eines offenen Kartensatzes und nicht bei `prefers-reduced-motion`. | vitest: `frontend-react/src/session/card-deck.spec.tsx`, `frontend-react/src/session/card.spec.tsx`; e2e: `frontend/e2e/card-motion.spec.ts` |
| A13 | Diese Tests tragen `@react` und sind in beiden Läufen von `make e2e` grün: `voting-round.spec.ts` (alle), `round-timer.spec.ts`, `card-motion.spec.ts` (alle), `session-room.spec.ts` (Freigabe mit `discussion-hint`, Wechsel in `VOTING`), `project-picker.spec.ts` (`round-number`), `layout.spec.ts` (Footer bei 375 × 667), `full-flow.spec.ts` (unbekannte Sitzung mit gespeichertem Zugang). Die Erwartungen bleiben gleich; geändert sind nur das Tag und die Selektoren aus den Entscheidungen. | e2e: `BACKEND_PORT=… FRONTEND_PORT=… make e2e` |
| A14 | Rundenstatus, Tisch, Kartensatz und Footer sehen im Browser aus wie im Angular-Frontend, hell und dunkel, bei 1440 × 900 und 375 × 800, in `DISCUSSION` und `VOTING` je Rolle. | Bildschirm: Raum als Scrum Master, Entwickler und Zuschauer neben dem Angular-Frontend |

## Contracts

keine Änderung. Genutzt: `POST /api/sessions/{id}/round/start`, `POST …/round/reveal`,
`PUT …/vote`, der Snapshot `SessionView`.

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh` nennt für die Dateiliste medium (Quelltext unter
`frontend-react/src/`, `frontend/src/app/session/card.html`, `project-rules/**`). Keine neue
Abhängigkeit, kein HTML aus fremdem Text. Hebt die Schlüsselwort-Regel die Stufe bei der
Umsetzung, hält `/implement` an.
Gates: G2, das Label `human-approved` nach dem letzten Push; G3, der Status `verified`; Code- und
Sicherheits-Review.
ADR nötig: nein, weil keine Bedingung aus `harness/policies/adr.md` zutrifft: keine neue
Abhängigkeit, kein Vertrag, keine Abweichung von einer Regel. Die Änderung folgt ADR 0004 und
ADR 0016.

## Umsetzung

Entscheidungen:

- Keine neue Abhängigkeit. `vote-progress` ist `Progress` aus `@ui-sdk/react/progress`, lokal in
  `session/`; die Buttons sind `AppButton`, die Karten eigenes HTML und CSS.
- Die Zeichnungen für `?` und `☕` stehen als React-Komponenten in `session/card-glyph.tsx`, mit
  den Pfaden der beiden SVG-Dateien des Angular-Frontends. Kein Abruf zur Laufzeit, kein
  `dangerouslySetInnerHTML`. Eine Änderung einer Zeichnung wird in beiden Frontends gemacht.
- `SeatTable` hat beide Zustände (verdeckt, aufgedeckt) schon in dieser Spec; 0061 setzt den
  aufgedeckten Tisch in das Ergebnis der Runde.
- Selektoren der Suite: `.card` in `voting-round.spec.ts` wird zu `button` im Kartensatz; die
  Klasse `unlock` in `card-motion.spec.ts` wird zum Attribut `data-unlock`, das beide Frontends
  an der Karte setzen (im Angular-Frontend neu in `card.html`); die Variable `--unlock-index` am
  Element der Karte bleibt in beiden Frontends.
- Der Footer ist die zweite Zeile des Rasters in `session-page.module.css`, wie im
  Angular-Frontend.

Dateien:

- `frontend-react/src/session/card.tsx`: neu
- `frontend-react/src/session/card.module.css`: neu
- `frontend-react/src/session/card.spec.tsx`: neu
- `frontend-react/src/session/card-glyph.tsx`: neu
- `frontend-react/src/session/card-deck.tsx`: neu
- `frontend-react/src/session/card-deck.module.css`: neu
- `frontend-react/src/session/card-deck.spec.tsx`: neu
- `frontend-react/src/session/seat-table.tsx`: neu
- `frontend-react/src/session/seat-table.module.css`: neu
- `frontend-react/src/session/seat-table.spec.tsx`: neu
- `frontend-react/src/session/outliers.ts`: neu
- `frontend-react/src/session/outliers.spec.ts`: neu
- `frontend-react/src/session/vote-progress.ts`: neu
- `frontend-react/src/session/vote-progress.spec.ts`: neu
- `frontend-react/src/session/round-status.tsx`: neu
- `frontend-react/src/session/round-status.module.css`: neu
- `frontend-react/src/session/round-status.spec.tsx`: neu
- `frontend-react/src/session/round-timer.tsx`: neu
- `frontend-react/src/session/round-timer.module.css`: neu
- `frontend-react/src/session/round-timer.spec.tsx`: neu
- `frontend-react/src/session/round-footer.tsx`: neu
- `frontend-react/src/session/round-footer.module.css`: neu
- `frontend-react/src/session/round-footer.spec.tsx`: neu
- `frontend-react/src/session/motif-name.ts`: neu
- `frontend-react/src/session/reduced-motion.ts`: neu
- `frontend-react/src/session/cards.ts`: ändern, Kartensatz `CARDS` und `cardLabel`
- `frontend-react/src/session/cards.spec.ts`: ändern
- `frontend-react/src/session/session-page.tsx`: ändern, Rundenstatus, Tisch, Footer
- `frontend-react/src/session/session-page.module.css`: ändern, Zeile des Footers
- `frontend-react/src/session/session-page.spec.tsx`: ändern
- `frontend-react/src/session/messages.ts`: ändern, Schlüssel `roundStatus.*`, `roundTimer.*`, `roundFooter.*`, `cardDeck.*`, `card.*`, `seatTable.*`, `motif.*`
- `frontend-react/src/session/testing/session-snapshots.tsx`: ändern, Snapshots mit Deadline, getrennten Entwicklern, Schätzungen
- `frontend/src/app/session/card.html`: ändern, Attribut `data-unlock`
- `frontend/e2e/voting-round.spec.ts`: ändern, Tags und Selektor
- `frontend/e2e/round-timer.spec.ts`: ändern, Tag
- `frontend/e2e/card-motion.spec.ts`: ändern, Tags und Selektor
- `frontend/e2e/session-room.spec.ts`: ändern, Tags
- `frontend/e2e/project-picker.spec.ts`: ändern, Tag
- `frontend/e2e/layout.spec.ts`: ändern, Tag
- `frontend/e2e/full-flow.spec.ts`: ändern, Tag
- `project-rules/frontend-react-session.md`: ändern
- `project-rules/frontend.md`: ändern, `data-unlock`
- `project-rules/testing.md`: ändern, Tests ohne Tag
- `docs/roadmap.md`: ändern, Stand
- `docs/specs/0060-react-raum-teil-3.md`: neu

Schritte:

1. Lesen: die Vorlagen `frontend/src/app/session/round-status.*`, `round-timer.*`,
   `round-footer.*`, `card-deck.*`, `card.*`, `card-glyphs.ts`, `seat-table.*`, `outliers.ts`,
   `vote-progress.ts`, `motif-name.ts`, `reduced-motion.ts`, `session-page.scss` (Footer),
   `project-rules/frontend.md` (Footer and scroll areas, Design Werkbank Teil B),
   `project-rules/frontend-react*.md` und
   `frontend-react/node_modules/@ui-sdk/react/docs/components/progress.md`. Setzt `Progress` die
   Attribute aus A2 nicht (`aria-valuemax` t, auch mit t = 0), hält `/implement` an.
2. `cards.ts`, `outliers.ts`, `vote-progress.ts`, `motif-name.ts`, `reduced-motion.ts` mit den
   Tests der Angular-Vorlagen.
3. `messages.ts`, `card-glyph.tsx`, `card.tsx`.
4. `round-timer.tsx`, `seat-table.tsx`, `round-status.tsx`.
5. `card-deck.tsx`, `round-footer.tsx`.
6. `session-page.tsx`: `RoundStatus` um das aktive Issue in `DISCUSSION` und `VOTING`, der
   aufgedeckte Tisch in `REVEALED`, Footer als letzte Zeile.
7. `data-unlock` im Angular-Frontend, Selektoren und Tags in `frontend/e2e/`.
8. Regeldateien, `docs/roadmap.md`.
9. `make check`, `BACKEND_PORT=18080 FRONTEND_PORT=14200 make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `frontend-react/src/session/round-status.spec.tsx`: Leiste je Phase, Motivname |
| A2 | `frontend-react/src/session/vote-progress.spec.ts`; `frontend-react/src/session/round-status.spec.tsx`: Attribute und Füllung |
| A3 | `frontend-react/src/session/round-timer.spec.tsx` |
| A4 | `frontend-react/src/session/seat-table.spec.tsx`: verdeckt |
| A5 | `frontend-react/src/session/seat-table.spec.tsx`: aufgedeckt; `frontend-react/src/session/outliers.spec.ts` |
| A6 | `frontend-react/src/session/session-page.spec.tsx`; `frontend/e2e/layout.spec.ts` |
| A7 | `frontend-react/src/session/round-footer.spec.tsx`: Scrum Master in `DISCUSSION` |
| A8 | `frontend-react/src/session/round-footer.spec.tsx`: Scrum Master in `VOTING` |
| A9 | `frontend-react/src/session/round-footer.spec.tsx`: Zuschauer |
| A10 | `frontend-react/src/session/card-deck.spec.tsx`; `frontend-react/src/session/card.spec.tsx` |
| A11 | `frontend-react/src/session/card-deck.spec.tsx`: Tastatur; `frontend/e2e/voting-round.spec.ts` |
| A12 | `frontend-react/src/session/card-deck.spec.tsx`, `frontend-react/src/session/card.spec.tsx`; `frontend/e2e/card-motion.spec.ts` |
| A13 | beide Läufe von `make e2e` |
| A14 | Browser: Raum neben dem Angular-Frontend |

Testdaten: Unit-Tests mit `createTestBackend`, den Beispiel-Snapshots und den Hilfen in
`frontend-react/src/session/testing/session-snapshots.tsx`; die Uhr ist die falsche Uhr von
vitest. Die Playwright-Tests legen ihre Sitzungen über die Startseite an.

## Offene Fragen

keine

## Verifikationsplan

- make check
- betroffene Tests: `pnpm -C frontend-react test`; beide Läufe von `make e2e`
- Browser: Raum des React-Frontends neben dem des Angular-Frontends als Scrum Master, Entwickler
  und Zuschauer in `DISCUSSION` und `VOTING` (ohne und mit Timer, vor und nach der eigenen
  Schätzung, alle haben geschätzt), hell und dunkel, bei 1440 × 900 und 375 × 800 (A14);
  Kartensatz mit der Tastatur
