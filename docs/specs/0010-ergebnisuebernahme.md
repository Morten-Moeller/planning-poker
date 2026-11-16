---
id: "0010"
title: Ergebnisübernahme (M7)
status: Review
risk: medium
adrs: ["0002"]
owner: Morten Möller
created: 2026-11-16
updated: 2026-11-16
pr: ""
note: freigegeben in der Session
---

# Ergebnisübernahme (M7)

Meilenstein M7 aus `docs/umsetzungsplan.md`. Deckt ab: R-20, R-21 auf der Serverseite.
Annahmen: A-07 (Kommentar, optional Gewicht vor dem Kommentar), A-16 (nach der Bestätigung
zurück nach `LOBBY`). Grundlage: Abschnitte 4.3, 4.4 und 4.7 des Plans, die Domäne aus 0004
(`beginConfirm`, `finishConfirm`, `failConfirm`), der GitLab-Client aus 0003.

## Ziel

Der Scrum Master bestätigt einen Wert aus dem Kartensatz; das Backend schreibt ihn als Kommentar
an das GitLab-Issue (mit `write-weight` vorher als Gewicht), trägt den Endwert ins Protokoll und
setzt die Sitzung nach `LOBBY`. Während des GitLab-Aufrufs ist die Sitzung nicht gesperrt, aber
jede Steuerungsaktion wird mit 409 abgelehnt; ein GitLab-Fehler lässt die Runde aufgelöst und
erlaubt einen erneuten Versuch.

## Scope

### Enthalten

- `POST /api/sessions/{id}/round/confirm`: `beginConfirm` unter der Sperre, GitLab-Aufrufe außerhalb, `finishConfirm` oder `failConfirm` unter der Sperre; 204, 409 `INVALID_STATE`, 502 `GITLAB_ERROR`, 400 `INVALID_CARD` (seit 0002).
- Kommentar nach der Vorlage in 4.7; mit `planningpoker.gitlab.write-weight=true` vorher `setWeight` für Zahlenkarten; bei `?` und ☕ nur der Kommentar.
- README-Abschnitt „GitLab“: Vorlage des Kommentars und Ablauf, Hinweis „Umsetzung ab Spec 0010“ entfernt.

### Nicht enthalten

- Entfernen des `errorCode` `NOT_IMPLEMENTED` und der README-Zeile dazu (0015, weil es den Vertrag ändert).
- Frontend (0014); WebSocket (0009).
- Änderungen an `GitLabClient`, `GitLabIssues` oder `application.properties`.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Bestätigung, Endwert, Karte, Runde, Auswertung, Protokolleintrag, Phase, Scrum Master, Issue | wie im Glossar |
| Ergebniskommentar | Note am GitLab-Issue nach der Vorlage in 4.7: Endwert, Rundenzahl, Verteilung der letzten Runde, Durchschnitt |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Bestätigung in `REVEALED` mit Karte `5` nach zwei Runden (letzte Runde 3, 5, 5, 5, 8): 204; GitLab erhält `POST …/issues/42/notes` mit genau dem Text `**Planning Poker: Ergebnis 5**\n\nRunden: 2. Letzte Runde: 3 (1 Stimme), 5 (3 Stimmen), 8 (1 Stimme). Durchschnitt 5,2.`; danach `phase` `LOBBY`, `activeIssue` und `round` `null`, `preselectedIssueIid` `null`, `history[0].finalCard` `"5"`. | Test `backend/src/test/java/planningpoker/session/ConfirmRoundTest.java` |
| A2 | Mit `write-weight` wird vor dem Kommentar `PUT …/issues/42` mit `{"weight":5}` gesendet; bei `?` oder ☕ kein `PUT`; ohne `write-weight` nie ein `PUT`. Die Vorlage zeigt ☕ als `☕` und `?` als `?`; ohne Zahlenkarte endet der Text mit `Kein Durchschnitt.` | Test `backend/src/test/java/planningpoker/session/ConfirmRoundTest.java`, `ResultCommentTest.java` |
| A3 | Ein Wert außerhalb des Kartensatzes (`4.3`, `coffee`) antwortet 400 `INVALID_CARD` (bestehender Test); Bestätigung in `LOBBY` oder `VOTING` antwortet 409 `INVALID_STATE`; ein Entwickler erhält 403. | Test `backend/src/test/java/planningpoker/session/ConfirmRoundTest.java`, `SessionResourceTest.java` |
| A4 | Antwortet GitLab auf den Kommentar mit 401, 404, 5xx oder gar nicht: 502 `GITLAB_ERROR`, `phase` bleibt `REVEALED`, `confirming` ist `false`, kein Endwert im Protokoll; ein erneuter Versuch mit erreichbarem GitLab antwortet 204. Schlägt das Gewicht fehl, wird kein Kommentar gesendet. | Test `backend/src/test/java/planningpoker/session/ConfirmRoundTest.java` |
| A5 | Zwei schnelle Bestätigungen (GitLab antwortet verzögert) erzeugen genau einen Kommentar; die zweite antwortet 409 `INVALID_STATE`; während der Verzögerung zeigt der Snapshot `round.confirming` `true` und Auflösen, neue Runde und Issue-Wechsel antworten 409. | Test `backend/src/test/java/planningpoker/session/ConfirmRoundTest.java` |
| A6 | Während eines langsamen GitLab-Aufrufs gelingt ein Beitritt zur selben Sitzung, bevor die Bestätigung antwortet. | Test `backend/src/test/java/planningpoker/session/ConfirmRoundTest.java` |
| A7 | Das README beschreibt unter „GitLab“ Vorlage und Ablauf der Ergebnisübernahme ohne den Hinweis „Umsetzung ab Spec 0010“. | Aufruf |

## Contracts

keine. Der Endpunkt und seine Antworten stehen seit 0002 und 0006 im Vertrag.

## Risiko

Stufe: medium
Begründung: `backend/src/main/java/planningpoker/session/` ist medium (kein Muster); keine
Contracts, keine Manifeste; der Code vermeidet die Eskalator-Wörter. Tests, README und `docs/` low.
Gates: G0 und G1 in dieser Session. G2: Label `human-approved`. G3 bei medium nicht gefordert;
`implement` führt `verify` trotzdem aus. Reviews: Code, Sicherheit.
ADR nötig: nein, weil ADR 0002 (GitLab-Aufruf außerhalb der Sperre, Schutz über `confirming`)
die Entscheidung festlegt und diese Spec ihr folgt.

## Umsetzung

Entscheidungen:

- Keine neuen Abhängigkeiten, keine Vertragsänderung.
- `ResultPublisher` (`@ApplicationScoped`, Paket `session`) baut den Kommentar aus `Confirmation` und ruft `GitLabClient.setWeight` (nur bei `writeWeight` und Zahlenkarte) und `addNote`; `GitLabException` wird zu `ApiException(GITLAB_ERROR)` mit festem `detail` (Abbildung wie in `GitLabIssues`, aber kein 404-Sonderfall).
- Vorlage: Durchschnitt mit Komma und einer Nachkommastelle (`Locale.GERMANY`); Stimmenzahl mit `Stimme`/`Stimmen`; Karten in Kartenreihenfolge; ohne Zahlenkarte `Kein Durchschnitt.`; ☕ für `COFFEE`.
- Ablauf in `SessionResource.confirmRound`: `Confirmation c = registry.update(id, s -> s.beginConfirm(actor, card))`; dann `publisher.publish(projectId, c)`; Erfolg: `registry.update(id, s -> s.finishConfirm(card))`; Fehler: `registry.update(id, Session::failConfirm)` und die `ApiException` weiterwerfen. `finishConfirm` und `failConfirm` laufen in einem `try/finally`-freien Zweig, damit kein zweiter Fehler den Zustand verdeckt.

Dateien:

- `backend/src/main/java/planningpoker/session/ResultComment.java`: neu, Vorlage als reine Funktion `of(Confirmation)`
- `backend/src/main/java/planningpoker/session/ResultPublisher.java`: neu, Gewicht und Kommentar über `GitLabClient`, Fehlerabbildung
- `backend/src/main/java/planningpoker/session/SessionResource.java`: ändern, `confirmRound` umgesetzt, `notImplemented()` entfernt
- `backend/src/test/java/planningpoker/session/ResultCommentTest.java`: neu, tabellengetrieben (A2)
- `backend/src/test/java/planningpoker/session/ConfirmRoundTest.java`: neu, A1 bis A6, `write-weight` über `@TestProfile`
- `backend/src/test/java/planningpoker/session/GitLabStubs.java`: ändern, Stubs für Notes und Gewicht (Erfolg, Fehler, Verzögerung)
- `backend/src/test/java/planningpoker/session/SessionResourceTest.java`: ändern, 501-Test entfernt, `confirm` in `securedEndpoints`
- `README.md`: ändern, Abschnitt „GitLab“

Schritte:

1. `ResultComment.of(confirmation)` nach der Vorlage; `ResultCommentTest` mit den Fällen aus A1 und A2 (gemischt, nur `?` und ☕, eine Stimme, Gleichstand).
2. `ResultPublisher.publish(projectId, confirmation)`: `writeWeight && card` numerisch: `setWeight(projectId, iid, zahl)`; dann `addNote(projectId, iid, text)`.
3. `confirmRound` nach den Entscheidungen; `notImplemented()` und seine Verwendung entfernen (`NOT_IMPLEMENTED` bleibt im `ErrorCode` bis 0015).
4. `GitLabStubs`: `note(server, project, iid)`, `noteFailing(status)`, `noteDelayed(millis)`, `weight(server, project, iid)`, `weightFailing(status)`; `ConfirmRoundTest` mit `WireMockGitLab`, Sitzung mit drei Entwicklern, zwei Runden; A5 mit verzögertem Kommentar und zweitem Aufruf aus einem zweiten Thread nach Eingang der ersten GitLab-Anfrage (wie `IssueSelectionTest.awaitGitLabRequest`); A6 wie dort.
5. `SessionResourceTest`: `stubEndpoints` und den 501-Test entfernen; `confirm` zu `securedEndpoints`.
6. README; `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `backend/src/test/java/planningpoker/session/ConfirmRoundTest.java`: Ablauf mit zwei Runden, WireMock-`verify` des Kommentartexts, Snapshot danach |
| A2 | `backend/src/test/java/planningpoker/session/ConfirmRoundTest.java`: `write-weight` an und aus, `?` und ☕; `ResultCommentTest.java`: Vorlage je Fall |
| A3 | `backend/src/test/java/planningpoker/session/ConfirmRoundTest.java`: `LOBBY`, `VOTING`, Entwickler; `SessionResourceTest.java`: `INVALID_CARD` |
| A4 | `backend/src/test/java/planningpoker/session/ConfirmRoundTest.java`: 401, 404, 500, Timeout auf den Kommentar; Gewicht schlägt fehl; erneuter Versuch |
| A5 | `backend/src/test/java/planningpoker/session/ConfirmRoundTest.java`: zwei schnelle Aufrufe, `confirming` im Snapshot, 409 für Steuerungsaktionen |
| A6 | `backend/src/test/java/planningpoker/session/ConfirmRoundTest.java`: Beitritt während der Verzögerung |
| A7 | Aufruf: README |

Testdaten: Sitzungen über REST mit zufälligem Namenszusatz; GitLab-Stubs aus `GitLabStubs`.

Contracts zu regenerieren: keine.

## Offene Fragen

- [ ] keine

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/session/`, `make e2e` (`health.spec.ts`)
- Browser: keiner
- Aufruf: README (A7)
