---
id: "0031"
title: Design Werkbank, Teil E, Start und Beitritt
status: done
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-17
updated: 2026-11-17
pr: "#31"
note: alle Kriterien erfüllt
---

# Design Werkbank, Teil E, Start und Beitritt

Letzter Teil des Design-Reworks „Werkbank“. Grundlage sind die Entwürfe `Start & Beitritt.dc.html`
und `Einstieg.dc.html` aus dem Export der Person (Claude-Design-Projekt
`08b204b3-956a-49ff-9d44-6f2e64fba627`, Stand 2026-11-17). Diese Spec legt beide unter
`docs/design/` ab. Theme, Schriften und Kopfzeile kommen aus Teil A (0027). Es gelten die
Abweichungen aus `docs/design/README.md`. Die Spec hängt ab von 0027 und läuft parallel zu C
(0029) und D (0030), mit getrennten Dateien.

## Ziel

Die Startseite und die Beitrittsseite sehen aus wie im Entwurf.
- **Startseite:**
  - Einleitung „Issues gemeinsam schätzen“.
  - Daneben zwei Karten-Panels „Sitzung erstellen · Für den Scrum Master“ und „Sitzung beitreten · Mit der Session-ID vom Scrum Master“.
  - Eine Statuszeile zum Backend mit „↻ Erneut prüfen“.
- **Beitrittsseite:** Session-ID als Chip, „Mit welchem Namen?“ und klare Fehlerzustände.

## Scope

### Enthalten

- **Startseite** (`start-page`), Desktop zweispaltig 3:2, mobil gestapelt:
  - Statuszeile: „● Backend erreichbar“, „Backend wird geprüft …“ oder „Backend nicht erreichbar“, dazu „Ohne Backend lassen sich keine Sitzungen erstellen oder betreten.“ und „↻ Erneut prüfen“, das die Prüfung neu startet.
  - Ist das Backend nicht erreichbar, sind beide Formulare gesperrt, und der Button heißt „Sitzung erstellen (Backend fehlt)“.
  - Einleitung: „Issues gemeinsam schätzen“ und „Der Scrum Master erstellt die Sitzung und teilt den Link. Das Team tritt mit Namen bei und schätzt verdeckt.“
  - Panel „Sitzung erstellen“:
    - „Dein Name“.
    - „GitLab-Projekt“ mit dem Hinweis „Name, Pfad oder ID. Eingabe von Hand möglich.“ Das Autocomplete aus 0022 zeigt je Eintrag Name, darunter Pfad · ID.
    - „Issue-Nummer“ mit Autocomplete „#42 Titel“.
    - Leerzustände „Keine Projekte gefunden“ und „Keine Issues gefunden“.
    - Fehler am Feld mit „⚠“.
  - Panel „Sitzung beitreten“:
    - Session-ID in Mono mit dem Hinweis „8 Zeichen, z. B. K7P2QX9M“.
    - Fehler „⚠ Die Session-ID hat 8 Zeichen (6 eingegeben)“.
    - Button „Weiter“.
  - Fehler aus dem Backend erscheinen als Hinweis mit Symbol nach Abschnitt 9 des Design-Systems am Formular. Die Texte kommen aus `error-messages.ts`, ohne neue Fehlercodes.
- **Beitrittsseite** (`join-page`):
  - „SITZUNG K7P2QX9M“ als Mono-Chip.
  - „Mit welchem Namen?“ und „Du trittst als Entwickler bei. Der Name ist für alle sichtbar.“
  - Feld „Name“ mit „Höchstens 30 Zeichen“ und Button „Beitreten“.
  - „⚠ Name schon vergeben. Bitte einen anderen wählen.“ am Feld.
  - Zustand „⚠ Sitzung nicht gefunden“ mit „Der Link ist abgelaufen oder falsch.“ und „Zur Startseite“ statt des Formulars.
- **`docs/design/`:**
  - `Start & Beitritt.dc.html` und `Einstieg.dc.html` unverändert aus dem Export.
  - Das README bekommt die Abweichungen dieses Teils:
    - Das Issue bleibt beim Anlegen Pflicht (R-01), anders als „Optional: Issue, mit dem die Sitzung startet“ im Entwurf.
    - Die Höchstzahl nennt keine Zahl laufender Sitzungen, weil das Backend sie nicht liefert.

### Nicht enthalten

- Ein optionales Issue beim Anlegen. Dafür bräuchte es Vertrag, Backend und eine Änderung an R-01.
- Neue Fehlercodes oder Texte für Fehler aus dem Backend. Die bestehenden aus 0015 und 0021 bleiben.
- Sitzungsraum (Teile B bis D) und `total` in der Issue-Suche der Startseite.

## Begriffe

keine neuen

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Bei nicht erreichbarem Backend zeigt die Startseite „Backend nicht erreichbar“ mit dem Satz zu den gesperrten Formularen. Beide Submit-Buttons sind deaktiviert, und der Erstellen-Button heißt „Sitzung erstellen (Backend fehlt)“. „↻ Erneut prüfen“ ruft `GET /api/health` erneut auf, und bei Erfolg werden die Formulare frei. | Unit `frontend/src/app/start/start-page.spec.ts` |
| A2 | Das Projekt-Autocomplete zeigt Name sowie darunter Pfad · ID, das Issue-Autocomplete „#42 Titel“. Die Leerzustände und die Eingabe von Hand bleiben wie in 0022. | Unit `start-page.spec.ts`; End-to-End `frontend/e2e/project-picker.spec.ts` |
| A3 | Eine Session-ID mit 6 Zeichen zeigt „⚠ Die Session-ID hat 8 Zeichen (6 eingegeben)“ und sendet nichts. Mit 8 Zeichen führt „Weiter“ zur Beitrittsseite. Kleinbuchstaben werden zu Großbuchstaben (0019). | Unit `start-page.spec.ts` |
| A4 | Die Beitrittsseite zeigt die Session-ID als Chip, den Satz zur Rolle und „Höchstens 30 Zeichen“. Bei `NAME_TAKEN` steht der Fehler am Feld. Bei `SESSION_NOT_FOUND` ersetzt der Zustand „Sitzung nicht gefunden“ mit „Zur Startseite“ das Formular. | Unit `frontend/src/app/join/join-page.spec.ts` |
| A5 | Bei 375 px stehen die Panels untereinander, ohne horizontalen Scrollbalken, hell und dunkel. Alle bestehenden `data-testid` der Start- und Beitrittsseite bleiben gültig. | End-to-End `frontend/e2e/create-and-join.spec.ts` (neuer Fall); Aufruf `make e2e` |
| A6 | `docs/design/` enthält die zwei neuen Entwürfe, und das README nennt die Abweichungen dieses Teils. | Browser: Dateien im PR |
| A7 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: `frontend/src/app/` ist Anwendungscode, `docs/` und Tests sind low.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`; `verify` läuft auch bei
medium. Reviews: Code und Sicherheit.
ADR nötig: nein. Es gibt keine neue Abhängigkeit, keine Vertragsänderung, und die Seiten folgen dem Theme aus 0027.

## Umsetzung

Entscheidungen:

- keine

Dateien:

- `docs/design/Start & Beitritt.dc.html`: neu, aus dem Export der Person
- `docs/design/Einstieg.dc.html`: neu, aus dem Export der Person
- `docs/design/README.md`: ändern, Abweichungen von Teil E
- `frontend/src/app/start/start-page.ts`: ändern, erneute Prüfung, Sperre ohne Backend, Prüfung der Session-ID
- `frontend/src/app/start/start-page.html`: ändern
- `frontend/src/app/start/start-page.scss`: ändern
- `frontend/src/app/start/start-page.spec.ts`: ändern, A1 bis A3
- `frontend/src/app/start/health-api.ts`: ändern, falls die erneute Prüfung eine Methode braucht
- `frontend/src/app/join/join-page.ts`: ändern, Zustand „Sitzung nicht gefunden“
- `frontend/src/app/join/join-page.html`: ändern
- `frontend/src/app/join/join-page.scss`: ändern
- `frontend/src/app/join/join-page.spec.ts`: ändern, A4
- `frontend/e2e/create-and-join.spec.ts`: ändern, A5
- `frontend/e2e/project-picker.spec.ts`: ändern, A2

Schritte:

1. Die zwei Entwürfe ablegen (die Session legt sie in den Worktree), README ergänzen.
2. Startseite nach `Einstieg.dc.html`: Statuszeile, Einleitung, zwei Panels, Zustände.
3. Beitrittsseite nach `Einstieg.dc.html`.
4. Tests, `make check`, `make e2e`. Dazu Screenshots hell und dunkel, Desktop und 375 px, mit allen Zuständen aus `Start & Beitritt.dc.html`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `start-page.spec.ts` mit Health-Stub |
| A2 | `start-page.spec.ts`, `project-picker.spec.ts` |
| A3 | `start-page.spec.ts` |
| A4 | `join-page.spec.ts` |
| A5 | `create-and-join.spec.ts`, `make e2e` |
| A6 | PR |
| A7 | `make check`, `make e2e` |

Testdaten: GitLab-Double mit Projekt `1234` und Issue 42.

Contracts zu regenerieren: keine.

## Offene Fragen

keine

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/start/*.spec.ts`, `frontend/src/app/join/*.spec.ts`, `make e2e`
- Browser: Start- und Beitrittsseite in allen Zuständen, hell und dunkel, 375 px
