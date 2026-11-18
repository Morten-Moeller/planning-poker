---
id: "0036"
title: Name, Projekt, Timer und Issue-Filter im Browser merken
status: Review
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-18
updated: 2026-11-18
pr: ""
note: freigegeben in der Session
---

# Name, Projekt, Timer und Issue-Filter im Browser merken

Rückmeldung der Person aus dem Test: Bei jeder neuen Sitzung müssen Name, Projekt, Timer und die
Filter der Issue-Liste neu eingestellt werden. Bezug: Startseite (0022, 0033), Beitrittsseite,
Timer (0016), Issue-Filter (0023).

## Ziel

Der Browser merkt sich die letzten Eingaben im `localStorage`. Beim nächsten Anlegen oder
Beitreten sind Name und Projekt vorbelegt, eine neue Sitzung startet mit dem zuletzt gewählten
Timer, und die Issue-Liste öffnet mit den zuletzt gewählten Filtern.

## Scope

### Enthalten

- **Einstellungsspeicher** `PreferencesStore` (Frontend, `localStorage`, ein Schlüssel `planningpoker.preferences` mit JSON). Felder: `name`, `projectId`, `timerSeconds`, `weightFilter`, `periodFilter`. Fehlender Speicher, ungültiges JSON, unbekannte Werte und Ausnahmen beim Lesen oder Schreiben führen zum Standardwert, nie zu einem Fehler auf der Seite.
- **Name:** ein gemeinsamer Wert für Startseite (Scrum Master) und Beitrittsseite (Entwickler), unabhängig von der Session-ID. Er wird nach erfolgreichem Anlegen oder Beitreten gespeichert und beim Öffnen der Seite vorbelegt.
- **Projekt:** Der Wert des Projektfelds auf der Startseite wird nach erfolgreichem Anlegen gespeichert und vorbelegt. Ein vorbelegtes Feld öffnet die Projektliste beim Fokus nicht (wie jedes gefüllte Feld). Nach „Projekt nicht gefunden“ wird der Wert nicht gespeichert.
- **Timer:** Jede erfolgreiche Änderung im Timer-Feld speichert den Wert (auch „Aus“). Nach dem Anlegen einer Sitzung setzt die Startseite einen gespeicherten Timer ungleich „Aus“ über den bestehenden Aufruf `PUT …/timer` und navigiert danach in die Sitzung, auch wenn der Aufruf fehlschlägt.
- **Issue-Filter:** Gewicht und „Geändert in“ des Issue-Panels starten mit den gespeicherten Werten. Jede Änderung speichert, „Filter zurücksetzen“ speichert die Standardwerte (`Ohne Gewicht`, `Alle`).
- **Doku:** `project-rules/frontend.md` (Einstellungsspeicher, Schlüssel, Felder), `project-rules/testing.md` (E2E-Fälle).

### Nicht enthalten

- Ein Knopf zum Löschen der gespeicherten Werte.
- Speichern im Backend oder pro Person über Geräte hinweg.
- Vorbelegen der Issue-Nummer auf der Startseite.
- Änderungen an Backend oder Vertrag.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Einstellungsspeicher | Werte im `localStorage` des Browsers, nur Vorbelegung, nie Quelle für den Zustand einer Sitzung; neu, nur UI, kein Glossarbegriff |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `PreferencesStore` liest und schreibt die fünf Felder. Ohne Eintrag, bei ungültigem JSON, unbekannten Werten (etwa `timerSeconds: 7`, `weightFilter: "X"`) und wenn `localStorage` eine Ausnahme wirft, liefert er Standardwerte und wirft nicht. | Unit `frontend/src/app/api/preferences-store.spec.ts` |
| A2 | Startseite: Nach erfolgreichem Anlegen sind Name und Projekt gespeichert und beim nächsten Öffnen vorbelegt. Nach `PROJECT_NOT_FOUND` wird nichts gespeichert. | Unit `frontend/src/app/start/start-page.spec.ts` |
| A3 | Startseite: Mit gespeichertem Timer 30 s ruft das Anlegen `setTimer` mit 30 auf und navigiert danach. Mit „Aus“ gibt es keinen Aufruf. Schlägt der Aufruf fehl, wird trotzdem navigiert. | Unit `frontend/src/app/start/start-page.spec.ts` |
| A4 | Beitrittsseite: Nach erfolgreichem Beitreten ist der Name gespeichert und auf der Beitrittsseite einer anderen Sitzung vorbelegt. Nach „Name vergeben“ wird nicht gespeichert. | Unit `frontend/src/app/join/join-page.spec.ts` |
| A5 | Timer-Feld: Eine erfolgreiche Änderung speichert den Wert, eine fehlgeschlagene nicht. | Unit `frontend/src/app/session/timer-setting.spec.ts` |
| A6 | Issue-Panel: startet mit den gespeicherten Filtern und lädt die Issues mit ihnen; Änderungen und „Filter zurücksetzen“ speichern. | Unit `frontend/src/app/session/issue-panel.spec.ts` |
| A7 | Im Browser: Sitzung anlegen mit Name und Projekt, Timer 30 s und Filter „Mit Gewicht“, „1 Monat“ wählen; neue Sitzung anlegen: Name und Projekt sind vorbelegt, der Timer zeigt 30 s, das Panel zeigt „Mit Gewicht“ und „1 Monat“. Beitrittsseite einer anderen Sitzung zeigt den Namen. | End-to-End `frontend/e2e/preferences.spec.ts` (neu) |
| A8 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh` meldet medium für Code unter `frontend/src/app/` und
für `project-rules/**`. Im `localStorage` liegen nur Name, Projekt-ID und Einstellungen, kein
Token; die Tokens bleiben im `sessionStorage` (`TokenStore`).
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`. `verified` ist nicht
erforderlich, `implement` führt `verify` trotzdem aus. Reviews: Code, Sicherheit.
ADR nötig: nein, weil keine neue Abhängigkeit, kein Vertrag und keine Abweichung von einer Regel
aus `harness/architecture.md` oder `harness/testing.md` entsteht; der Speicher ist reine
Vorbelegung im Frontend.

## Umsetzung

Entscheidungen:

- Neuer Dienst `PreferencesStore` in `frontend/src/app/api/`, neben `TokenStore`, ein JSON-Eintrag im `localStorage`.
- Der Timer einer neuen Sitzung wird über den bestehenden Aufruf `setTimer` gesetzt, ohne Änderung an `CreateSessionRequest`.

Dateien:

- `frontend/src/app/api/preferences-store.ts`: neu
- `frontend/src/app/api/preferences-store.spec.ts`: neu, A1
- `frontend/src/app/start/start-page.ts`: ändern, vorbelegen, speichern, Timer nach dem Anlegen
- `frontend/src/app/start/start-page.spec.ts`: ändern, A2 und A3
- `frontend/src/app/join/join-page.ts`: ändern, Name vorbelegen und speichern
- `frontend/src/app/join/join-page.spec.ts`: ändern, A4
- `frontend/src/app/session/timer-setting.ts`: ändern, speichern nach Erfolg
- `frontend/src/app/session/timer-setting.spec.ts`: ändern, A5
- `frontend/src/app/session/issue-panel.ts`: ändern, Filter vorbelegen und speichern
- `frontend/src/app/session/issue-panel.spec.ts`: ändern, A6
- `frontend/e2e/preferences.spec.ts`: neu, A7
- `project-rules/frontend.md`: ändern, Einstellungsspeicher
- `project-rules/testing.md`: ändern, E2E-Fall

Schritte:

1. `PreferencesStore` mit Prüfung der Werte gegen `TIMER_OPTIONS`, `WeightFilter`, `UpdatedPeriod`.
2. Startseite und Beitrittsseite: vorbelegen, nach Erfolg speichern, Timer nach dem Anlegen.
3. Timer-Feld und Issue-Panel: vorbelegen und speichern.
4. E2E-Fall, `project-rules`, `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `preferences-store.spec.ts` |
| A2, A3 | `start-page.spec.ts` |
| A4 | `join-page.spec.ts` |
| A5 | `timer-setting.spec.ts` |
| A6 | `issue-panel.spec.ts` |
| A7 | `preferences.spec.ts` |
| A8 | `make check`, `make e2e` |

Testdaten: GitLab-Double wie bisher (Projekt und Issues 42 bis 44); jeder Playwright-Fall hat einen
frischen Browserkontext, also einen leeren `localStorage`.

Contracts zu regenerieren: keine.

## Offene Fragen

- [x] Welche Zeit-Einstellung wird gemerkt? → Der Timer und die Issue-Filter („Geändert in“, dazu das Gewicht). (Morten Möller, 2026-11-18)
- [x] Wird der Name gemerkt? → Ja, ein Name für Startseite und Beitrittsseite, unabhängig von der Session-ID. (Morten Möller, 2026-11-18)
- [x] `risk-level.sh` meldet high, weil zwei Doku-Zeilen in `project-rules/frontend.md` das Wort „token“ enthalten. Mit high weiter oder umformulieren? → Umformulieren: `PreferencesStore` in einer eigenen Zeile, die Zeile mit `TokenStore` bleibt unberührt, die Aussage bleibt („holds only the values listed above; session credentials stay in sessionStorage“). Die Stufe bleibt medium. (Morten Möller, 2026-11-18)

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/api/`, `frontend/src/app/start/`, `frontend/src/app/join/`, `frontend/src/app/session/timer-setting.spec.ts`, `frontend/src/app/session/issue-panel.spec.ts`, `make e2e`
- Browser: Startseite, Beitrittsseite, Timer und Issue-Panel über zwei Sitzungen hinweg
