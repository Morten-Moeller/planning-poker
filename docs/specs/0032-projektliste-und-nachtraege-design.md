---
id: "0032"
title: Projektliste beim Fokus und Nachträge zum Design-Rework
status: approved
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-17
updated: 2026-11-17
pr: ""
note: freigegeben in der Session
---

# Projektliste beim Fokus und Nachträge zum Design-Rework

Sammel-Spec nach dem Durchgang der Person durch die App und den offenen Punkten aus den Reviews der
Specs 0027 bis 0031. Bezug: R-01 (Projekt und Issue beim Anlegen), 0022 (Projektauswahl),
0028 bis 0031 (Design Werkbank).

## Ziel

- Wer eine Sitzung anlegt, klickt ins Feld „GitLab-Projekt“ und sieht sofort die Projekte, die der Token sieht, ohne vorher zu tippen.
- Die offenen Nachträge sind erledigt:
  - Die Motivfarben stehen an einer Stelle.
  - Die Beitrittsseite zeigt die Kartenrücken aus dem Entwurf.
  - „Zuletzt geschätzt“ verlinkt das Issue in GitLab.
  - `project-rules` beschreiben den Stand.
  - Ein zeitabhängiger Test ist verlässlich.

## Scope

### Enthalten

- **Projektliste beim Fokus** (Startseite):
  - Bei leerem Feld „GitLab-Projekt“ lädt der Fokus die erste Seite von `GET /api/projects` ohne Suchbegriff, und das Autocomplete öffnet sich.
  - Tippen filtert wie bisher nach 300 ms. Eine reine Ziffernfolge gilt weiter als ID und sucht nicht.
  - Nach einer Auswahl zeigt ein erneuter Fokus wieder die volle Liste, solange das Feld leer ist.
  - Der Leerzustand „Keine Projekte gefunden“ und die Fehler bleiben wie in 0022 und 0031.
- **Motivfarben an einer Stelle:**
  - Die Tabelle der fünf Motive (Farben hell und dunkel, Muster) kommt aus `app-shell.scss` und `session-page.scss` in eine gemeinsame SCSS-Datei, zum Beispiel `frontend/src/styles/_motifs.scss`.
  - Sie stellt eine Funktion oder ein Mixin bereit, das die Variablen `--app-card-*` für ein Motiv setzt. Kopfzeile, Sitzungsraum und Beitrittsseite nutzen sie.
  - Das Verhalten bleibt gleich, gleiches `data-motif`, gleiche Farben.
- **Kartenrücken auf der Beitrittsseite:** Über dem Titel steht die Reihe der fünf Kartenrücken aus `docs/design/Einstieg.dc.html`, mit `aria-hidden`. `docs/design/README.md` streicht diese Abweichung.
- **Link in „Zuletzt geschätzt“:**
  - „In GitLab öffnen ↗“ führt zu `project.webUrl + "/-/issues/" + iid`, wenn `project` im Snapshot gesetzt ist (0030). Sonst entfällt der Link.
  - Er öffnet in einem neuen Tab mit `rel="noopener noreferrer"`.
- **`project-rules` nachziehen:**
  - `frontend.md`: Mock-Backend mit `total`, `project` und `writeWeight`; Projektliste beim Fokus; Testids `health-down`, `health-retry`, `join-not-found`, `join-not-found-home`, `join-role-hint`, `card-deck-locked`, `result-count-card`, `result-count-votes`.
  - `testing.md`: Mappings mit `X-Total`; die neuen E2E-Fälle aus 0029 (reduzierte Bewegung, Tastatur und Tisch, 375 px), 0030 (Projektname, Gesamtzahl, Fehlertext im Dialog) und 0031 (Startseite und Beitritt).
- **Verlässlicher Test:**
  - `ConfirmRoundTest.writesOneCommentForTwoFastConfirmationsAndBlocksCommandsMeanwhile` scheitert unter Last. Die Verzögerung der Notiz beträgt dort 700 ms. Läuft der Test langsamer, ist die Bestätigung vor den Prüfungen fertig.
  - Der Test hält die Antwort von GitLab, bis die Prüfungen gelaufen sind, zum Beispiel über eine von einem Latch gesteuerte WireMock-Erweiterung oder eine Verzögerung nahe am Timeout eines eigenen Testprofils. Keine Prüfung wird gelockert.
  - `acceptsAJoinWhileTheCommentIsWritten` nutzt dasselbe Muster, wenn es dort dieselbe Lücke gibt.

### Nicht enthalten

- Weitere Designänderungen, eine Paginierung der Projektliste über die erste Seite hinaus im Autocomplete, Caching der Projektliste.
- Änderungen an Backend-Code oder Vertrag.

## Begriffe

keine neuen

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Fokus auf das leere Feld „GitLab-Projekt“ ruft `GET /api/projects` ohne `search` auf und zeigt die Einträge mit Name, Pfad und ID. Tippen von „pok“ ruft mit `search=pok` auf, „1234“ ruft nichts auf. | Unit `frontend/src/app/start/start-page.spec.ts` |
| A2 | Im Browser gegen das GitLab-Double öffnet ein Klick ins leere Feld die Liste. Die Auswahl setzt die ID, und das Issue-Feld zeigt danach seine Liste. | End-to-End `frontend/e2e/project-picker.spec.ts` |
| A3 | Die Motivtabelle steht in genau einer SCSS-Datei. `app-shell.scss`, `session-page.scss` und `join-page.scss` enthalten keine Farbwerte der Motive mehr. Die berechneten `--app-card-accent` je `data-motif` sind hell und dunkel unverändert. | Aufruf `grep` im PR-Text; End-to-End `frontend/e2e/design-sidebar.spec.ts` (Farbwert je Motiv) |
| A4 | Die Beitrittsseite zeigt fünf Kartenrücken mit den Mustern der Motive, `aria-hidden="true"`. `docs/design/README.md` nennt die Abweichung nicht mehr. | Unit `frontend/src/app/join/join-page.spec.ts` |
| A5 | „Zuletzt geschätzt“ zeigt mit `project.webUrl` den Link auf `…/-/issues/42` mit `target="_blank"` und `rel="noopener noreferrer"`. Ohne `project` fehlt der Link. | Unit `frontend/src/app/session/last-result.spec.ts` |
| A6 | `project-rules/frontend.md` und `testing.md` nennen die Testids, Mappings und E2E-Fälle aus dem Scope. Die Regelprüfung meldet keinen Doku-Hinweis mehr für die Dateien aus 0029 bis 0031. | Aufruf `harness/scripts/review-rules.sh` im PR |
| A7 | `ConfirmRoundTest` läuft 20 Mal hintereinander grün, auch während parallel ein zweites `make test` läuft. Die Prüfungen sind dieselben wie vorher. | Aufruf `./mvnw test -Dtest=ConfirmRoundTest` in einer Schleife, Ergebnis im PR-Text |
| A8 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: `frontend/src/` ist Anwendungscode, `project-rules/` ist medium. Tests und
`docs/` sind low.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`; `verify` läuft auch bei
medium. Reviews: Code und Sicherheit.
ADR nötig: nein. Es gibt keine neue Abhängigkeit und keine Vertragsänderung. Die Projektliste folgt ADR 0008.

## Umsetzung

Entscheidungen:

- keine

Dateien:

- `frontend/src/app/start/start-page.ts`: ändern, Laden beim Fokus
- `frontend/src/app/start/start-page.html`: ändern, Fokus öffnet das Autocomplete
- `frontend/src/app/start/start-page.spec.ts`: ändern, A1
- `frontend/e2e/project-picker.spec.ts`: ändern, A2
- `frontend/src/styles/_motifs.scss`: neu, Motivtabelle und Mixin
- `frontend/src/app/shell/app-shell.scss`: ändern, gemeinsame Quelle
- `frontend/src/app/session/session-page.scss`: ändern, gemeinsame Quelle
- `frontend/e2e/design-sidebar.spec.ts`: ändern, A3
- `frontend/src/app/join/join-page.html`: ändern, Kartenrücken
- `frontend/src/app/join/join-page.scss`: ändern, Kartenrücken
- `frontend/src/app/join/join-page.spec.ts`: ändern, A4
- `docs/design/README.md`: ändern, Abweichung gestrichen
- `frontend/src/app/session/last-result.ts`: ändern, Link
- `frontend/src/app/session/last-result.html`: ändern, Link
- `frontend/src/app/session/last-result.spec.ts`: ändern, A5
- `project-rules/frontend.md`: ändern, A6
- `project-rules/testing.md`: ändern, A6
- `backend/src/test/java/planningpoker/session/ConfirmRoundTest.java`: ändern, A7
- `backend/src/test/java/planningpoker/session/GitLabStubs.java`: ändern, gehaltene Antwort, falls nötig

Schritte:

1. Projektliste beim Fokus. Den Fokus als zusätzliche Quelle neben `valueChanges` einbinden. Bei leerem Text wird ohne `search` angefragt.
2. Motivtabelle nach `frontend/src/styles/_motifs.scss`, beide Komponenten umstellen, Beitrittsseite mit Kartenrücken.
3. Link in `last-result`.
4. `ConfirmRoundTest` deterministisch machen, dann 20 Läufe.
5. `project-rules/`, README unter `docs/design/`.
6. `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `start-page.spec.ts` mit Fake-Timern und HTTP-Testing |
| A2 | `project-picker.spec.ts` |
| A3 | `grep`, `design-sidebar.spec.ts` |
| A4 | `join-page.spec.ts` |
| A5 | `last-result.spec.ts` |
| A6 | `review-rules.sh` |
| A7 | 20 Läufe von `ConfirmRoundTest` |
| A8 | `make check`, `make e2e` |

Testdaten: GitLab-Double mit Projekt `1234` und Issue 42; Backend über `GitLabStubs`.

Contracts zu regenerieren: keine.

## Offene Fragen

keine

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/start/*.spec.ts`, `frontend/src/app/join/*.spec.ts`, `frontend/src/app/session/last-result.spec.ts`, `backend/src/test/java/planningpoker/session/ConfirmRoundTest.java`, `make e2e`
- Browser: Startseite mit Klick ins leere Projektfeld, Beitrittsseite hell und dunkel, „Zuletzt geschätzt“ mit Link
