---
id: "0041"
title: Gesperrte Karten und Animation bei der Freigabe
status: Review
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-18
updated: 2026-11-18
pr: ""
note: freigegeben in der Session
---

# Gesperrte Karten und Animation bei der Freigabe

Rückmeldung der Person aus dem Test: Gesperrte Karten zeigen den Zeiger einer Hand, als wären sie
klickbar. Gewünscht sind der Cursor „gesperrt“, ein kurzes Wackeln als ablehnende Geste und eine
kleine Animation, wenn der Scrum Master die Schätzung startet. Bezug: Kartenleiste (0029, 0032,
0035), Diskussionsphase (ADR 0010).

## Ziel

Gesperrte Karten wirken gesperrt. Beim Start der Schätzung werden die Karten nacheinander von
links nach rechts farbig, sodass die Freigabe sichtbar wird.

## Scope

### Enthalten

- **Cursor:** Gesperrte Karten zeigen `cursor: not-allowed`. Heute gewinnt `button.card { cursor: pointer }` gegen `.locked`.
- **Wackeln:** Eine gesperrte Karte wackelt kurz nach links und rechts, beim Überfahren mit der Maus und beim Antippen oder Klicken. Gemeint ist eine Drehung um etwa ±4°, die abklingt, rund 400 ms, einmal je Auslösung. Unter `prefers-reduced-motion: reduce` wackelt nichts.
- **Freigabe-Animation:**
  - **Auslöser:** Wechselt die Phase, während die Kartenleiste sichtbar ist, von `DISCUSSION` nach `VOTING`, gehen die Karten nacheinander von links nach rechts vom gesperrten Aussehen in das offene, farbige über.
  - **Ablauf:** Jede Karte braucht etwa 250 ms, der Versatz je Karte beträgt etwa 60 ms. Bei elf Karten ist alles nach rund 0,9 s fertig.
  - **Bedienbarkeit:** Die Karten sind sofort wählbar, die Animation sperrt nichts.
  - **Ohne Animation:** Beim Laden einer Seite, die schon in `VOTING` ist, und bei „Erneut schätzen“ (direkt `REVEALED` → `VOTING`) gibt es keine Animation. Unter `prefers-reduced-motion: reduce` wechselt die Leiste sofort.
  - **Eine Instanz:** Damit der Wechsel erkannt wird, rendert der Footer in `DISCUSSION` und `VOTING` dieselbe Instanz von `app-card-deck` mit `[locked]`.
- **Doku:** keine Änderung an `project-rules`. Der Abschnitt „Motion and focus“ in `project-rules/frontend.md` deckt Bewegung und reduzierte Bewegung schon ab.

### Nicht enthalten

- Andere Animationen, etwa beim Aufdecken oder Konfetti.
- Ton oder Vibration.
- Animationen für den Scrum Master. Er hat keine Kartenleiste.

## Begriffe

keine neuen

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Eine Karte im Zustand `locked` hat den berechneten Cursor `not-allowed`, eine offene Karte `pointer`. | End-to-End `frontend/e2e/card-motion.spec.ts` (neu) |
| A2 | Mausbewegung über eine gesperrte Karte oder ein Klick darauf setzt die Klasse für das Wackeln, die nach dem Ende der Animation wieder entfernt wird. Eine Stimme wird dabei nicht gesendet. Unter reduzierter Bewegung wird die Klasse nicht gesetzt. | Unit `frontend/src/app/session/card.spec.ts` |
| A3 | Wechselt `locked` bei derselben Instanz der Leiste von `true` auf `false`, tragen die Karten die Klasse für die Freigabe mit dem Index als Versatz von 0 bis 10. Beim ersten Rendern mit `locked=false` fehlt sie, ebenso unter reduzierter Bewegung. Die Karten sind währenddessen wählbar. | Unit `frontend/src/app/session/card-deck.spec.ts` |
| A4 | Der Footer nutzt in `DISCUSSION` und `VOTING` dieselbe Instanz der Leiste. | Unit `frontend/src/app/session/round-footer.spec.ts` |
| A5 | Im Browser: Der Entwickler sieht die gesperrte Leiste, der Scrum Master startet die Schätzung. Die erste Karte trägt die Klasse für die Freigabe mit Versatz 0, die letzte mit Versatz 10, und nach etwa einer Sekunde sind alle offen. Mit `reducedMotion: 'reduce'` tritt die Klasse nicht auf. | End-to-End `frontend/e2e/card-motion.spec.ts` |
| A6 | Im Browser hell und dunkel: Wackeln und Freigabe wirken ruhig und flackern nicht. | `/verify`, Browser, kurze Aufnahme oder Screenshots |
| A7 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh` meldet medium für Code unter `frontend/src/app/`.
Kein Backend, kein Vertrag, keine neue Abhängigkeit.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`. `verified` ist nicht
erforderlich, `implement` führt `verify` trotzdem aus. Reviews: Code, Sicherheit.
ADR nötig: nein, weil sich nur die Darstellung der Kartenleiste ändert, ohne neue Abhängigkeit,
ohne Vertrag und ohne Abweichung von einer Regel aus `harness/architecture.md` oder
`harness/testing.md`.

## Umsetzung

Entscheidungen:

- CSS-Animationen mit `@keyframes` und `animation-delay` je Index, keine Bibliothek. Die reduzierte Bewegung prüft `reduced-motion.ts`.

Dateien:

- `frontend/src/app/session/card.ts`: ändern, Wackeln auslösen und zurücksetzen
- `frontend/src/app/session/card.html`: ändern, Klasse und `animationend`
- `frontend/src/app/session/card.scss`: ändern, Cursor, Keyframes für Wackeln und Freigabe
- `frontend/src/app/session/card.spec.ts`: ändern, A2
- `frontend/src/app/session/card-deck.ts`: ändern, Wechsel von `locked` erkennen
- `frontend/src/app/session/card-deck.html`: ändern, Index als Versatz
- `frontend/src/app/session/card-deck.scss`: ändern, falls nötig
- `frontend/src/app/session/card-deck.spec.ts`: ändern, A3
- `frontend/src/app/session/round-footer.html`: ändern, eine Instanz mit `[locked]`
- `frontend/src/app/session/round-footer.spec.ts`: ändern, A4
- `frontend/e2e/card-motion.spec.ts`: neu, A1 und A5

Schritte:

1. Cursor und Wackeln an der Karte.
2. Eine Instanz der Leiste im Footer, Erkennen des Wechsels, Freigabe-Animation.
3. Tests, `make check`, `make e2e`, Screenshots oder eine kurze Aufnahme.

Tests:

| Kriterium | Test |
|---|---|
| A1, A5 | `card-motion.spec.ts` |
| A2 | `card.spec.ts` |
| A3 | `card-deck.spec.ts` |
| A4 | `round-footer.spec.ts` |
| A6 | `/verify`, Browser |
| A7 | `make check`, `make e2e` |

Testdaten: GitLab-Double wie bisher, Scrum Master und Entwickler in zwei Kontexten.

Contracts zu regenerieren: keine.

## Offene Fragen

- [x] Wie soll die Freigabe aussehen? → Die Karten werden von links nach rechts nacheinander farbig. (Morten Möller, 2026-11-18)
- [x] Wie reagieren gesperrte Karten? → Cursor „gesperrt“ und ein kurzes Wackeln nach links und rechts als ablehnende Geste. (Morten Möller, 2026-11-18)

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/session/card.spec.ts`, `card-deck.spec.ts`, `round-footer.spec.ts`, `make e2e` (`card-motion.spec.ts`, `voting-round.spec.ts`)
- Browser: Entwickler in der Diskussion (Maus über gesperrte Karte), Start der Schätzung, hell und dunkel, mit und ohne reduzierte Bewegung
