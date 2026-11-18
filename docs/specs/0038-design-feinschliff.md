---
id: "0038"
title: Design-Feinschliff aus dem Test
status: done
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-18
updated: 2026-11-18
pr: "#39"
note: alle Kriterien erfüllt
---

# Design-Feinschliff aus dem Test

Rückmeldungen der Person nach dem Durchgang durch 0035 bis 0037, mit Screenshots. Bezug: Design
Werkbank (0027 bis 0031), Footer (0035), Umschalter (0037).

## Ziel

Elf kleine Korrekturen an Abständen, Symbolen, der Seitenleiste und der Wartegrafik, damit der
Sitzungsraum ruhiger und sauberer wirkt.

## Scope

### Enthalten

1. **Symbole größer:** „↻“ in „↻ Erneut schätzen“ und „↗“ in „In GitLab öffnen ↗“ (aktives Issue und „Zuletzt geschätzt“) stehen in einem eigenen `span` mit `aria-hidden`, Größe etwa 1.25em, vertikal mittig zum Text.
2. **Sitzungsprotokoll:** Kopf und Inhalt des Panels haben denselben Innenabstand (16 px links und rechts), der Titel berührt den Rand des Panels nicht.
3. **Kein Springen durch die Scrollleiste:** Seitenleiste und Hauptbereich reservieren den Platz der Scrollleiste (`scrollbar-gutter: stable`), die Breite des Inhalts ändert sich nicht, wenn eine Scrollleiste erscheint.
4. **Teilnehmerliste:** Der Eintrag ohne Kartensymbol (Scrum Master) reserviert keine leere Spalte; Abstand links und rechts sind gleich.
5. **Umschalter in der Toolbar:** Das Emoji steht vertikal mittig im runden Knopf, der Abstand zum rechten Rand ist so groß wie der linke Innenabstand der Toolbar.
6. **Eine gemeinsame Grafik „Kartenhand“** (neue Komponente `app-card-hand`): die fünf Motive (Raster, Punkte, Zeilen, Ringe, Stufen) in ihren Farben als Hand, unten eng überlappend, nach oben aufgefächert (Drehung etwa −20° bis +20°, gemeinsamer Drehpunkt unter der Hand). Sie folgt dem hellen und dunklen Design. Verwendet im Wartebereich der Lobby (statt der drei gestapelten Karten) und auf der Beitrittsseite (statt der Reihe der Kartenrücken), dort größer und mittig. Testid `card-hand`, die Testid `join-card-backs` entfällt.
7. **Seitenleiste 340 px** ab 720 px statt 320 px.
8. **Beschreibung wieder einklappen:** Nach „▾ Ganze Beschreibung anzeigen“ steht unter der Beschreibung „▴ Beschreibung einklappen“ (Testid `active-issue-collapse`, `aria-expanded="true"`), der Klick klappt wieder ein. Nur wenn das Einklappen in der Phase greift (aufgedeckt oder schmal).
9. **Überschrift „Sitzung“ entfernen:** Die sichtbare `h1` entfällt, der Hauptbereich beginnt direkt mit dem Inhalt. Für Screenreader bleibt eine `h1` „Sitzung“ mit Klasse `visually-hidden`.
10. **Doku:** `project-rules/frontend.md` (340 px, Kartenhand, Scrollleisten-Platz, Testids), `project-rules/testing.md`.

### Nicht enthalten

- Neue Farben, neue Motive, Änderungen an Karten im Fächer oder am Tisch.
- Änderungen an Backend oder Vertrag.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Kartenhand | Grafik aus den fünf Motivkarten, unten überlappend, oben aufgefächert; nur UI, kein Glossarbegriff |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Die Symbole ↻ und ↗ stehen in eigenen `span` mit `aria-hidden` und sind größer als der Text daneben. | Unit `frontend/src/app/session/round-footer.spec.ts`, `active-issue.spec.ts`, `last-result.spec.ts` |
| A2 | `app-card-hand` zeigt fünf Karten mit den Motiven in fester Reihenfolge, mit Drehung je Karte; Lobby und Beitrittsseite verwenden sie. | Unit `frontend/src/app/api/card-hand.spec.ts`, `frontend/src/app/session/session-page.spec.ts`, `frontend/src/app/join/join-page.spec.ts` |
| A3 | Nach „Ganze Beschreibung anzeigen“ klappt „Beschreibung einklappen“ wieder ein; der Knopf fehlt, solange nicht eingeklappt werden kann. | Unit `frontend/src/app/session/active-issue.spec.ts` |
| A4 | Die Sitzungsseite hat keine sichtbare `h1`, aber eine `h1` „Sitzung“ im Accessibility-Baum. | Unit `frontend/src/app/session/session-page.spec.ts` |
| A5 | Bei 1440 px ist die Seitenleiste 340 px breit. Die Breite des Hauptinhalts bleibt gleich, wenn die Beschreibung lang wird und eine Scrollleiste erscheint. | End-to-End `frontend/e2e/layout.spec.ts` (Fall 320 px wird 340 px, neuer Fall Scrollleiste) |
| A6 | Auf der Beitrittsseite ist die Kartenhand mittig und größer als im Wartebereich; die Farbprüfung der Kartenrücken aus `design-sidebar.spec.ts` läuft gegen `card-hand`. | End-to-End `frontend/e2e/design-sidebar.spec.ts` |
| A7 | Im Browser hell und dunkel, bei 1440 und 375 px: Symbole, Protokoll-Kopf, Teilnehmerliste, Umschalter, Kartenhand in Lobby und Beitritt, keine Überschrift „Sitzung“. | `/verify`, Browser, Screenshots |
| A8 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh` meldet medium für Code unter `frontend/src/` und für
`project-rules/**`. Kein Backend, kein Vertrag, keine neue Abhängigkeit.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`. `verified` ist nicht
erforderlich, `implement` führt `verify` trotzdem aus. Reviews: Code, Sicherheit.
ADR nötig: nein, weil sich nur die Darstellung im Frontend ändert, ohne neue Abhängigkeit, ohne
Vertrag und ohne Abweichung von einer Regel aus `harness/architecture.md` oder
`harness/testing.md`.

## Umsetzung

Entscheidungen:

- Neue Komponente `app-card-hand` in `frontend/src/app/api/`, weil zwei Features (`session`, `join`) sie nutzen und `project-rules/frontend.md` geteilten Code dort ablegt (A1.3); Motive aus `frontend/src/styles/_motifs.scss`.

Dateien:

- `frontend/src/app/api/card-hand.ts`: neu
- `frontend/src/app/api/card-hand.html`: neu
- `frontend/src/app/api/card-hand.scss`: neu
- `frontend/src/app/api/card-hand.spec.ts`: neu, A2
- `frontend/src/app/session/session-page.html`: ändern, Kartenhand, `h1` versteckt
- `frontend/src/app/session/session-page.scss`: ändern, 340 px, `scrollbar-gutter`, Stapel entfernen
- `frontend/src/app/session/session-page.ts`: ändern, Import `CardHand`
- `frontend/src/app/session/session-page.spec.ts`: ändern, A2 und A4
- `frontend/src/app/join/join-page.html`: ändern, Kartenhand
- `frontend/src/app/join/join-page.scss`: ändern, Kartenrücken entfernen, Kartenhand groß und mittig
- `frontend/src/app/join/join-page.ts`: ändern, Import `CardHand`
- `frontend/src/app/join/join-page.spec.ts`: ändern, A2
- `frontend/src/app/session/round-footer.html`: ändern, Symbol ↻
- `frontend/src/app/session/round-footer.scss`: ändern, Symbolgröße
- `frontend/src/app/session/round-footer.spec.ts`: ändern, A1
- `frontend/src/app/session/active-issue.html`: ändern, Symbol ↗, Einklappen
- `frontend/src/app/session/active-issue.ts`: ändern, `collapse()`
- `frontend/src/app/session/active-issue.scss`: ändern, Symbolgröße, Knopf
- `frontend/src/app/session/active-issue.spec.ts`: ändern, A1 und A3
- `frontend/src/app/session/last-result.html`: ändern, Symbol ↗
- `frontend/src/app/session/last-result.scss`: ändern, Symbolgröße
- `frontend/src/app/session/last-result.spec.ts`: ändern, A1
- `frontend/src/app/session/session-history.scss`: ändern, Innenabstand
- `frontend/src/app/session/participant-list.html`: ändern, keine leere Spalte ohne Kartensymbol
- `frontend/src/app/session/participant-list.scss`: ändern, Abstände
- `frontend/src/app/shell/app-shell.scss`: ändern, Umschalter
- `frontend/e2e/layout.spec.ts`: ändern, A5
- `frontend/e2e/design-sidebar.spec.ts`: ändern, A6
- `project-rules/frontend.md`: ändern
- `project-rules/testing.md`: ändern

Schritte:

1. `app-card-hand` mit den fünf Motiven, in Lobby und Beitrittsseite einsetzen.
2. Seitenleiste 340 px, `scrollbar-gutter`, `h1` versteckt.
3. Symbole, Einklappen, Protokoll, Teilnehmerliste, Umschalter.
4. Tests, `project-rules`, `make check`, `make e2e`, Screenshots hell und dunkel bei 1440 und 375 px.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `round-footer.spec.ts`, `active-issue.spec.ts`, `last-result.spec.ts` |
| A2 | `card-hand.spec.ts`, `session-page.spec.ts`, `join-page.spec.ts` |
| A3 | `active-issue.spec.ts` |
| A4 | `session-page.spec.ts` |
| A5 | `layout.spec.ts` |
| A6 | `design-sidebar.spec.ts` |
| A7 | `/verify`, Browser |
| A8 | `make check`, `make e2e` |

Testdaten: GitLab-Double wie bisher, Issue 45 mit langer Beschreibung aus 0035.

Contracts zu regenerieren: keine.

## Offene Fragen

- [x] Wie soll die Wartegrafik aussehen? → Die fünf Motivkarten als Hand, unten überlappend, nach oben aufgefächert; dieselbe Grafik in der Lobby und auf der Beitrittsseite, dort größer und mittig. (Morten Möller, 2026-11-18)
- [x] Breite der Seitenleiste? → 340 px ab 720 px. (Morten Möller, 2026-11-18)

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/api/`, `frontend/src/app/session/*.spec.ts`, `frontend/src/app/join/`, `make e2e` (`layout.spec.ts`, `design-sidebar.spec.ts`)
- Browser: Sitzungsraum beider Rollen in allen Phasen, Beitrittsseite, hell und dunkel, 1440 und 375 px
