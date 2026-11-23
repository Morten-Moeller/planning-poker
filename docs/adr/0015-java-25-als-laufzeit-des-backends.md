# 0015: Java 25 (Temurin) als Laufzeit und Sprachstand des Backends

Status: accepted
Datum: 2026-11-23
Spec: docs/specs/0047-java-25.md
Ersetzt Grundregeln: keine

## Kontext

ADR 0001 legt für das Backend Java 21 fest. Seit Harness 0.8.0 gilt
`harness/policies/versions.md`: eine Stack-Entscheidung nimmt die neueste LTS-Linie (V1), und
`make deps` scheitert für eine ältere LTS-Linie ohne ADR mit Begründung (V3). Java 25 ist seit
2025-09-22 LTS; die Frist von 30 Tagen (`stack_lts_grace_days`) ist abgelaufen. Das Projekt hat
keine Komponente, die Java 25 ausschließt: Quarkus 3.40 verlangt JDK 17 oder neuer
(<https://quarkus.io/guides/getting-started>, gelesen am 2026-11-23).

## Optionen

### Option A: Java 25 als Laufzeit und als Sprachstand (`maven.compiler.release` 25)

- Vorteile: erfüllt V1 ohne Ausnahme; Support bis 2031-09-30; eine Version für Build, Test und
  Betrieb; neue Sprachmittel stehen späteren Specs offen.
- Nachteile: jeder Entwicklungsrechner und CI brauchen JDK 25; der Formatter
  (`palantir-java-format` 2.68.0) ist unter JDK 25 nicht geprüft und braucht möglicherweise eine
  neuere Version.

### Option B: Bei Java 21 bleiben, mit ADR nach V3

- Vorteile: keine Änderung an Build und CI; Support bis 2029-12-31.
- Nachteile: V3 verlangt eine Komponente, die Java 25 nicht unterstützt, mit Quelle. Diese
  Komponente gibt es nicht; die Begründung wäre "bewährt", und V3 schließt diese Begründung aus.

### Option C: JDK 25 als Laufzeit, Sprachstand bleibt 21 (`maven.compiler.release` 21)

- Vorteile: der Bytecode läuft weiter auf JDK 21.
- Nachteile: zwei Versionen in den Dateien, die V4 gleich verlangt; kein Betrieb auf JDK 21
  geplant, der den älteren Bytecode braucht.

## Entscheidung

Option A. Linie: `eclipse-temurin 25`, LTS seit 2025-09-22, Support bis 2031-09-30, neueste
Version 25.0.5.1+2. Lookup am 2026-11-23 mit
`harness/scripts/stack-check.sh --latest eclipse-temurin`, Quelle <https://endoflife.date>. Das
Projekt hat keinen Grund nach V3 für eine ältere Linie. Diese ADR ändert aus ADR 0001 nur den
Punkt "Java 21"; die übrigen Entscheidungen von ADR 0001 gelten weiter.

## Folgen

- `backend/pom.xml` (`maven.compiler.release`), `.github/actions/setup/action.yml` und das
  Makefile nennen 25 (Spec 0047).
- `project-rules/backend.md`, Abschnitt Stack: Java 25 und JDK 25.
- `harness/config.yml`, Liste `stack`: `eclipse-temurin 25` ohne `adr:`-Zusatz. Den Eintrag setzt
  die Person mit dem Harness-Update 0.8.0.
- Entwicklungsrechner brauchen ein JDK 25 (`brew install --cask temurin@25` unter macOS).
- Der Quellcode bleibt unverändert; neue Sprachmittel von Java 22 bis 25 sind ab dieser ADR
  erlaubt.
