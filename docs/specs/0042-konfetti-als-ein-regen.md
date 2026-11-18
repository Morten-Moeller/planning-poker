---
id: "0042"
title: Konfetti als ein durchgehender Regen
status: Review
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-18
updated: 2026-11-18
pr: ""
note: freigegeben in der Session
---

# Konfetti als ein durchgehender Regen

Rückmeldung der Person aus dem Test: Das Konfetti beim Konsens kommt in drei Blöcken statt als
ein langer Regen. Bezug: Konsens (0018), Design Teil C (0029).

Ursache in `frontend/src/app/session/confetti.scss`: Die Startverzögerung wiederholt sich alle
neun Teilchen (`($i % 9) * 0.09s`), alle Teilchen fallen gleich schnell und gleich weit (520 px).
Deshalb starten und landen Gruppen gemeinsam.

## Ziel

Das Konfetti fällt als ein gleichmäßiger Regen über die ganze Höhe des Ergebnisbereichs, ohne
sichtbare Wellen oder Blöcke.

## Scope

### Enthalten

- **Startverzögerungen:** Sie verteilen sich gleichmäßig und ohne Wiederholung über etwa 1,2 s, etwa nach dem goldenen Schnitt je Index. Kein Wert kommt doppelt vor.
- **Fallzeit:** Sie streut je Teilchen zwischen etwa 2,2 und 3,2 s.
- **Startpunkt:** Die Starthöhe streut leicht, zwischen etwa −40 und −120 px.
- **Fallweite:** Sie richtet sich nach der Höhe des Bereichs (`container-type: size` am Host, `100cqh`), nicht nach festen 520 px. Kein Teilchen verschwindet mitten im Bereich.
- **Gleich bleiben:** die Anzahl von 46 Teilchen, die Farben, `aria-hidden` und das Ausblenden unter `prefers-reduced-motion: reduce`.

### Nicht enthalten

- Neue Formen, Farben, mehr Teilchen oder eine Bibliothek.
- Änderungen daran, wann das Konfetti erscheint.

## Begriffe

keine neuen

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Die berechneten `animation-delay`-Werte der 46 Teilchen sind paarweise verschieden und liegen zwischen 0 und 1,3 s. Die `animation-duration` streut über mindestens 0,8 s. | End-to-End `frontend/e2e/confetti.spec.ts` (neu, liest `getComputedStyle` der Teilchen) |
| A2 | Der Host hat `container-type: size`, und die Fallweite der Keyframes nutzt `cqh`. | End-to-End `frontend/e2e/confetti.spec.ts` |
| A3 | Die bestehenden Fälle zum Konfetti bleiben grün: Es erscheint bei Konsens, ist `aria-hidden` und fehlt unter reduzierter Bewegung. | Unit `frontend/src/app/session/round-result.spec.ts`, End-to-End `frontend/e2e/consensus.spec.ts` |
| A4 | Im Browser hell und dunkel, bei 1440 und 375 px: ein durchgehender Regen ohne Blöcke. | `/verify`, Browser, Bildfolge |
| A5 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh` meldet medium für Code unter `frontend/src/app/`.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`. `verified` ist nicht
erforderlich, `implement` führt `verify` trotzdem aus. Reviews: Code, Sicherheit.
ADR nötig: nein, weil sich nur eine CSS-Animation ändert.

## Umsetzung

Entscheidungen: keine

Dateien:

- `frontend/src/app/session/confetti.scss`: ändern, Verzögerung, Dauer, Start, Fallweite
- `frontend/e2e/confetti.spec.ts`: neu, A1 und A2; Runde mit Konsens über die E2E-Helfer

Schritte:

1. `confetti.scss` umstellen.
2. E2E-Fall, `make check`, `make e2e`, Bildfolge hell und dunkel.

Tests:

| Kriterium | Test |
|---|---|
| A1, A2 | `confetti.spec.ts` |
| A3 | `round-result.spec.ts`, `consensus.spec.ts` |
| A4 | `/verify`, Browser |
| A5 | `make check`, `make e2e` |

Testdaten: GitLab-Double wie bisher, Runde mit Konsens wie in `consensus.spec.ts`. Läuft 0040 vorher ein, treten die Teilnehmer über den Einladungslink bei.

Contracts zu regenerieren: keine.

## Offene Fragen

- [x] Wie soll das Konfetti fallen? → Als ein langer, durchgehender Regen statt in drei Blöcken. (Morten Möller, 2026-11-18)

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/session/round-result.spec.ts`, `make e2e` (`confetti.spec.ts`, `consensus.spec.ts`)
- Browser: Konsens-Runde, hell und dunkel, 1440 und 375 px
