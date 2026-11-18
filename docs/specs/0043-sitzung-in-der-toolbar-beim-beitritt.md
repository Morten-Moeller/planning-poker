---
id: "0043"
title: Session-ID in der Toolbar der Beitrittsseite
status: Review
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-18
updated: 2026-11-18
pr: ""
note: freigegeben in der Session
---

# Session-ID in der Toolbar der Beitrittsseite

Wunsch der Person: Auf der Beitrittsseite steht die Sitzung im Kopf der Seite, so wie im
Sitzungsraum. Bezug: Toolbar (0027, 0039), Beitrittsseite (0031, 0040).

## Ziel

Wer einen Einladungslink öffnet, sieht in der Toolbar dieselbe Session-ID wie später im Raum. Der
Kopf sieht auf der Beitrittsseite und im Raum gleich aus.

## Scope

### Enthalten

- **Toolbar auf `/session/:id/join`:**
  - Neben „Planning Poker“ steht die Session-ID aus der Route, im selben Stil und mit derselben Testid `toolbar-session-id` wie im Raum.
  - Davor steht das Motiv-Feld als gestrichelter Platzhalter (Testid `toolbar-motif`). Das ist der heutige Stil ohne Rundenmotiv.
  - Name und Rolle fehlen, solange niemand beigetreten ist.
- **Quelle der Session-ID:** `app-shell` liest sie aus der aktuellen URL über den `Router` (`NavigationEnd`). Gilt sie nur für die Beitrittsroute und passt sie zum Muster der Session-ID (8 Zeichen, A-17), wird sie gezeigt. Im Raum bleibt die Quelle der Snapshot.
- **Beitrittsseite:** Der Chip „Sitzung K7P2QX9M“ (`session-chip`, Testid `join-session-id`) entfällt, damit die ID nicht doppelt steht. Tests, die `join-session-id` lesen, lesen `toolbar-session-id`.
- **Doku:** `project-rules/frontend.md` (Toolbar auf der Beitrittsseite) und `project-rules/testing.md`, falls dort `join-session-id` steht.

### Nicht enthalten

- Den Projektnamen oder das Issue auf der Beitrittsseite. Ohne Beitritt gibt es keinen Snapshot.
- Änderungen an Backend oder Vertrag.

## Begriffe

keine neuen

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Auf `/session/K7P2QX9M/join` zeigt die Toolbar `toolbar-session-id` mit „K7P2QX9M“ und `toolbar-motif`, aber kein `toolbar-me`. Auf `/` gibt es keine Session-ID. Eine ungültige ID in der URL wird nicht gezeigt. | Unit `frontend/src/app/shell/app-shell.spec.ts` |
| A2 | Die Beitrittsseite hat keinen Chip `join-session-id` mehr. | Unit `frontend/src/app/join/join-page.spec.ts`, `frontend/src/app/api/session.guard.spec.ts` |
| A3 | Im Browser: Der Entwickler öffnet den Einladungslink, die Toolbar zeigt die Session-ID. Nach dem Beitritt steht im Raum dieselbe ID an derselben Stelle, dazu Name und Rolle. | End-to-End `frontend/e2e/create-and-join.spec.ts`, `frontend/e2e/full-flow.spec.ts` (bisherige Prüfungen von `join-session-id` umgestellt) |
| A4 | Im Browser hell und dunkel, bei 1440 und 375 px: Die Toolbar der Beitrittsseite sieht aus wie im Raum, ohne horizontale Scrollleiste. | `/verify`, Browser, Screenshots |
| A5 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh` meldet medium für Code unter `frontend/src/app/` und
`project-rules/**`.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`. `verified` ist nicht
erforderlich, `implement` führt `verify` trotzdem aus. Reviews: Code, Sicherheit.
ADR nötig: nein, weil sich nur die Darstellung der Toolbar ändert.

## Umsetzung

Entscheidungen: keine

Dateien:

- `frontend/src/app/shell/app-shell.ts`: ändern, Session-ID der Beitrittsroute
- `frontend/src/app/shell/app-shell.html`: ändern, Anzeige auch ohne Snapshot
- `frontend/src/app/shell/app-shell.spec.ts`: ändern, A1
- `frontend/src/app/join/join-page.html`: ändern, Chip entfernen
- `frontend/src/app/join/join-page.scss`: ändern, Chip-Stile entfernen
- `frontend/src/app/join/join-page.spec.ts`: ändern, A2
- `frontend/src/app/api/session.guard.spec.ts`: ändern, A2
- `frontend/e2e/create-and-join.spec.ts`: ändern, A3
- `frontend/e2e/full-flow.spec.ts`: ändern, A3
- `project-rules/frontend.md`: ändern
- `project-rules/testing.md`: ändern, falls nötig

Schritte:

1. `app-shell`: Session-ID aus der Beitrittsroute, Anzeige ohne Snapshot.
2. Chip der Beitrittsseite entfernen, Tests umstellen.
3. Doku, `make check`, `make e2e`, Screenshots.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `app-shell.spec.ts` |
| A2 | `join-page.spec.ts`, `session.guard.spec.ts` |
| A3 | `create-and-join.spec.ts`, `full-flow.spec.ts` |
| A4 | `/verify`, Browser |
| A5 | `make check`, `make e2e` |

Testdaten: GitLab-Double wie bisher, Einladungslink aus dem Raum des Scrum Masters.

Contracts zu regenerieren: keine.

## Offene Fragen

- [x] Wo steht die Sitzung auf der Beitrittsseite? → In der Toolbar wie im Raum. Der Chip im Inhalt entfällt, damit die ID nicht doppelt steht. (Morten Möller, 2026-11-18)

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/shell/`, `frontend/src/app/join/`, `frontend/src/app/api/session.guard.spec.ts`, `make e2e`
- Browser: Beitrittsseite über den Einladungslink, danach der Raum, hell und dunkel, 1440 und 375 px
