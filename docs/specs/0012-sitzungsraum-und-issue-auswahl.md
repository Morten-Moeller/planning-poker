---
id: "0012"
title: Sitzungsraum und Issue-Auswahl (M10)
status: done
risk: medium
adrs: ["0004"]
owner: Morten Möller
created: 2026-11-16
updated: 2026-11-16
pr: "#12"
note: alle Kriterien erfüllt
---

# Sitzungsraum und Issue-Auswahl (M10)

Meilenstein M10 aus `docs/umsetzungsplan.md`. Deckt ab: R-04 bis R-08, R-10 und den Teil
„Teilnehmerliste mit Rolle, freigegebenes Issue“ von R-22 im Frontend. Annahmen: A-03
(vorausgewähltes Issue). Grundlage: der Store und der WebSocket aus 0005 und 0009, der
Sitzungsraum mit dem Block „Teilen“ aus 0011, die Endpunkte `issues` und `active-issue` aus 0007.

## Ziel

Im Sitzungsraum sehen alle die Teilnehmer mit Rolle und Verbindungsstatus. Der Scrum Master
sucht im Bedienfeld ein Issue des Projekts, sieht eine Vorschau und gibt es frei; das
vorausgewählte Issue ist vorbelegt. Entwickler warten in der Phase `LOBBY` und sehen das aktive
Issue mit Titel, bereinigter Beschreibung und Link zu GitLab, sobald es freigegeben ist, ohne
Neuladen. Ein Issue-Wechsel während einer Runde verlangt eine Rückfrage.

## Scope

### Enthalten

- Teilnehmerliste: Name, Rollenkennzeichen „Scrum Master“, Verbindungsstatus „verbunden“ oder „getrennt“; aktualisiert sich über den Snapshot.
- Bedienfeld des Scrum Masters: lädt beim Öffnen die erste Seite der Issues des Projekts, Suche per Text, „Mehr laden“ bei `nextPage`; Auswahl eines Treffers zeigt die Vorschau (Titel, `#iid`, Link zu GitLab); das vorausgewählte Issue ist ausgewählt; „Freigeben“ ruft `active-issue`. Die Treffer bleiben in der Komponente (ADR 0004).
- Issue-Wechsel in `VOTING` und `REVEALED`: dieselbe Schaltfläche heißt „Issue wechseln“ und öffnet einen Material-Dialog mit der Rückfrage, dass die laufende Runde verworfen wird. Während `round.confirming` und für das schon aktive Issue ist sie deaktiviert.
- Wartezustand für Entwickler in der Phase `LOBBY`.
- Anzeige des aktiven Issues: Titel, `#iid`, Beschreibung als Markdown über `marked` und `[innerHTML]` mit der eingebauten Bereinigung von Angular, Link zu GitLab in neuem Tab.
- Neues Mapping des GitLab-Doubles: Issue 44 mit Skript-Inhalten in der Beschreibung.
- End-to-End-Abläufe mit Scrum Master und Entwickler in zwei Browser-Kontexten.

### Nicht enthalten

- Kartenfächer, Fortschritt, Hinweis „alle haben geschätzt“, Auflösen (0013); Auswertung, neue Runde, Bestätigung, Protokoll (0014).
- Backend- und Vertragsänderungen.
- Mock-Backend: `start:mock` bleibt beim Stand von 0011; die Freigabe ändert dort den Snapshot nicht.
- Groß- und Kleinschreibung der Session-ID im Beitrittslink (Hinweis aus 0011, geht nach 0015).

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Teilnehmer, Scrum Master, Entwickler, Rolle, Aktives Issue, Freigabe, Issue-Wechsel, Phase, Vorausgewähltes Issue, Verbindungsstatus, GitLab-Double | wie im Glossar |
| Bedienfeld | Bereich des Scrum Masters im Sitzungsraum mit Issue-Suche, Vorschau und Freigabe; wird für Entwickler nicht gerendert |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Die Teilnehmerliste (`participant-list`, je Zeile `participant`) zeigt für jeden Teilnehmer den Namen (`participant-name`), beim Scrum Master das Kennzeichen „Scrum Master“ (`participant-role`) und den Verbindungsstatus (`participant-status`, „verbunden“ oder „getrennt“). Scrum Master und Entwickler sehen dieselbe Liste; schließt der Entwickler seinen Browser-Kontext, zeigt die Liste des Scrum Masters ihn ohne Neuladen als „getrennt“. | End-to-End `frontend/e2e/session-room.spec.ts` |
| A2 | Der Scrum Master sieht in der Phase `LOBBY` das Bedienfeld (`issue-panel`): die Issues des Projekts als Liste (`issue-result`), Suche (`issue-search-input`, `issue-search-submit`), „Mehr laden“ (`issue-load-more`) nur bei `nextPage`; das vorausgewählte Issue ist ausgewählt und in der Vorschau (`issue-preview`, Titel, `#iid`, Link); ein Klick auf einen anderen Treffer ändert die Vorschau; „Freigeben“ (`issue-release`) setzt die Phase auf „Runde läuft“. | End-to-End `frontend/e2e/session-room.spec.ts`; Unit `frontend/src/app/session/issue-panel.spec.ts` (Laden, Suche, Folgeseite, Vorbelegung, Freigabe) |
| A3 | Für Entwickler sind Bedienfeld und Schaltflächen des Scrum Masters nicht im DOM, in `LOBBY` und in `VOTING` (`issue-panel`, `issue-release` mit Anzahl 0). | Unit `frontend/src/app/session/session-page.spec.ts`; End-to-End `frontend/e2e/session-room.spec.ts` |
| A4 | Ein Entwickler sieht in `LOBBY` den Wartezustand (`lobby-waiting`) und kein Issue; nach der Freigabe durch den Scrum Master erscheint ohne Neuladen das aktive Issue (`active-issue`) mit Titel (`active-issue-title`), Beschreibung (`active-issue-description`) und Link zu GitLab (`active-issue-link`, `href` gleich `webUrl`, `target="_blank"`, `rel="noopener"`). | End-to-End `frontend/e2e/session-room.spec.ts` |
| A5 | In `VOTING` heißt die Schaltfläche „Issue wechseln“; der Klick öffnet die Rückfrage (`switch-dialog`). „Abbrechen“ (`switch-cancel`) lässt das aktive Issue unverändert; „Wechseln“ (`switch-confirm`) macht das gewählte Issue für Scrum Master und Entwickler ohne Neuladen aktiv. Für das schon aktive Issue und während `round.confirming` ist die Schaltfläche deaktiviert. | End-to-End `frontend/e2e/session-room.spec.ts`; Unit `frontend/src/app/session/issue-panel.spec.ts` (Rückfrage, Abbruch, Deaktivierung) |
| A6 | Skript-Inhalte einer Issue-Beschreibung werden nicht ausgeführt: Issue 44 des Doubles enthält `<script>` und `<img onerror>`, die beide `window.__pwned` setzen würden; nach der Freigabe ist `window.__pwned` in beiden Kontexten `undefined`, `active-issue-description` enthält kein `script`-Element und kein Attribut `onerror`, Markdown (`**fett**`) erscheint als `strong`. | End-to-End `frontend/e2e/session-room.spec.ts`; Unit `frontend/src/app/session/active-issue.spec.ts` |
| A7 | Jeder neue Text trägt eine i18n-ID, Bedienelemente sind beschriftet und per Tastatur bedienbar; `make lint` ist grün; `frontend/e2e/create-and-join.spec.ts` bleibt grün. | Aufruf `make lint`, `make e2e`; Browser |

## Contracts

keine. Das Frontend nutzt `listIssues`, `selectIssue` und `SessionView` (`preselectedIssueIid`,
`activeIssue`, `round.confirming`) aus `frontend/src/app/api/schema.d.ts`.

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh` meldet medium: die Dateien unter
`frontend/src/app/session/`, das Mapping des Doubles und `project-rules/testing.md` sind medium
(kein Muster), die Testdateien low. Kein Eskalator greift: kein Token, keine Contracts, keine
Manifeste. Das Rendern fremden Markdowns ist sicherheitsrelevant; deshalb läuft das
Sicherheits-Review, und A6 prüft die Bereinigung im Browser.
Gates: G0 und G1 in dieser Session. G2: Label `human-approved`. G3: Status `verified`
(`verify_required_for: high` verlangt es erst ab high, `implement` führt `verify` ab medium aus).
Reviews: Code, Sicherheit.
ADR nötig: nein, weil die Spec ADR 0004 (Snapshot im Store, lokale Abfragen in der Komponente)
folgt und keine neue Abhängigkeit, kein neues Modul und keine Vertragsänderung bringt.

## Umsetzung

Entscheidungen:

- Keine neuen Abhängigkeiten: Markdown über `marked` (seit 0001 im Manifest), Bereinigung allein durch Angulars `[innerHTML]`-Sanitizer, nie `bypassSecurityTrust…`; Rückfrage über `MatDialog` aus `@angular/material`, kein `window.confirm`.
- Suchergebnisse, Auswahl und Folgeseite liegen als Signale in der Komponente `IssuePanel`; der Snapshot im `SessionStore` bleibt die einzige Quelle für Phase und aktives Issue (ADR 0004).
- Der Sitzungsraum wird in Komponenten unter `frontend/src/app/session/` geteilt: `ParticipantList`, `IssuePanel`, `SwitchIssueDialog`, `ActiveIssue`; die Platzhalter-Daten aus 0005 (`session-id`, `session-phase`, `session-role`, `session-participant-count`) bleiben, weil die Abläufe aus 0011 sie lesen.
- Neues Mapping `issue-44.json` im GitLab-Double als Testdatum für A6; Suche und andere Mappings bleiben unverändert.

Dateien:

- `frontend/src/app/session/session-page.ts`: ändern, Komponenten einbinden, Rollen- und Phasenweiche
- `frontend/src/app/session/session-page.html`: ändern, Layout mit Liste, Bedienfeld, Wartezustand, aktivem Issue
- `frontend/src/app/session/session-page.scss`: neu, Layout mit `--mat-sys-*` und `--app-space-*`
- `frontend/src/app/session/session-page.spec.ts`: neu, Entwickler ohne Bedienfeld in `LOBBY` und `VOTING`, Scrum Master mit Bedienfeld
- `frontend/src/app/session/participant-list.ts`: neu, Liste aus `SessionStore.participants`
- `frontend/src/app/session/participant-list.html`: neu
- `frontend/src/app/session/participant-list.scss`: neu
- `frontend/src/app/session/issue-panel.ts`: neu, Laden, Suche, Folgeseite, Auswahl, Vorbelegung, Freigabe, Wechsel mit Rückfrage
- `frontend/src/app/session/issue-panel.html`: neu
- `frontend/src/app/session/issue-panel.scss`: neu
- `frontend/src/app/session/issue-panel.spec.ts`: neu, mit `HttpTestingController` und Beispiel-Snapshots
- `frontend/src/app/session/switch-issue-dialog.ts`: neu, Rückfrage beim Issue-Wechsel
- `frontend/src/app/session/switch-issue-dialog.html`: neu
- `frontend/src/app/session/active-issue.ts`: neu, Titel, Link, Beschreibung über `marked`
- `frontend/src/app/session/active-issue.html`: neu
- `frontend/src/app/session/active-issue.scss`: neu
- `frontend/src/app/session/active-issue.spec.ts`: neu, Markdown und Bereinigung
- `frontend/e2e/session-room.spec.ts`: neu, A1 bis A6
- `frontend/e2e/gitlab-double/mappings/issue-44.json`: neu, Issue mit Skript-Inhalten
- `project-rules/testing.md`: ändern, Areas (`session-room.spec.ts`), Testdaten (Issue 44)

Schritte:

1. `ParticipantList`: `@for` über `store.participants()`, Rollenkennzeichen nur für `SCRUM_MASTER`, Verbindungsstatus als Text mit Symbol (nicht nur Farbe).
2. `ActiveIssue`: `input` `IssueView`; `computed` mit `marked.parse(description, { async: false })`; Ausgabe über `[innerHTML]`; Link mit `target="_blank"` und `rel="noopener"`.
3. `IssuePanel`: beim Start `listIssues(sessionId)`; Formular mit Suchtext; `nextPage` als Signal, „Mehr laden“ hängt an; Auswahl als Signal, vorbelegt mit `preselectedIssueIid`, in `VOTING`/`REVEALED` mit dem aktiven Issue; „Freigeben“ in `LOBBY` direkt `selectIssue`, sonst erst `SwitchIssueDialog`; deaktiviert während eines laufenden Aufrufs, bei `round.confirming` und für das aktive Issue. Fehler gehen über den Interceptor ins Banner.
4. `session-page`: Liste immer; `@if (store.isScrumMaster())` Bedienfeld; `@if` Phase `LOBBY` und Entwickler: Wartezustand; `@if (store.activeIssue())` `ActiveIssue`.
5. Mapping `issue-44.json` (Titel „Script check“, Beschreibung mit `**fett**`, `<script>window.__pwned = true</script>` und `<img src="x" onerror="window.__pwned = true">`).
6. `session-room.spec.ts`: Sitzung über die Startseite (Issue 42), Entwickler über den Beitrittslink im zweiten Kontext; Fälle A1 bis A6; für A6 eine Sitzung mit Issue 44.
7. `project-rules/testing.md`; `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `frontend/e2e/session-room.spec.ts`: Liste in beiden Kontexten, Entwickler schließt den Kontext |
| A2 | `frontend/e2e/session-room.spec.ts`: Bedienfeld, Vorbelegung 42, Auswahl 43, Freigabe; `frontend/src/app/session/issue-panel.spec.ts`: Laden, Suche, `nextPage`, Vorbelegung, Freigabe |
| A3 | `frontend/src/app/session/session-page.spec.ts`: Entwickler in `LOBBY` und `VOTING`; `frontend/e2e/session-room.spec.ts`: Anzahl 0 beim Entwickler |
| A4 | `frontend/e2e/session-room.spec.ts`: Wartezustand, Issue erscheint nach der Freigabe |
| A5 | `frontend/e2e/session-room.spec.ts`: Wechsel abbrechen und bestätigen; `frontend/src/app/session/issue-panel.spec.ts`: Dialog, Deaktivierung bei `confirming` und aktivem Issue |
| A6 | `frontend/e2e/session-room.spec.ts`: Issue 44; `frontend/src/app/session/active-issue.spec.ts`: `script` und `onerror` entfernt, `strong` vorhanden |
| A7 | Aufruf `make lint`, `make e2e`; Browser (Tab-Reihenfolge im Bedienfeld und im Dialog) |

Testdaten: die Mappings des GitLab-Doubles (Projekt `1234`, Issues 42 und 43, neu Issue 44);
Sitzungen entstehen im Ablauf über die Oberfläche. Unit-Tests nehmen die Beispiel-Snapshots aus
`frontend/src/app/api/examples.ts`.

Contracts zu regenerieren: keine.

## Offene Fragen

- keine

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/session/*.spec.ts`, `make e2e` (`health.spec.ts`, `create-and-join.spec.ts`, `session-room.spec.ts`)
- Browser: Sitzungsraum als Scrum Master und als Entwickler über `make e2e`
- Aufruf: `make lint` (A7)
