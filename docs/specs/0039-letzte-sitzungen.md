---
id: "0039"
title: Letzte Sitzungen und Weg zur Startseite
status: done
risk: high
adrs: ["0013"]
owner: Morten Möller
created: 2026-11-18
updated: 2026-11-18
pr: "#41"
note: alle Kriterien erfüllt; make e2e nur in CI
---

# Letzte Sitzungen und Weg zur Startseite

Wunsch der Person: Auf der Startseite stehen die letzten aktiven Sitzungen. Ein Klick führt mit
derselben Rolle zurück, auch als Scrum Master nach geschlossenem Tab. Das Feature ist abschaltbar
für einen Betrieb in offenem Umfeld. Dazu ein Weg aus dem Sitzungsraum zur Startseite, damit der
Scrum Master nach einem Team gleich eine Sitzung für das nächste Team mit anderem Projekt anlegt. Bezug: ADR 0003 (Identität), ADR 0013, Startseite (0022,
0036). Die Spec hängt ab von 0038, weil beide `project-rules/frontend.md` ändern.

## Ziel

Ist das Feature eingeschaltet, zeigt die Startseite bis zu fünf eigene Sitzungen, die noch leben.
Ein Klick öffnet die Sitzung direkt, ohne erneutes Beitreten.

## Scope

### Enthalten

- **Backend-Einstellung:** `planningpoker.session.remember` (Umgebung `PLANNINGPOKER_SESSION_REMEMBER`), Standard `true`. Für den Betrieb in offenem Umfeld auf `false` setzen.
- **Neuer Endpunkt:** `GET /api/config` ohne Anmeldung liefert `{ "rememberSessions": <bool> }`. Die Vertragsversion wird `3.4.0`.
- **Frontend-Speicher** `RecentSessions` in `frontend/src/app/api/`. Er nutzt den `localStorage`-Schlüssel `planningpoker.recent-sessions` mit höchstens fünf Einträgen, der neueste zuerst. Jeder Eintrag hat `sessionId`, `participantId`, `token`, `role`, `name` und `lastUsedAt`. Wer erneut anlegt oder beitritt, schiebt die Sitzung nach vorn. Ungültige Einträge und Ausnahmen beim Lesen oder Schreiben führen zu einer leeren Liste, nie zu einem Fehler auf der Seite.
- **TokenStore:** Bei eingeschaltetem Feature schreibt `store` zusätzlich in `RecentSessions`. `identity` fällt auf den Eintrag zurück, wenn der `sessionStorage` nichts hat, und kopiert ihn dann in den `sessionStorage`. Bei ausgeschaltetem Feature bleibt alles wie in ADR 0003.
- **Startseite:**
  - Ist das Feature eingeschaltet und die Liste nicht leer, zeigt die Startseite den Bereich „Letzte Sitzungen“ (Testid `recent-sessions`).
  - Die Startseite prüft jeden Eintrag mit `GET /api/sessions/{id}` und seinem Token. Antwortet das Backend mit 404 oder 401, wird der Eintrag entfernt. Bei anderen Fehlern bleibt er, ohne Details.
  - Eine Zeile (Testid `recent-session`) zeigt Projektname, aktives Issue (`#iid Titel`) oder „Kein Issue aktiv“, Rolle, eigenen Namen, Session-ID und „zuletzt vor …“.
  - Ein Klick auf die Zeile öffnet `/session/:id`.
  - Der Knopf „Aus Liste entfernen“ (Testid `recent-session-remove`) löscht nur den Eintrag im Browser.
- **Feature aus:** Kein Bereich wird gezeigt, nichts wird gespeichert, und eine vorhandene Liste wird beim Laden der Startseite gelöscht.
- **Weg zur Startseite:**
  - Der Titel „Planning Poker“ in der Toolbar wird ein Link auf `/` (Testid `toolbar-home`), auf jeder Seite und für jede Rolle.
  - Im Sitzungsraum hat der Scrum Master in der Seitenleiste unter „Teilen“ einen Knopf „＋ Neue Sitzung“ (Testid `new-session`). Er öffnet die Startseite.
  - Das Verlassen beendet die Sitzung nicht. Sie läuft weiter, und mit eingeschaltetem Feature steht sie in „Letzte Sitzungen“.
- **Mock-Backend:** liefert `GET /api/config` mit `true`.
- **Doku:**
  - ADR 0013 und `docs/adr/README.md`.
  - README: Umgebungsvariable und „Verbleibendes Risiko“.
  - `.env.example`: Zeile auskommentiert mit Standard `true` und dem Hinweis „in offenem Umfeld auf false setzen, das Token liegt sonst im localStorage“.
  - `project-rules/frontend.md`, `project-rules/backend.md` und `project-rules/testing.md`.

### Nicht enthalten

- Das SSO selbst: Es sitzt als Proxy vor der Anwendung und ist nicht Teil des Repositorys.
- Eine serverseitige Liste von Sitzungen und das Verlassen einer Sitzung auf dem Server.
- Mehr als fünf Einträge und eine Einstellung der Anzahl.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Letzte Sitzungen | Liste im Browser mit den eigenen, noch lebenden Sitzungen samt Zugang; neu, mit /domain ins Glossar |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `GET /api/config` antwortet ohne Token mit 200 und `rememberSessions` aus der Einstellung, Standard `true`; mit `false` in einem Testprofil `false`. | Test `backend/src/test/java/planningpoker/platform/ConfigResourceTest.java` |
| A2 | Der Vertrag enthält `getConfig` und `ConfigResponse`, `info.version` ist `3.4.0`, und `make drift` ist grün. | Test `backend/src/test/java/planningpoker/session/api/ContractTest.java`; Aufruf `make drift` |
| A3 | `RecentSessions` hält höchstens fünf Einträge, den neuesten zuerst. Erneutes Speichern derselben Sitzung schiebt sie nach vorn, `remove` und `clear` löschen. Ungültiges JSON und Ausnahmen des Speichers ergeben eine leere Liste. | Unit `frontend/src/app/api/recent-sessions.spec.ts` |
| A4 | `TokenStore` mit Feature an: `store` schreibt auch in `RecentSessions`, und `identity` liefert ohne `sessionStorage` den Eintrag. Mit Feature aus bleibt alles wie bisher: Es gibt keinen Eintrag und keinen Rückfall. | Unit `frontend/src/app/api/token-store.spec.ts` |
| A5 | Die Startseite zeigt mit Feature an die geprüften Einträge mit Projekt, Issue, Rolle, Name und Session-ID. Einträge mit 404 oder 401 verschwinden, „Aus Liste entfernen“ löscht. Mit Feature aus gibt es keinen Bereich, und die Liste ist leer. | Unit `frontend/src/app/start/start-page.spec.ts` |
| A6 | Im Browser mit Feature an: Sitzung als Scrum Master anlegen, Tab schließen, neuen Tab auf `/` öffnen. Die Sitzung steht in der Liste, ein Klick öffnet sie als Scrum Master mit Issue-Panel. | End-to-End `frontend/e2e/recent-sessions.spec.ts` (neu) |
| A7 | Im Browser mit Feature aus: Nach dem Anlegen bleibt der `localStorage`-Schlüssel `planningpoker.recent-sessions` leer, und die Startseite zeigt keinen Bereich. | End-to-End `frontend/e2e/recent-sessions.spec.ts`, mit einem über `page.route` gestellten `GET /api/config` |
| A8 | Der Titel in der Toolbar ist ein Link auf `/`. Der Scrum Master sieht im Raum „＋ Neue Sitzung“, Entwickler sehen ihn nicht. Der Knopf führt zur Startseite, wo Name und Projekt aus 0036 vorbelegt sind. | Unit `frontend/src/app/shell/app-shell.spec.ts`, `frontend/src/app/session/share-session.spec.ts`; End-to-End `frontend/e2e/recent-sessions.spec.ts` (zweite Sitzung mit anderem Projekt anlegen, beide stehen in der Liste) |
| A9 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

`contracts/api/openapi.yaml` und `frontend/src/app/api/schema.d.ts` werden mit `make contracts`
generiert. Neu sind der Pfad `/api/config` (`getConfig`) und das Schema `ConfigResponse` mit dem
Pflichtfeld `rememberSessions`. Die Änderung ist additiv, Verbraucher ist nur das Frontend dieses
Repositorys. Version `3.3.0` wird `3.4.0`.

## Risiko

Stufe: high
Begründung:
- `harness/scripts/risk-level.sh` meldet high für `contracts/**` und `**/*.env*`.
- Inhaltlich liegt das Teilnehmer-Token bei eingeschaltetem Feature im `localStorage` (ADR 0013).

Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved` und G3 über den Status
`verified`. Reviews: Code, Sicherheit und Architektur.
ADR nötig: ja, 0013. Sie ändert die Token-Ablage aus ADR 0003 für das eingeschaltete Feature.

## Umsetzung

Entscheidungen:

- ADR 0013: Token im `localStorage` nur bei `planningpoker.session.remember=true`, Standard an, abschaltbar.
- Neuer öffentlicher Endpunkt `GET /api/config` im Paket `platform`, Vertrag `3.4.0` über `make contracts`.
- Neuer Speicher `RecentSessions` in `frontend/src/app/api/`. `TokenStore` nutzt ihn nur bei eingeschaltetem Feature.

Dateien:

- `docs/adr/0013-letzte-sitzungen-im-browser.md`: neu
- `docs/adr/README.md`: ändern, Zeile 0013
- `backend/src/main/java/planningpoker/platform/ConfigResource.java`: neu
- `backend/src/main/java/planningpoker/session/SessionConfig.java`: ändern, `remember()` mit Standard `true`
- `backend/src/main/resources/application.properties`: ändern, `info-version` 3.4.0
- `backend/src/test/java/planningpoker/platform/ConfigResourceTest.java`: neu, A1
- `backend/src/test/java/planningpoker/session/api/ContractTest.java`: ändern, A2
- `contracts/api/openapi.yaml`: ändern, generiert
- `frontend/src/app/api/schema.d.ts`: ändern, generiert
- `frontend/src/app/api/api.service.ts`: ändern, `config()`
- `frontend/src/app/api/recent-sessions.ts`: neu
- `frontend/src/app/api/recent-sessions.spec.ts`: neu, A3
- `frontend/src/app/api/token-store.ts`: ändern
- `frontend/src/app/api/token-store.spec.ts`: ändern, A4
- `frontend/src/app/api/mock/mock-backend.interceptor.ts`: ändern, `GET /api/config`
- `frontend/src/app/start/start-page.ts`: ändern, Liste laden, prüfen, entfernen
- `frontend/src/app/start/start-page.html`: ändern, Bereich „Letzte Sitzungen“
- `frontend/src/app/start/start-page.scss`: ändern
- `frontend/src/app/start/start-page.spec.ts`: ändern, A5
- `frontend/src/app/shell/app-shell.html`: ändern, Titel als Link
- `frontend/src/app/shell/app-shell.scss`: ändern, Link-Stil
- `frontend/src/app/shell/app-shell.spec.ts`: ändern, A8
- `frontend/src/app/session/share-session.html`: ändern, „＋ Neue Sitzung“
- `frontend/src/app/session/share-session.ts`: ändern, Rolle
- `frontend/src/app/session/share-session.scss`: ändern
- `frontend/src/app/session/share-session.spec.ts`: ändern, A8
- `frontend/e2e/recent-sessions.spec.ts`: neu, A6 bis A8
- `.env.example`: ändern, Zeile auskommentiert
- `README.md`: ändern, Umgebungsvariable, „Verbleibendes Risiko“
- `project-rules/frontend.md`: ändern
- `project-rules/backend.md`: ändern
- `project-rules/testing.md`: ändern

Schritte:

1. ADR 0013, Einstellung, `ConfigResource`, Test, `info-version`, `make contracts`, `ContractTest`.
2. `RecentSessions`, `TokenStore`, `ApiService.config()`, Mock-Backend.
3. Startseite: Bereich, Prüfung der Einträge, Entfernen, Löschen bei ausgeschaltetem Feature.
4. Titel als Link, „＋ Neue Sitzung“ für den Scrum Master.
5. E2E-Fälle, Doku, `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `ConfigResourceTest` |
| A2 | `ContractTest`, `make drift` |
| A3 | `recent-sessions.spec.ts` |
| A4 | `token-store.spec.ts` |
| A5 | `start-page.spec.ts` |
| A6, A7 | `recent-sessions.spec.ts` |
| A8 | `app-shell.spec.ts`, `share-session.spec.ts`, `recent-sessions.spec.ts` |
| A9 | `make check`, `make e2e` |

Testdaten: GitLab-Double wie bisher. In E2E schließt ein neuer Tab im selben Browserkontext den
alten (`context.newPage()` nach `page.close()`), damit `localStorage` bleibt und `sessionStorage`
leer ist.

Contracts zu regenerieren: `make contracts` (`contracts/api/openapi.yaml`,
`frontend/src/app/api/schema.d.ts`).

## Offene Fragen

- [x] Was soll die Liste können? → Zurückkehren mit Rolle, abschaltbar für den Betrieb in offenem Umfeld. Geplant ist ein Betrieb hinter Microsoft SSO. (Morten Möller, 2026-11-18)
- [x] Standard an oder aus? → An; in offenem Umfeld schaltet der Betreiber es ab. (Morten Möller, 2026-11-18)
- [x] Wie kommt der Scrum Master aus dem Raum zur Startseite, um für das nächste Team eine Sitzung anzulegen? → Titel in der Toolbar als Link und Knopf „＋ Neue Sitzung“ für den Scrum Master; die Sitzung läuft weiter. (Morten Möller, 2026-11-18)
- [x] Wie viele Einträge? → Die letzten fünf, nur Sitzungen, die noch leben. (Morten Möller, 2026-11-18)

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/platform/`, `backend/src/test/java/planningpoker/session/api/`, `frontend/src/app/api/`, `frontend/src/app/start/`, `make e2e`
- Browser: Startseite mit Feature an und aus, Rückkehr als Scrum Master und als Entwickler nach geschlossenem Tab, „＋ Neue Sitzung“ und zweite Sitzung
- Aufruf: `make drift`
