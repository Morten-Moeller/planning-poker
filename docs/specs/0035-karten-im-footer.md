---
id: "0035"
title: Karten und Aktionen im festen Footer
status: done
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-18
updated: 2026-11-18
pr: "#35"
note: alle Kriterien erfüllt
---

# Karten und Aktionen im festen Footer

Rückmeldung der Person aus dem Test: Bei einer längeren Issue-Beschreibung rutschen die Karten
unter den sichtbaren Bereich, man muss scrollen, um zu schätzen. Bezug: Design Werkbank
(0027 bis 0031), Kartenleiste aus 0032 (A9).

## Ziel

Die Kartenleiste der Entwickler und die Rundenaktionen des Scrum Masters stehen in einem Footer,
der immer sichtbar ist. Nur der Inhalt darüber (Issue, Tisch, Ergebnis) scrollt.

## Scope

### Enthalten

- **Layout ab 720 px:** Der Sitzungsraum füllt die Höhe des Fensters unter der Toolbar (`100dvh` minus 56 px). Die Seitenleiste und der Hauptbereich scrollen je für sich. Unter dem Hauptbereich steht der Footer über die Breite der Hauptspalte, mit Trennlinie oben und Hintergrund `--mat-sys-surface`. Die Seite selbst scrollt nicht.
- **Layout unter 720 px:** Die Seite scrollt wie heute (Hauptbereich, darunter die Seitenleiste). Der Footer klebt mit `position: sticky; bottom: 0` am unteren Fensterrand.
- **Footer-Inhalt je Phase und Rolle** (neue Komponente `app-round-footer`):

  | Phase | Entwickler | Scrum Master |
  |---|---|---|
  | `LOBBY` | kein Footer | kein Footer |
  | `DISCUSSION` | Kartenleiste gesperrt mit Diskussionshinweis | Box „Das Team diskutiert das Issue.“ mit „Schätzung starten“ |
  | `VOTING` | Kartenleiste offen | Box mit Stand der Stimmen und „Auflösen“ |
  | `REVEALED` | Hinweis „Der Scrum Master lässt erneut schätzen oder übernimmt das Ergebnis.“ | „↻ Erneut schätzen“ und „Ergebnis übernehmen …“ |

  Diese Blöcke ziehen aus `round-status` und `round-result` in den Footer. Ihr Text, ihre Testids und ihr Verhalten bleiben gleich.
- **Kartenleiste unter 600 px:** eine Reihe mit allen elf Karten, kleiner als heute (etwa 48 × 70 px), seitlich wischbar mit `scroll-snap`. Die gewählte Karte und die Karte mit dem Tastaturfokus werden in den sichtbaren Bereich gescrollt. Ab 600 px bleibt die Leiste wie in 0032: höchstens 1000 px breit, zentriert, Hochformat.
- **Bedienung:** Die Pfeiltasten in der Kartenleiste funktionieren weiter. Der Footer liegt im DOM hinter dem Hauptbereich, damit die Tab-Reihenfolge Issue → Tisch → Karten bleibt.
- **Tests und Doku:** Ein Issue mit langer Beschreibung im GitLab-Double, Layout-E2E-Fälle, `project-rules/frontend.md` (Footer, Scrollbereiche), `project-rules/testing.md` (neue E2E-Fälle).

### Nicht enthalten

- Das Issue-Panel des Scrum Masters in `LOBBY` mit „Freigeben“. Es bleibt im Hauptbereich.
- Änderungen an Backend oder Vertrag.
- Ein Ein- und Ausklappen des Footers.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Footer | Fester Bereich unter dem Hauptbereich des Sitzungsraums mit Kartenleiste oder Rundenaktionen; neu, nur UI, kein Glossarbegriff |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `app-round-footer` zeigt je Phase und Rolle genau den Inhalt der Tabelle im Scope, in `LOBBY` nichts. | Unit `frontend/src/app/session/round-footer.spec.ts` |
| A2 | `round-status` und `round-result` zeigen die Kartenleiste und die Aktionsboxen nicht mehr. Die Testids `card-deck`, `card-deck-locked`, `discussion-hint`, `round-start`, `round-reveal`, `all-voted-hint`, `pending-hint`, `round-restart`, `result-accept`, `result-waiting` gibt es weiter, jetzt im Footer. | Unit `frontend/src/app/session/round-status.spec.ts`, `round-result.spec.ts`, `session-page.spec.ts` |
| A3 | Bei 1440 × 900 und einem Issue mit langer Beschreibung liegt der Footer in `DISCUSSION`, `VOTING` und `REVEALED` für beide Rollen ganz im Fenster. Der Hauptbereich scrollt, die Seite hat keine vertikale Scrollleiste, und die letzte Zeile der Beschreibung lässt sich in den sichtbaren Bereich scrollen. | End-to-End `frontend/e2e/layout.spec.ts` (neuer Fall) |
| A4 | Bei 375 × 667 mit langer Beschreibung liegt der Footer in `VOTING` am unteren Fensterrand. Die Kartenleiste ist eine Reihe, scrollt seitlich, die Seite hat keine horizontale Scrollleiste. Nach Auswahl der Karte 100 ist sie im sichtbaren Bereich. | End-to-End `frontend/e2e/layout.spec.ts` (neuer Fall); der Fall „no horizontal scroll bar at 375 px“ bleibt grün |
| A5 | Mit der Tastatur: Fokus in der Kartenleiste, Pfeil rechts bis zur letzten Karte, Enter wählt sie, sie ist sichtbar. | Unit `frontend/src/app/session/card-deck.spec.ts` |
| A6 | Im Browser hell und dunkel, bei 1440 und 375 px: Die Karten verschwinden mit langer Beschreibung nicht mehr, der Footer überdeckt keinen Inhalt. | `/verify`, Browser |
| A7 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh` meldet medium für Code unter `frontend/src/app/`,
für `project-rules/**` und für die neue GitLab-Double-Abbildung. Keine Datei unter `contracts/`,
kein Backend.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`. `verified` ist nicht
erforderlich (`verify_required_for: high`), `implement` führt `verify` trotzdem aus. Reviews:
Code, Sicherheit.
ADR nötig: nein, weil sich nur das Layout einer Seite ändert, ohne neue Abhängigkeit, ohne Vertrag
und ohne Abweichung von einer Regel aus `harness/architecture.md` oder `harness/testing.md`.

## Umsetzung

Entscheidungen:

- Neue Komponente `app-round-footer` im Bereich `session`. Die Aktionslogik (`startVoting`, `reveal`, `restart`, `openConfirm`) zieht mit aus `round-status` und `round-result` um.
- Ab 720 px eigene Scrollbereiche für Seitenleiste und Hauptbereich, unter 720 px Seiten-Scroll mit `position: sticky` für den Footer.
- Unter 600 px eine wischbare Kartenreihe statt zwei Reihen à 6 (ersetzt die mobile Regel aus 0032, A9).

Dateien:

- `frontend/src/app/session/round-footer.ts`: neu
- `frontend/src/app/session/round-footer.html`: neu
- `frontend/src/app/session/round-footer.scss`: neu
- `frontend/src/app/session/round-footer.spec.ts`: neu, A1
- `frontend/src/app/session/session-page.html`: ändern, Footer unter `.main`
- `frontend/src/app/session/session-page.scss`: ändern, Grid mit Footer-Zeile, Scrollbereiche, Sticky unter 720 px
- `frontend/src/app/session/session-page.ts`: ändern, Import `RoundFooter`
- `frontend/src/app/session/session-page.spec.ts`: ändern, A2
- `frontend/src/app/session/round-status.html`: ändern, Box und gesperrte Leiste entfernen
- `frontend/src/app/session/round-status.ts`: ändern, Aktionslogik entfernen
- `frontend/src/app/session/round-status.scss`: ändern, Box-Stile entfernen
- `frontend/src/app/session/round-status.spec.ts`: ändern, A2
- `frontend/src/app/session/round-result.html`: ändern, Aktionen und Wartehinweis entfernen
- `frontend/src/app/session/round-result.ts`: ändern, Aktionslogik entfernen
- `frontend/src/app/session/round-result.scss`: ändern, Aktions-Stile entfernen
- `frontend/src/app/session/round-result.spec.ts`: ändern, A2
- `frontend/src/app/session/card-deck.ts`: ändern, gewählte oder fokussierte Karte in den Blick scrollen
- `frontend/src/app/session/card-deck.scss`: ändern, eine Reihe mit `scroll-snap` unter 600 px
- `frontend/src/app/session/card-deck.spec.ts`: ändern, A5
- `frontend/src/app/session/card.scss`: ändern, kleine Karte unter 600 px
- `frontend/src/app/shell/app-shell.scss`: ändern, `.content.room` füllt die Höhe ohne Seiten-Scroll ab 720 px
- `frontend/e2e/gitlab-double/mappings/issue-45.json`: neu, Issue mit langer Beschreibung (etwa 60 Zeilen Markdown)
- `frontend/e2e/layout.spec.ts`: ändern, A3 und A4
- `project-rules/frontend.md`: ändern, Footer und Scrollbereiche
- `project-rules/testing.md`: ändern, neue E2E-Fälle

Schritte:

1. `app-round-footer` mit den Blöcken aus `round-status` und `round-result`, dort entfernen, Unit-Tests umziehen.
2. Grid des Sitzungsraums mit Footer-Zeile und Scrollbereichen, Shell-Höhe; unter 720 px Sticky.
3. Kartenleiste unter 600 px als wischbare Reihe, Scrollen in den Blick.
4. GitLab-Double-Issue 45, Layout-E2E-Fälle; bestehende E2E-Fälle laufen über die gleichen Testids weiter.
5. `project-rules`, `make check`, `make e2e`, Screenshots hell und dunkel bei 1440 und 375 px.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `round-footer.spec.ts` |
| A2 | `round-status.spec.ts`, `round-result.spec.ts`, `session-page.spec.ts` |
| A3 | `layout.spec.ts`, Fall Footer bei 1440 × 900 |
| A4 | `layout.spec.ts`, Fall Footer bei 375 × 667 |
| A5 | `card-deck.spec.ts` |
| A6 | `/verify`, Browser |
| A7 | `make check`, `make e2e` |

Testdaten: GitLab-Double mit neuem Issue 45 (lange Beschreibung), Sitzung über die bestehenden
E2E-Helfer (`frontend/e2e/helpers.ts`) mit `issueIid: 45`.

Contracts zu regenerieren: keine.

## Offene Fragen

- [x] Was gehört außer den Karten in den Footer? → Auch die Rundenaktionen des Scrum Masters (Schätzung starten, Auflösen, Erneut schätzen, Ergebnis übernehmen). (Morten Möller, 2026-11-18)
- [x] Wie sieht der Footer auf dem Handy aus? → Eine Reihe kleinerer Karten, seitlich wischbar. (Morten Möller, 2026-11-18)

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/session/*.spec.ts`, `make e2e` (vor allem `layout.spec.ts`, `voting-round.spec.ts`, `result-round.spec.ts`, `full-flow.spec.ts`)
- Browser: Sitzungsraum mit langer Beschreibung in `DISCUSSION`, `VOTING`, `REVEALED`, beide Rollen, hell und dunkel, 1440 und 375 px
