# 0001: Angular-Frontend und Quarkus-Backend (Variante A)

Status: accepted
Datum: 2026-11-16
Spec: docs/specs/0001-projektgeruest.md
Ersetzt Grundregeln: keine

## Kontext

Die Coding Challenge lässt zwei Varianten zu: A mit eigenem Backend, B mit direkter Anbindung des
Frontends an GitLab. Die Technik ist vorgegeben (R-26): Angular im Frontend, Java mit Quarkus und
Jakarta EE im Backend. Das Backend-README verlangt, dass Steuerungsaktionen ausschließlich dem
Scrum Master vorbehalten sind (R-05), und die Karten bleiben bis zur Auflösung verdeckt (R-12).
Das Issue-Ergebnis wird an GitLab geschrieben (R-21); dafür ist ein Token mit Schreibrecht nötig.
Der Umsetzungsplan (`docs/umsetzungsplan.md`, Abschnitt 4.1) legt die Bibliotheken je Bereich fest.

## Optionen

### Option A: Variante A, Angular und Quarkus mit eigenem Backend

- Vorteile: Der Server erzwingt Rollen und verdeckte Karten; der GitLab-Token bleibt im Backend;
  Echtzeit über einen eigenen WebSocket ohne Drittdienst; die Technik-Vorgabe ist erfüllt.
- Nachteile: Zwei Projekte mit zwei Toolchains (Maven, pnpm); mehr Gerüst, mehr Gates.

### Option B: Variante B, Angular direkt gegen die GitLab-API

- Vorteile: Ein Projekt, kein Backend-Betrieb.
- Nachteile: Jeder Browser braucht einen Token mit Schreibrecht; verdeckte Karten und Rollen sind
  nur im Client geprüft; Echtzeit braucht einen externen Dienst oder Abfragen der GitLab-API;
  die Backend-Vorgabe (R-26) bleibt unerfüllt.

## Entscheidung

Option A. Backend: Java 21, Maven Wrapper, Quarkus 3.x; `quarkus-rest-jackson`, Jakarta
Validation, Jakarta CDI; `quarkus-websockets-next` für Echtzeit; MicroProfile REST Client mit
`quarkus-rest-client-jackson` für GitLab; `quarkus-smallrye-openapi` für den Vertrag;
`quarkus-logging-json`; Tests mit JUnit 5, REST Assured, WireMock und dem WebSocket-Client von
Quarkus. Frontend: Angular in der aktuellen stabilen Version mit Standalone Components, Signals,
Router, HttpClient und RxJS `webSocket`; pnpm; Angular Material mit Material-3-Theme;
`@angular/localize` mit Quellsprache `de`; `marked` für Markdown; angular-eslint und Prettier;
Unit-Tests mit dem Standard-Runner des Angular-CLI, End-to-End mit Playwright. Monorepo mit
`backend/`, `frontend/`, `contracts/api/` und `docs/`.

## Folgen

- `project-rules/backend.md`, `project-rules/frontend.md` und `project-rules/testing.md` werden
  in Spec 0001 mit diesem Stack gefüllt.
- Alle Abhängigkeiten bis M13 stehen ab Spec 0001 in `backend/pom.xml` und
  `frontend/package.json`, damit parallel laufende Specs die Manifeste nicht ändern.
- Jede weitere Bibliothek für einen Bereich, den diese ADR nennt, ist eine Abweichung von A1.7
  und braucht eine eigene ADR.
- Das README begründet die Variantenwahl mit dem Text aus dem Kontext (R-24).
