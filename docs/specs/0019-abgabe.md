---
id: "0019"
title: Abgabe (M13, Teil 2)
status: approved
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-17
updated: 2026-11-17
pr: ""
note: freigegeben in der Session
---

# Abgabe (M13, Teil 2)

Zweiter Teil von Meilenstein M13 aus `docs/umsetzungsplan.md`, letzte Welle der Roadmap. Die
Spec deckt R-23 bis R-25 ab und ordnet R-01 bis R-26 Tests oder Punkten einer Checkliste zu.
Grundlage ist der Stand nach 0001 bis 0018, dazu die offenen Hinweise aus den Reviews von 0011
bis 0014 und die beiden unzuverlässigen Tests, die in den Wellen 11 bis 13 aufgefallen sind.

## Ziel

Die Anwendung ist abgabefertig. Ein Prüfer startet sie aus einem frischen Klon nach höchstens
fünf dokumentierten Befehlen. Ein End-to-End-Test spielt den gesamten Ablauf mit drei Browsern
durch. Fehler- und Leerzustände sind sichtbar, das Layout funktioniert auf schmalen Bildschirmen.
Jede Anforderung R-01 bis R-26 ist einem Test oder einem Punkt der Checkliste zugeordnet.

## Scope

### Enthalten

- **Gesamtablauf:** Ein End-to-End-Test mit drei Browser-Kontexten (Scrum Master, zwei Entwickler) gegen das GitLab-Double: Erstellen, Beitreten über Link und über Session-ID, Freigabe, Schätzen, Fortschritt, Hinweis an den Scrum Master, Auflösen, Neue Runde, Issue-Wechsel, Bestätigung mit Kommentar am Issue, Protokoll.
- **Fehler- und Leerzustände:**
  - Abgelaufene oder unbekannte Sitzung mit gespeichertem Token: Die Sitzungsseite zeigt „Diese Sitzung ist abgelaufen oder existiert nicht.“ mit einem Link zur Startseite (`data-testid="session-gone"`) statt „Sitzung wird geladen“. Das gespeicherte Token der Sitzung wird verworfen.
  - GitLab nicht erreichbar bei der Issue-Suche: Das Bedienfeld zeigt „GitLab ist nicht erreichbar.“ und eine Schaltfläche „Erneut versuchen“ (`data-testid="issue-results-error"`, `issue-results-retry`).
  - Keine Issues gefunden: Das Bedienfeld zeigt einen Leerzustand. Er besteht schon und bekommt einen Test im Gesamtablauf.
- **Hinweise aus den Reviews:**
  - Eine Session-ID in Kleinbuchstaben, im Link oder auf der Beitrittsseite getippt, wird in Großbuchstaben umgewandelt, bevor sie an das Backend geht.
  - Scheitert das Kopieren in die Zwischenablage, zeigt die Oberfläche „Kopieren nicht möglich, bitte von Hand kopieren.“
  - Die Rundennummer erscheint während der Runde und in der aufgedeckten Ansicht als „Runde 2“.
- **Layout und Barrierefreiheit:**
  - Bei 375 px Breite hat die Sitzungsseite in allen drei Phasen keinen horizontalen Scrollbalken.
  - Fokus, Beschriftungen und Kontrast prüft die Person von Hand nach der Checkliste. Dazu gehören die offenen Punkte aus 0017 und 0018: Kontrast der Hervorhebungen und Ausgabe im Screenreader.
- **Unzuverlässige Tests:**
  - `SessionSocketTest.usesTheEnvelopeAndTheTypesOfTheContract` wartet auf die `error`-Nachricht des abgewiesenen Clients, bevor er die Typen vergleicht.
  - `result-round.spec.ts` „a GitLab error stays in the dialog …“ setzt das WireMock-Szenario `issue-45-notes` vor dem Test zurück. Ist die Ursache eine andere, behebt sie der Implementer und nennt sie im PR.
- **README final:**
  - Ein Schnellstart mit höchstens fünf Befehlen aus einem frischen Klon.
  - Die bestehenden Abschnitte Variante (R-24), GitLab (A-07) und Schnittstellen (R-25) werden geprüft und auf den Stand nach 0016 gebracht, mit Verweis auf `contracts/api/`.
  - Neu ist ein Abschnitt „Optionale Features“ (Timer, Ausreißer, Konsens) und ein Verweis auf Checkliste und Anforderungszuordnung.
- **Content-Security-Policy:** Ein Meta-Tag in `frontend/src/index.html` setzt `img-src 'self' data:`. Externe Bilder aus Issue-Beschreibungen laden nicht mehr. Das README nennt die Regel.
- **Umsetzungsplan:** Abschnitt 4.7 bekommt den Schlüssel `planningpoker.gitlab.timeout` (Standard `10s`) aus 0003.
- **Abgabedokumente:**
  - `docs/abgabe/checkliste.md`: manuelle Prüfung gegen ein echtes GitLab-Projekt (Kommentar, optional `weight`) und Prüfung der Barrierefreiheit, je Punkt mit Ergebnisfeld für die Person.
  - `docs/abgabe/anforderungen.md`: R-01 bis R-26 mit Test (Datei und Fall) oder Checklistenpunkt.

### Nicht enthalten

- Titel des vorausgewählten Issues, wenn es nicht in den Suchergebnissen steht (Hinweis aus 0012). Dafür bräuchte das Backend einen Aufruf mehr; die Vorschau zeigt weiter `#iid`.
- Rate-Limit und WebSocket-Grenzen (ADR 0005), Container-Setup, Deployment.
- Das Ausfüllen der Checkliste. Das macht die Person vor dem Label.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Sitzung, Session-ID, Token, Runde, Protokoll, Ergebnisübernahme | wie im Glossar |
| Checkliste | Manuelle Prüfpunkte für die Abgabe in `docs/abgabe/checkliste.md`; kein Domänenbegriff |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Der Gesamtablauf mit drei Kontexten läuft in `make e2e` und in der CI (`gates (e2e)`) grün. Am Ende hat das GitLab-Double genau einen Kommentar für das bestätigte Issue erhalten. | End-to-End `frontend/e2e/full-flow.spec.ts` |
| A2 | Gilt die Sitzung mit gespeichertem Token als unbekannt (404 `SESSION_NOT_FOUND`), zeigt die Sitzungsseite `session-gone` mit Link zur Startseite, und das Token ist aus dem Speicher entfernt. | Unit `frontend/src/app/session/session-page.spec.ts`; End-to-End `full-flow.spec.ts` (unbekannte ID) |
| A3 | Antwortet die Issue-Suche 502 `GITLAB_ERROR`, zeigt das Bedienfeld den Fehler mit „Erneut versuchen“. Ein zweiter Versuch mit Erfolg zeigt die Liste. | Unit `frontend/src/app/session/issue-panel.spec.ts` |
| A4 | Ein Beitrittslink mit `/session/k7p2qx9m/join` und die Eingabe `k7p2qx9m` führen zur Sitzung `K7P2QX9M`. | Unit `frontend/src/app/join/join-page.spec.ts`; End-to-End `full-flow.spec.ts` |
| A5 | Lehnt `navigator.clipboard.writeText` ab, erscheint „Kopieren nicht möglich, bitte von Hand kopieren.“ als `role="status"`. | Unit `frontend/src/app/session/share-session.spec.ts` |
| A6 | In `VOTING` und `REVEALED` zeigt die Oberfläche „Runde 2“ nach einer neuen Runde, für beide Rollen gleich. | Unit `frontend/src/app/session/round-status.spec.ts`, `round-result.spec.ts`; End-to-End `full-flow.spec.ts` |
| A7 | Bei Viewport 375×800 ist in `LOBBY`, `VOTING` und `REVEALED` `scrollWidth <= clientWidth` auf der Sitzungsseite. | End-to-End `frontend/e2e/layout.spec.ts` |
| A8 | `SessionSocketTest` und `result-round.spec.ts` laufen je fünfmal hintereinander grün, ohne gelockerte Prüfungen. | Aufruf `./mvnw test -Dtest=SessionSocketTest -Dsurefire.rerunFailingTestsCount=0` fünfmal; `pnpm -C frontend exec playwright test e2e/result-round.spec.ts --repeat-each=5` |
| A9 | Die README-Befehle des Schnellstarts laufen in einem frischen Klon (`git clone` in ein leeres Verzeichnis), es sind höchstens fünf, und danach antworten `GET /api/health` mit 200 und die Startseite. | Aufruf durch `/verify` in einem Temp-Verzeichnis mit GitLab-Double statt echtem Token |
| A10 | `docs/abgabe/anforderungen.md` hat für jede R-ID von R-01 bis R-26 eine Zeile mit einem Test, der existiert, oder einem Punkt aus `docs/abgabe/checkliste.md`. | Aufruf: Skript im PR-Body zählt 26 Zeilen und prüft die Pfade; Browser: Dateien im PR |
| A11 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |
| A12 | Ein Issue, dessen Beschreibung ein externes Bild enthält (`https://tracker.example/pixel.gif`), erzeugt keine Anfrage an diesen Host, und die Seite hat die CSP `img-src 'self' data:`. | End-to-End `frontend/e2e/session-room.spec.ts` (Issue 44) |
| A13 | `docs/umsetzungsplan.md` 4.7 nennt `planningpoker.gitlab.timeout` mit Standard `10s` wie das README. | Browser: Datei im PR |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh` meldet medium für den Anwendungscode unter
`frontend/src/app/` und für `project-rules/`. Tests, E2E, README und `docs/` sind low.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved` nach der manuellen
Checkliste. `verify` läuft auch bei medium. Reviews: Code und Sicherheit.
ADR nötig: nein. Es gibt keine neue Abhängigkeit, keinen Vertragsbruch und keine Abweichung von einer
Regel. Die Hinweise folgen den bestehenden ADRs.

## Umsetzung

Entscheidungen:

- keine

Dateien:

- `frontend/e2e/full-flow.spec.ts`: neu, A1, A2, A4, A6
- `frontend/e2e/layout.spec.ts`: neu, A7
- `frontend/e2e/result-round.spec.ts`: ändern, Szenario vor dem Test zurücksetzen (A8)
- `backend/src/test/java/planningpoker/realtime/SessionSocketTest.java`: ändern, auf `error` warten (A8)
- `frontend/src/app/session/session-page.ts`: ändern, Zustand `session-gone`
- `frontend/src/app/session/session-page.html`: ändern, `session-gone`
- `frontend/src/app/session/session-page.spec.ts`: ändern, A2
- `frontend/src/app/session/session-page.scss`: ändern, schmales Layout
- `frontend/src/app/api/token-store.ts`: ändern, Token einer Sitzung entfernen
- `frontend/src/app/api/token-store.spec.ts`: ändern, Entfernen
- `frontend/src/app/session/issue-panel.ts`: ändern, Fehlerzustand und erneuter Versuch
- `frontend/src/app/session/issue-panel.html`: ändern, Fehlerzustand
- `frontend/src/app/session/issue-panel.spec.ts`: ändern, A3
- `frontend/src/app/join/join-page.ts`: ändern, Session-ID in Großbuchstaben
- `frontend/src/app/join/join-page.spec.ts`: ändern, A4
- `frontend/src/app/session/share-session.ts`: ändern, Rückmeldung bei Fehler
- `frontend/src/app/session/share-session.html`: ändern, Rückmeldung
- `frontend/src/app/session/share-session.spec.ts`: ändern, A5
- `frontend/src/app/session/round-status.html`: ändern, Rundennummer
- `frontend/src/app/session/round-status.spec.ts`: ändern, A6
- `frontend/src/app/session/round-result.html`: ändern, Rundennummer
- `frontend/src/app/session/round-result.spec.ts`: ändern, A6
- `docs/roadmap.md`: ändern, Nachtrag zur Frage Timeout
- `README.md`: ändern, Schnellstart, Abschnitte geprüft, optionale Features, Verweise
- `docs/abgabe/checkliste.md`: neu
- `frontend/src/index.html`: ändern, CSP-Meta-Tag `img-src 'self' data:`
- `frontend/e2e/session-room.spec.ts`: ändern, A12
- `frontend/e2e/gitlab-double/mappings/issue-44.json`: ändern, externes Bild in der Beschreibung, falls es fehlt
- `docs/umsetzungsplan.md`: ändern, 4.7 `planningpoker.gitlab.timeout`
- `docs/abgabe/anforderungen.md`: neu, A10
- `project-rules/testing.md`: ändern, `full-flow.spec.ts` und `layout.spec.ts` in Areas und End-to-End
- `project-rules/frontend.md`: ändern, Fehler- und Leerzustände der Sitzungsseite

Schritte:

1. Unzuverlässige Tests zuerst: die Ursache je Test bestätigen, beheben, fünfmal laufen lassen (A8).
2. Den Zustand `session-gone` zeigen, wenn `GET` oder die WebSocket-Anmeldung `SESSION_NOT_FOUND` meldet. Dazu `TokenStore.remove(sessionId)` und den Link zur Startseite ergänzen.
3. Bedienfeld mit Fehlerzustand und „Erneut versuchen“; CSP-Meta-Tag und A12.
4. Session-ID in Großbuchstaben, Rückmeldung beim Kopieren, Rundennummer.
5. Schmales Layout prüfen und korrigieren.
6. `full-flow.spec.ts` und `layout.spec.ts`.
7. README-Schnellstart in einem frischen Klon ausprobieren und dann die Abschnitte nachziehen.
8. Checkliste und Anforderungszuordnung schreiben. Jeden genannten Test per Pfad prüfen.
9. `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `full-flow.spec.ts`: drei Kontexte, Issues 42 und 43 des Doubles, Kommentar über `/__admin/requests` des Doubles gezählt |
| A2 | `session-page.spec.ts`: Fehler `SESSION_NOT_FOUND` aus Store oder API; `full-flow.spec.ts`: unbekannte ID mit gespeichertem Token |
| A3 | `issue-panel.spec.ts`: 502, dann Erfolg |
| A4 | `join-page.spec.ts`: Route und Eingabe in Kleinbuchstaben; `full-flow.spec.ts`: Beitritt über die Session-ID in Kleinbuchstaben |
| A5 | `share-session.spec.ts`: abgelehnter `writeText` |
| A6 | `round-status.spec.ts`, `round-result.spec.ts`: Runde 2; `full-flow.spec.ts` |
| A7 | `layout.spec.ts`: Viewport 375×800, drei Phasen |
| A8 | `SessionSocketTest`, `result-round.spec.ts` je fünfmal |
| A9 | `/verify`: frischer Klon, Schnellstart mit dem Double |
| A10 | Zählung und Pfadprüfung im PR-Body |
| A11 | `make check`, `make e2e` |
| A12 | `session-room.spec.ts`: `page.on('request')` ohne Anfrage an `tracker.example`; Meta-Tag vorhanden |
| A13 | Datei im PR |

Testdaten:
- Sitzungen über die Startseite.
- GitLab-Double mit den vorhandenen Mappings: Issue 42 für die Runde, Issue 43 für den Wechsel und eine Suche ohne Treffer. Fehlt eine Suche ohne Treffer, kommt ein neues Mapping `frontend/e2e/gitlab-double/mappings/issues-search-empty.json` dazu.

Contracts zu regenerieren: keine.

## Offene Fragen

- [x] Content-Security-Policy gegen externe Bilder in Issue-Beschreibungen (Hinweis aus 0012)? → Ja, `img-src 'self' data:` als Meta-Tag. (Morten Möller, 2026-11-17)
- [x] Trägt diese Spec `planningpoker.gitlab.timeout` (Standard `10s`) in Abschnitt 4.7 von `docs/umsetzungsplan.md` nach? → Ja, im PR von 0019. (Morten Möller, 2026-11-17)

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/session/*.spec.ts`, `frontend/src/app/join/*.spec.ts`, `frontend/src/app/api/token-store.spec.ts`, `backend/src/test/java/planningpoker/realtime/SessionSocketTest.java`, `make e2e`
- Browser: Sitzungsseite bei 375 px, abgelaufene Sitzung, Fehler der Issue-Suche, README und Abgabedokumente im PR
- Aufruf: frischer Klon nach README
