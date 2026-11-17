---
id: "0024"
title: Ports für Backend und Frontend aus .env
status: Review
risk: high
adrs: ["0001"]
owner: Morten Möller
created: 2026-11-17
updated: 2026-11-17
pr: ""
note: freigegeben in der Session
---

# Ports für Backend und Frontend aus .env

Wunsch der Person nach dem lokalen Test. Bezug: R-23 (Einrichtung und Start). Die Spec hängt von
0022 und 0023 ab, weil alle drei `README.md` ändern.

## Ziel

Die Ports stehen einmal in `.env`: `BACKEND_PORT` und `FRONTEND_PORT`. Zwei neue Make-Ziele
starten Backend und Frontend mit diesen Werten. Der Dev-Proxy des Frontends zeigt automatisch
auf denselben Backend-Port. Bisher war das getrennt: Der Backend-Port kam über
`QUARKUS_HTTP_PORT`, und das Frontend brauchte `BACKEND_PORT` und `--port` von Hand.

## Scope

### Enthalten

- **`make backend`:** Liest `.env`, sofern vorhanden, in einer Subshell (`set -a; . ./.env`) und startet `./mvnw quarkus:dev -Dquarkus.http.port=$BACKEND_PORT`. Ohne Wert gilt Port 8080.
- **`make frontend`:** Liest `.env` ebenso und startet `ng serve --port $FRONTEND_PORT` (Standard 4200). `BACKEND_PORT` wird an den Dev-Proxy übergeben (`frontend/proxy.conf.mjs` liest ihn schon).
- **Kein globales Laden:** Die `.env` wird nur in diesen beiden Zielen geladen. `make check`, `make test` und `make e2e` sehen weder den GitLab-Token noch die Ports aus `.env`. `make e2e` behält seine eigenen Variablen.
- **Keine Werte im Log:** `make` gibt die Befehle der beiden Ziele nicht aus (`@`). So erscheinen weder Token noch andere Werte aus `.env` im Terminal.
- **`.env.example`:** `BACKEND_PORT` und `FRONTEND_PORT` stehen auskommentiert mit Standardwert und dem Hinweis, dass beide Ziele sie lesen. Die Zeile `QUARKUS_HTTP_PORT` entfällt.
- **README:**
  - Der Schnellstart wird zu `git clone`, `cp .env.example .env`, `make install`, `make backend`, `make frontend`, also weiter fünf Befehle.
  - Der Absatz „Port belegt“ verweist auf die beiden Variablen.
- **`make help`:** Beide Ziele erscheinen mit Beschreibung.

### Nicht enthalten

- Ein gemeinsames Ziel, das beide Prozesse in einem Terminal startet.
- Eine Änderung an `make e2e` und an der Playwright-Konfiguration.
- Eine Änderung an `application.properties`.

## Begriffe

keine neuen

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Mit `BACKEND_PORT=28180` und `FRONTEND_PORT=24300` in einer `.env` (Platzhalter-Token, Basis-URL auf das GitLab-Double) antworten nach `make backend` und `make frontend` `http://localhost:24300/` mit 200 und `http://localhost:24300/api/health` über den Proxy mit 200. | Aufruf durch `/verify` in einem Klon unter dem Scratchpad |
| A2 | Ohne `BACKEND_PORT` und `FRONTEND_PORT` in `.env` starten beide Ziele auf 8080 und 4200. Ohne `.env` startet `make frontend` trotzdem. | Aufruf durch `/verify` (`make -n backend` und `make -n frontend` zeigen die Standardports); Start von `make frontend` ohne `.env` |
| A3 | `make check` und `make e2e` laden `.env` nicht. Mit einer `.env` mit `BACKEND_PORT=1` laufen beide unverändert grün. Die Ausgabe von `make backend` enthält den Wert von `GITLAB_TOKEN` nicht. | Aufruf `make check`; `make -n e2e` ohne `.env`-Bezug; `make backend` mit Platzhalter-Token, Ausgabe nach dem Wert durchsucht |
| A4 | `.env.example` nennt `BACKEND_PORT` und `FRONTEND_PORT` statt `QUARKUS_HTTP_PORT`. Der README-Schnellstart hat fünf Befehle mit `make backend` und `make frontend`. `make help` zeigt beide Ziele. | Browser: README im PR; Aufruf `make help` |
| A5 | `make check` ist grün. | Aufruf `make check` |

## Contracts

keine

## Risiko

Stufe: high
Begründung: `harness/scripts/risk-level.sh` stuft `.env.example` über das Muster `**/*.env*` als
high ein. `Makefile` ist medium, `README.md` low. Inhaltlich ändern sich Startbefehle und
Doku, nicht der Code der Anwendung.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`, G3 über den Status
`verified`. Reviews: Code, Sicherheit, Architektur.
ADR nötig: ja wegen high (Punkt 1), erfüllt durch ADR 0001. Die Änderung folgt dieser
Entscheidung: lokaler Start von Angular-Frontend und Quarkus-Backend, Konfiguration aus der
Umgebung.

## Umsetzung

Entscheidungen:

- Zwei neue Make-Ziele `backend` und `frontend`, die `.env` nur in ihrer Subshell laden. Neue Abhängigkeiten gibt es keine.

Dateien:

- `Makefile`: ändern, Ziele `backend` und `frontend`, `.PHONY`, Beschreibung für `make help`
- `.env.example`: ändern, `BACKEND_PORT`, `FRONTEND_PORT` statt `QUARKUS_HTTP_PORT`
- `README.md`: ändern, Schnellstart, Absatz „Port belegt“
- `project-rules/testing.md`: ändern, Hinweis, dass `make e2e` `.env` nicht liest

Schritte:

1. In den Make-Zielen `@set -a; [ -f .env ] && . ./.env; set +a; …` verwenden, mit Standardwerten über `$${BACKEND_PORT:-8080}` und `$${FRONTEND_PORT:-4200}`.
2. `.env.example`, README und `project-rules/testing.md` anpassen.
3. A1 bis A3 in einem Klon unter dem Scratchpad gegen das GitLab-Double prüfen, mit Platzhalter-Token und freien Ports. Die laufende App der Person auf 18080 und 14200 bleibt unberührt.
4. `make check`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `/verify`: Klon, `.env` mit Ports und Double, beide Ziele, zwei `curl` |
| A2 | `make -n`, Start ohne `.env` |
| A3 | `make check` und `make -n e2e`, Ausgabe von `make backend` ohne Token-Wert |
| A4 | README im PR, `make help` |
| A5 | `make check` |

Testdaten: GitLab-Double aus `frontend/e2e/gitlab-double/`, Token-Platzhalter `test`.

Contracts zu regenerieren: keine.

## Offene Fragen

keine

## Verifikationsplan

- make check
- betroffene Tests: keine Code-Tests; Aufrufe der Make-Ziele
- Browser: README im PR
- Aufruf: `make backend` und `make frontend` mit Ports aus `.env` in einem Klon
