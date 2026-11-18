---
id: "0040"
title: Zuschauer und Einladungslinks je Rolle
status: Review
risk: high
adrs: ["0014"]
owner: Morten Möller
created: 2026-11-18
updated: 2026-11-18
pr: ""
note: freigegeben in der Session
---

# Zuschauer und Einladungslinks je Rolle

Wunsch der Person: Product Owner, Stakeholder und andere Gäste sitzen beim Planning Poker dabei,
ohne zu schätzen. Der Scrum Master lädt sie über einen eigenen Link als Zuschauer ein. Bezug:
ADR 0003, ADR 0014. Die Spec hängt ab von 0039, weil beide den Vertrag ändern (0039: `3.4.0`) und 0039 die Liste der letzten Sitzungen bringt.

## Ziel

Im Bereich „Teilen“ stehen zwei Einladungslinks, einer für Entwickler und einer für Zuschauer. Die
Rolle hängt fest am Code im Link. Wer über den Zuschauer-Link beitritt, sieht alles, hat keine
Karten und zählt nicht als Schätzer. Beitreten geht nur noch über einen der Links.

## Scope

### Enthalten

- **Backend:**
  - Neue Rolle `Role.VIEWER`.
  - **Einladungscodes:** Jede Sitzung erzeugt beim Anlegen einen Code für Entwickler und einen für Zuschauer, je mindestens 128 Bit aus `SecureRandom`, Base64url ohne Auffüllung.
  - **Beitreten:** `JoinSessionRequest` bekommt das Pflichtfeld `invite`. Der Server vergleicht in konstanter Zeit (`MessageDigest.isEqual`):
    - Code für Entwickler: Der Beitretende wird `DEVELOPER`.
    - Code für Zuschauer: Er wird `VIEWER`.
    - Anderer Code: 403 mit neuem `errorCode` `INVITE_INVALID`.
    - Fehlendes oder leeres Feld: 400 `VALIDATION_ERROR`.
    - Unbekannte Sitzung: 404 `SESSION_NOT_FOUND` wie bisher.
  - **Snapshot:** neues Feld `invites` mit `developer` und `viewer`, nur für den Scrum Master gefüllt, für alle anderen `null`. Die Codes erscheinen in keinem Log.
  - **Rechte von Zuschauern:** Sie stimmen nicht ab und geben keine Befehle des Scrum Masters. Beides ergibt 403 `FORBIDDEN_ROLE` wie bisher.
  - **Zählung:** „Alle verbundenen Entwickler haben geschätzt“ und „Nicht geschätzt“ berücksichtigen nur `DEVELOPER`. Zuschauer zählen zur Obergrenze der Teilnehmer.
- **Vertrag:** `Role.VIEWER`, `JoinSessionRequest.invite` als Pflichtfeld, `SessionView.invites` und `INVITE_INVALID`. Die Version steigt von `3.4.0` auf `4.0.0` (bricht beim Beitreten), über `make contracts`.
- **Teilen** (Seitenleiste, nur Scrum Master):
  - Die Zeile „Session-ID kopieren“ entfällt.
  - Neu sind zwei Zeilen: „Einladung Entwickler“ (Testid `share-link-developer`) und „Einladung Zuschauer“ (Testid `share-link-viewer`).
  - Die Links haben die Form `…/session/<id>/join?invite=<code>`. Der Zuschauer-Link trägt zusätzlich `&as=viewer`, nur für den Hinweistext, der Server ignoriert ihn.
  - Jede Zeile hat „Kopieren“, und „✓ Kopiert“ verschwindet wie in 0032 nach 3 s.
  - Die Session-ID steht weiter unter „Fakten“.
- **Startseite:** Das Formular „Sitzung beitreten“ mit der Session-ID entfällt, mit seinen Testids `join-form`, `join-session-id-*` und der Logik dazu.
- **Beitrittsseite:**
  - **Mit `invite`:** Sie sendet den Code. Mit `as=viewer` zeigt sie „Du trittst als Zuschauer bei. Du siehst die Runde, schätzt aber nicht mit.“ (Testid `join-viewer-hint`).
  - **Ohne `invite`:** Sie zeigt „Zum Beitreten brauchst du einen Einladungslink vom Scrum Master.“ (Testid `join-invite-missing`), ohne Formular.
  - **Bei `INVITE_INVALID`:** „Der Einladungslink ist ungültig. Bitte den Scrum Master um einen neuen.“ (Testid `join-invite-invalid`).
  - Der Guard leitet ohne Token weiter auf die Beitrittsseite. Ohne Code zeigt sie dann den Hinweis.
- **Sitzungsraum für Zuschauer:**
  - Er hat keine Kartenleiste. Im Footer (0035) steht in `DISCUSSION` und `VOTING` „Du schaust zu.“ (Testid `viewer-hint`), in `REVEALED` der Hinweis für Entwickler.
  - Die Toolbar zeigt „Name · Zuschauer“.
  - Die Teilnehmerliste zeigt Zuschauer mit dem Kennzeichen „👁 Zuschauer“, ohne Status zur Schätzung, unter den Entwicklern.
  - Der Tisch und die Zählung zeigen nur Entwickler.
  - „Fakten“ zeigt „Teilnehmer 7 (5 Entwickler, 1 Zuschauer)“. Ohne Zuschauer bleibt der Text wie heute.
- **Letzte Sitzungen (0039):** Eine Rolle `VIEWER` wird gespeichert und als „Zuschauer“ angezeigt.
- **Mock-Backend:** Codes, `invites` und `INVITE_INVALID`.
- **Doku:**
  - ADR 0014 und `docs/adr/README.md`.
  - Umsetzungsplan A-19.
  - Glossar: „Zuschauer“, „Einladungslink“, und „Rolle“ nennt drei Rollen.
  - `docs/domain/invariants.md` und der README-Abschnitt zu den Rollen.
  - `project-rules/frontend.md`, `project-rules/backend.md` und `project-rules/testing.md`.

### Nicht enthalten

- Neue Codes erzeugen oder einen Code widerrufen.
- Ein Rollenwechsel während der Sitzung.
- Ein Rate-Limit für das Beitreten. Wegen der 128 Bit ist es nicht nötig.
- Eigene Rechte für den Product Owner, etwa das Übernehmen des Ergebnisses.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Zuschauer | Rolle eines Teilnehmers, der über den Zuschauer-Link beitritt; sieht die Runde, schätzt nicht, steuert nicht; `Role.VIEWER`; neu, mit /domain ins Glossar |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Eine neue Sitzung hat zwei verschiedene Codes mit mindestens 22 Zeichen Base64url. `join` mit dem Code für Entwickler ergibt `DEVELOPER`, mit dem Code für Zuschauer `VIEWER`, mit einem anderen Code `INVITE_INVALID`. Ein Zuschauer, der abstimmen will, bekommt `FORBIDDEN_ROLE`. „Alle verbundenen Entwickler haben geschätzt“ und „Nicht geschätzt“ ignorieren Zuschauer. Zuschauer zählen zur Obergrenze. | Unit `backend/src/test/java/planningpoker/session/SessionTest.java` |
| A2 | `POST …/participants` liefert mit gültigem Code 201 und die passende Rolle im Snapshot. Ohne `invite` kommt 400, mit falschem Code 403 `INVITE_INVALID`. `PUT …/vote` und `POST …/round/reveal` eines Zuschauers ergeben 403. Der Snapshot hat `invites` nur für den Scrum Master, für Entwickler und Zuschauer `null`. | Test `backend/src/test/java/planningpoker/session/SessionResourceTest.java`, `RoundCommandsTest.java`, `SessionViewMapperTest.java` |
| A3 | Kein Log enthält einen Einladungscode. | Test `backend/src/test/java/planningpoker/platform/LoggingTest.java` (Fall Beitreten) |
| A4 | Der Vertrag enthält `VIEWER`, `invite`, `invites` und `INVITE_INVALID`, `info.version` ist `4.0.0`, und `make drift` ist grün. | Test `backend/src/test/java/planningpoker/session/api/ContractTest.java`; Aufruf `make drift` |
| A5 | „Teilen“ zeigt zwei Einladungslinks mit Code und Kopieren, keine Zeile für die Session-ID. Die Startseite hat kein Formular „Sitzung beitreten“ mehr. | Unit `frontend/src/app/session/share-session.spec.ts`, `frontend/src/app/start/start-page.spec.ts` |
| A6 | Die Beitrittsseite sendet `invite` und zeigt bei `as=viewer` den Hinweis. Ohne `invite` zeigt sie `join-invite-missing` ohne Formular, bei `INVITE_INVALID` `join-invite-invalid`. | Unit `frontend/src/app/join/join-page.spec.ts` |
| A7 | Für Zuschauer fehlt die Kartenleiste, der Footer zeigt den Hinweis, und die Toolbar zeigt „Zuschauer“. Teilnehmerliste, Tisch, Zählung und Fakten behandeln Zuschauer wie beschrieben. | Unit `round-footer.spec.ts`, `participant-list.spec.ts`, `seat-table.spec.ts`, `session-facts.spec.ts`, `frontend/src/app/shell/app-shell.spec.ts` |
| A8 | Im Browser: Der Scrum Master kopiert beide Links. Kontext B tritt über den Entwickler-Link bei, Kontext C über den Zuschauer-Link. C sieht keine Karten. B schätzt, und „Alle haben geschätzt“ erscheint ohne Zutun von C. Nach dem Auflösen steht C nicht unter „Nicht geschätzt“. Ein Link ohne Code und einer mit verändertem Code zeigen die Hinweise. | End-to-End `frontend/e2e/viewer.spec.ts` (neu) |
| A9 | Alle bestehenden E2E-Fälle treten über den Einladungslink bei und sind grün. `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

`contracts/api/openapi.yaml` und `frontend/src/app/api/schema.d.ts` werden mit `make contracts`
generiert. Neu sind:
- `Role` mit dem Wert `VIEWER`.
- `JoinSessionRequest.invite` als **Pflichtfeld**. Es bricht das Beitreten alter Clients.
- `SessionView.invites` (nullable) mit `developer` und `viewer`.
- `errorCode` `INVITE_INVALID` (403).

Verbraucher ist nur das Frontend dieses Repositorys, es zieht in derselben Änderung nach. Version
`3.4.0` wird `4.0.0`. Der Migrationspfad ist dieselbe Änderung, alte Clients gibt es nicht.

## Risiko

Stufe: high
Begründung: `harness/scripts/risk-level.sh` meldet high für `contracts/**`. Inhaltlich ändern sich
die Rollenprüfung, der Zugang zum Beitreten (neue Geheimnisse) und die Zählung der Schätzer, und
der Vertrag bricht.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`, G3 über den Status
`verified`. Reviews: Code, Sicherheit, Architektur.
ADR nötig: ja, 0014 (neue Rolle, Einladungscodes, Beitreten nur per Link, brechende Vertragsänderung).

## Umsetzung

Entscheidungen:

- ADR 0014: `Role.VIEWER` und zwei Einladungscodes je Sitzung mit mindestens 128 Bit. Die Rolle folgt aus dem Code, Beitreten geht nur per Link, das Formular auf der Startseite entfällt.
- Vertrag `4.0.0` über `make contracts`, brechend beim Beitreten.
- Neuer Fehlercode `INVITE_INVALID` (403).

Dateien:

- `docs/adr/0014-zuschauer-rolle.md`: neu
- `docs/adr/README.md`: ändern, Zeile 0014
- `docs/umsetzungsplan.md`: ändern, A-19
- `backend/src/main/java/planningpoker/session/Role.java`: ändern, `VIEWER`
- `backend/src/main/java/planningpoker/platform/ErrorCode.java`: ändern, `INVITE_INVALID`
- `backend/src/main/java/planningpoker/session/api/JoinSessionRequest.java`: ändern, `invite`
- `backend/src/main/java/planningpoker/session/api/SessionView.java`: ändern, `invites`
- `backend/src/main/java/planningpoker/session/Session.java`: ändern, Codes, `join` mit Code, Zählung nur Entwickler
- `backend/src/main/java/planningpoker/session/SessionRegistry.java`: ändern, Code an `join` durchreichen
- `backend/src/main/java/planningpoker/session/SessionResource.java`: ändern, `invite` übergeben, Antworten dokumentieren
- `backend/src/main/java/planningpoker/session/SessionViewMapper.java`: ändern, `invites` nur für den Scrum Master
- `backend/src/main/resources/application.properties`: ändern, `info-version` 4.0.0
- `backend/src/test/java/planningpoker/session/SessionTest.java`: ändern, A1
- `backend/src/test/java/planningpoker/session/SessionResourceTest.java`: ändern, A2
- `backend/src/test/java/planningpoker/session/RoundCommandsTest.java`: ändern, A2
- `backend/src/test/java/planningpoker/session/SessionViewMapperTest.java`: ändern, A2
- `backend/src/test/java/planningpoker/session/SessionApiTest.java`: ändern, Beitreten mit Code
- `backend/src/test/java/planningpoker/session/SessionLimitsTest.java`: ändern, Beitreten mit Code
- `backend/src/test/java/planningpoker/realtime/RestCalls.java`: ändern, Beitreten mit Code
- `backend/src/test/java/planningpoker/platform/LoggingTest.java`: ändern, A3
- `backend/src/test/java/planningpoker/session/api/ContractTest.java`: ändern, A4
- `contracts/api/openapi.yaml`: ändern, generiert
- `contracts/api/examples/lobby-scrum-master.json`: ändern, `invites`
- `contracts/api/examples/discussion-scrum-master.json`: ändern, `invites`
- `contracts/api/examples/voting-scrum-master.json`: ändern, `invites`
- `contracts/api/examples/revealed-scrum-master.json`: ändern, `invites`
- `contracts/api/examples/lobby-developer.json`: ändern, `invites: null`
- `contracts/api/examples/discussion-developer.json`: ändern, `invites: null`
- `contracts/api/examples/voting-developer.json`: ändern, `invites: null`
- `contracts/api/examples/revealed-developer.json`: ändern, `invites: null`
- `frontend/src/app/api/schema.d.ts`: ändern, generiert
- `frontend/src/app/api/session-store.ts`: ändern, `isViewer`, `invites`
- `frontend/src/app/api/error-messages.ts`: ändern, `INVITE_INVALID`
- `frontend/src/app/api/mock/mock-backend.interceptor.ts`: ändern, Codes
- `frontend/src/app/api/mock/mock-session.ts`: ändern, Codes
- `frontend/src/app/api/recent-sessions.ts`: ändern, Rolle `VIEWER`
- `frontend/src/app/start/start-page.html`: ändern, Formular „Sitzung beitreten“ entfernen
- `frontend/src/app/start/start-page.ts`: ändern, `joinForm` entfernen
- `frontend/src/app/start/start-page.scss`: ändern
- `frontend/src/app/start/start-page.spec.ts`: ändern, A5
- `frontend/src/app/session/share-session.html`: ändern
- `frontend/src/app/session/share-session.ts`: ändern
- `frontend/src/app/session/share-session.scss`: ändern
- `frontend/src/app/session/share-session.spec.ts`: ändern, A5
- `frontend/src/app/join/join-page.html`: ändern, Hinweise
- `frontend/src/app/join/join-page.ts`: ändern, `invite`, `as`
- `frontend/src/app/join/join-page.spec.ts`: ändern, A6
- `frontend/src/app/session/round-footer.html`: ändern, Hinweis für Zuschauer
- `frontend/src/app/session/round-footer.ts`: ändern
- `frontend/src/app/session/round-footer.spec.ts`: ändern, A7
- `frontend/src/app/session/vote-progress.ts`: ändern, nur Entwickler
- `frontend/src/app/session/participant-list.html`: ändern, Kennzeichen
- `frontend/src/app/session/participant-list.ts`: ändern
- `frontend/src/app/session/participant-list.scss`: ändern
- `frontend/src/app/session/participant-list.spec.ts`: ändern, A7
- `frontend/src/app/session/seat-table.ts`: ändern, nur Entwickler
- `frontend/src/app/session/seat-table.spec.ts`: ändern, A7
- `frontend/src/app/session/session-facts.html`: ändern
- `frontend/src/app/session/session-facts.ts`: ändern
- `frontend/src/app/session/session-facts.spec.ts`: ändern, A7
- `frontend/src/app/session/round-result.ts`: ändern, „Nicht geschätzt“ nur Entwickler
- `frontend/src/app/session/last-result.ts`: ändern, falls Rollen gezählt werden
- `frontend/src/app/shell/app-shell.html`: ändern, „Zuschauer“
- `frontend/src/app/shell/app-shell.spec.ts`: ändern, A7
- `frontend/e2e/viewer.spec.ts`: neu, A8
- `frontend/e2e/helpers.ts`: ändern, Beitreten über den Einladungslink
- `frontend/e2e/create-and-join.spec.ts`: ändern, A9
- `frontend/e2e/full-flow.spec.ts`: ändern, A9
- `frontend/e2e/round-timer.spec.ts`: ändern, A9
- `frontend/e2e/preferences.spec.ts`: ändern, A9
- `frontend/e2e/voting-round.spec.ts`: ändern, A9
- `frontend/e2e/result-round.spec.ts`: ändern, A9
- `frontend/e2e/outliers.spec.ts`: ändern, A9
- `frontend/e2e/consensus.spec.ts`: ändern, A9
- `frontend/e2e/theme.spec.ts`: ändern, A9
- `frontend/e2e/recent-sessions.spec.ts`: ändern, A9
- `README.md`: ändern, Rollen, Beitreten
- `docs/domain/glossary.md`: ändern
- `docs/domain/invariants.md`: ändern
- `project-rules/frontend.md`: ändern
- `project-rules/backend.md`: ändern
- `project-rules/testing.md`: ändern

Schritte:

1. Backend: `Role.VIEWER`, Codes, `join` mit Code, `INVITE_INVALID`, `invites` im Snapshot, Zählung nur Entwickler, Tests, `info-version`, `make contracts`, Beispiele, `ContractTest`.
2. Frontend: Store, Mock-Backend, Teilen mit zwei Links, Startseite ohne Formular, Beitrittsseite, Footer, Liste, Tisch, Fakten, Toolbar.
3. E2E-Helfer und alle Fälle über den Link, neuer Fall `viewer.spec.ts`.
4. Doku, Glossar, Invarianten, A-19, `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `SessionTest` |
| A2 | `SessionResourceTest`, `RoundCommandsTest`, `SessionViewMapperTest` |
| A3 | `LoggingTest` |
| A4 | `ContractTest`, `make drift` |
| A5 | `share-session.spec.ts`, `start-page.spec.ts` |
| A6 | `join-page.spec.ts` |
| A7 | `round-footer.spec.ts`, `participant-list.spec.ts`, `seat-table.spec.ts`, `session-facts.spec.ts`, `app-shell.spec.ts` |
| A8 | `viewer.spec.ts` |
| A9 | `make check`, `make e2e` |

Testdaten: GitLab-Double wie bisher, je Rolle ein eigener Playwright-Kontext. Der E2E-Helfer liest die Links aus dem Snapshot des Scrum Masters (`GET /api/sessions/{id}`).

Contracts zu regenerieren: `make contracts` (`contracts/api/openapi.yaml`,
`frontend/src/app/api/schema.d.ts`).

## Offene Fragen

- [x] Wie kommt jemand als Zuschauer in die Sitzung? → Über einen eigenen Einladungslink, der Scrum Master entscheidet und beim Beitreten wählt niemand. Der zweite Link ersetzt die kopierbare Session-ID im Bereich „Teilen“. (Morten Möller, 2026-11-18)
- [x] Lenkt der Link die Rolle nur, oder bindet er sie? → Er bindet sie fest über einen Einladungscode je Rolle (ADR 0014, Option B). (Morten Möller, 2026-11-18)
- [x] Was passiert mit dem Beitreten über die Session-ID? → Es entfällt, Beitreten geht nur noch per Link. R-02 ist über den generierten Link erfüllt. (Morten Möller, 2026-11-18)

## Verifikationsplan

- make check
- betroffene Tests: `backend/src/test/java/planningpoker/session/`, `backend/src/test/java/planningpoker/session/api/`, `frontend/src/app/session/`, `frontend/src/app/join/`, `frontend/src/app/shell/`, `make e2e`
- Browser: Scrum Master, Entwickler und Zuschauer in drei Kontexten durch alle Phasen, hell und dunkel; Link ohne Code und mit falschem Code
- Aufruf: `make drift`
