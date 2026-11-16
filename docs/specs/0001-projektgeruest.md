---
id: "0001"
title: Projektgerüst (M0)
status: in Arbeit
risk: high
adrs: ["0001", "0002", "0003", "0004"]
owner: Morten Möller
created: 2026-11-16
updated: 2026-11-16
pr: ""
note: freigegeben in der Session
---

# Projektgerüst (M0)

Meilenstein M0 aus `docs/umsetzungsplan.md`. Deckt ab: R-23 (Gerüst), R-26. Annahmen: A-14
(Konfigurationsschlüssel), A-15 (Sprache der Oberfläche und des Codes).

## Ziel

Beide Projekte starten lokal, alle Gates des Harness laufen mit echten Befehlen für Backend und
Frontend, und ein erster Weg von der Oberfläche zum Backend (`GET /api/health` über den
Dev-Proxy) ist durch einen End-to-End-Test belegt. Jede weitere Spec baut auf diesem Gerüst auf;
die Manifeste `backend/pom.xml` und `frontend/package.json` enthalten schon alle Abhängigkeiten
bis M13, damit parallel laufende Specs sie nicht ändern.

## Scope

### Enthalten

- Monorepo-Struktur aus Abschnitt 4 des Umsetzungsplans: `backend/`, `frontend/`, `contracts/api/` (erst 0002 füllt es), `docs/`.
- Quarkus-Projekt (Java 21, Maven Wrapper, Quarkus 3.x aktuell) mit allen Extensions und Test-Abhängigkeiten aus Abschnitt 4.1; Health-Endpunkt `GET /api/health`; alle Konfigurationsschlüssel aus Abschnitt 4.7 mit Standardwerten in `application.properties`; Tests auf freiem Port; Profil `e2e`.
- Angular-Projekt (aktuelle stabile Version, pnpm) mit Routing, Angular Material und Material-3-Theme, `@angular/localize` (Quellsprache `de`), `marked`, angular-eslint mit Template-Barrierefreiheit und i18n, Prettier, Playwright; Dev-Proxy `/api` und `/ws` an `localhost:8080`.
- Startseite zeigt den Zustand von `/api/health` (Text über i18n, `data-testid`); erster Playwright-Test; Playwright startet Backend und Frontend selbst.
- Makefile: `test`, `typecheck`, `lint`, `e2e` für beide Projekte, dazu `install` für die Abhängigkeiten; `.github/actions/setup/action.yml` mit Java 21, Node und pnpm.
- `project-rules/backend.md`, `project-rules/frontend.md`, `project-rules/testing.md` ohne `TODO`; `docs/domain/glossary.md` mit den Begriffen aus Abschnitt 4.2; `docs/architecture/overview.md` mit Kontext und Containern.
- README als Abgabe-README gegliedert (Start, Variante, GitLab, Schnittstellen, Entwicklung mit dem Harness); `.env.example` mit `GITLAB_TOKEN`.
- `docs/roadmap.md`, die ADRs 0001 bis 0004 und `docs/adr/README.md` aus dem Roadmap-Lauf.

### Nicht enthalten

- Vertrag und `make contracts` (0002), GitLab-Client (0003), Fachlogik (0004), Frontend-Dienste und Store (0005).
- Änderungen an `harness/config.yml`: die Person setzt `e2e_in_ci: true` und `worktree_setup` selbst (offene Fragen).
- Container-Setup, Dockerfiles; vom Quarkus-Generator erzeugte Docker-Dateien werden gelöscht.
- Prüfung des fehlenden GitLab-Tokens beim Start (A-14): kommt mit dem Client in 0003.

## Begriffe

Das Glossar ist leer; diese Spec füllt es mit den Objekten aus Abschnitt 4.2 des Umsetzungsplans
(neu, mit `/domain` ins Glossar). Diese Spec selbst verwendet nur:

| Begriff | Bedeutung hier |
|---|---|
| Backend | Quarkus-Anwendung unter `backend/`, Port 8080, Pfade `/api` und `/ws` |
| Frontend | Angular-Anwendung unter `frontend/`, Dev-Server auf Port 4200 mit Proxy auf das Backend |
| Gate | Make-Ziel aus `harness/quality-gates.md`, das lokal und in der CI läuft |
| GitLab-Double | WireMock Standalone mit festen Mappings, Ersatz für GitLab in End-to-End-Tests (eingeführt in 0011) |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `./mvnw quarkus:dev` in `backend/` startet ohne Fehler und ohne gesetzten `GITLAB_TOKEN`; `GET /api/health` antwortet 200 mit `{"status":"UP"}`. | Test `backend/src/test/java/planningpoker/platform/HealthResourceTest.java`, Aufruf |
| A2 | `pnpm start` in `frontend/` startet ohne Fehler; die Startseite zeigt den Zustand von `/api/health` über den Proxy im Element `data-testid="health-status"` mit dem deutschen Text „Backend erreichbar“. | End-to-End `frontend/e2e/health.spec.ts`, Bildschirm Startseite |
| A3 | `make test`, `make typecheck` und `make lint` laufen für Backend und Frontend mit echten Befehlen und sind grün; `make check` ist grün. | Aufruf |
| A4 | `make e2e` startet Backend (Profil `e2e`) und Frontend selbst, nimmt `harness/scripts/app-lock.sh` und führt den Playwright-Test aus; die CI führt `make e2e` aus und ist grün. | Aufruf, CI-Checks des Pull Requests |
| A5 | Zwei Läufe von `make test` in zwei Worktrees laufen gleichzeitig grün durch (freier Port im Backend-Test, kein Port im Frontend-Test). | Aufruf |
| A6 | `make lint` schlägt fehl, wenn ein Template-Text ohne `i18n`-Attribut oder ein Bild ohne `alt` vorkommt. | Aufruf mit einem temporären Template |
| A7 | `project-rules/backend.md`, `project-rules/frontend.md`, `project-rules/testing.md`, `docs/domain/glossary.md` und `docs/architecture/overview.md` enthalten kein `TODO` und keine leere Vorlagenzeile mehr; das Glossar nennt Sitzung, Teilnehmer, Scrum Master, Entwickler, Issue, Runde, Karte, Auswertung, Protokoll, Snapshot und Freigabe. | Aufruf (`grep -n TODO`) |
| A8 | Das README hat die Abschnitte Einrichtung und Start, Variante, GitLab, Schnittstellen und Entwicklung; `.env.example` nennt `GITLAB_TOKEN`; ein frischer Klon startet nach den Befehlen des Abschnitts Einrichtung und Start. | Aufruf |
| A9 | Logs des Backends sind JSON-Zeilen; kein Log enthält den Wert von `planningpoker.gitlab.token`. | Test `backend/src/test/java/planningpoker/platform/LoggingTest.java` |

## Contracts

keine. `contracts/api/` entsteht in 0002. Die Konfigurationsschlüssel aus Abschnitt 4.7 des
Umsetzungsplans sind kein Vertrag, werden hier aber mit ihren Standardwerten angelegt.

## Risiko

Stufe: high
Begründung: `harness/scripts/risk-level.sh --files-from` über die Dateiliste: `.env.example`
trifft `**/*.env*` (high); `backend/pom.xml`, `frontend/package.json` und `frontend/pnpm-lock.yaml`
sind Abhängigkeitsmanifeste (medium); `Makefile`, `.github/actions/setup/action.yml` und
`project-rules/` sind medium; `backend/src/main/` und `frontend/src/` treffen kein Muster
(medium). Der Eskalator `token` greift über die Konfigurationsschlüssel. Mehr als 200 geänderte
Zeilen.
Gates: G0 und G1 in dieser Session (Roadmap-Freigabe). G2: Label `human-approved` nach dem letzten
Push. G3: Status `verified` auf dem Head-Commit (`verify_required_for: high`).
ADR nötig: ja, 0001 (Stack und neue Abhängigkeiten), 0002 (ersetzt A4.1, A4.3, A4.4, T1.2),
0003 (ersetzt A4.2 für die Session-ID), 0004 (ersetzt A7.1). Alle vier entstehen im Roadmap-Lauf
und werden mit dieser Spec freigegeben.

## Umsetzung

Entscheidungen:

- Neue Abhängigkeiten, alle bis M13 (ADR 0001): Backend `quarkus-rest-jackson`, `quarkus-hibernate-validator`, `quarkus-websockets-next`, `quarkus-rest-client-jackson`, `quarkus-smallrye-openapi`, `quarkus-logging-json`; Test `quarkus-junit5`, `rest-assured`, `org.wiremock:wiremock`. Frontend `@angular/material`, `@angular/localize`, `marked`, `openapi-typescript`, `angular-eslint`, `prettier`, `@playwright/test`. Maven-Plugin Spotless (palantir-java-format) als Backend-Lint.
- Java-Basispaket `planningpoker` mit Unterpaket `platform` für Code ohne Fachbegriffe; `GET /api/health` ist eine eigene Ressource statt `quarkus-smallrye-health`, weil der Pfad unter `/api` liegt.
- Frontend-Unit-Tests mit dem Standard-Runner des Angular-CLI (vitest) ohne Browser-Port; Playwright startet Backend-Jar (Profil `e2e`, Port 8080) und Frontend-Dev-Server (Port 4200) über `webServer`; `make e2e` nimmt `harness/scripts/app-lock.sh`.
- Alle Konfigurationsschlüssel aus Abschnitt 4.7 in `application.properties`; `planningpoker.gitlab.token` ohne Standardwert aus `GITLAB_TOKEN`, in den Profilen `test` und `e2e` mit festem Platzhalterwert; die Startprüfung folgt in 0003.
- Keine Änderung an `harness/config.yml`; die Person setzt die Schlüssel (offene Fragen).

Dateien:

- `backend/pom.xml`: neu, Quarkus-Projekt mit allen Extensions, Test-Abhängigkeiten, `maven.compiler.release` 21, Spotless
- `backend/mvnw`: neu, Maven Wrapper
- `backend/mvnw.cmd`: neu, Maven Wrapper
- `backend/.mvn/wrapper/maven-wrapper.properties`: neu, Maven Wrapper
- `backend/.gitignore`: neu, `target/`
- `backend/.dockerignore`: löschen, falls der Generator sie anlegt
- `backend/src/main/docker/`: löschen, falls der Generator sie anlegt
- `backend/src/main/java/planningpoker/platform/HealthResource.java`: neu, `GET /api/health`
- `backend/src/main/resources/application.properties`: neu, Schlüssel aus 4.7, `quarkus.http.test-port=0`, JSON-Logs, Profile `test` und `e2e`
- `backend/src/test/java/planningpoker/platform/HealthResourceTest.java`: neu, A1
- `backend/src/test/java/planningpoker/platform/LoggingTest.java`: neu, A9
- `frontend/package.json`: neu, Skripte `start`, `build`, `test`, `typecheck`, `lint`, `format`, `e2e`
- `frontend/pnpm-lock.yaml`: neu
- `frontend/pnpm-workspace.yaml`: neu, `minimumReleaseAge: 10080`, `blockExoticSubdeps: true`, `trustPolicy: no-downgrade` (harness/quality-gates.md)
- `frontend/angular.json`: neu, Material-Theme, Proxy, `i18n` mit `sourceLocale: de`
- `frontend/tsconfig.json`: neu, strict, `strictTemplates`
- `frontend/tsconfig.app.json`: neu
- `frontend/tsconfig.spec.json`: neu
- `frontend/eslint.config.js`: neu, angular-eslint mit `template/i18n` und den Regeln für Barrierefreiheit, Prettier-Kompatibilität
- `frontend/.prettierrc`: neu
- `frontend/.gitignore`: neu, `dist/`, `.angular/`, `node_modules/`, `test-results/`, `playwright-report/`
- `frontend/.editorconfig`: löschen, falls der Generator sie anlegt (die Wurzel hat eine)
- `frontend/proxy.conf.json`: neu, `/api` und `/ws` an `http://localhost:8080`, `ws: true`
- `frontend/playwright.config.ts`: neu, `webServer` für Backend und Frontend, `baseURL` 4200, Chromium
- `frontend/public/favicon.ico`: neu, Gerüst-Ausgabe
- `frontend/src/index.html`: neu, `lang="de"`
- `frontend/src/main.ts`: neu, `@angular/localize/init`, Bootstrap
- `frontend/src/styles.scss`: neu, Material-3-Theme, Systemvariablen
- `frontend/src/app/app.ts`: neu, Wurzelkomponente mit `router-outlet`
- `frontend/src/app/app.html`: neu
- `frontend/src/app/app.config.ts`: neu, Router, HttpClient
- `frontend/src/app/app.routes.ts`: neu, Route `/` auf die Startseite
- `frontend/src/app/start/start-page.ts`: neu, Startseite, lädt `/api/health`
- `frontend/src/app/start/start-page.html`: neu, Text mit `i18n` und `data-testid="health-status"`
- `frontend/src/app/start/start-page.spec.ts`: neu, Unit-Test mit `HttpTestingController`
- `frontend/src/app/start/health-api.ts`: neu, `GET /api/health` über `HttpClient`
- `frontend/e2e/health.spec.ts`: neu, A2
- `.nvmrc`: neu, aktuelle LTS-Version von Node, die das Angular-CLI unterstützt
- `.env.example`: neu, `GITLAB_TOKEN=`
- `.gitignore`: ändern, `.env`, `backend/target/`, `frontend/dist/`, `frontend/.angular/`, `frontend/test-results/`, `frontend/playwright-report/`
- `Makefile`: ändern, `test`, `typecheck`, `lint`, `e2e`, `install`
- `.github/actions/setup/action.yml`: ändern, Java 21 (temurin, Maven-Cache), Node aus `.nvmrc`, pnpm, `pnpm install --frozen-lockfile`, Playwright-Chromium; semgrep, gitleaks, osv-scanner bleiben
- `README.md`: ändern, Abgabe-Gliederung
- `project-rules/backend.md`: ändern, Stack, Struktur (`session`, `gitlab`, `realtime`, `platform`), Daten nach ADR 0002, Fehler und Logs, Konfiguration, Authentifizierung nach ADR 0003
- `project-rules/frontend.md`: ändern, Stack, Struktur je Feature, Zustand nach ADR 0004, UI, i18n, Barrierefreiheit, Gates
- `project-rules/testing.md`: ändern, Ebenen, Bereiche, End-to-End, Testdaten
- `docs/domain/glossary.md`: ändern, Begriffe aus Abschnitt 4.2 des Umsetzungsplans
- `docs/architecture/overview.md`: ändern, Kontext, Container, Modulgrenzen, Querschnitt
- `docs/roadmap.md`: neu, aus dem Roadmap-Lauf
- `docs/adr/0001-angular-und-quarkus-variante-a.md`: neu, aus dem Roadmap-Lauf
- `docs/adr/0002-sitzungen-im-arbeitsspeicher.md`: neu, aus dem Roadmap-Lauf
- `docs/adr/0003-identitaet-ohne-login.md`: neu, aus dem Roadmap-Lauf
- `docs/adr/0004-rest-befehle-websocket-snapshot.md`: neu, aus dem Roadmap-Lauf
- `docs/adr/README.md`: ändern, vier Zeilen

Schritte:

1. Backend erzeugen: Projekt von `code.quarkus.io` (enthält den Maven Wrapper) mit den Extensions aus den Entscheidungen nach `backend/` entpacken; Docker-Dateien und Beispielcode löschen; `maven.compiler.release` 21; Test-Abhängigkeiten und Spotless in `backend/pom.xml`. Lokal läuft Java 21 über `JAVA_HOME` (`/usr/libexec/java_home -v 21`), siehe README.
2. `application.properties`: `planningpoker.gitlab.base-url=https://gitlab.com`, `planningpoker.gitlab.token=${GITLAB_TOKEN}`, `planningpoker.gitlab.write-weight=false`, `planningpoker.session.ttl=12h`, `quarkus.http.test-port=0`, `quarkus.log.console.json=true` (Dev-Profil lesbar), Profil `test` und `e2e` mit Platzhalter-Token, Profil `e2e` mit `planningpoker.gitlab.base-url=http://localhost:8089` für das spätere GitLab-Double.
3. `HealthResource` unter `/api/health` mit `{"status":"UP"}`; `HealthResourceTest` mit REST Assured; `LoggingTest` prüft JSON-Format und dass der Token-Wert nicht erscheint.
4. Frontend erzeugen: `pnpm dlx @angular/cli@latest new frontend --style scss --ssr false --package-manager pnpm --skip-git`; `ng add @angular/material`, `ng add @angular/localize`, `ng add angular-eslint`; `marked`, `openapi-typescript`, `prettier`, `@playwright/test` hinzufügen; `pnpm-workspace.yaml` mit den drei Schlüsseln; `.nvmrc`.
5. `angular.json`: Proxy-Datei im `serve`-Ziel, `i18n.sourceLocale: de`, Material-Theme in `styles.scss` über die Systemvariablen; `eslint.config.js` mit `@angular-eslint/template/i18n` und den Regeln für Barrierefreiheit (`template/alt-text`, `template/click-events-have-key-events`, `template/interactive-supports-focus`, `template/label-has-associated-control`, `template/no-autofocus`, `template/role-has-required-aria`, `template/valid-aria`).
6. Startseite: `HealthApi` ruft `GET /api/health`; `StartPage` zeigt „Backend erreichbar“ oder „Backend nicht erreichbar“ in `data-testid="health-status"` mit `i18n`-IDs; Unit-Test mit `HttpTestingController`; Route `/`.
7. Playwright: `playwright.config.ts` mit zwei `webServer`-Einträgen (Backend: `./mvnw -q -DskipTests package` und `java -Dquarkus.profile=e2e -jar target/quarkus-app/quarkus-run.jar`, Port 8080; Frontend: `pnpm exec ng serve`, Port 4200), `reuseExistingServer` nur lokal; `e2e/health.spec.ts` prüft den Text im `data-testid`.
8. Makefile: `test` (Backend `./mvnw -q test`, Frontend `pnpm -C frontend test`), `typecheck` (Backend `./mvnw -q -DskipTests compile test-compile`, Frontend `pnpm -C frontend typecheck` mit `ng build --configuration development`), `lint` (Backend `./mvnw -q spotless:check`, Frontend `pnpm -C frontend lint` und `prettier --check`), `e2e` (`app-lock.sh acquire --owner make-e2e --wait 900`, Playwright, `release` auch bei Fehler), `install` (`pnpm -C frontend install --frozen-lockfile`, `pnpm -C frontend exec playwright install chromium`, `./mvnw -q dependency:go-offline`).
9. `.github/actions/setup/action.yml`: `actions/setup-java` 21 temurin mit Maven-Cache, `pnpm/action-setup`, `actions/setup-node` mit `.nvmrc` und pnpm-Cache, `pnpm install --frozen-lockfile` in `frontend/`, `playwright install --with-deps chromium`; die drei Harness-Werkzeuge bleiben.
10. `project-rules/*.md`, `docs/domain/glossary.md` (Sitzung, Teilnehmer, Scrum Master, Entwickler, Issue, Runde, Karte, Stimme, Auswertung, Protokoll, Protokolleintrag, Snapshot, Freigabe, Auflösung, Bestätigung, Phase; Spalte „Im Code“ mit den Typen aus Abschnitt 4.2; Spalte „Nicht verwenden“ mit Synonymen wie Raum, Moderator, Voting, Reveal), `docs/architecture/overview.md`, `README.md`, `.env.example`, `.gitignore`.
11. `make check`, `make e2e`; zweiter Worktree mit `git worktree add`, `make install`, `make test` in beiden gleichzeitig (A5).

Tests:

| Kriterium | Test |
|---|---|
| A1 | `backend/src/test/java/planningpoker/platform/HealthResourceTest.java`: `GET /api/health` antwortet 200 mit `status` `UP` |
| A2 | `frontend/e2e/health.spec.ts`: Startseite zeigt „Backend erreichbar“ in `data-testid="health-status"`; `frontend/src/app/start/start-page.spec.ts`: Text je Antwort und bei Fehler / Browser: Startseite `http://localhost:4200/` |
| A3 | Aufruf `make check` durch `/verify` |
| A4 | Aufruf `make e2e` lokal; CI-Check `gates (e2e)` am Pull Request |
| A5 | Aufruf: zwei Worktrees, `make test` gleichzeitig, beide grün |
| A6 | Aufruf: Template-Text ohne `i18n` einfügen, `make lint` schlägt fehl, Änderung verwerfen |
| A7 | Aufruf `grep -rn TODO project-rules docs/domain docs/architecture` ohne Treffer |
| A8 | Aufruf: README-Abschnitte vorhanden; frischer Klon in einem temporären Verzeichnis nach den dokumentierten Befehlen |
| A9 | `backend/src/test/java/planningpoker/platform/LoggingTest.java`: Logzeile ist JSON; Platzhalter-Token des Testprofils erscheint nicht |

Testdaten: keine (kein Zustand, keine Sitzung).

Contracts zu regenerieren: keine.

## Offene Fragen

- [x] Wer setzt `e2e_in_ci: true` und `worktree_setup` in `harness/config.yml`? → Die Person selbst auf `main`: `e2e_in_ci: true` vor dem ersten CI-Lauf dieser Spec (`make e2e` ist bis zum Merge ein Stub mit Exit 0), `worktree_setup: "make setup && make install"` mit dem Merge, weil `make install` erst dann existiert. Ohne `e2e_in_ci: true` kann A4 in der CI nicht geprüft werden. (Morten Möller, 2026-11-16)
- [x] Java-Basispaket? → `planningpoker` mit `session`, `gitlab`, `realtime`, `platform`. (Morten Möller, 2026-11-16)

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/platform/`, `frontend/src/app/start/start-page.spec.ts`, `frontend/e2e/health.spec.ts` über `make e2e`
- Browser: Startseite `http://localhost:4200/` mit laufendem Backend und Frontend (A2)
- Aufrufe: `make e2e` in zwei Worktrees nacheinander (Lock), `make test` in zwei Worktrees gleichzeitig (A5), `grep -rn TODO` (A7), Lint-Probe (A6), frischer Klon (A8)
