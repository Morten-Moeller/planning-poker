---
id: "0014"
title: Auflösung und Abschluss (M12)
status: approved
risk: medium
adrs: ["0004"]
owner: Morten Möller
created: 2026-11-16
updated: 2026-11-16
pr: ""
note: freigegeben in der Session
---

# Auflösung und Abschluss (M12)

Meilenstein M12 aus `docs/umsetzungsplan.md`. Deckt ab: R-15 bis R-21 und den Teil „aufgedeckte
Karten mit Gruppenauswertung“ von R-22 im Frontend. Annahmen: A-04 (aufgelöste Runde bleibt beim
Issue-Wechsel ohne Endwert im Protokoll), A-05 (Protokoll), A-06 (Auswertung), A-07 (Ergebnis in
GitLab), A-16 (nach der Bestätigung zurück zur Issue-Auswahl). Grundlage: die Schätzrunde aus
0013, `restart` aus 0008, `confirm` aus 0010.

## Ziel

Nach der Auflösung sehen alle dieselben Karten je Teilnehmer und dieselbe Auswertung. Der Scrum
Master startet eine neue Runde oder übernimmt einen Kartenwert als Endwert, der nach GitLab
geschrieben wird; während des Schreibens sind die Aktionen für alle gesperrt, ein GitLab-Fehler
lässt sich erneut versuchen. Das Protokoll der aufgelösten Runden ist für alle einklappbar
sichtbar.

## Scope

### Enthalten

- Aufgedeckte Ansicht in `REVEALED`: Name und Karte je Stimme aus `round.votes`, ☕ als Symbol mit zugänglichem Namen „Kaffeepause“.
- Auswertung: Anzahl je abgegebener Karte in Kartenreihenfolge, Durchschnitt (eine Nachkommastelle, deutsches Komma; „kein Durchschnitt“ ohne Zahlenkarten) und häufigste Werte, beschriftet als Orientierung und ohne Bedienelement.
- Aktionen nur für den Scrum Master: „Neue Runde“ (`restart`) und „Ergebnis übernehmen“ mit Dialog: Auswahl genau einer der 11 Karten, dann „Übernehmen“ (`confirm`).
- Während `round.confirming` sehen alle einen Hinweis; „Neue Runde“, „Ergebnis übernehmen“ und „Issue wechseln“ sind gesperrt.
- Rückmeldung: Erfolg als Snackbar beim Scrum Master; `GITLAB_ERROR` im Dialog mit „Erneut versuchen“, der Dialog bleibt offen und behält die gewählte Karte; der Fehler geht nicht zusätzlich ins Banner (Muster „Form errors“ aus `project-rules/frontend.md`).
- Protokoll für alle als einklappbarer Bereich (`mat-expansion-panel`), neueste Runde zuerst: Issue (`#iid` und Titel), Rundennummer, Stimmen, Auswertung, Endwert oder „ohne Endwert“.
- Gemeinsame Konstante des Kartensatzes für Kartenfächer und Ergebnisauswahl.
- GitLab-Double: Issue 45, dessen erste Note mit 500 scheitert und dessen zweite gelingt (WireMock-Szenario), für den Fehlerfall mit erneutem Versuch.

### Nicht enthalten

- Countdown, Ausreißer, Konsens (O-01 bis O-03, Specs 0016 bis 0018).
- Backend- und Vertragsänderungen; das Mock-Backend bleibt beim Stand von 0011.
- Härtung, Leerzustände und Layout über diese Ansicht hinaus (0015).

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Auflösung, Auswertung, Neue Runde, Bestätigung, Endwert, Protokoll, Protokolleintrag, Karte, Kartensatz, Stimme, Issue-Wechsel | wie im Glossar |
| Ergebnisdialog | Dialog des Scrum Masters, in dem er den Endwert aus dem Kartensatz wählt und bestätigt |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Nach der Auflösung zeigen Scrum Master und beide Entwickler dieselben Stimmen (`result-vote`, Name und Karte) und dieselbe Auswertung: Anzahl je Karte in Kartenreihenfolge (`result-count`), Durchschnitt (`result-average`, z. B. „6,5“) und häufigste Werte (`result-most-frequent`), beide als Orientierung beschriftet und ohne Schaltfläche. | End-to-End `frontend/e2e/result-round.spec.ts` (Texte in drei Kontexten gleich); Unit `frontend/src/app/session/round-result.spec.ts` (Reihenfolge, Komma, „kein Durchschnitt“, ☕) |
| A2 | „Neue Runde“ (`round-restart`) und „Ergebnis übernehmen“ (`result-accept`) gibt es nur beim Scrum Master; bei Entwicklern sind sie nicht im DOM. | Unit `frontend/src/app/session/round-result.spec.ts`; End-to-End `frontend/e2e/result-round.spec.ts` |
| A3 | Nach „Neue Runde“ sind bei allen die Karten zurückgesetzt (Kartenfächer ohne `aria-pressed="true"`, Status „Ausstehend“), die Rundennummer ist 2, und das Protokoll (`history-panel`, Einträge `history-entry`) enthält Runde 1 mit ihren Stimmen und „ohne Endwert“. | End-to-End `frontend/e2e/result-round.spec.ts` |
| A4 | Im Ergebnisdialog (`confirm-dialog`) sind genau die 11 Karten des Kartensatzes wählbar (`confirm-card`); „Übernehmen“ (`confirm-submit`) ist erst nach der Wahl einer Karte aktiv. | Unit `frontend/src/app/session/confirm-result-dialog.spec.ts`; End-to-End `frontend/e2e/result-round.spec.ts` |
| A5 | Nach der Übernahme zeigt der Scrum Master die Erfolgsmeldung (`confirm-success`); bei allen zeigt das Protokoll den Endwert (`history-final-card`), die Phase ist „Wartet auf ein Issue“, und der Scrum Master sieht das Bedienfeld der Issue-Auswahl. | End-to-End `frontend/e2e/result-round.spec.ts` |
| A6 | Während `round.confirming` sehen alle den Hinweis (`confirming-hint`), und „Neue Runde“, „Ergebnis übernehmen“ und „Issue wechseln“ sind deaktiviert. | Unit `frontend/src/app/session/round-result.spec.ts` (Snapshot mit `confirming: true`); „Issue wechseln“ ist seit 0012 durch `issue-panel.spec.ts` abgedeckt |
| A7 | Scheitert das Schreiben nach GitLab (Issue 45, erste Note 500), zeigt der Dialog „GitLab hat nicht geantwortet.“ (`confirm-error`) mit „Erneut versuchen“, das Banner bleibt leer, die Phase bleibt „Runde aufgelöst“; der zweite Versuch gelingt und führt zu A5. | End-to-End `frontend/e2e/result-round.spec.ts`; Unit `frontend/src/app/session/confirm-result-dialog.spec.ts` |
| A8 | Jeder neue Text trägt eine i18n-ID; Dialog und Protokoll sind per Tastatur bedienbar; `make lint` ist grün; die bisherigen End-to-End-Abläufe bleiben grün. | Aufruf `make lint`, `make e2e`; Browser |

## Contracts

keine. Das Frontend nutzt `restartRound`, `confirmRound`, `RoundView` (`votes`, `stats`,
`confirming`) und `HistoryEntryView` aus `frontend/src/app/api/schema.d.ts`.

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh` meldet medium für die Dateien unter
`frontend/src/app/session/`, die Mappings des GitLab-Doubles und `project-rules/testing.md`
(kein Muster), low für die Testdateien. Kein Eskalator: kein Token, keine Contracts, keine
Manifeste. Das Schreiben nach GitLab und seine Fehler regelt das Backend (0010); das Frontend
zeigt sie nur an.
Gates: G0 und G1 in dieser Session. G2: Label `human-approved`. G3: Status `verified`.
Reviews: Code, Sicherheit.
ADR nötig: nein, weil die Spec ADR 0004 folgt und keine neue Abhängigkeit, kein neues Modul und
keine Vertragsänderung bringt.

## Umsetzung

Entscheidungen:

- Keine neuen Abhängigkeiten: `MatDialog`, `MatSnackBar`, `MatExpansionModule` und `MatRadioModule` aus `@angular/material` (seit 0001 im Manifest).
- Phase, Stimmen, Auswertung, `confirming` und Protokoll kommen nur aus dem Snapshot (ADR 0004); der Ergebnisdialog hält nur die gewählte Karte und den Fehler lokal.
- `GITLAB_ERROR` der Bestätigung behandelt der Dialog wie einen Formularfehler (`formErrorMessage`, danach `ErrorState` leeren); andere Codes bleiben im Banner.
- Der Kartensatz zieht aus `card-deck.ts` in `frontend/src/app/session/cards.ts` (Konstante, Typ, Symbol und zugänglicher Name), den Kartenfächer, Ergebnis und Protokoll nutzen.
- Testdaten: neue Mappings für Issue 45 im GitLab-Double, die Note-Mappings von 42 und 43 bleiben.

Dateien:

- `frontend/src/app/session/cards.ts`: neu, Kartensatz, Symbol, zugänglicher Name
- `frontend/src/app/session/card-deck.ts`: ändern, Kartensatz aus `cards.ts`
- `frontend/src/app/session/round-result.ts`: neu, Stimmen, Auswertung, Aktionen, Hinweis während `confirming`
- `frontend/src/app/session/round-result.html`: neu
- `frontend/src/app/session/round-result.scss`: neu
- `frontend/src/app/session/round-result.spec.ts`: neu, Auswertung, Rollen, `confirming`, Aufruf `restart`
- `frontend/src/app/session/confirm-result-dialog.ts`: neu, Kartenauswahl, Aufruf `confirm`, Fehler, erneuter Versuch
- `frontend/src/app/session/confirm-result-dialog.html`: neu
- `frontend/src/app/session/confirm-result-dialog.scss`: neu
- `frontend/src/app/session/confirm-result-dialog.spec.ts`: neu, 11 Karten, Aktivierung, `GITLAB_ERROR`, Erfolg
- `frontend/src/app/session/session-history.ts`: neu, Protokoll
- `frontend/src/app/session/session-history.html`: neu
- `frontend/src/app/session/session-history.scss`: neu
- `frontend/src/app/session/session-page.html`: ändern, `RoundResult` in `REVEALED`, Protokoll für alle
- `frontend/src/app/session/session-page.ts`: ändern, Importe
- `frontend/src/app/session/session-page.spec.ts`: ändern, Aktionen nur für den Scrum Master
- `frontend/e2e/result-round.spec.ts`: neu, A1 bis A5 und A7
- `frontend/e2e/gitlab-double/mappings/issue-45.json`: neu, Issue 45
- `frontend/e2e/gitlab-double/mappings/issue-45-notes.json`: neu, Szenario: erste Note 500, danach 201
- `project-rules/testing.md`: ändern, Areas (`result-round.spec.ts`), Testdaten (Issue 45)

Schritte:

1. `cards.ts` mit `CARDS`, `Card`, `cardSymbol`, `cardName`; `card-deck.ts` nutzt sie.
2. `RoundResult`: Stimmen und Auswertung aus `store.round()`; Durchschnitt mit `DecimalPipe` (`1.1-1`, Locale `de`); Aktionen nur bei `store.isScrumMaster()`, deaktiviert bei `confirming` und während eines Aufrufs; „Ergebnis übernehmen“ öffnet `ConfirmResultDialog`; Hinweis `confirming-hint` für alle.
3. `ConfirmResultDialog`: `mat-radio-group` mit den 11 Karten; „Übernehmen“ ruft `confirmRound`; Erfolg schließt den Dialog und zeigt die Snackbar; `GITLAB_ERROR` zeigt den Text im Dialog, leert `ErrorState`, Schaltfläche heißt „Erneut versuchen“.
4. `SessionHistory`: `mat-expansion-panel`, Einträge aus `store.history()`; Endwert oder „ohne Endwert“.
5. `session-page`: `RoundResult` in `REVEALED`; `SessionHistory` für alle, sobald `history` nicht leer ist.
6. Mappings für Issue 45 (`scenarioName`, `requiredScenarioState`, `newScenarioState`); `result-round.spec.ts` mit Scrum Master und zwei Entwicklern: Karten 5 und 8, Auflösen, A1 bis A3, Übernahme mit Karte 8 (A4, A5); zweiter Ablauf mit Issue 45 für A7.
7. `project-rules/testing.md`; `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `frontend/e2e/result-round.spec.ts`: gleiche Texte in drei Kontexten; `frontend/src/app/session/round-result.spec.ts`: Reihenfolge, Komma, ohne Zahlenkarten, ☕ |
| A2 | `frontend/src/app/session/round-result.spec.ts`: Rollenweiche; `frontend/e2e/result-round.spec.ts`: Anzahl 0 beim Entwickler |
| A3 | `frontend/e2e/result-round.spec.ts`: Neue Runde, Protokoll |
| A4 | `frontend/src/app/session/confirm-result-dialog.spec.ts`: 11 Karten, „Übernehmen“ erst nach Wahl; `frontend/e2e/result-round.spec.ts` |
| A5 | `frontend/e2e/result-round.spec.ts`: Snackbar, Endwert, Phase, Bedienfeld |
| A6 | `frontend/src/app/session/round-result.spec.ts`: Snapshot mit `confirming: true` |
| A7 | `frontend/e2e/result-round.spec.ts`: Issue 45; `frontend/src/app/session/confirm-result-dialog.spec.ts`: `GITLAB_ERROR`, erneuter Versuch |
| A8 | Aufruf `make lint`, `make e2e`; Browser (Tastatur im Dialog und im Protokoll) |

Testdaten: die Mappings des GitLab-Doubles (Projekt `1234`, Issue 42, neu Issue 45 mit
Szenario); Sitzungen entstehen im Ablauf über die Oberfläche. Unit-Tests nehmen die
Beispiel-Snapshots aus `frontend/src/app/api/examples.ts` (`revealedScrumMaster`,
`revealedDeveloper`).

Contracts zu regenerieren: keine.

## Offene Fragen

- keine

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/session/*.spec.ts`, `make e2e` (alle Abläufe in `frontend/e2e/`)
- Browser: Sitzungsraum in `REVEALED` als Scrum Master und als Entwickler, Ergebnisdialog, Protokoll über `make e2e`
- Aufruf: `make lint` (A8)
