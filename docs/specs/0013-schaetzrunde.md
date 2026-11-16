---
id: "0013"
title: Schätzrunde (M11)
status: approved
risk: medium
adrs: ["0004"]
owner: Morten Möller
created: 2026-11-16
updated: 2026-11-16
pr: ""
note: freigegeben in der Session
---

# Schätzrunde (M11)

Meilenstein M11 aus `docs/umsetzungsplan.md`. Deckt ab: R-11 bis R-14 und den Teil
„Abstimmungsstatus ohne Wert“ von R-22 im Frontend. Annahmen: A-02 (Scrum Master schätzt nicht
mit), A-10 (getrennte Entwickler blockieren den Hinweis nicht), A-11 (Nachzügler), A-12 (Karte
ändern). Grundlage: der Sitzungsraum aus 0012, die Runden-Befehle aus 0008, der Snapshot je
Empfänger aus 0009.

## Ziel

Entwickler wählen in der Phase `VOTING` verdeckt eine Karte aus dem Kartensatz und können sie
bis zur Auflösung ändern. Alle sehen je Teilnehmer den Abstimmungsstatus und einen Zähler, nie
fremde Werte. Der Scrum Master wird aktiv darauf hingewiesen, sobald alle verbundenen Entwickler
geschätzt haben, und kann die Runde jederzeit auflösen.

## Scope

### Enthalten

- Kartenfächer für Entwickler in `VOTING`: die 11 Karten des Kartensatzes in Kartenreihenfolge als Schaltflächen, ☕ mit zugänglichem Namen „Kaffeepause“; die eigene Karte aus `round.myVote` ist hervorgehoben (`aria-pressed`); ein Klick ruft `vote`, eine andere Karte ändert die Stimme.
- Abstimmungsstatus in der Teilnehmerliste: in `VOTING` je Entwickler „Hat geschätzt“ oder „Ausstehend“ aus `hasVoted`.
- Zähler für alle in `VOTING`: abgegebene Stimmen der verbundenen Entwickler von der Zahl der verbundenen Entwickler.
- Hinweis an den Scrum Master bei `round.allVoted`: Banner mit `role="status"` und hervorgehobene Schaltfläche „Auflösen“.
- Schaltfläche „Auflösen“ nur für den Scrum Master, in `VOTING` jederzeit aktiv; ruft `reveal`.
- End-to-End-Ablauf mit Scrum Master und zwei Entwicklern; Prüfung der WebSocket-Frames auf fremde Werte.

### Nicht enthalten

- Ansicht nach der Auflösung (Karten je Teilnehmer, Auswertung), neue Runde, Bestätigung, Protokoll (0014). Nach der Auflösung zeigt der Raum in dieser Spec nur die Phase „Runde aufgelöst“; der Kartenfächer verschwindet.
- Backend- und Vertragsänderungen; das Mock-Backend bleibt beim Stand von 0011.
- Auswertung der WebSocket-Nachricht `round.allVoted`: der Hinweis folgt `round.allVoted` im Snapshot, der dieselbe Information trägt und nach einem Neuladen erhalten bleibt.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Karte, Kartensatz, Stimme, Runde, Abstimmungsstatus, Auflösung, Scrum Master, Entwickler, Verbindungsstatus | wie im Glossar |
| Kartenfächer | Die 11 Karten als Schaltflächen, aus denen ein Entwickler seine Stimme wählt |
| Zähler | „x von y haben geschätzt“: x verbundene Entwickler mit Stimme, y verbundene Entwickler |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Ein Entwickler sieht in `VOTING` den Kartenfächer (`card-deck`) mit 11 Karten in Kartenreihenfolge (`card-0` bis `card-34`, `card-?`, `card-COFFEE`); nach dem Klick auf eine Karte ist genau diese hervorgehoben (`aria-pressed="true"`), nach dem Klick auf eine andere Karte nur die andere. Die Karten sind mit Tab erreichbar und mit Enter oder Leertaste wählbar. | End-to-End `frontend/e2e/voting-round.spec.ts`; Unit `frontend/src/app/session/card-deck.spec.ts` |
| A2 | Der Scrum Master sieht keinen Kartenfächer; Entwickler sehen keine Schaltfläche „Auflösen“ (`round-reveal`), beides nicht im DOM. | Unit `frontend/src/app/session/session-page.spec.ts`; End-to-End `frontend/e2e/voting-round.spec.ts` |
| A3 | Wählt ein Entwickler eine Karte, wechselt sein Abstimmungsstatus (`participant-vote-status`) bei Scrum Master und anderem Entwickler ohne Neuladen von „Ausstehend“ auf „Hat geschätzt“, und der Zähler (`vote-counter`) steigt von „0 von 2“ auf „1 von 2“. | End-to-End `frontend/e2e/voting-round.spec.ts`; Unit `frontend/src/app/session/round-status.spec.ts` (Zähler über verbundene Entwickler) |
| A4 | Fremde Werte sind nicht sichtbar, auch nicht im Netzwerk: kein `session.state`-Frame, den ein Entwickler oder der Scrum Master vor der Auflösung empfängt, enthält eine Karte eines anderen Entwicklers (`round.votes` ist `null`, `round.myVote` ist nur die eigene Karte oder `null`). | End-to-End `frontend/e2e/voting-round.spec.ts` (`page.on('websocket')`, `framereceived`) |
| A5 | Sobald alle verbundenen Entwickler geschätzt haben, sieht der Scrum Master ohne Neuladen den Hinweis (`all-voted-hint`) und die hervorgehobene Schaltfläche „Auflösen“; vorher nicht. Ein getrennter Entwickler ohne Stimme verhindert den Hinweis nicht. | End-to-End `frontend/e2e/voting-round.spec.ts`; Unit `frontend/src/app/session/round-status.spec.ts` |
| A6 | „Auflösen“ ist in `VOTING` auch ohne alle Stimmen aktiv; der Klick setzt bei allen die Phase auf „Runde aufgelöst“ und blendet den Kartenfächer aus. | End-to-End `frontend/e2e/voting-round.spec.ts`; Unit `frontend/src/app/session/round-status.spec.ts` (Aufruf `reveal`) |
| A7 | Jeder neue Text trägt eine i18n-ID; `make lint` ist grün; `create-and-join.spec.ts` und `session-room.spec.ts` bleiben grün. | Aufruf `make lint`, `make e2e`; Browser |

## Contracts

keine. Das Frontend nutzt `vote`, `revealRound` und `SessionView` (`round.myVote`,
`round.allVoted`, `participants[].hasVoted`, `participants[].connected`) aus
`frontend/src/app/api/schema.d.ts`.

## Risiko

Stufe: medium
Begründung: wie bei 0012 meldet `harness/scripts/risk-level.sh` medium für die Dateien unter
`frontend/src/app/session/` und `project-rules/testing.md` (kein Muster), low für die
Testdateien. Kein Eskalator: kein Token, keine Contracts, keine Manifeste. Dass fremde Werte
verborgen bleiben, sichert das Backend (0009); A4 prüft es im Browser.
Gates: G0 und G1 in dieser Session. G2: Label `human-approved`. G3: Status `verified`.
Reviews: Code, Sicherheit.
ADR nötig: nein, weil die Spec ADR 0004 (Snapshot im Store) folgt und keine neue Abhängigkeit,
kein neues Modul und keine Vertragsänderung bringt.

## Umsetzung

Entscheidungen:

- Keine neuen Abhängigkeiten; Karten als Material-Schaltflächen mit `aria-pressed`, Reihenfolge aus einer Konstante mit den Werten des Typs `Card`.
- Die hervorgehobene Karte kommt nur aus `round.myVote` im Snapshot (ADR 0004); während des Aufrufs `vote` sind die Karten deaktiviert, kein optimistischer Zustand.
- Hinweis und Zähler werden aus dem Snapshot berechnet (`round.allVoted`, `participants`); die WebSocket-Nachricht `round.allVoted` bleibt ungenutzt.
- Neue Komponenten `CardDeck` und `RoundStatus` unter `frontend/src/app/session/`; `ParticipantList` erhält den Abstimmungsstatus.

Dateien:

- `frontend/src/app/session/card-deck.ts`: neu, Kartensatz, Auswahl aus `myVote`, Aufruf `vote`
- `frontend/src/app/session/card-deck.html`: neu
- `frontend/src/app/session/card-deck.scss`: neu
- `frontend/src/app/session/card-deck.spec.ts`: neu, Reihenfolge, Hervorhebung, Aufruf, Tastatur
- `frontend/src/app/session/round-status.ts`: neu, Zähler, Hinweis, Schaltfläche „Auflösen“
- `frontend/src/app/session/round-status.html`: neu
- `frontend/src/app/session/round-status.scss`: neu
- `frontend/src/app/session/round-status.spec.ts`: neu, Zähler, Hinweis, Rolle, Aufruf `reveal`
- `frontend/src/app/session/participant-list.html`: ändern, Abstimmungsstatus in `VOTING`
- `frontend/src/app/session/participant-list.ts`: ändern, Phase aus dem Store
- `frontend/src/app/session/participant-list.scss`: ändern
- `frontend/src/app/session/session-page.html`: ändern, `RoundStatus` und `CardDeck` einbinden
- `frontend/src/app/session/session-page.ts`: ändern, Importe
- `frontend/src/app/session/session-page.spec.ts`: ändern, Kartenfächer nur für Entwickler, „Auflösen“ nur für den Scrum Master
- `frontend/e2e/voting-round.spec.ts`: neu, A1 bis A6
- `project-rules/testing.md`: ändern, Areas (`voting-round.spec.ts`)

Schritte:

1. `CardDeck`: Konstante `CARDS` in Kartenreihenfolge; `@for` mit `data-testid="card-<wert>"`, `aria-pressed` aus `store.round().myVote`; Klick ruft `api.vote(sessionId, { card })`, Karten während des Aufrufs deaktiviert; Fehler über den Interceptor ins Banner.
2. `RoundStatus`: `computed` für die verbundenen Entwickler und den Zähler; Hinweis bei `round.allVoted` nur für den Scrum Master; „Auflösen“ nur für den Scrum Master, `mat-flat-button` bei `allVoted`, sonst `mat-stroked-button`, während des Aufrufs deaktiviert.
3. `ParticipantList`: in `VOTING` je Entwickler „Hat geschätzt“ oder „Ausstehend“ mit Symbol.
4. `session-page`: in `VOTING` `RoundStatus` für alle, `CardDeck` nur für Entwickler.
5. `voting-round.spec.ts`: Sitzung über die Startseite (Issue 42), zwei Entwickler über den Beitrittslink, Freigabe; Frames über `page.on('websocket')` sammeln; Fälle A1 bis A6, für A5 ein dritter Entwickler, der den Kontext schließt.
6. `project-rules/testing.md`; `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `frontend/e2e/voting-round.spec.ts`: Karte wählen und ändern, Tastatur; `frontend/src/app/session/card-deck.spec.ts`: Reihenfolge, `aria-pressed`, Aufruf `vote` |
| A2 | `frontend/src/app/session/session-page.spec.ts`: Rollenweiche; `frontend/e2e/voting-round.spec.ts`: Anzahl 0 |
| A3 | `frontend/e2e/voting-round.spec.ts`: Status und Zähler in den anderen Kontexten; `frontend/src/app/session/round-status.spec.ts`: Zähler |
| A4 | `frontend/e2e/voting-round.spec.ts`: Frames aller Kontexte vor der Auflösung |
| A5 | `frontend/e2e/voting-round.spec.ts`: Hinweis nach der letzten Stimme, getrennter Entwickler; `frontend/src/app/session/round-status.spec.ts`: Hinweis aus `allVoted` |
| A6 | `frontend/e2e/voting-round.spec.ts`: Auflösen mit einer Stimme; `frontend/src/app/session/round-status.spec.ts`: Aufruf `reveal` |
| A7 | Aufruf `make lint`, `make e2e`; Browser (Tab-Reihenfolge im Kartenfächer) |

Testdaten: die Mappings des GitLab-Doubles (Projekt `1234`, Issue 42); Sitzungen entstehen im
Ablauf über die Oberfläche. Unit-Tests nehmen die Beispiel-Snapshots aus
`frontend/src/app/api/examples.ts` (`votingScrumMaster`, `votingDeveloper`).

Contracts zu regenerieren: keine.

## Offene Fragen

- keine

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/session/*.spec.ts`, `make e2e` (`health.spec.ts`, `create-and-join.spec.ts`, `session-room.spec.ts`, `voting-round.spec.ts`)
- Browser: Sitzungsraum in `VOTING` als Scrum Master und als Entwickler über `make e2e`
- Aufruf: `make lint` (A7)
