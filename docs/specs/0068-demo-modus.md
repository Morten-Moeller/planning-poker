---
id: "0068"
title: "Demo-Modus ohne GitLab-Token"
status: Review
risk: high
adrs: ["0018"]
owner: Morten Möller
created: 2026-11-26
updated: 2026-11-27
pr: ""
note: freigegeben in der Session
---

# Demo-Modus ohne GitLab-Token

## Ziel

Wer das öffentliche Repository klont, soll die Anwendung ohne GitLab-Konto und ohne Token
ausprobieren können. Ohne `GITLAB_TOKEN` startet das Backend im Demo-Modus mit Beispielprojekten
und Beispiel-Issues im Arbeitsspeicher, und beide Frontends zeigen, dass sie im Demo-Modus laufen.
Gelöst ist es, wenn ein frischer Klon mit leerem `GITLAB_TOKEN` den ganzen Ablauf von „Sitzung
anlegen“ bis „Ergebnis übernehmen“ durchläuft, ohne dass ein Aufruf das Backend verlässt.

## Scope

Gilt für beide Frontends (ADR 0016): Der Hinweis erscheint im Angular- und im React-Frontend mit
demselben Text und derselben Test-ID.

### Enthalten

- Backend: `planningpoker.gitlab.token` ist optional. Fehlt der Wert oder ist er leer, beantwortet
  `GitLabClient` jeden Aufruf aus einem eingebauten Ersatz mit festen Demo-Daten.
- Demo-Daten: zwei Projekte mit zusammen mindestens zwölf offenen Issues, Titel und Beschreibung
  auf Deutsch, Beschreibungen mit Markdown (Überschrift, Liste, Code), mindestens drei Issues mit
  Gewicht, Änderungszeiten über mehr als ein Jahr verteilt, sodass jeder Zeitraum-Filter eine
  andere Menge zeigt.
- Suche, Gewichtsfilter, Zeitraum-Filter, Sortierung, Seiten von 20 und Gesamtzahl im Demo-Modus
  wie bei GitLab.
- „Ergebnis übernehmen“ schreibt Kommentar und, mit `write-weight`, das Gewicht in die Demo-Daten
  im Arbeitsspeicher.
- `GET /api/config` meldet `demo`.
- Hinweis `demo-hint` unter der Toolbar auf jeder Seite beider Frontends.
- README, `.env.example`, Glossar und Regeln.

### Nicht enthalten

- Die Bildschirmaufnahme für das README. Sie entsteht nach dem Merge mit dem Angular-Frontend im
  Demo-Modus als GIF und kommt mit einem eigenen Doku-PR.
- Ein öffentlich gehostetes Demo-System.
- Ein eigener Schalter für den Demo-Modus. Er hängt nur am fehlenden Token (ADR 0018).
- Änderungen an der Projekt-Allowlist. Sie gilt im Demo-Modus unverändert; eine Liste mit IDs,
  die es in den Demo-Daten nicht gibt, zeigt keine Projekte.
- Anzeige der geschriebenen Kommentare.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Demo-Modus | Zustand einer Backend-Instanz ohne GitLab-Token: Projekte und Issues kommen aus festen Beispieldaten im Arbeitsspeicher, kein Aufruf geht an GitLab. Neu, mit /domain ins Glossar. |
| GitLab-Double | Unverändert: WireMock für End-to-End-Tests. Der Demo-Modus nutzt es nicht. |
| Projekt-Allowlist | Unverändert. |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Ohne `planningpoker.gitlab.token` (nicht gesetzt oder nur Leerzeichen) startet das Backend und schreibt beim Start genau eine Zeile auf `WARN`, die den Demo-Modus nennt. Mit Token gibt es diese Zeile nicht. | Test |
| A2 | `GET /api/config` antwortet ohne Token mit `demo: true`, mit Token mit `demo: false`; `rememberSessions` bleibt wie bisher. | Test |
| A3 | Im Demo-Modus liefert `GET /api/projects` die zwei Demo-Projekte; `search` filtert nach dem Namen ohne Beachtung der Groß- und Kleinschreibung. Ein unbekanntes Projekt antwortet beim Anlegen ohne Issue mit 404 `PROJECT_NOT_FOUND`, ein unbekanntes Issue mit 404 `ISSUE_NOT_FOUND`. | Test |
| A4 | Im Demo-Modus liefert die Issue-Suche eines Projekts: `search` als Teil des Titels, Gewicht `None` und `Any`, `updatedAfter`, Sortierung nach letzter Änderung absteigend, Seiten von 20 mit `nextPage` und die Gesamtzahl `total`. | Test |
| A5 | Im Demo-Modus läuft der Ablauf anlegen, Issue freigeben, Schätzung starten, abstimmen, auflösen, bestätigen bis 204 und Phase `LOBBY`. Mit `write-weight=true` und Zahlenkarte trägt das Issue danach dieses Gewicht und fehlt in der Liste mit Gewichtsfilter `NONE`. Ein WireMock unter der eingestellten `base-url` zählt dabei null Aufrufe. | Test |
| A6 | Mit Token verhält sich das Backend wie bisher: Die bestehenden Tests von `gitlab` und `session` laufen ohne Änderung an ihren Erwartungen. | Test |
| A7 | Bei `demo: true` zeigen beide Frontends auf Startseite, Beitrittsseite und im Raum unter der Toolbar den Hinweis `demo-hint` mit dem Text „Demo-Modus: Projekte und Issues sind Beispiele. Ergebnisse gehen nicht an GitLab.“ Bei `demo: false` und wenn `GET /api/config` fehlschlägt, gibt es den Hinweis nicht. | Test, Bildschirm (/verify: Startseite und Raum, beide Frontends, Backend ohne Token) |
| A8 | `contracts/api/openapi.yaml` hat die Version `4.1.0` und in `ConfigResponse` das Pflichtfeld `demo`; `make drift` ist grün. | Aufruf |
| A9 | Das README beschreibt den Demo-Modus im Schnellstart, in der Tabelle des Abschnitts GitLab und in einem Abschnitt „Demo-Modus“; `.env.example` nennt ihn an der Zeile `GITLAB_TOKEN`. Der Satz „Ohne `GITLAB_TOKEN` startet das Backend nicht“ ist entfernt. | Aufruf (`grep`) |

## Contracts

`contracts/api/openapi.yaml`: `ConfigResponse` bekommt das Pflichtfeld `demo` (boolean), Version
`4.0.0` wird `4.1.0`. Additiv; Konsumenten sind die beiden Frontends
(`frontend/src/app/api/schema.d.ts`, `frontend-react/src/api/schema.d.ts`), beide neu generiert
mit `make contracts`. Die Beispiel-Snapshots unter `contracts/api/examples/` ändern sich nicht.

## Risiko

Stufe: high
Begründung: `contracts/api/openapi.yaml` (`contracts/**`) und `.env.example` (`**/*.env*`); dazu
Code in Backend und beiden Frontends und `project-rules/`.
Gates: G2 (Label `human-approved` nach dem letzten Push), G3 (Status `verified`), KI-Review Code,
Sicherheit und Architektur.
ADR nötig: ja, 0018 (hohes Risiko; Entscheidung mit Alternativen über Backend, Vertrag und beide
Frontends).

## Umsetzung

Entscheidungen:

- Kein Token heißt Demo-Modus: Das Backend startet ohne `GITLAB_TOKEN`, statt mit einem Fehler zu
  enden (ADR 0018). Ein fehlender Token im Betrieb fällt nur am Log und am Hinweis auf.
- Vertrag `4.1.0`: `ConfigResponse.demo` als Pflichtfeld, additiv.
- Neue Klasse `planningpoker.gitlab.DemoGitLab` und Ressource `demo-gitlab.json`; `GitLabClient`
  bleibt der einzige Einstieg, kein Interface. Keine neue Abhängigkeit.
- Die Links der Demo-Projekte und Demo-Issues zeigen auf `https://gitlab.example.com/demo/…` und
  führen zu keiner Seite.
- Der Hinweis hängt in beiden Frontends an der Shell; die Einstellung kommt aus demselben Aufruf
  von `GET /api/config`, der schon `rememberSessions` lädt.

Dateien:

- `docs/adr/0018-demo-modus-ohne-gitlab-token.md`: neu
- `docs/adr/README.md`: ändern, Zeile 0018
- `docs/domain/glossary.md`: ändern, Begriff Demo-Modus
- `backend/src/main/resources/application.properties`: ändern, `planningpoker.gitlab.token=${GITLAB_TOKEN:}`, Version `4.1.0`
- `backend/src/main/resources/demo-gitlab.json`: neu, Demo-Projekte und Demo-Issues
- `backend/src/main/java/planningpoker/gitlab/GitLabConfig.java`: ändern, `Optional<String> token()`, `demo()`
- `backend/src/main/java/planningpoker/gitlab/GitLabClient.java`: ändern, im Demo-Modus an `DemoGitLab`, Zeile auf `WARN` beim Start
- `backend/src/main/java/planningpoker/gitlab/DemoGitLab.java`: neu, Suche, Filter, Seiten, Kommentar, Gewicht im Arbeitsspeicher
- `backend/src/main/java/planningpoker/platform/ConfigResource.java`: ändern, Feld `demo`
- `backend/src/test/java/planningpoker/gitlab/DemoGitLabTest.java`: neu
- `backend/src/test/java/planningpoker/gitlab/DemoModeTest.java`: neu, Quarkus-Test mit Profil ohne Token
- `backend/src/test/java/planningpoker/platform/ConfigResourceTest.java`: ändern, `demo: false`
- `contracts/api/openapi.yaml`: generiert
- `frontend/src/app/api/schema.d.ts`: generiert
- `frontend-react/src/api/schema.d.ts`: generiert
- `frontend/src/app/api/demo-mode.ts`: neu, Signal für den Demo-Modus
- `frontend/src/app/api/recent-sessions.ts`: ändern, der Aufruf von `config` setzt auch den Demo-Modus
- `frontend/src/app/api/recent-sessions.spec.ts`: ändern
- `frontend/src/app/api/mock/mock-backend.interceptor.ts`: ändern, `demo: false`
- `frontend/src/app/shell/app-shell.ts`: ändern
- `frontend/src/app/shell/app-shell.html`: ändern, `demo-hint`, Text `@@shell.demoHint`
- `frontend/src/app/shell/app-shell.scss`: ändern
- `frontend/src/app/shell/app-shell.spec.ts`: ändern
- `frontend-react/src/api/demo-mode.ts`: neu, Store für den Demo-Modus
- `frontend-react/src/api/recent-sessions.ts`: ändern, der Aufruf von `config` setzt auch den Demo-Modus
- `frontend-react/src/api/recent-sessions.spec.ts`: ändern
- `frontend-react/src/shell/app-shell.tsx`: ändern, `demo-hint`
- `frontend-react/src/shell/app-shell.module.css`: ändern
- `frontend-react/src/shell/app-shell.spec.tsx`: ändern
- `frontend-react/src/shell/messages.ts`: ändern, Text des Hinweises
- `frontend/e2e/demo-mode.spec.ts`: neu
- `project-rules/backend.md`: ändern
- `project-rules/frontend.md`: ändern
- `project-rules/frontend-react.md`: ändern
- `project-rules/testing.md`: ändern, `demo-mode.spec.ts` in der Tabelle Areas
- `.env.example`: ändern, Kommentar an `GITLAB_TOKEN`
- `README.md`: ändern

Schritte:

1. Backend: `GitLabConfig.token()` optional, `demo()` ist wahr ohne Wert oder mit einem Wert nur
   aus Leerzeichen. `DemoGitLab` liest `demo-gitlab.json` einmal, hält Issues veränderlich und
   threadsicher, rechnet Änderungszeiten relativ zur Uhr (`Clock`) und meldet ein unbekanntes
   Projekt oder Issue als `GitLabException` mit `NOT_FOUND`. `GitLabClient` baut im Demo-Modus
   keinen REST-Client und schreibt die Zeile auf `WARN`.
2. `ConfigResource` meldet `demo` aus `GitLabConfig`. Version des Vertrags auf `4.1.0`,
   `make contracts`.
3. Angular: Signal für den Demo-Modus, gesetzt aus dem vorhandenen Aufruf von `config`; die Shell
   zeigt `demo-hint` mit `role="status"` zwischen Toolbar und Fehlerbanner.
4. React: dasselbe mit einem Store und dem Textkatalog der Shell.
5. End-to-End-Test mit einer gerouteten Antwort von `GET /api/config`, weil die Suite das Backend
   im Profil `e2e` mit Token startet; der Demo-Modus des Backends ist durch die Backend-Tests und
   den Gang von `/verify` belegt.
6. README, `.env.example`, Glossar, Regeln.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `backend/src/test/java/planningpoker/gitlab/DemoModeTest.java`: Zeile auf `WARN` im Log der Instanz ohne Token; `backend/src/test/java/planningpoker/platform/ConfigResourceTest.java`: keine Zeile mit Token |
| A2 | `DemoModeTest.java`: `demo: true`; `ConfigResourceTest.java`: `demo: false` |
| A3 | `DemoModeTest.java`: Projektliste, Suche, `PROJECT_NOT_FOUND`, `ISSUE_NOT_FOUND` |
| A4 | `backend/src/test/java/planningpoker/gitlab/DemoGitLabTest.java`: Suche, Gewicht, Zeitraum mit `TestClock`, Sortierung, Seiten, Gesamtzahl |
| A5 | `DemoModeTest.java`: Ablauf bis zur Bestätigung mit `write-weight=true`, WireMock ohne Aufruf |
| A6 | bestehende Tests unter `backend/src/test/java/planningpoker/gitlab/` und `backend/src/test/java/planningpoker/session/` |
| A7 | `frontend/src/app/shell/app-shell.spec.ts`, `frontend-react/src/shell/app-shell.spec.tsx`: Hinweis bei `demo: true`, keiner bei `false` und bei Fehler; `frontend/e2e/demo-mode.spec.ts`: Startseite und Raum, beide Frontends; Browser: `/verify` mit Backend ohne Token |
| A8 | `make drift`; `grep` nach `4.1.0` und `demo` in `contracts/api/openapi.yaml` |
| A9 | `/verify`: `grep` in `README.md` und `.env.example` |

Testdaten: keine über die Demo-Daten hinaus. `/verify` startet das Backend mit leerem
`GITLAB_TOKEN`.

## Offene Fragen

- [x] Woher kommen die Demo-Daten? → Im Backend, im Arbeitsspeicher (Morten Möller, 2026-11-26)
- [x] Zeigt die Oberfläche den Demo-Modus? → Ja, in beiden Frontends (Morten Möller, 2026-11-26)
- [x] Aufnahme für das README? → Angular, GIF, eigener Doku-PR danach (Morten Möller, 2026-11-26)

## Verifikationsplan

- make check
- betroffene Tests: `make test-backend`, `make test-frontend`, `make test-frontend-react`,
  `make e2e`
- Browser: Backend mit leerem `GITLAB_TOKEN`; Startseite und Raum im Angular- und im
  React-Frontend: Hinweis `demo-hint`, Projektauswahl mit den Demo-Projekten, ein Ablauf bis
  „Ergebnis übernehmen“
