---
id: "0061"
title: "React-Frontend: Raum Teil 4 mit Auflösung und Abschluss"
status: approved
risk: high
adrs: ["0004", "0016"]
owner: Morten Möller
created: 2026-11-25
updated: 2026-11-25
pr: ""
note: freigegeben in der Session
---

# React-Frontend: Raum Teil 4 mit Auflösung und Abschluss

## Ziel

Im React-Frontend endet eine Runde nach Spec 0060 mit dem aufgedeckten Tisch; niemand kann erneut
schätzen lassen oder das Ergebnis übernehmen. Diese Spec baut die Auflösung und den Abschluss wie
im Angular-Frontend (`frontend/src/app/session/round-result.*`, `confetti.*`,
`confirm-result-dialog.*`, `confirm-success.*`, `session-history.*`, Teil `REVEALED` von
`round-footer.*`): das Ergebnis der Runde, den Footer mit „Erneut schätzen“ und „Ergebnis
übernehmen“, den Dialog mit dem Endwert, die Meldung nach dem Speichern und das Sitzungsprotokoll.
Gelöst ist es, wenn alle Playwright-Tests außer dem Test der Favicon-Verweise das Tag `@react`
tragen und gegen beide Frontends grün sind.

## Scope

### Enthalten

- Ergebnis `round-result` in `REVEALED` um das aktive Issue: Leiste, Konsens mit Konfetti,
  Ausreißer, Tisch, „Nicht geschätzt“, Verteilung und Kennzahlen (Specs 0014, 0015, 0020, 0022,
  0030, 0042).
- Footer in `REVEALED` je Rolle (Specs 0035, 0039).
- Dialog `confirm-dialog` mit dem Endwert, Meldung `confirm-success` (Specs 0014, 0018, 0024,
  0037).
- Sitzungsprotokoll `history-panel` in der Seitenleiste (Specs 0014, 0028).
- Tag `@react` für alle übrigen Tests außer dem Test der Favicon-Verweise.

### Nicht enthalten

- Test der Favicon-Verweise, Lauf der Suite ohne Tag, Bundle-Grenze, README (0062).
- Änderungen am Verhalten des Angular-Frontends, am Backend und am Vertrag.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Sitzung, Runde, Schätzung, Endwert, Konsens, Ausreißer, Sitzungsprotokoll, Scrum Master, Entwickler, Zuschauer | wie in `docs/domain/glossary.md` |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | In `REVEALED` steht das aktive Issue in `round-result` mit der Überschrift „Aufgedeckte Karten“. Die Leiste zeigt `round-number` „Runde n“ und „· aufgelöst“, `result-counter` „1 Schätzung“ oder „n Schätzungen“, dazu „· Cem war getrennt“ oder „· Cem, Dana waren getrennt“ für getrennte Entwickler ohne Schätzung, und `motif-name`. Unter dem Issue folgt der aufgedeckte Tisch; ohne Schätzung steht `result-empty` „Keine Karten abgegeben.“ da. | vitest: `frontend-react/src/session/round-result.spec.tsx`; e2e: `frontend/e2e/result-round.spec.ts`, `frontend/e2e/round-timer.spec.ts` |
| A2 | Konsens (`consensusCard` wie `frontend/src/app/session/consensus.ts`: mindestens zwei Schätzungen, alle dieselbe Zahlenkarte): `consensus-hint` (`role="status"`) „Konsens: Alle n abgegebenen Stimmen zeigen 5.“ mit der Karte daneben, und `consensus-confetti` mit 46 Teilen mit Größe, Farbe, Dauer und Verzögerung aus `pieceStyle` wie `frontend/src/app/session/confetti.ts`; kein Konfetti bei `prefers-reduced-motion`. Fehlen Entwickler, steht `turnout-hint` „v von t Entwicklern haben geschätzt.“ darunter. | vitest: `frontend-react/src/session/consensus.spec.ts`, `frontend-react/src/session/confetti.spec.tsx`, `frontend-react/src/session/round-result.spec.tsx`; e2e: `frontend/e2e/consensus.spec.ts`, `frontend/e2e/confetti.spec.ts` |
| A3 | Mit Ausreißern steht ein Hinweis (`role="note"`) „↕ Ausreißer“ mit `outlier-hint` „Niedrigste und höchste Schätzung liegen weit auseinander.“ da. Entwickler ohne Schätzung nennt `not-voted` „Nicht geschätzt:“ mit `not-voted-name` je Name, getrennte mit „(nicht verbunden)“. | vitest: `frontend-react/src/session/round-result.spec.tsx`; e2e: `frontend/e2e/outliers.spec.ts`, `frontend/e2e/consensus.spec.ts` |
| A4 | Mit `round.stats`: „VERTEILUNG“ (`result-distribution`) mit `result-count` je Karte (`result-count-card`, Balken im Verhältnis zur größten Zahl, `result-count-votes` „1 Stimme“ oder „n Stimmen“) und „ZUR ORIENTIERUNG“ (`result-facts`) mit `result-average` (eine Nachkommastelle mit Komma, ohne Zahlenkarten „kein Durchschnitt“), `result-most-frequent` (durch „, “ getrennt) und „Kein Vorschlag: Den Endwert legt das Team fest.“. Keiner der beiden Blöcke enthält einen Button. `?` und `☕` haben `role="img"` mit Namen. | vitest: `frontend-react/src/session/round-result.spec.tsx`, `frontend-react/src/session/round-stats.spec.ts`; e2e: `frontend/e2e/result-round.spec.ts` |
| A5 | Mit `round.confirming` steht `confirming-hint` (`role="status"`) „Das Ergebnis wird nach GitLab geschrieben.“ da, für jede Rolle. | vitest: `frontend-react/src/session/round-result.spec.tsx` |
| A6 | Footer in `REVEALED`: Der Scrum Master hat `round-restart` „↻ Erneut schätzen“ (umrandet) und `result-accept` „Ergebnis übernehmen …“ (gefüllt); beide sind gesperrt während `round.confirming`, bis zur Antwort auf „Erneut schätzen“ und solange der Dialog offen ist. `round-restart` sendet `POST …/round/restart`. Entwickler und Zuschauer sehen `result-waiting` „Der Scrum Master lässt erneut schätzen oder übernimmt das Ergebnis.“. | vitest: `frontend-react/src/session/round-footer.spec.tsx`; e2e: `frontend/e2e/result-round.spec.ts`, `frontend/e2e/viewer.spec.ts`, `frontend/e2e/layout.spec.ts` |
| A7 | `result-accept` öffnet `confirm-dialog` (Komponente `Dialog` des UI SDK) mit dem Titel „Ergebnis übernehmen“ und `confirm-lead`: „Endwert für #iid Titel.“ (`confirm-issue`) und „Konsens: 5 ist vorausgewählt.“ oder „Kein Konsens, deshalb ist nichts vorausgewählt.“. Die Gruppe „Endwert“ (`radiogroup`) hat elf Optionen `confirm-card` mit der Rolle `radio` und dem Namen der Karte („5“, „Unklar“, „Kaffeepause“); `confirm-card-votes` zeigt „n×“ mit der Beschreibung „1 Stimme“, „n Stimmen“ oder „n Stimmen, häufigster Wert“. Ohne Konsens sind die häufigsten Werte markiert und `confirm-legend` erklärt die Markierung. Die Pfeiltasten wechseln die Wahl. | vitest: `frontend-react/src/session/confirm-result-dialog.spec.tsx`; e2e: `frontend/e2e/result-round.spec.ts`, `frontend/e2e/consensus.spec.ts` |
| A8 | `confirm-note` nennt „Ins GitLab-Issue #iid wird ein Kommentar mit dem Endwert geschrieben.“ und je nach `writeWeight` „Zahlenwerte werden zusätzlich als Gewicht gesetzt.“ oder „Das Gewicht des Issues bleibt unverändert.“. `confirm-submit` „Übernehmen“ ist ohne Wahl gesperrt. Der Klick sendet `POST …/round/confirm` mit der Karte; bis zur Antwort steht `confirm-writing` (`role="status"`, unbestimmter Fortschritt) „Das Ergebnis wird nach GitLab geschrieben …“ da, der Button heißt „Wird übernommen …“, Optionen, `confirm-cancel` und Escape sind gesperrt. | vitest: `frontend-react/src/session/confirm-result-dialog.spec.tsx` |
| A9 | Antwortet die Anfrage mit `GITLAB_ACCESS_DENIED` oder `GITLAB_ERROR`, bleibt der Dialog offen mit `confirm-error` (`role="alert"`): Text des Fehlers in `confirm-error-message` und „Der Kommentar wurde nicht geschrieben. Prüfe das Token und versuche es erneut.“; das Banner bleibt leer, die Wahl bleibt, der Button heißt „Erneut versuchen“. | vitest: `frontend-react/src/session/confirm-result-dialog.spec.tsx`; e2e: `frontend/e2e/result-round.spec.ts` (GitLab-Fehler) |
| A10 | Nach Erfolg schließt der Dialog, und `confirm-success` (Komponente `Toast` des UI SDK) zeigt 5 s lang „✓ Endwert 8 in GitLab-Issue #42 gespeichert.“ mit dem Link `confirm-success-open` „Öffnen“ (neuer Tab, `rel="noopener"`, nur mit Adresse mit `http:` oder `https:`). Nur der Scrum Master sieht die Meldung. | vitest: `frontend-react/src/session/confirm-result-dialog.spec.tsx`, `frontend-react/src/session/session-page.spec.tsx`; e2e: `frontend/e2e/result-round.spec.ts`, `frontend/e2e/full-flow.spec.ts` |
| A11 | Mit Einträgen im Protokoll steht `history-panel` am Ende der Seitenleiste (Komponente `Collapsible` des UI SDK), zu Beginn geschlossen: `history-toggle` mit der Überschrift „Sitzungsprotokoll“ und `history-count` „1 aufgelöste Runde“ oder „n aufgelöste Runden“. Geöffnet zeigt es je Eintrag `history-entry` mit `history-issue` „#iid Titel“, `history-round` „Runde n“, `history-vote` je Schätzung (Name und Karte), `history-average`, `history-most-frequent` und `history-final-card` „Endwert 8“ oder `history-no-final-card` „ohne Endwert“. | vitest: `frontend-react/src/session/session-history.spec.tsx`, `frontend-react/src/session/session-page.spec.tsx`; e2e: `frontend/e2e/result-round.spec.ts`, `frontend/e2e/full-flow.spec.ts` |
| A12 | Alle Tests in `frontend/e2e/` außer „the page links the favicon in three formats and serves them“ tragen `@react` und sind in beiden Läufen von `make e2e` grün. Die Erwartungen bleiben gleich; geändert sind nur das Tag und die Selektoren aus den Entscheidungen. | e2e: `BACKEND_PORT=… FRONTEND_PORT=… make e2e` |
| A13 | Ergebnis, Footer, Dialog, Meldung und Protokoll sehen im Browser aus wie im Angular-Frontend, hell und dunkel, bei 1440 × 900 und 375 × 800. | Bildschirm: Raum als Scrum Master und Entwickler neben dem Angular-Frontend, mit Konsens und mit Ausreißern |

## Contracts

keine Änderung. Genutzt: `POST /api/sessions/{id}/round/restart`, `POST …/round/confirm`, der
Snapshot `SessionView`.

## Risiko

Stufe: high
Begründung: `harness/scripts/risk-level.sh` nennt für die Dateiliste medium (Quelltext unter
`frontend-react/src/`, `frontend/src/app/session/round-result.html`, `project-rules/**`). Der
Text des Dialogs enthält das Wort „Token“; die Schlüsselwort-Regel hebt die Stufe damit auf high.
Die Spec ist deshalb mit high freigegeben.
Gates: G2, das Label `human-approved` nach dem letzten Push; G3, der Status `verified`; Code-,
Sicherheits- und Architektur-Review.
ADR nötig: nein, kein neues: keine neue Abhängigkeit, kein Vertrag, keine Abweichung von einer
Regel. Die Änderung folgt ADR 0004 (Zustand nur aus dem Snapshot; das Protokoll und der Endwert
kommen aus dem Snapshot) und ADR 0016.

## Umsetzung

Entscheidungen:

- Keine neue Abhängigkeit. Bedienelemente aus dem UI SDK, lokal in `session/`: `Dialog`
  (Bestätigen), `RadioGroup` (Endwert), `Progress` ohne Wert (Schreiben), `Toast` (Meldung),
  `Collapsible` (Protokoll).
- Die `ToastRegion` steht in `session-page.tsx`, nicht in der Shell: nur der Raum zeigt eine
  Meldung (A1.3), und die Shell bleibt unverändert. Die Roadmap nannte dafür `shell/`.
- Der Durchschnitt wird mit `Intl.NumberFormat('de')` auf eine Nachkommastelle formatiert.
- Selektoren der Suite: `.piece` in `confetti.spec.ts` wird zu `span` in `consensus-confetti`;
  `.facts button, .distribution button` in `result-round.spec.ts` wird zu `button` in
  `result-facts` und `result-distribution` (zwei neue `data-testid`, auch im Angular-Frontend);
  `app-session-page .room` in `design-sidebar.spec.ts` wird zu `room`.
- `RoundResult` enthält den aufgedeckten Tisch; `session-page.tsx` zeigt ihn nicht mehr selbst.

Dateien:

- `frontend-react/src/session/round-result.tsx`: neu
- `frontend-react/src/session/round-result.module.css`: neu
- `frontend-react/src/session/round-result.spec.tsx`: neu
- `frontend-react/src/session/round-stats.ts`: neu
- `frontend-react/src/session/round-stats.spec.ts`: neu
- `frontend-react/src/session/consensus.ts`: neu
- `frontend-react/src/session/consensus.spec.ts`: neu
- `frontend-react/src/session/confetti.tsx`: neu
- `frontend-react/src/session/confetti.module.css`: neu
- `frontend-react/src/session/confetti.spec.tsx`: neu
- `frontend-react/src/session/confirm-result-dialog.tsx`: neu
- `frontend-react/src/session/confirm-result-dialog.module.css`: neu
- `frontend-react/src/session/confirm-result-dialog.spec.tsx`: neu
- `frontend-react/src/session/confirm-success.tsx`: neu, Meldung und Toaster
- `frontend-react/src/session/confirm-success.module.css`: neu
- `frontend-react/src/session/session-history.tsx`: neu
- `frontend-react/src/session/session-history.module.css`: neu
- `frontend-react/src/session/session-history.spec.tsx`: neu
- `frontend-react/src/session/round-footer.tsx`: ändern, Teil `REVEALED`
- `frontend-react/src/session/round-footer.module.css`: ändern
- `frontend-react/src/session/round-footer.spec.tsx`: ändern
- `frontend-react/src/session/session-page.tsx`: ändern, Ergebnis, Protokoll, Region der Meldung
- `frontend-react/src/session/session-page.module.css`: ändern
- `frontend-react/src/session/session-page.spec.tsx`: ändern
- `frontend-react/src/session/messages.ts`: ändern, Schlüssel `roundResult.*`, `roundStats.*`, `confirmResult.*`, `history.*`
- `frontend-react/src/session/testing/session-snapshots.tsx`: ändern, Snapshots mit Schätzungen, Kennzahlen, Protokoll
- `frontend/src/app/session/round-result.html`: ändern, zwei `data-testid`
- `frontend/e2e/confetti.spec.ts`: ändern, Tags und Selektor
- `frontend/e2e/consensus.spec.ts`: ändern, Tags
- `frontend/e2e/design-sidebar.spec.ts`: ändern, Tags und Selektor
- `frontend/e2e/outliers.spec.ts`: ändern, Tag
- `frontend/e2e/result-round.spec.ts`: ändern, Tags und Selektor
- `frontend/e2e/round-timer.spec.ts`: ändern, Tag
- `frontend/e2e/symbols.spec.ts`: ändern, Tag
- `frontend/e2e/viewer.spec.ts`: ändern, Tag
- `frontend/e2e/full-flow.spec.ts`: ändern, Tag
- `frontend/e2e/layout.spec.ts`: ändern, Tags
- `project-rules/frontend-react-session.md`: ändern
- `project-rules/frontend.md`: ändern, zwei `data-testid`
- `project-rules/testing.md`: ändern, Tests ohne Tag
- `docs/roadmap.md`: ändern, Stand
- `docs/specs/0061-react-raum-teil-4.md`: neu

Schritte:

1. Lesen: die Vorlagen `frontend/src/app/session/round-result.*`, `round-stats.ts`,
   `consensus.ts`, `confetti.*`, `confirm-result-dialog.*`, `confirm-success.*`,
   `session-history.*`, `round-footer.*`, `project-rules/frontend.md` (Design Werkbank Teil B),
   `project-rules/frontend-react*.md` und in
   `frontend-react/node_modules/@ui-sdk/react/docs/components/` die Seiten `dialog.md`,
   `radio.md`, `toast.md`, `collapsible.md`, `progress.md`. Erfüllt eine Komponente ihr Kriterium
   nicht (Rolle `radio` mit Namen und Pfeiltasten, Sperren von Escape, Dauer und Inhalt der
   Meldung, `aria-expanded` am Umschalter), hält `/implement` an.
2. `consensus.ts`, `round-stats.ts`, `confetti.tsx` mit den Tests der Angular-Vorlagen.
3. `messages.ts`, `round-result.tsx`.
4. `confirm-success.tsx`, `confirm-result-dialog.tsx`, Teil `REVEALED` von `round-footer.tsx`.
5. `session-history.tsx`.
6. `session-page.tsx`: `RoundResult` um das aktive Issue in `REVEALED`, Footer in `REVEALED`,
   Protokoll in der Seitenleiste, Region der Meldung.
7. `data-testid` im Angular-Frontend, Selektoren und Tags in `frontend/e2e/`.
8. Regeldateien, `docs/roadmap.md`.
9. `make check`, `BACKEND_PORT=18080 FRONTEND_PORT=14200 make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `frontend-react/src/session/round-result.spec.tsx`: Leiste, Tisch, leer |
| A2 | `frontend-react/src/session/consensus.spec.ts`; `frontend-react/src/session/confetti.spec.tsx`; `frontend-react/src/session/round-result.spec.tsx`: Konsens |
| A3 | `frontend-react/src/session/round-result.spec.tsx`: Ausreißer, nicht geschätzt |
| A4 | `frontend-react/src/session/round-result.spec.tsx`: Verteilung, Kennzahlen; `frontend-react/src/session/round-stats.spec.ts` |
| A5 | `frontend-react/src/session/round-result.spec.tsx` |
| A6 | `frontend-react/src/session/round-footer.spec.tsx`: `REVEALED` je Rolle |
| A7 | `frontend-react/src/session/confirm-result-dialog.spec.tsx`: Aufbau, Vorwahl, Tastatur |
| A8 | `frontend-react/src/session/confirm-result-dialog.spec.tsx`: Senden |
| A9 | `frontend-react/src/session/confirm-result-dialog.spec.tsx`: Fehler |
| A10 | `frontend-react/src/session/confirm-result-dialog.spec.tsx`: Erfolg; `frontend-react/src/session/session-page.spec.tsx` |
| A11 | `frontend-react/src/session/session-history.spec.tsx`; `frontend-react/src/session/session-page.spec.tsx` |
| A12 | beide Läufe von `make e2e` |
| A13 | Browser: Raum neben dem Angular-Frontend |

Testdaten: Unit-Tests mit `createTestBackend`, den Beispiel-Snapshots und den Hilfen in
`frontend-react/src/session/testing/session-snapshots.tsx`; die Uhr ist die falsche Uhr von
vitest. Die Playwright-Tests legen ihre Sitzungen über die Startseite an und lesen die Notizen im
GitLab-Double.

## Offene Fragen

keine

## Verifikationsplan

- make check
- betroffene Tests: `pnpm -C frontend-react test`; beide Läufe von `make e2e`
- Browser: Raum des React-Frontends neben dem des Angular-Frontends als Scrum Master und
  Entwickler in `REVEALED` mit Konsens und mit Ausreißern, der Dialog ohne und mit Wahl, die
  Meldung, das geöffnete Protokoll, hell und dunkel, bei 1440 × 900 und 375 × 800 (A13)
