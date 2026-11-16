---
id: "0015"
title: Härtung (M13, Teil 1)
status: Review
risk: high
adrs: ["0005"]
owner: Morten Möller
created: 2026-11-16
updated: 2026-11-16
pr: ""
note: freigegeben in der Session
---

# Härtung (M13, Teil 1)

Erster Teil von Meilenstein M13 aus `docs/umsetzungsplan.md`: die Härtung von Backend und
Vertrag. Der zweite Teil (Gesamtablauf, Fehler- und Leerzustände, Layout, README final,
Checkliste) ist Spec 0019 und läuft nach den optionalen Features als letzte Welle. Grundlage: die
Entscheidungen, die 0006, 0007, 0009 und 0010 auf die Härtung verschoben haben; ADR 0005.

## Ziel

Die offenen Endpunkte sind begrenzt: das Backend legt höchstens eine konfigurierte Zahl von
Sitzungen und Teilnehmern je Sitzung an und, wenn der Betreiber eine Allowlist setzt, Sitzungen
nur für erlaubte GitLab-Projekte. Der Vertrag nennt nur noch Codes, die das Backend liefert, und
die Oberfläche zeigt die neuen Fehler am Formular. Das README beschreibt Konfiguration,
Fehlercodes und das verbleibende Risiko vollständig.

## Scope

### Enthalten

- Obergrenze lebender Sitzungen (`planningpoker.session.max-sessions`, Standard 1000; abgelaufene Sitzungen zählen nicht) und Teilnehmer je Sitzung (`planningpoker.session.max-participants`, Standard 50, Scrum Master zählt mit); Überschreiten antwortet 409 `LIMIT_REACHED`.
- Projekt-Allowlist `planningpoker.session.allowed-projects` (Liste, ohne Standard): gesetzt, legt `POST /api/sessions` nur Sitzungen für Projekt-IDs der Liste an (exakter Vergleich nach dem Trimmen) und antwortet sonst 403 `PROJECT_NOT_ALLOWED`, bevor GitLab gefragt wird; nicht gesetzt, sind alle Projekte erlaubt.
- Vertrag: `ErrorCode` mit `PROJECT_NOT_ALLOWED` und `LIMIT_REACHED`, ohne `NOT_IMPLEMENTED`; `info.version` `2.0.0`; Antworten der Endpunkte `createSession` (403, 409) und `joinSession` (409) dokumentiert; `make contracts` regeneriert `contracts/api/openapi.yaml` und `frontend/src/app/api/schema.d.ts`.
- Frontend: deutsche Texte für die neuen Codes; Startseite zeigt `PROJECT_NOT_ALLOWED` und `LIMIT_REACHED` am Formular, Beitrittsseite `LIMIT_REACHED`; Text für `NOT_IMPLEMENTED` entfällt.
- README: Konfigurationszeilen für die drei neuen Schlüssel und für `planningpoker.realtime.auth-timeout` (aus 0009); Fehlercodes ohne `NOT_IMPLEMENTED`, Satz zu 501 entfällt; Absatz zu 401 und 404; Absatz zum verbleibenden Risiko.
- `project-rules/backend.md` (Absatz „Accepted risk“), `project-rules/frontend.md` (Codes der Formulare), `docs/domain/invariants.md` (I35 bis I37).

### Nicht enthalten

- Rate-Limit je Client-IP und Grenzen für WebSocket-Verbindungen vor `auth` (bleiben dokumentiertes Risiko, ADR 0005).
- Einheitliche Antwort für unbekannte Sitzung und fremdes Token (bleibt 404 und 401, ADR 0005).
- Gesamtablauf mit drei Kontexten, Fehler- und Leerzustände, Layout, Session-ID in Kleinbuchstaben im Beitrittslink, Rückmeldung beim Kopieren, Rundennummer, Content-Security-Policy, README final mit Checkliste und Zuordnung R-01 bis R-26 (Spec 0019).
- Mock-Backend: es liefert die neuen Codes nicht.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Sitzung, Teilnehmer, Scrum Master, Token | wie im Glossar |
| Obergrenze | Konfigurierte Höchstzahl lebender Sitzungen der Instanz oder Teilnehmer einer Sitzung; neu, mit /domain ins Glossar |
| Projekt-Allowlist | Konfigurierte Liste der GitLab-Projekt-IDs, für die Sitzungen angelegt werden dürfen; neu, mit /domain ins Glossar |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Mit `max-sessions=2` antwortet die dritte Erstellung 409 `LIMIT_REACHED`; nach dem Verfall einer Sitzung gelingt sie wieder. | Test `backend/src/test/java/planningpoker/session/SessionLimitsTest.java`; Unit `backend/src/test/java/planningpoker/session/SessionRegistryTest.java` |
| A2 | Mit `max-participants=3` antwortet der dritte Beitritt (vierter Teilnehmer) 409 `LIMIT_REACHED`; Sitzung und Teilnehmerliste bleiben unverändert, es geht kein Snapshot hinaus. | Test `backend/src/test/java/planningpoker/session/SessionLimitsTest.java`; Unit `backend/src/test/java/planningpoker/session/SessionTest.java` |
| A3 | Mit `allowed-projects=1234` antwortet die Erstellung für Projekt `5678` 403 `PROJECT_NOT_ALLOWED`, und WireMock hat keinen Aufruf erhalten; für ` 1234 ` (mit Leerzeichen) gelingt sie. Ohne den Schlüssel gelingt die Erstellung für jedes Projekt wie bisher. | Test `backend/src/test/java/planningpoker/session/ProjectAllowlistTest.java`; bestehende Tests in `IssueSelectionTest` |
| A4 | Der Vertrag enthält `PROJECT_NOT_ALLOWED` (403) und `LIMIT_REACHED` (409), nicht `NOT_IMPLEMENTED`; `info.version` ist `2.0.0`; `make drift` ist grün; `createSession` dokumentiert 403 und 409, `joinSession` 409. | Test `backend/src/test/java/planningpoker/session/api/ContractTest.java`; Aufruf `make drift` |
| A5 | Die Startseite zeigt bei `PROJECT_NOT_ALLOWED` „Für dieses GitLab-Projekt dürfen keine Sitzungen angelegt werden.“ und bei `LIMIT_REACHED` „Die Höchstzahl ist erreicht. Bitte später erneut versuchen.“ am Formular; die Beitrittsseite zeigt `LIMIT_REACHED` am Formular; das Banner bleibt leer. | Unit `frontend/src/app/start/start-page.spec.ts`, `frontend/src/app/join/join-page.spec.ts` |
| A6 | README: Tabelle der Konfiguration mit `max-sessions`, `max-participants`, `allowed-projects` und `realtime.auth-timeout`; Fehlercodes ohne `NOT_IMPLEMENTED` und ohne den Satz zu 501; Absatz zu 401 und 404 und zum verbleibenden Risiko (Rate-Limit, WebSocket vor `auth`). | Browser: README auf GitHub im PR; Aufruf `grep -c NOT_IMPLEMENTED README.md` ergibt 0 |
| A7 | `make check` und `make e2e` sind grün; kein Code im Repository nennt `NOT_IMPLEMENTED`. | Aufruf `make check`, `make e2e`, `git grep -c NOT_IMPLEMENTED` ohne Treffer außer Specs und ADRs |

## Contracts

`contracts/api/openapi.yaml` (generiert aus `ErrorCode` und den Annotationen von
`SessionResource`) und `frontend/src/app/api/schema.d.ts` (generiert). Breaking: der Enum-Wert
`NOT_IMPLEMENTED` entfällt (ADR 0005). Neu und kompatibel: `PROJECT_NOT_ALLOWED`,
`LIMIT_REACHED`, die zusätzlichen Antworten. Verbraucher: nur das Frontend dieses Repositorys; es
zieht in derselben Änderung nach. Version `1.0.0` auf `2.0.0`.

## Risiko

Stufe: high
Begründung: `harness/scripts/risk-level.sh` meldet high, weil `contracts/api/openapi.yaml` sich
ändert (`contracts/**`); der entfallene Enum-Wert bricht den Vertrag. Die Dateien unter
`backend/src/main/`, `frontend/src/app/` und `project-rules/` sind medium, Tests und Doku low.
Gates: G0 und G1 in dieser Session. G2: Label `human-approved`. G3: Status `verified`. Reviews:
Code, Sicherheit, Architektur.
ADR nötig: ja, 0005 (Vertragsbruch und Risiko high, `harness/policies/adr.md` Punkte 1 und 3).

## Umsetzung

Entscheidungen:

- ADR 0005: Obergrenzen und Projekt-Allowlist; kein Rate-Limit, keine WebSocket-Grenzen; 404 und 401 bleiben getrennt.
- Vertragsbruch: `NOT_IMPLEMENTED` entfällt, zwei neue Codes, Version `2.0.0`; Generierung nur über `make contracts`.
- Drei neue Konfigurationsschlüssel im `@ConfigMapping` `SessionConfig`; die Allowlist als `Optional<List<String>>`.
- Keine neuen Abhängigkeiten, keine neuen Module.

Dateien:

- `docs/roadmap.md`: ändern, 0015 geteilt, neue Zeile 0019, Welle 14
- `docs/adr/0005-haertung-offener-endpunkte.md`: neu
- `docs/adr/README.md`: ändern, Zeile 0005
- `backend/src/main/java/planningpoker/platform/ErrorCode.java`: ändern, Codes
- `backend/src/main/java/planningpoker/session/SessionConfig.java`: ändern, drei Schlüssel
- `backend/src/main/java/planningpoker/session/SessionRegistry.java`: ändern, Obergrenze Sitzungen, Teilnehmergrenze an die Sitzung
- `backend/src/main/java/planningpoker/session/SessionRegistryProducer.java`: ändern, Werte aus `SessionConfig`
- `backend/src/main/java/planningpoker/session/Session.java`: ändern, Obergrenze Teilnehmer in `join`
- `backend/src/main/java/planningpoker/session/SessionResource.java`: ändern, Allowlist vor dem GitLab-Aufruf, Antworten 403 und 409
- `backend/src/main/resources/application.properties`: ändern, `info-version` 2.0.0
- `backend/src/test/java/planningpoker/session/SessionLimitsTest.java`: neu, A1 und A2 mit `@TestProfile`
- `backend/src/test/java/planningpoker/session/ProjectAllowlistTest.java`: neu, A3 mit `@TestProfile`
- `backend/src/test/java/planningpoker/session/SessionRegistryTest.java`: ändern, Obergrenze und Verfall
- `backend/src/test/java/planningpoker/session/SessionTest.java`: ändern, Teilnehmergrenze
- `backend/src/test/java/planningpoker/session/SessionBuilder.java`: ändern, Grenze im Builder, falls der Konstruktor sie verlangt
- `backend/src/test/java/planningpoker/session/api/ContractTest.java`: ändern, Codes und Version
- `contracts/api/openapi.yaml`: ändern, generiert
- `frontend/src/app/api/schema.d.ts`: ändern, generiert
- `frontend/src/app/api/error-messages.ts`: ändern, neue Texte, `NOT_IMPLEMENTED` entfernt
- `frontend/src/app/shell/error-banner.spec.ts`: ändern, Codes
- `frontend/src/app/start/start-page.ts`: ändern, Codes des Formulars
- `frontend/src/app/start/start-page.spec.ts`: ändern, A5
- `frontend/src/app/join/join-page.ts`: ändern, Code des Formulars
- `frontend/src/app/join/join-page.spec.ts`: ändern, A5
- `README.md`: ändern, Konfiguration, Fehlercodes, 401 und 404, Risiko
- `project-rules/backend.md`: ändern, Absatz „Accepted risk“, Konfiguration
- `project-rules/frontend.md`: ändern, Codes der Formulare
- `docs/domain/invariants.md`: ändern, I35 bis I37
- `docs/domain/glossary.md`: ändern, Obergrenze, Projekt-Allowlist

Schritte:

1. `SessionConfig` um `maxSessions` (1000), `maxParticipants` (50) und `allowedProjects` erweitern; `SessionRegistryProducer` reicht die Grenzen weiter.
2. `SessionRegistry.create` zählt lebende Sitzungen und wirft `SessionException(LIMIT_REACHED)`; `Session.join` prüft die Teilnehmergrenze vor der Namensprüfung; die abgelehnte Änderung stellt `lastActivityAt` wieder her (bestehendes Verhalten von `update`).
3. `SessionResource.createSession` prüft die Allowlist vor `gitLabIssues.loadIssue` und wirft `ApiException(PROJECT_NOT_ALLOWED)`; Annotationen für 403 und 409.
4. `ErrorCode` ändern; `info-version` 2.0.0; `make contracts`; `ContractTest` anpassen.
5. Frontend: Texte, Codes der Formulare, Tests.
6. README, `project-rules/`, Invarianten, Glossar.
7. `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `SessionLimitsTest`: dritte Erstellung 409, nach Verfall (`TestClock`) wieder 201; `SessionRegistryTest`: Zählung ohne abgelaufene Sitzungen |
| A2 | `SessionLimitsTest`: vierter Teilnehmer 409, Liste unverändert; `SessionTest`: Grenze vor Namensprüfung |
| A3 | `ProjectAllowlistTest`: 403 ohne GitLab-Aufruf, Trimmen; bestehende Tests ohne Schlüssel |
| A4 | `ContractTest`: Codes, Antworten, Version; `make drift` |
| A5 | `start-page.spec.ts`, `join-page.spec.ts`: Texte am Formular, Banner leer |
| A6 | README im PR; `grep` |
| A7 | `make check`, `make e2e`, `git grep` |

Testdaten: Sitzungen über den HTTP-Ablauf (`SessionApiTest`), GitLab über `GitLabStubs`; die
Grenzen über `@TestProfile` mit kleinen Werten, damit die übrigen Tests die Standardwerte behalten.

Contracts zu regenerieren: `make contracts` (`contracts/api/openapi.yaml`,
`frontend/src/app/api/schema.d.ts`).

## Offene Fragen

- [x] 0015 aufteilen? → Ja: 0015 Härtung von Backend und Vertrag in Welle 11, neue 0019 Abgabe als letzte Welle nach den optionalen Features. (Morten Möller, 2026-11-16)
- [x] Welche Schutzmaßnahmen für die offenen Endpunkte? → Obergrenzen und Projekt-Allowlist; Rate-Limit und WebSocket-Grenzen bleiben dokumentiertes Risiko. (Morten Möller, 2026-11-16)
- [x] 401 und 404 vereinheitlichen? → Nein, beibehalten und im README dokumentieren. (Morten Möller, 2026-11-16)

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/session/`, `backend/src/test/java/planningpoker/session/api/`, `frontend/src/app/start/*.spec.ts`, `frontend/src/app/join/*.spec.ts`, `frontend/src/app/shell/*.spec.ts`, `make e2e`
- Browser: README im PR
- Aufruf: `make drift`, `git grep NOT_IMPLEMENTED`
