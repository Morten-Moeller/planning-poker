---
id: "0011"
title: Erstellen und Beitreten (M9)
status: approved
risk: high
adrs: ["0003", "0004"]
owner: Morten Möller
created: 2026-11-16
updated: 2026-11-16
pr: ""
note: freigegeben in der Session
---

# Erstellen und Beitreten (M9)

Meilenstein M9 aus `docs/umsetzungsplan.md`. Deckt ab: R-01 bis R-03 im Frontend. Annahmen:
A-03 (Issue bei der Erstellung), A-08 (Token im `sessionStorage`), A-13 (Namen), A-15
(deutsche Texte je `errorCode`), A-17 (Session-ID zum Abtippen). Grundlage: das Grundgerüst
aus 0005, die Endpunkte aus 0006 und 0007.

## Ziel

Eine Sitzung lässt sich anlegen, teilen und betreten: die Startseite bietet das Formular zum
Erstellen (Name, GitLab-Projekt-ID, Issue-Nummer) und den Beitritt per Session-ID; nach dem
Erstellen landet der Scrum Master im Sitzungsraum mit Beitrittslink und Session-ID zum Kopieren;
die Beitrittsseite nimmt den Namen und meldet unbekannte Sitzungen und vergebene Namen. Die
End-to-End-Umgebung erhält das GitLab-Double, damit die Abläufe gegen das echte Backend laufen.

## Scope

### Enthalten

- Startseite: Formular „Sitzung erstellen“ (Name 1 bis 30 Zeichen, Projekt-ID, Issue-Nummer positiv) mit Validierung und Anzeige der Fehler `ISSUE_NOT_FOUND`, `GITLAB_ERROR`, `VALIDATION_ERROR`; Feld „Session-ID“ mit „Beitreten“ (8 Zeichen, Großschreibung erzwungen), führt auf `/session/:id/join`.
- Beitrittsseite: Formular mit Name; Fehler `SESSION_NOT_FOUND` und `NAME_TAKEN` am Formular; Erfolg speichert Token und Teilnehmer-ID und führt in den Sitzungsraum.
- Sitzungsraum: Block „Teilen“ mit Beitrittslink (`<origin>/session/<id>/join`) und Session-ID, je mit Kopier-Schaltfläche (Clipboard API, Rückmeldung „Kopiert“).
- GitLab-Double der End-to-End-Umgebung: feste Mappings für Projekt `1234` mit Issues 42 und 43, Suche, Notes und Gewicht; Start durch Playwright als dritter `webServer`; Backend-Basis-URL über `-Dplanningpoker.gitlab.base-url`.
- End-to-End-Abläufe: Erstellen und Raum als Scrum Master; Beitritt über den Link und über die Session-ID in einem zweiten Browser-Kontext als Entwickler; unbekanntes Issue zeigt die Meldung und legt keine Sitzung an; vergebener Name.
- Mock-Backend (`start:mock`) beantwortet die neuen Fehlerfälle (Issue 404 für `issueIid` 404, Name `Ben` als vergeben), damit der Browser-Gang ohne Backend bleibt.

### Nicht enthalten

- Teilnehmerliste, Issue-Auswahl, Kartenfächer, Auflösung (0012 bis 0014); der Sitzungsraum bleibt der Platzhalter aus 0005 plus Block „Teilen“.
- Backend-Änderungen; Vertragsänderungen.
- Entfernen der Platzhalter-Knöpfe aus 0005: sie werden durch die Formulare ersetzt.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Sitzung, Session-ID, Teilnehmer, Scrum Master, Entwickler, Token, Vorausgewähltes Issue, GitLab-Double | wie im Glossar |
| Beitrittslink | `<origin>/session/<Session-ID>/join`; öffnet die Beitrittsseite der Sitzung |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Die Startseite zeigt das Formular „Sitzung erstellen“ (`data-testid` `create-name`, `create-project`, `create-issue`, `create-submit`); leere oder zu lange Namen, leere Projekt-ID und Issue-Nummer kleiner 1 blockieren das Absenden mit Fehlertext am Feld; nach dem Erstellen landet der Ersteller im Sitzungsraum mit Rolle „Scrum Master“. | End-to-End `frontend/e2e/create-and-join.spec.ts`; Unit `frontend/src/app/start/start-page.spec.ts` |
| A2 | Im Sitzungsraum zeigt der Block „Teilen“ (`session-share`) den Beitrittslink (`share-link`) und die Session-ID (`share-session-id`) je mit Kopier-Schaltfläche (`copy-link`, `copy-session-id`); nach dem Klick erscheint „Kopiert“ und die Zwischenablage enthält den Wert. | End-to-End `frontend/e2e/create-and-join.spec.ts` (Clipboard-Berechtigung im Kontext) |
| A3 | Ein zweiter Browser-Kontext öffnet den Beitrittslink, gibt einen Namen ein (`join-name`, `join-submit`) und landet als „Entwickler“ im Sitzungsraum; der Scrum Master sieht danach zwei Teilnehmer (`session-participant-count`). | End-to-End `frontend/e2e/create-and-join.spec.ts` |
| A4 | Der Beitritt gelingt auch über die Startseite: Eingabe der Session-ID (`join-session-id-input`, `join-session-id-submit`, Kleinbuchstaben werden Großbuchstaben) führt auf die Beitrittsseite der Sitzung. | End-to-End `frontend/e2e/create-and-join.spec.ts`; Unit `frontend/src/app/start/start-page.spec.ts` |
| A5 | Ein unbekanntes Issue (`issueIid` 404 im Double) zeigt am Formular den Text „Das Issue wurde im GitLab-Projekt nicht gefunden“ und bleibt auf der Startseite; die Felder behalten ihre Werte. | End-to-End `frontend/e2e/create-and-join.spec.ts` |
| A6 | Ein vergebener Name auf der Beitrittsseite zeigt „Der Name ist in dieser Sitzung schon vergeben“; eine unbekannte Session-ID zeigt „Die Sitzung wurde nicht gefunden oder ist abgelaufen“. | End-to-End `frontend/e2e/create-and-join.spec.ts`; Unit `frontend/src/app/join/join-page.spec.ts` |
| A7 | `make e2e` startet das GitLab-Double, das Backend im Profil `e2e` gegen das Double und das Frontend; die Abläufe laufen lokal und in der CI (`gates (e2e)`) grün; `health.spec.ts` bleibt grün. | Aufruf `make e2e`; CI |
| A8 | Jeder neue Text trägt eine i18n-ID; Formularfelder haben Beschriftungen und sind per Tastatur bedienbar; `make lint` ist grün. | Aufruf `make lint`; Browser |

## Contracts

keine. Das Frontend nutzt die Endpunkte und Typen aus `frontend/src/app/api/schema.d.ts`.

## Risiko

Stufe: high
Begründung: `frontend/src/**` ist medium (kein Muster); der Eskalator `token` greift über die
Ablage des Tokens nach dem Erstellen und Beitreten. `frontend/playwright.config.ts` und das
Double sind medium; End-to-End-Specs und `project-rules/` medium beziehungsweise low. Keine
Contracts, keine Manifeste.
Gates: G0 und G1 in dieser Session. G2: Label `human-approved`. G3: Status `verified`. Reviews:
Code, Sicherheit, Architektur.
ADR nötig: nein, weil ADR 0003 (Token im `sessionStorage`) und ADR 0004 (Store) die
Entscheidungen festlegen und diese Spec ihnen folgt.

## Umsetzung

Entscheidungen:

- Keine neuen Abhängigkeiten; Formulare mit Angular Reactive Forms und Angular Material (`mat-form-field`, `mat-input`, `mat-button`), beides seit 0001 vorhanden.
- GitLab-Double als WireMock Standalone (von der Person bestätigt): das Jar `org.wiremock:wiremock-standalone:3.13.1` wird über `backend/mvnw dependency:copy` nach `backend/target/gitlab-double/` geholt; Mappings unter `frontend/e2e/gitlab-double/mappings/`; Playwright startet es als `webServer` auf `GITLAB_DOUBLE_PORT` (Standard `8089`) und übergibt dem Backend `-Dplanningpoker.gitlab.base-url`.
- Fehler am Formular: der `ApiError` aus dem Interceptor wird in der Seite abgefangen (`errorCode` zu Text über `ErrorMessages`) und am Formular gezeigt; das globale Banner bleibt für Fehler außerhalb von Formularen.
- Kopieren über `navigator.clipboard.writeText`; ohne Clipboard-API bleibt der Text markierbar.
- Der Block „Teilen“ ist eine eigene Komponente `share-session`, die 0012 übernimmt.

Dateien:

- `frontend/src/app/start/start-page.ts`: ändern, Formular Erstellen, Beitritt per Session-ID
- `frontend/src/app/start/start-page.html`: ändern
- `frontend/src/app/start/start-page.spec.ts`: ändern, Validierung, Navigation, Fehler am Formular
- `frontend/src/app/join/join-page.ts`: ändern, Formular Name
- `frontend/src/app/join/join-page.html`: ändern
- `frontend/src/app/join/join-page.spec.ts`: neu, Fehler `SESSION_NOT_FOUND`, `NAME_TAKEN`, Erfolg
- `frontend/src/app/session/share-session.ts`: neu, Link, ID, Kopieren
- `frontend/src/app/session/share-session.html`: neu
- `frontend/src/app/session/share-session.spec.ts`: neu, Link aus `location.origin`, Kopieren mit Fake-Clipboard
- `frontend/src/app/session/session-page.html`: ändern, `share-session` einbinden
- `frontend/src/app/session/session-page.ts`: ändern, Import
- `frontend/src/app/api/error-messages.ts`: ändern, Texte für Formularfehler, falls sie fehlen
- `frontend/src/app/api/mock/mock-backend.interceptor.ts`: ändern, Fehlerfälle Issue 404 und Name `Ben`
- `frontend/e2e/create-and-join.spec.ts`: neu, A1 bis A6
- `frontend/e2e/gitlab-double/mappings/issue-42.json`: neu
- `frontend/e2e/gitlab-double/mappings/issue-43.json`: neu
- `frontend/e2e/gitlab-double/mappings/issue-404.json`: neu, 404
- `frontend/e2e/gitlab-double/mappings/issues-search.json`: neu
- `frontend/e2e/gitlab-double/mappings/issue-notes.json`: neu, 201
- `frontend/e2e/gitlab-double/mappings/issue-weight.json`: neu, 200
- `frontend/playwright.config.ts`: ändern, dritter `webServer`, Basis-URL an das Backend
- `Makefile`: ändern, Ziel `gitlab-double` (Jar holen) als Teil von `install`
- `project-rules/testing.md`: ändern, End-to-End mit Double, Testdaten aus den Mappings

Schritte:

1. `start-page`: Reactive Form (`name`, `gitlabProjectId`, `issueIid`) mit Validatoren; Submit ruft `createSession`, speichert Token, navigiert; Fehler je `errorCode` am Formular; zweites Formular `sessionId` (Pattern `[A-Z2-9]{8}`, Eingabe wird groß geschrieben) navigiert auf `/session/:id/join`. Health-Anzeige bleibt.
2. `join-page`: Form `name`; Fehler am Formular; Erfolg wie bisher.
3. `share-session` mit `input` `sessionId`, Link aus `location.origin`; Kopieren mit Rückmeldung; in `session-page.html` oberhalb der Daten.
4. Mock-Backend: `issueIid` 404 antwortet 404 `ISSUE_NOT_FOUND`, Name `Ben` antwortet 409 `NAME_TAKEN`, Sitzung außer `K7P2QX9M` 404.
5. GitLab-Double: Mappings nach dem Format von WireMock (`request.urlPath`, `response.jsonBody`); `make gitlab-double` holt das Jar (`dependency:copy`); `playwright.config.ts`: `webServer` für das Double (`java -jar … --port … --root-dir frontend/e2e/gitlab-double`, `url` `/__admin/health`), Backend mit `-Dplanningpoker.gitlab.base-url=http://localhost:<port>`.
6. `create-and-join.spec.ts`: Szenarien A1 bis A6 mit zwei Kontexten, Clipboard-Berechtigung (`context.grantPermissions(['clipboard-read','clipboard-write'])`), Selektoren über `data-testid`.
7. `project-rules/testing.md` (Double, Ports, Named States aus den Mappings); `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `frontend/e2e/create-and-join.spec.ts`: Erstellen bis zum Raum; `frontend/src/app/start/start-page.spec.ts`: Validatoren, Fehlertexte |
| A2 | `frontend/e2e/create-and-join.spec.ts`: Teilen-Block, Kopieren; `frontend/src/app/session/share-session.spec.ts` |
| A3 | `frontend/e2e/create-and-join.spec.ts`: zweiter Kontext über den Link |
| A4 | `frontend/e2e/create-and-join.spec.ts`: Beitritt über die Session-ID; `start-page.spec.ts`: Großschreibung, Navigation |
| A5 | `frontend/e2e/create-and-join.spec.ts`: Issue 404 |
| A6 | `frontend/e2e/create-and-join.spec.ts`: Name vergeben, unbekannte Sitzung; `join-page.spec.ts` |
| A7 | Aufruf `make e2e`; CI `gates (e2e)` |
| A8 | Aufruf `make lint`; Browser (Tab-Reihenfolge, Beschriftungen) |

Testdaten: die Mappings des GitLab-Doubles (Projekt `1234`, Issues 42 und 43, Issue 404 fehlt); Sitzungen entstehen im Ablauf über die Oberfläche.

Contracts zu regenerieren: keine.

## Offene Fragen

- [x] GitLab-Double als WireMock Standalone oder als Node-Skript? → WireMock Standalone: Jar über `backend/mvnw dependency:copy`, Mappings als JSON, Start durch Playwright. (Morten Möller, 2026-11-16)

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/start/*.spec.ts`, `frontend/src/app/join/*.spec.ts`, `frontend/src/app/session/*.spec.ts`, `make e2e` (`health.spec.ts`, `create-and-join.spec.ts`)
- Browser: Startseite, Beitrittsseite, Sitzungsraum (Block „Teilen“) über `make e2e` und `pnpm -C frontend start:mock`
- Aufruf: `make lint` (A8)
