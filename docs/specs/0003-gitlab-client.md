---
id: "0003"
title: GitLab-Client (M4)
status: Review
risk: high
adrs: ["0001"]
owner: Morten Möller
created: 2026-11-16
updated: 2026-11-16
pr: ""
note: freigegeben in der Session
---

# GitLab-Client (M4)

Meilenstein M4 aus `docs/umsetzungsplan.md`. Deckt ab: R-09. Annahmen: A-07 (Kommentar und
optionales Gewicht), A-14 (Konfiguration je Backend-Instanz, fehlender Token stoppt den Start).
Grundlage: Abschnitt 4.7 des Plans, geprüft gegen die GitLab-Dokumentation am 2026-11-16
(Issues-API, Notes-API, Pagination-Header `x-next-page`, Header `PRIVATE-TOKEN`).

## Ziel

Das Backend beherrscht die vier GitLab-Aufrufe aus 4.7 (Issues suchen, Issue laden, Kommentar
schreiben, Gewicht setzen) über einen eigenen Client im Paket `gitlab`, noch ohne eigenen
Endpunkt. GitLab-Fehler werden auf eigene Fehlertypen abgebildet, die 0007 und 0010 in
`ISSUE_NOT_FOUND` oder `GITLAB_ERROR` übersetzen. Der Token erscheint in keinem Fehler und
keinem Log.

## Scope

### Enthalten

- Konfiguration `planningpoker.gitlab.*` als `@ConfigMapping` (Basis-URL, Token, `write-weight`, Timeout); ein fehlender Token stoppt den Start mit dem Namen des Schlüssels.
- REST-Client (MicroProfile REST Client, `quarkus-rest-client-jackson`) für die vier Aufrufe aus 4.7 mit Header `PRIVATE-TOKEN`.
- `GitLabClient` als CDI-Bean mit den Operationen `searchIssues(projectId, search, page)`, `loadIssue(projectId, iid)`, `addNote(projectId, iid, body)`, `setWeight(projectId, iid, weight)`.
- Abbildung von 401, 403, 404, 5xx, Verbindungsfehlern und Timeouts auf `GitLabException` mit einer Ursache (`NOT_FOUND`, `UNAUTHORIZED`, `UNAVAILABLE`); kein GitLab-Fehlertext und kein Token in der Meldung.
- WireMock-Tests je Aufruf für Erfolg, 401, 404 und Timeout; für die Suche leere Liste und Paginierung.

### Nicht enthalten

- Endpunkte und Sitzungslogik, die den Client nutzen (0007, 0010).
- Kommentarvorlage nach 4.7 (0010); hier nimmt `addNote` einen fertigen Text.
- README-Zeile für den neuen Schlüssel `planningpoker.gitlab.timeout` (kommt mit 0007, weil 0002 in dieser Welle das README ändert).
- Änderungen an `application.properties` (0002 ändert die Datei in dieser Welle); Standardwerte stehen im `@ConfigMapping`.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Issue | GitLab-Issue mit `iid`, `title`, `description`, `webUrl`; im Client als `GitLabIssue` |
| Token | hier der GitLab Personal Access Token aus `planningpoker.gitlab.token`, nicht das Teilnehmer-Token |
| GitLab-Double | WireMock im Test (Bibliothek `wiremock-jetty12`), nicht das Standalone-Double der End-to-End-Tests |
| Seite | Ergebnisseite der Issue-Suche mit 20 Einträgen; `nextPage` aus dem Header `x-next-page`, leer auf der letzten Seite |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `searchIssues` ruft `GET /api/v4/projects/{id}/issues?state=opened&search=…&per_page=20&page=…` mit Header `PRIVATE-TOKEN` auf und liefert je Treffer `iid`, `title`, `webUrl` und `nextPage` aus `x-next-page`; eine leere Antwort liefert eine leere Liste ohne `nextPage`; Seite 2 wird mit `page=2` angefragt. | Test `backend/src/test/java/planningpoker/gitlab/GitLabClientTest.java` |
| A2 | `loadIssue` liefert `iid`, `title`, `description`, `webUrl`; 404 wird `GitLabException` mit `NOT_FOUND`, 401 mit `UNAUTHORIZED`, ein Timeout mit `UNAVAILABLE`. | Test `backend/src/test/java/planningpoker/gitlab/GitLabClientTest.java` |
| A3 | `addNote` sendet `POST /api/v4/projects/{id}/issues/{iid}/notes` mit JSON `body`; 401, 404 und Timeout werden wie in A2 abgebildet. | Test `backend/src/test/java/planningpoker/gitlab/GitLabClientTest.java` |
| A4 | `setWeight` sendet `PUT /api/v4/projects/{id}/issues/{iid}` mit JSON `weight`; 404 und Timeout werden wie in A2 abgebildet. | Test `backend/src/test/java/planningpoker/gitlab/GitLabClientTest.java` |
| A5 | Die Meldung jeder `GitLabException` und jede Logzeile des Testprozesses enthält den Token nicht; der Fehlertext von GitLab wird nicht übernommen. | Test `backend/src/test/java/planningpoker/gitlab/GitLabClientTest.java` |
| A6 | Ohne `GITLAB_TOKEN` startet das Backend nicht; die Fehlermeldung nennt `planningpoker.gitlab.token`. | Aufruf: Jar ohne Variable starten |
| A7 | Die Basis-URL kommt aus der Konfiguration; die Tests zeigen auf den WireMock-Port, ohne `application.properties` zu ändern. | Test `backend/src/test/java/planningpoker/gitlab/WireMockGitLab.java` (Test-Ressource) |

## Contracts

keine. Der Client spricht die GitLab-API v4; der eigene Vertrag ändert sich nicht.

## Risiko

Stufe: high
Begründung: Dateien unter `backend/src/main/java/planningpoker/gitlab/` sind medium (kein
Muster); der Eskalator `token` (Header `PRIVATE-TOKEN`, Konfigurationsschlüssel) hebt auf high.
Keine Manifeste, keine Contracts.
Gates: G0 und G1 in dieser Session. G2: Label `human-approved`. G3: Status `verified`. Reviews:
Code, Sicherheit, Architektur.
ADR nötig: nein, weil der REST-Client in ADR 0001 festgelegt ist, die Entscheidung lokal im Paket
`gitlab` bleibt und keine Grundregel ersetzt wird.

## Umsetzung

Entscheidungen:

- Keine neuen Abhängigkeiten (`quarkus-rest-client-jackson`, `wiremock-jetty12` seit 0001).
- Neuer Konfigurationsschlüssel `planningpoker.gitlab.timeout` (Standard `10s`, Verbindungs- und Lesezeit) als Ergänzung zu 4.7, damit Timeouts testbar sind; Standard über `@WithDefault`, nicht in `application.properties`.
- Client-Erzeugung mit `QuarkusRestClientBuilder` aus `GitLabConfig` (Basis-URL, Timeouts, Header-Filter für `PRIVATE-TOKEN`) statt `@RegisterRestClient` mit Schlüsseln in `application.properties`.
- Fehlertyp `GitLabException` (unchecked) mit `Reason` `NOT_FOUND`, `UNAUTHORIZED` (401 und 403), `UNAVAILABLE` (5xx, Timeout, Verbindungsfehler) und dem HTTP-Status; die Meldung nennt nur Aufruf, Status und Ursache.
- GitLab-Felder (`web_url`) über `@JsonProperty` auf camelCase; der Client hat einen eigenen Jackson-Kontext ohne Einfluss auf die REST-Ressourcen.

Dateien:

- `backend/src/main/java/planningpoker/gitlab/GitLabConfig.java`: neu, `@ConfigMapping(prefix = "planningpoker.gitlab")` mit `baseUrl`, `token`, `writeWeight`, `timeout`
- `backend/src/main/java/planningpoker/gitlab/GitLabApi.java`: neu, REST-Client-Interface mit vier Methoden; Suche liefert `Response`, damit `x-next-page` lesbar ist
- `backend/src/main/java/planningpoker/gitlab/GitLabClient.java`: neu, CDI-Bean, baut den Client, führt die vier Aufrufe aus, bildet Fehler ab
- `backend/src/main/java/planningpoker/gitlab/GitLabIssue.java`: neu, Record `iid`, `title`, `description`, `webUrl`
- `backend/src/main/java/planningpoker/gitlab/IssuePage.java`: neu, Record `items`, `nextPage`
- `backend/src/main/java/planningpoker/gitlab/GitLabException.java`: neu, mit `Reason` und Status
- `backend/src/main/java/planningpoker/gitlab/NoteRequest.java`: neu, Record `body`
- `backend/src/main/java/planningpoker/gitlab/WeightRequest.java`: neu, Record `weight`
- `backend/src/test/java/planningpoker/gitlab/WireMockGitLab.java`: neu, `QuarkusTestResourceLifecycleManager`, WireMock auf freiem Port, setzt `planningpoker.gitlab.base-url` und `planningpoker.gitlab.timeout` für den Test
- `backend/src/test/java/planningpoker/gitlab/GitLabClientTest.java`: neu, A1 bis A5

Schritte:

1. `GitLabConfig` mit `@WithDefault` für `base-url` (`https://gitlab.com`), `write-weight` (`false`), `timeout` (`10s`); `token` ohne Standard.
2. `GitLabApi` mit `@Path("/api/v4/projects/{id}/issues")`: `GET` Liste (Query `state`, `search`, `per_page`, `page`), `GET {iid}`, `POST {iid}/notes`, `PUT {iid}`; Produces und Consumes JSON.
3. `GitLabClient`: `QuarkusRestClientBuilder` mit `baseUri`, `connectTimeout` und `readTimeout` aus `timeout`, `ClientRequestFilter` für `PRIVATE-TOKEN`; Methoden fangen `WebApplicationException` und `ProcessingException` und werfen `GitLabException`; `nextPage` aus `x-next-page` (leer oder fehlend bedeutet keine weitere Seite).
4. Test-Ressource `WireMockGitLab` (dynamischer Port, `WireMockServer` aus `wiremock-jetty12`), `GitLabClientTest` mit Stubs je Fall; Timeout über `withFixedDelay` über dem Test-Timeout (`planningpoker.gitlab.timeout=1s` im Test); Header-Prüfung mit `verify(...withHeader("PRIVATE-TOKEN", equalTo(...)))`; Logprüfung wie `LoggingTest` (eigene `processId`).
5. Jar ohne `GITLAB_TOKEN` starten (A6): Meldung mit `planningpoker.gitlab.token`; in dev weiter mit `.env` nach README.
6. `make check`; `make e2e` (Profil `e2e` hat einen Platzhalter-Token, die Startseite ruft GitLab nicht).

Tests:

| Kriterium | Test |
|---|---|
| A1 | `backend/src/test/java/planningpoker/gitlab/GitLabClientTest.java`: Suche mit Treffern und `x-next-page`, leere Liste, Seite 2, Query-Parameter und Header geprüft |
| A2 | `backend/src/test/java/planningpoker/gitlab/GitLabClientTest.java`: Issue laden Erfolg, 404, 401, Timeout |
| A3 | `backend/src/test/java/planningpoker/gitlab/GitLabClientTest.java`: Note Erfolg mit Body-Prüfung, 401, 404, Timeout |
| A4 | `backend/src/test/java/planningpoker/gitlab/GitLabClientTest.java`: Gewicht Erfolg mit Body-Prüfung, 404, Timeout |
| A5 | `backend/src/test/java/planningpoker/gitlab/GitLabClientTest.java`: Meldungen und Logzeilen ohne Token; GitLab-Fehlertext (`message` der Antwort) nicht in der Meldung |
| A6 | Aufruf: `env -u GITLAB_TOKEN java -jar target/quarkus-app/quarkus-run.jar` endet mit Meldung zu `planningpoker.gitlab.token` |
| A7 | `backend/src/test/java/planningpoker/gitlab/WireMockGitLab.java`: Konfiguration über die Test-Ressource |

Testdaten: feste WireMock-Stubs im Test; keine Sitzungen.

Contracts zu regenerieren: keine.

## Offene Fragen

- [x] Welches ADR verlinkt die Spec bei risk high? → ADR 0001 (REST-Client ist dort festgelegt, die Spec folgt ihr nur); kein neues ADR. (Morten Möller, 2026-11-16)
- [x] Ergänzt der Schlüssel `planningpoker.gitlab.timeout` (Standard `10s`) die Tabelle in Abschnitt 4.7 des Umsetzungsplans? → Ja; die Person trägt ihn in `docs/umsetzungsplan.md` nach, 0007 ergänzt die README-Tabelle. (Morten Möller, 2026-11-16)

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/gitlab/`, `make e2e`
- Browser: keiner
- Aufruf: Jar ohne `GITLAB_TOKEN` (A6)
