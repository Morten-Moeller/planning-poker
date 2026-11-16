# Planning Poker

Ein Scrum-Team schätzt GitLab-Issues synchron: Der Scrum Master legt eine Sitzung an, teilt Link
oder Session-ID, wählt ein Issue und gibt es frei. Die Entwickler wählen verdeckt eine Karte, der
Scrum Master löst auf, startet bei Bedarf eine neue Runde und übernimmt den vereinbarten Wert als
Kommentar an das GitLab-Issue. Lösung der Coding Challenge Planning Poker
([Frontend-README](https://github.com/buchner-org/coding-challenge/blob/main/planning-poker/frontend/README.md),
[Backend-README](https://github.com/buchner-org/coding-challenge/blob/main/planning-poker/backend/README.md)).

## Einrichtung und Start

Voraussetzungen: JDK 21 (`JAVA_HOME`; auf macOS findet `make` das JDK 21 selbst), Node in der
Version aus `.nvmrc`, pnpm 12, ein GitLab Personal Access Token mit Scope `api`.

```bash
cp .env.example .env            # GITLAB_TOKEN eintragen
make setup && make install      # Git-Hooks, Abhängigkeiten, Playwright-Browser
set -a && source .env && set +a
(cd backend && ./mvnw quarkus:dev)   # Backend auf http://localhost:8080
pnpm -C frontend start               # Frontend auf http://localhost:4200
```

Das Frontend erreicht das Backend über den Dev-Proxy (`frontend/proxy.conf.mjs`, Pfade `/api`
und `/ws`); es gibt kein CORS. Die Startseite zeigt, ob das Backend erreichbar ist.

Ist Port 8080 oder 4200 belegt: Backend mit `./mvnw quarkus:dev -Dquarkus.http.port=18080`,
Frontend mit `BACKEND_PORT=18080 pnpm -C frontend start --port 14200`. `make e2e` nimmt
dieselben Variablen `BACKEND_PORT` und `FRONTEND_PORT`.

## Variante

Gebaut ist Variante A: ein Angular-Frontend und ein Quarkus-Backend. Der Server erzwingt verdeckte
Karten und Rollen, wie es das Backend-README verlangt („stellt sicher, dass Steuerungsaktionen
ausschließlich dem Scrum Master vorbehalten sind“). Der GitLab-Token bleibt im Backend, und die
Echtzeit-Synchronisation braucht keinen Drittdienst. In Variante B bräuchte jeder Browser einen
Token mit Schreibrecht, und die Synchronisation liefe über einen externen Dienst oder über
Abfragen der GitLab-API. Entscheidung: `docs/adr/0001-angular-und-quarkus-variante-a.md`.

## GitLab

Das Backend spricht die GitLab-REST-API v4 mit dem Header `PRIVATE-TOKEN`. Basis-URL und Token
gelten je Backend-Instanz, nicht je Sitzung.

| Schlüssel | Standard | Bedeutung |
|---|---|---|
| `planningpoker.gitlab.base-url` | `https://gitlab.com` | Basis-URL der GitLab-Instanz |
| `planningpoker.gitlab.token` | keiner, aus `GITLAB_TOKEN` | Personal Access Token mit Scope `api` |
| `planningpoker.gitlab.write-weight` | `false` | Zahlenwerte zusätzlich als `weight` setzen (Premium/Ultimate) |
| `planningpoker.session.ttl` | `12h` | Verfall inaktiver Sitzungen |

Das bestätigte Ergebnis wird als Kommentar (Note) am Issue hinterlegt: Endwert, Rundenzahl und
Verteilung der letzten Runde. Das funktioniert in jedem GitLab-Tarif. Mit `write-weight` setzt
das Backend Zahlenwerte vorher zusätzlich als `weight`; bei `?` und ☕ wird nur kommentiert.
Umsetzung ab Spec 0010.

## Schnittstellen

Der Server ist die einzige Quelle der Wahrheit: Befehle gehen per REST an `/api`, der Zustand
kommt per WebSocket unter `/ws/sessions/{sessionId}` als vollständiger, je Teilnehmer gefilterter
Snapshot zurück. Fehler folgen RFC 9457 (`application/problem+json`) mit einem stabilen
`errorCode`. Die vollständige Definition (Endpunkte, Nachrichten, Snapshot, Fehlercodes) steht in
`docs/umsetzungsplan.md`, Abschnitte 4.3 bis 4.6; ab Spec 0002 liegt der generierte Vertrag unter
`contracts/api/openapi.yaml` und die Swagger-UI im Dev-Modus unter
`http://localhost:8080/q/swagger-ui`.

Vorhanden seit Spec 0001: `GET /api/health` antwortet `{"status":"UP"}`.

## Entwicklung

Dieses Repository verwendet den AI Development Harness. Einstieg: `AGENTS.md` und
`harness/README.md`. Plan und Specs: `docs/umsetzungsplan.md`, `docs/roadmap.md`,
`docs/specs/`. Stack-Regeln: `project-rules/`.

| Ich will | Befehl |
|---|---|
| alle Gates laufen lassen | `make check` (test, typecheck, lint, sast, deps, drift) |
| End-to-End-Tests | `make e2e` (startet Backend und Frontend selbst; Ports über `BACKEND_PORT`, `FRONTEND_PORT`) |
| Formatierer anwenden | `make format` |
| nur ein Projekt testen | `make test-backend`, `make test-frontend` |
| eine Änderung vorschlagen | `/spec <Thema>` in Claude Code, dann Freigabe durch eine Person |
| eine freigegebene Spec umsetzen | `/implement <Nummer>` |
| alle Ziele sehen | `make help` |

```text
backend/         Quarkus (Java 21): session, gitlab, realtime, platform
frontend/        Angular (pnpm): src/app je Feature, e2e/ Playwright
contracts/api/   generierter OpenAPI-Vertrag und Beispiele (ab Spec 0002)
docs/            Umsetzungsplan, Roadmap, Specs, ADRs, Glossar, Architektur
project-rules/   Stack-Regeln für Frontend, Backend, Tests
harness/         Workflow, Policies, Quality Gates (harness-owned)
```

Harness-Version: `HARNESS_VERSION`. Aktualisierung mit `harness/scripts/update.sh`.
