---
id: "0052"
title: Maven-Build ohne Abfrage der Prefix-Dateien der Repositories
status: done
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-24
updated: 2026-11-24
pr: "#60"
note: alle Kriterien erfüllt
---

# Maven-Build ohne Abfrage der Prefix-Dateien der Repositories

## Ziel

Seit Maven 3.10.1 (Pull Request #53) fragt jeder Build des Backends bei jedem Repository die
Datei `.meta/prefixes.txt` ab. `repository.jboss.org` (aus einem Eltern-POM der Abhängigkeiten)
antwortet darauf seit 2026-11-23 mit HTTP 503; Maven wiederholt die Abfrage mit Wartezeit. Der
Build `./mvnw -q -DskipTests package` braucht lokal 3:45 Minuten statt weniger Sekunden, und
`gates (e2e)` bricht in CI ab, weil Playwright 5 Minuten auf das Backend wartet (Pull Request
#55). Nach der Änderung fragt Maven die Datei nicht mehr ab, und der Build hängt nicht von der
Antwort dieses Servers ab.

## Scope

### Enthalten

- Neue Datei `backend/.mvn/maven.config` mit der Option
  `-Daether.remoteRepositoryFilter.prefixes.resolvePrefixFiles=false`.

### Nicht enthalten

- Die Maven-Version des Wrappers (bleibt 3.10.1).
- Wartezeiten und Wiederholungen von Playwright (`webServer.timeout`).
- Ein Spiegel oder ein Cache für Maven-Repositories.

## Begriffe

Keine Fachbegriffe aus `docs/domain/glossary.md`.

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `./mvnw -B -DskipTests package` im Ordner `backend` endet ohne Fehler, und die Ausgabe nennt `prefixes.txt` nicht. | Aufruf mit Ausgabe in eine Datei, `grep -c prefixes.txt` gibt 0 aus |
| A2 | Derselbe Aufruf braucht lokal weniger als 60 Sekunden, während `repository.jboss.org` für `.meta/prefixes.txt` HTTP 503 liefert. | Aufruf mit Zeitmessung; `curl` auf die Datei für den Status |
| A3 | `make check` und `make e2e` laufen ohne Fehler und ohne `MAVEN_ARGS=-o`. | Aufruf: `make check`, `make e2e` |
| A4 | Der Job `gates (e2e)` des Pull Requests läuft ohne Fehler. | CI-Lauf des Pull Requests |

## Contracts

keine.

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh`: `backend/.mvn/maven.config` hat kein Muster in der
Matrix, das ist medium. Kein Eskalator.
Gates: G2, das Label `human-approved` einer Person vor dem Merge.
ADR nötig: nein, weil die Änderung eine Einstellung des Build-Werkzeugs ist, keine Komponente
hinzufügt und sich mit dem Löschen einer Zeile zurücknehmen lässt.

## Umsetzung

Entscheidungen:

- Die Abfrage wird abgestellt; der Wrapper bleibt bei Maven 3.10.1 (Entscheidung der Person vom
  2026-11-24, gegen den Rückschritt auf 3.9.16 und gegen Abwarten).
- Option: `aether.remoteRepositoryFilter.prefixes.resolvePrefixFiles=false`. Geprüft am
  Verhalten (Build ohne Abfrage, 5 Sekunden), nicht an der Dokumentation des Maven Resolvers.
  Die Option `aether.remoteRepositoryFilter.prefixes=false` wirkt gleich; gewählt ist die engere,
  die nur das Laden der Dateien abstellt.
- Folge: Maven nutzt die Prefix-Listen der Repositories nicht, um Anfragen an Repositories
  auszulassen, die ein Artefakt nicht führen. Das ist das Verhalten von Maven 3.9.

Dateien:

- `backend/.mvn/maven.config`: neu, eine Zeile
- `docs/specs/0052-maven-ohne-prefix-abfrage.md`: neu

Schritte:

1. Datei anlegen.
2. Die Aufrufe zu A1 und A2, `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | Aufruf `./mvnw`; Ausgabe im Pull Request |
| A2 | Aufruf mit Zeitmessung und `curl`; Ausgabe im Pull Request |
| A3 | `make check`; bestehende End-to-End-Specs unter `frontend/e2e/` mit `make e2e` |
| A4 | CI-Lauf des Pull Requests, Job `gates (e2e)` |

Kein neuer automatischer Test: die Änderung fügt kein Verhalten der Anwendung hinzu.

## Offene Fragen

- [x] Abfrage abstellen, zurück auf Maven 3.9.16 oder abwarten? → Abfrage abstellen.
  (Morten Möller, 2026-11-24)

## Verifikationsplan

- make check
- betroffene Tests: `make e2e`, die Aufrufe zu A1 und A2
- Browser: keiner
