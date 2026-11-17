---
id: "0029"
title: Design Werkbank, Teil C, Tisch und Karten
status: Review
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-17
updated: 2026-11-17
pr: ""
note: freigegeben in der Session
---

# Design Werkbank, Teil C, Tisch und Karten

Teil des Design-Reworks „Werkbank“ nach `docs/design/` (aus Spec 0027, Teil A). Es gilt die Benennung aus 0026 („Diskussion“, „Schätzung starten“), und der Server löst bei Ablauf des Timers weiter automatisch auf (O-01). Die Teile B, C und D ändern getrennte Dateien und laufen nach Teil A parallel. Grundlage ist `docs/design/Raum.dc.html` (Phasenleiste, Tisch, Kartenfächer, aufgedeckte
Ansicht) und `docs/design/Design-System.dc.html` (Abschnitte 6, 7, 10 und 11). Die Spec hängt
ab von 0027. Die Motiv-Variablen `--app-card-*` setzt Teil B, Teil C nutzt sie mit Rückfallwert
`--mat-sys-primary`.

## Ziel

Die Karten sind das ausdrucksstarke Element des Raums. Ein Kartenfächer mit den Zuständen offen,
gewählt, gesperrt und aufgedeckt, ein Tisch mit einem Platz je Entwickler, eine Phasenleiste mit
Rundennummer, Fortschritt und Timer, und eine aufgedeckte Ansicht mit Verteilung, Ausreißern,
Konsens und „Nicht geschätzt“, alles nach dem Design.

## Scope

### Enthalten

- **Karte** (neue Komponente `app-card`, Abschnitt 6):
  - Maße 84 × 124 px, Radius 10 px, 6-px-Motivband und Wert in Plex Mono 38/600.
  - Zustände: offen, Hover, Fokus, gewählt (volle Motivfarbe, „✓ GEWÄHLT“, 12 px angehoben), verdeckt (Muster ohne Wert), gesperrt (gestrichelt, `aria-disabled`), ausstehend (gestrichelter Rahmen), aufgedeckt, Ausreißer (Rahmen in Warnfarbe und Etikett „Ausreißer“).
  - `aria-label` „Karte 5“, „Karte Unklar“ und „Karte Kaffeepause“.
- **Bildkarten:** ☕ und ? als SVG aus `frontend/public/coffee-break.svg` und `question-mark.svg` (die Fassungen aus `docs/design/assets/`). Sie werden inline gerendert, `aria-hidden`, ohne `<metadata>`, und gefärbt über `--poker-body`, `--poker-shade`, `--poker-soft` und `--poker-ink`.
- **Kartenfächer** des Entwicklers (`card-deck`):
  - `role="group"` mit dem Label „Deine Karte“. Pfeiltasten wechseln den Fokus, Leertaste und Enter wählen.
  - In `DISCUSSION` ist der Fächer gesperrt und sichtbar, mit „Deine Karte · gesperrt“ und dem Hinweis aus 0026.
  - In `VOTING` steht darunter „Du kannst sie ändern, bis aufgelöst wird.“
  - Mobil gibt es ein Raster mit 6 Spalten und mindestens 44 px Trefferfläche.
- **Phasenleiste** (`round-status`):
  - „Runde 2“ und „Kartensatz: Ringe“.
  - Zähler „3 von 5 haben geschätzt“ mit Fortschrittsbalken.
  - Timer-Chip „◷ Noch 0:42“, in den letzten 10 s mit Rahmen und ohne Animation, „⏱ Zeit abgelaufen“ und „◷ 1:00 · startet mit der Schätzung“ in `DISCUSSION`.
  - Der Timer ist `role="timer"`. Vorgelesen wird er über einen getrennten `aria-live="polite"`-Text nur alle 15 s und in den letzten 10 s.
- **Tisch** (neue Komponente `seat-table`, „AM TISCH · VERDECKT“ in `VOTING` bzw. „AUFGEDECKT“ in `REVEALED`):
  - Ein Platz je Entwickler mit Name.
  - Verdeckte Karte mit Motiv und „✓ geschätzt“, oder „…“ und „ausstehend“ oder „getrennt“.
  - Nach der Auflösung die Karte mit Wert, Ausreißer markiert.
- **Hinweise für den Scrum Master:**
  - Box „Noch 2 Schätzungen ausstehend. Du kannst auch vorher auflösen.“
  - Bei allen: „✓ Alle verbundenen Entwickler haben geschätzt. Finn ist getrennt und wird nicht abgewartet.“ mit hervorgehobenem „Auflösen“.
  - In `DISCUSSION` „Das Team diskutiert das Issue.“ und „Die Karten sind gesperrt, bis du die Schätzung startest. Timer: 1 min.“ mit „Schätzung starten“.
- **Aufgedeckte Ansicht** (`round-result`):
  - „VERTEILUNG“ als Balken je Karte mit „2 Stimmen“.
  - „ZUR ORIENTIERUNG“ mit Durchschnitt und häufigstem Wert, dazu „Kein Vorschlag: Den Endwert legt das Team fest.“
  - Zähler „4 Schätzungen · Finn war getrennt“.
  - Ausreißer-Hinweis „↕ Ausreißer“ mit Text aus 0017.
  - Konsens-Hinweis in Erfolgsfläche mit Konfetti nach Design (46 Teile, 2,6 s, einmal je Runde, entfällt bei reduzierter Bewegung). Die Texte aus 0025 bleiben.
  - Für Entwickler: „Der Scrum Master startet eine neue Runde oder übernimmt das Ergebnis.“
  - „↻ Neue Runde“ und „Ergebnis übernehmen …“.
- **Bewegung** nach Abschnitt 11:
  - Wählen: 150 ms.
  - Aufdecken: Drehung 240 ms, versetzt um 40 ms.
  - Fortschritt: 200 ms.
  - Alles entfällt unter `prefers-reduced-motion: reduce`.

### Nicht enthalten

- Seitenleiste, Motiv-Berechnung und `data-motif` (Teil B).
- Bedienfeld, aktives Issue, Dialoge, Snackbar, Verbindungsbanner (Teil D).
- Änderung von Texten aus 0017, 0018, 0025 und 0026, außer den genannten Ergänzungen.

## Begriffe

keine neuen

## Akzeptanzkriterien

| Nr  | Kriterium                                                                                                                                                                                                                                                                                                                 | Prüfung                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A1  | `app-card` setzt je Zustand die passenden Attribute: gewählt mit `aria-pressed="true"` und „✓ GEWÄHLT“, gesperrt mit `aria-disabled="true"`, Ausreißer mit dem Text „Ausreißer“. `aria-label` ist „Karte 5“, „Karte Unklar“ bzw. „Karte Kaffeepause“. Die SVG-Glyphen sind `aria-hidden` und enthalten kein `<metadata>`. | Unit `frontend/src/app/session/card.spec.ts`                                                      |
| A2  | Im Kartenfächer bewegt Pfeil rechts den Fokus zur nächsten Karte, und Enter wählt sie. In `DISCUSSION` sendet kein Klick eine Stimme.                                                                                                                                                                                     | Unit `frontend/src/app/session/card-deck.spec.ts`                                                 |
| A3  | Die Phasenleiste zeigt „Runde 2“, den Zähler, den Fortschrittsbalken mit passendem `aria-valuenow` und die Timer-Zustände. Der Live-Text ändert sich nur alle 15 s und in den letzten 10 s.                                                                                                                               | Unit `frontend/src/app/session/round-status.spec.ts`, `round-timer.spec.ts`                       |
| A4  | Der Tisch zeigt je Entwickler den Platz mit „✓ geschätzt“, „ausstehend“ oder „getrennt“. In `VOTING` ist kein Kartenwert eines anderen Teilnehmers im DOM, nach der Auflösung sind es alle Werte.                                                                                                                         | Unit `frontend/src/app/session/seat-table.spec.ts`                                                |
| A5  | Die aufgedeckte Ansicht zeigt Verteilung, Orientierung, Ausreißer, Konsens und „Nicht geschätzt“. Unter reduzierter Bewegung ist kein Konfetti im DOM, und die Karten erscheinen ohne Drehung.                                                                                                                            | Unit `frontend/src/app/session/round-result.spec.ts`; End-to-End `frontend/e2e/consensus.spec.ts` |
| A6  | Im Browser: Ein Entwickler wählt per Tastatur eine Karte, der Tisch des Scrum Masters zeigt „✓ geschätzt“ ohne Wert. Nach der Auflösung sehen beide die Karten am Tisch.                                                                                                                                                  | End-to-End `frontend/e2e/voting-round.spec.ts` (neuer Fall)                                       |
| A7  | Bei 375 px hat der Fächer 6 Spalten, jede Karte ist mindestens 44 px hoch und breit, und es gibt keinen horizontalen Scrollbalken.                                                                                                                                                                                        | End-to-End `frontend/e2e/voting-round.spec.ts` (neuer Fall)                                       |
| A8  | `make check` und `make e2e` sind grün, alle bestehenden `data-testid` von `card-deck`, `round-status` und `round-result` bleiben.                                                                                                                                                                                         | Aufruf `make check`, `make e2e`                                                                   |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: `frontend/src/app/` ist Anwendungscode, Tests sind low.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`; `verify` läuft auch bei
medium. Reviews: Code und Sicherheit (inline gerendertes SVG).
ADR nötig: nein. Es gibt keine neue Abhängigkeit, die Animationen sind reines CSS, und der Vertrag ändert sich nicht.

## Umsetzung

Entscheidungen:

- Neue Frontend-Komponenten `app-card` und `seat-table`. Die SVGs liegen als statische Dateien in `frontend/public/` und werden zur Laufzeit geladen und bereinigt. Es gibt keine neuen Abhängigkeiten.

Dateien:

- `frontend/public/coffee-break.svg`: neu
- `frontend/public/question-mark.svg`: neu
- `frontend/src/app/session/card-glyphs.ts`: neu, Laden und Bereinigen der SVGs
- `frontend/src/app/session/card.ts`: neu
- `frontend/src/app/session/card.html`: neu
- `frontend/src/app/session/card.scss`: neu
- `frontend/src/app/session/card.spec.ts`: neu, A1
- `frontend/src/app/session/seat-table.ts`: neu
- `frontend/src/app/session/seat-table.html`: neu
- `frontend/src/app/session/seat-table.scss`: neu
- `frontend/src/app/session/seat-table.spec.ts`: neu, A4
- `frontend/src/app/session/card-deck.ts`: ändern
- `frontend/src/app/session/card-deck.html`: ändern
- `frontend/src/app/session/card-deck.scss`: ändern
- `frontend/src/app/session/card-deck.spec.ts`: ändern, A2
- `frontend/src/app/session/round-status.ts`: ändern
- `frontend/src/app/session/round-status.html`: ändern
- `frontend/src/app/session/round-status.scss`: ändern
- `frontend/src/app/session/round-status.spec.ts`: ändern, A3
- `frontend/src/app/session/round-timer.ts`: ändern
- `frontend/src/app/session/round-timer.html`: ändern
- `frontend/src/app/session/round-timer.scss`: ändern
- `frontend/src/app/session/round-timer.spec.ts`: ändern, A3
- `frontend/src/app/session/round-result.ts`: ändern
- `frontend/src/app/session/round-result.html`: ändern
- `frontend/src/app/session/round-result.scss`: ändern
- `frontend/src/app/session/round-result.spec.ts`: ändern, A5
- `frontend/src/app/session/confetti.ts`: ändern
- `frontend/src/app/session/confetti.html`: ändern
- `frontend/src/app/session/confetti.scss`: ändern
- `frontend/src/app/session/cards.ts`: ändern, Label „Unklar“ für ?
- `frontend/e2e/voting-round.spec.ts`: ändern, A6 und A7 als neue Fälle
- `frontend/e2e/consensus.spec.ts`: ändern, A5
- `frontend/src/app/session/reduced-motion.ts`: neu, Abfrage von `prefers-reduced-motion` für Konfetti und Aufdecken
- `frontend/src/app/session/session-page.html`: ändern nach dem Merge von 0028, Timer-Chip in der Phasenleiste, Reihenfolge nach Design
- `frontend/src/app/session/session-page.ts`: ändern nach dem Merge von 0028, falls Imports sich ändern
- `frontend/src/app/session/session-page.scss`: ändern nach dem Merge von 0028, falls die Reihenfolge es braucht
- `frontend/src/app/session/motif-name.ts`: neu, Name des Motivs für „Kartensatz: <Name>“
- `project-rules/frontend.md`: ändern, gesperrter Fächer in `DISCUSSION`, Karte und Tisch (Teil C), Ausnahme für die Glyphen
- `frontend/e2e/result-round.spec.ts`: ändern, Erwartung an die Verteilung ohne „:“ über `result-count-card` und `result-count-votes` (Datei von 0030; ist dessen PR noch offen, löst der Zweite den Konflikt beim Merge)

Schritte:

1. SVGs nach `frontend/public/`. `card-glyphs.ts` lädt sie einmal, entfernt `<metadata>`, `role` und `aria-label` und setzt `aria-hidden`. Ins DOM kommen sie über `DomSanitizer.bypassSecurityTrustHtml` nur für diese beiden festen, eigenen Dateien. Eingaben von Nutzern gehen nie diesen Weg.
2. `app-card` mit allen Zuständen, dann Fächer mit Tastatursteuerung.
3. Phasenleiste und Timer mit Live-Text.
4. `seat-table` und aufgedeckte Ansicht mit Konfetti nach Design.
5. Tests, `make check`, `make e2e`. `project-rules/frontend.md` beschreibt die Karte schon über Teil B; ändert sich etwas daran, steht es im PR-Text als Hinweis für einen Nachtrag. Dazu Screenshots hell und dunkel aller Phasen im PR.

Tests:

| Kriterium | Test                                                          |
| --------- | ------------------------------------------------------------- |
| A1        | `card.spec.ts`                                                |
| A2        | `card-deck.spec.ts`                                           |
| A3        | `round-status.spec.ts`, `round-timer.spec.ts` mit Fake-Timern |
| A4        | `seat-table.spec.ts`                                          |
| A5        | `round-result.spec.ts`, `consensus.spec.ts`                   |
| A6        | `voting-round.spec.ts`                                        |
| A7        | `voting-round.spec.ts`                                        |
| A8        | `make check`, `make e2e`                                      |

Testdaten: Sitzung über die Startseite, Issue 42 des GitLab-Doubles.

Contracts zu regenerieren: keine.

## Offene Fragen

Beantwortet von Morten Möller am 2026-11-17:

1. **„Kartensatz: Ringe“:** Der Name des Motivs kommt aus `card-motif.ts` von Teil B (0028). Antwort: Auf Teil B warten. Nach dem Merge von 0028 wird origin/main nachgezogen, und der Name kommt aus `card-motif.ts`.
2. **Anordnung der Seite:** `session-page.html` gehört zu 0028. Antwort: Teil C ändert `session-page.html` selbst (Timer-Chip in der Phasenleiste, Reihenfolge nach Design), nach dem Merge von 0028 und damit ohne Konflikt. Die Datei steht in der Dateiliste.
3. **Versteckte Texte in der aufgedeckten Ansicht:** Antwort: „(Orientierung)“ bleibt als Text für Screenreader an Durchschnitt und Häufigste Werte. Das unsichtbare „:“ in der Verteilung entfällt; die Erwartung in `frontend/e2e/result-round.spec.ts` (Datei von 0030) wird an den neuen Text angepasst.

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/session/*.spec.ts`, `make e2e`
- Browser: Fächer, Tisch, Phasenleiste und aufgedeckte Ansicht in allen Phasen, beide Rollen, hell und dunkel, 375 px, Tastatur, reduzierte Bewegung
