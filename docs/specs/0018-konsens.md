---
id: "0018"
title: Konsens (M14, O-03)
status: done
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-16
updated: 2026-11-16
pr: "#18"
note: alle Kriterien erfüllt
---

# Konsens (M14, O-03)

Optionales Feature O-03 aus Meilenstein M14 in `docs/umsetzungsplan.md`. R-IDs: keine, das
Feature ist optional, es baut auf R-16 bis R-18 (Auflösung und Auswertung) und R-20/R-21
(Übernahme) auf. A-IDs: A-02.

## Ziel

Haben nach der Auflösung alle abgegebenen Karten denselben Wert, sehen alle Teilnehmer eine
Bestätigung mit Konfetti. Der Scrum Master bekommt den Wert im Dialog „Ergebnis übernehmen“
vorausgewählt. Bei eingeschalteter reduzierter Bewegung zeigt die Oberfläche die Bestätigung ohne
Animation.

## Scope

### Enthalten

- Konsens liegt vor, wenn die Runde aufgedeckt ist, mindestens zwei Stimmen abgegeben sind und alle Stimmen dieselbe Zahlenkarte zeigen (`0` bis `34`). Haben alle `?` oder alle die Kaffeepause gewählt, ist das kein Konsens, weil kein Schätzwert entsteht. Entwickler ohne Stimme zählen nicht.
- Bestätigung in der aufgedeckten Ansicht für alle Rollen: Über den Stimmen steht „Konsens: Alle haben 5 gewählt.“ als `role="status"`.
- Konfetti: Eine reine CSS-Animation ohne Bibliothek in der neuen Komponente `Confetti` läuft einmal je aufgedeckter Runde und ist `aria-hidden`. Unter `prefers-reduced-motion: reduce` wird das Konfetti nicht dargestellt, die Bestätigung als Text bleibt.
- Vorschlag: Bei Konsens zeigt der Dialog „Ergebnis übernehmen“ den Konsenswert vorausgewählt. Der Scrum Master kann ihn ändern. Ohne Konsens bleibt der Dialog ohne Auswahl.
- Die Berechnung stützt sich nur auf `round.votes` des Snapshots, also ist sie bei allen Teilnehmern gleich.
- Glossar: „Ausreißer“ (aus 0017) und „Konsens“.

### Nicht enthalten

- Änderungen am Backend oder am Vertrag; der Konsens ist kein Feld im Snapshot.
- Automatisches Übernehmen ohne Bestätigung durch den Scrum Master.
- Konfetti oder Markierung im Sitzungsprotokoll.
- Weitere Hinweise aus den Reviews und die manuelle Prüfung von Kontrast und Screenreader (0019).

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Runde, Auflösung, Stimme, Karte, Ergebnisübernahme, Snapshot | wie im Glossar |
| Konsens | Aufgedeckte Runde mit mindestens zwei Stimmen, die alle dieselbe Zahlenkarte zeigen; neu, ins Glossar mit dieser Spec |
| Ausreißer | aus 0017; ins Glossar mit dieser Spec |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `consensusCard` liefert für `5, 5, 5` den Wert `5`. Für `5, 8`, für `5` allein, für `?, ?`, für `COFFEE, COFFEE` und ohne Stimmen liefert sie `null`. | Unit `frontend/src/app/session/consensus.spec.ts` |
| A2 | Die aufgedeckte Ansicht zeigt bei `5, 5` die Bestätigung „Konsens: Alle haben 5 gewählt.“ und das Konfetti, bei `5, 8` beides nicht. | Unit `frontend/src/app/session/round-result.spec.ts` |
| A3 | Bei Konsens auf `8` ist im Dialog „Ergebnis übernehmen“ `8` ausgewählt, und „Übernehmen“ ist aktiv. Ohne Konsens ist nichts ausgewählt. | Unit `frontend/src/app/session/confirm-result-dialog.spec.ts`, `round-result.spec.ts` |
| A4 | Im Browser stimmen zwei Entwickler beide `5`, und der Scrum Master löst auf. Alle drei Kontexte zeigen die Bestätigung und das Konfetti. Der Scrum Master öffnet „Ergebnis übernehmen“ und sieht `5` ausgewählt. | End-to-End `frontend/e2e/consensus.spec.ts` |
| A5 | Mit `reducedMotion: 'reduce'` (Playwright `emulateMedia`) ist die Bestätigung sichtbar, das Konfetti nicht. | End-to-End `frontend/e2e/consensus.spec.ts` |
| A6 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh` meldet medium für `frontend/src/app/session/`
(Anwendungscode) und für `project-rules/`. Tests und Dokumentation sind low.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`; `verify` läuft auch bei
medium. Reviews: Code und Sicherheit.
ADR nötig: nein, weil die Regel aus dem Umsetzungsplan stammt, nur im Frontend gilt und ohne
neue Abhängigkeit (CSS-Animation) und ohne Vertragsänderung auskommt.

## Umsetzung

Entscheidungen:

- keine

Dateien:

- `frontend/src/app/session/consensus.ts`: neu, `consensusCard(votes)` auf Basis von `CARDS`
- `frontend/src/app/session/consensus.spec.ts`: neu, A1
- `frontend/src/app/session/confetti.ts`: neu, Komponente ohne Eingaben, `aria-hidden`
- `frontend/src/app/session/confetti.html`: neu
- `frontend/src/app/session/confetti.scss`: neu, `@keyframes`, `prefers-reduced-motion: reduce` blendet aus
- `frontend/src/app/session/round-result.ts`: ändern, `consensus` als `computed`, `suggestedCard` an den Dialog
- `frontend/src/app/session/round-result.html`: ändern, Bestätigung (`data-testid="consensus-hint"`), Konfetti (`data-testid="consensus-confetti"`)
- `frontend/src/app/session/round-result.scss`: ändern, Bestätigung
- `frontend/src/app/session/round-result.spec.ts`: ändern, A2 und A3
- `frontend/src/app/session/confirm-result-dialog.ts`: ändern, `ConfirmResultData.suggestedCard`, Startwert von `selected`
- `frontend/src/app/session/confirm-result-dialog.spec.ts`: ändern, A3
- `frontend/e2e/consensus.spec.ts`: neu, A4 und A5
- `project-rules/testing.md`: ändern, `consensus.spec.ts` in der Tabelle Areas und im Abschnitt End-to-End
- `docs/domain/glossary.md`: ändern, Ausreißer, Konsens

Schritte:

1. `consensusCard(votes: readonly { card: Card }[]): Card | null` in `consensus.ts`. Die Funktion liefert `null` bei weniger als zwei Stimmen, bei verschiedenen Karten oder bei einer Karte außerhalb der Zahlenkarten.
2. Die Komponente `Confetti` bekommt feste Konfetti-Stücke aus `span`-Elementen mit Farben aus den Material-Systemvariablen. Die Animation läuft einmal ohne Endlosschleife. Unter `@media (prefers-reduced-motion: reduce)` gilt `display: none`.
3. `RoundResult`:
   - Neu ist `consensus = computed(() => consensusCard(this.votes()))`.
   - Die Bestätigung kommt per `$localize` mit dem Kartensymbol, beziehungsweise mit dem Kartennamen für den Screenreader.
   - Das Konfetti erscheint bei Konsens.
   - `openConfirm` übergibt `suggestedCard: this.consensus()`.
4. `ConfirmResultDialog`: `selected` startet mit `data.suggestedCard ?? null`.
5. Unit-Tests, E2E, `project-rules/testing.md`, Glossar, `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `consensus.spec.ts`: Tabelle mit den Fällen aus A1 |
| A2 | `round-result.spec.ts`: Snapshot mit `5, 5` und mit `5, 8` |
| A3 | `confirm-result-dialog.spec.ts`: mit und ohne `suggestedCard`; `round-result.spec.ts`: Dialogdaten bei Konsens |
| A4 | `consensus.spec.ts` (E2E): drei Browser-Kontexte, Issue 42 des GitLab-Doubles; Hilfsfunktionen wie in `outliers.spec.ts` |
| A5 | `consensus.spec.ts` (E2E): `page.emulateMedia({ reducedMotion: 'reduce' })`, Konfetti nicht sichtbar, Bestätigung sichtbar |
| A6 | `make check`, `make e2e` |

Testdaten:
- Unit-Tests: Store mit Snapshots wie in `round-result.spec.ts`.
- End-to-End: Sitzung über die Startseite, Issue 42 des GitLab-Doubles, keine Übernahme nach GitLab.

Contracts zu regenerieren: keine.

## Offene Fragen

- [x] Konsens erst ab zwei Stimmen und nur mit einer Zahlenkarte (nicht bei lauter `?` oder Kaffeepause)? → Ja, ab zwei Stimmen und nur mit Zahlenkarte. (Morten Möller, 2026-11-16)

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/session/consensus.spec.ts`, `frontend/src/app/session/round-result.spec.ts`, `frontend/src/app/session/confirm-result-dialog.spec.ts`, `make e2e`
- Browser: aufgedeckte Ansicht in drei Kontexten, Dialog „Ergebnis übernehmen“, reduzierte Bewegung
