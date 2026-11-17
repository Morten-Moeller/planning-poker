---
id: "0028"
title: Design Werkbank, Teil B, Seitenleiste und Rundenmotiv
status: done
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-17
updated: 2026-11-17
pr: "#29"
note: alle Kriterien erfüllt
---

# Design Werkbank, Teil B, Seitenleiste und Rundenmotiv

Teil des Design-Reworks „Werkbank“ nach `docs/design/` (aus Spec 0027, Teil A). Es gilt die Benennung aus 0026 („Diskussion“, „Schätzung starten“), und der Server löst bei Ablauf des Timers weiter automatisch auf (O-01). Die Teile B, C und D ändern getrennte Dateien und laufen nach Teil A parallel. Grundlage ist `docs/design/Raum.dc.html` (Seitenleiste, Kopfzeile, Wartezustand) und `docs/design/Design-System.dc.html` (Abschnitte 7, 8 und 9). Die Spec hängt ab von 0027.

## Ziel

Die Seitenleiste des Sitzungsraums sieht aus wie im Design: Teilnehmer-Einträge mit Status,
Teilen, Fakten, Timer und Protokoll. Jede Runde hat ein Kartenmotiv, das alle gleich sehen. Die
Seite stellt es als CSS-Variablen bereit, Kopfzeile und Teilnehmer-Chips nutzen es. Teil C wendet
es auf die Karten an. Entwickler sehen nach einer Übernahme das letzte Ergebnis, bis das nächste
Issue freigegeben ist.

## Scope

### Enthalten

- **Rundenmotiv** (`frontend/src/app/session/card-motif.ts`):
  - Es gibt fünf Motive: Raster, Punkte, Zeilen, Ringe und Stufen. Farben und Muster stehen für hell und dunkel in `Design-System.dc.html`, Abschnitt 7.
  - Das Motiv ist `hash(sessionId:issueIid:round) % 5` mit FNV-1a wie im Design. Ergibt der Hash das Motiv der Vorrunde, nimmt die Funktion das nächste.
  - Die Sitzungsseite setzt `[attr.data-motif]` und die Variablen `--app-card-accent`, `--app-card-on-accent`, `--app-card-pattern` und `--app-card-pattern-size` am Raum. In `LOBBY` gilt Motiv 0.
- **Kopfzeile:** Links neben dem Titel steht das Motivfeld, 20 × 28 px mit dem Muster. Dafür ändert sich `app-shell` aus Teil A.
- **Teilnehmer-Eintrag** nach Abschnitt 8:
  - Ein Chip, ausgefüllt mit Motiv, wenn der Teilnehmer geschätzt hat, sonst gestrichelt.
  - Der Name, bei dir mit „(du)“ und hervorgehobener Zeile.
  - Das Etikett „★ Scrum Master“.
  - Der Status:
    - „Moderiert, schätzt nicht mit“ für den Scrum Master,
    - „Bereit“ in `LOBBY`, „Diskutiert“ in `DISCUSSION`,
    - „✓ Hat geschätzt“ oder „○ Ausstehend“ in `VOTING` und `REVEALED`.
  - Rechts „● verbunden“ oder „○ getrennt“.
  - Farbe nie allein, immer mit Text.
- **Abschnitte der Seitenleiste** mit Mono-Marken nach Abschnitt 4 (`--app-label-section`):
  - „TEILNEHMER · 6“.
  - „TIMER“: Auswahl mit Hinweis „Gilt ab der nächsten Runde.“
  - „TEILEN“: Beitrittslink und Session-ID mit „⧉ Kopieren“, „✓ Kopiert“ und „⚠ Kopieren nicht möglich, bitte von Hand kopieren“.
  - „FAKTEN“: Phase, Deine Rolle, Teilnehmer „6 (5 Entwickler)“.
  - „SITZUNGSPROTOKOLL“.
- **Fakten als Komponente** `session-facts` statt Inline-Markup in `session-page.html`. Die `data-testid` bleiben.
- **Protokoll:** Einträge mit „#42 Titel“, „Runde 2 · Karten 2 · 3 · 8 · 13“ und „Endwert 5“ in Erfolgsfläche oder „ohne Endwert“. Die bestehenden `history-*` bleiben.
- **Zuletzt geschätzt** (neue Komponente `last-result`, `data-testid="last-result"`):
  - Wann: Entwickler in `LOBBY`, wenn der neueste Protokolleintrag einen Endwert hat.
  - Inhalt: „ZULETZT GESCHÄTZT“ mit Issue, Runde, Karten, „ENDWERT 5“, „✓ Als Kommentar in GitLab gespeichert“. Den Link „In GitLab öffnen ↗“ gibt es noch nicht, weil das Protokoll keine URL trägt. Er folgt nach Teil D, sobald der Snapshot die Projekt-URL enthält.
  - Darüber steht „Das Ergebnis ist übernommen. Warten, bis der Scrum Master das nächste Issue freigibt.“
- **Wartezustand des Entwicklers** in `LOBBY` nach dem Design: „Warten, bis der Scrum Master ein Issue freigibt“ und „Die Seite aktualisiert sich von selbst.“
- **Mobil:** Die Seitenleiste steht unter dem Hauptbereich.

### Nicht enthalten

- Karten, Kartenfächer, Tisch, Rundenstatus, aufgedeckte Ansicht (Teil C).
- Bedienfeld, aktives Issue, Dialoge, Snackbar, Verbindungsbanner (Teil D).
- Schalter für hell und dunkel.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Kartenmotiv | Farbe und Muster der Karten einer Runde, aus Session-ID, Issue und Rundennummer berechnet; neu, mit /domain ins Glossar |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `motifFor('K7P2QX9M', 42, r)` liefert für dieselben Eingaben immer dasselbe Motiv. Zwei aufeinanderfolgende Runden haben nie dasselbe Motiv. Die Werte liegen in 0 bis 4. | Unit `frontend/src/app/session/card-motif.spec.ts` |
| A2 | In zwei Browser-Kontexten (Scrum Master und Entwickler) hat die Sitzungsseite in derselben Runde dasselbe `data-motif`. Nach „Neue Runde“ ändert es sich. | End-to-End `frontend/e2e/design-sidebar.spec.ts` |
| A3 | Die Teilnehmerliste zeigt je Phase die Statustexte aus dem Scope, „★ Scrum Master“, „(du)“ und „○ getrennt“ für einen getrennten Teilnehmer. Der Chip ist bei „Hat geschätzt“ gefüllt. | Unit `frontend/src/app/session/participant-list.spec.ts` |
| A4 | Die Fakten zeigen „Teilnehmer 6 (5 Entwickler)“. Die Timer-Auswahl zeigt „Gilt ab der nächsten Runde.“ | Unit `frontend/src/app/session/session-facts.spec.ts`, `timer-setting.spec.ts` |
| A5 | Ein Entwickler sieht nach der Übernahme in `LOBBY` `last-result` mit Endwert, Runde und Karten. Mit der nächsten Freigabe verschwindet es. Der Scrum Master sieht es nie. | Unit `frontend/src/app/session/last-result.spec.ts`; End-to-End `design-sidebar.spec.ts` |
| A6 | Das Protokoll zeigt „Endwert 5“ oder „ohne Endwert“ als Text. Alle bestehenden `history-*`, `participant-*` und `copy-*`-Selektoren bleiben gültig. | Unit `frontend/src/app/session/session-history.spec.ts`; Aufruf `make e2e` |
| A7 | Bei 375 px steht die Seitenleiste unter dem Hauptbereich, ohne horizontalen Scrollbalken. | End-to-End `frontend/e2e/layout.spec.ts` |
| A8 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: `frontend/src/app/` ist Anwendungscode, Tests und Doku sind low.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`; `verify` läuft auch bei
medium. Reviews: Code und Sicherheit.
ADR nötig: nein. Es gibt keine neue Abhängigkeit, keine Vertragsänderung, und das Motiv wird nur im Frontend aus
dem Snapshot berechnet (ADR 0004).

## Umsetzung

Entscheidungen:

- Neue Frontend-Komponenten `session-facts` und `last-result` sowie die Funktion `card-motif.ts`. Es gibt keine neuen Abhängigkeiten.

Dateien:

- `frontend/src/app/session/card-motif.ts`: neu
- `frontend/src/app/session/card-motif.spec.ts`: neu, A1
- `frontend/src/app/session/session-page.ts`: ändern, Motiv, Imports
- `frontend/src/app/session/session-page.html`: ändern, `data-motif`, Seitenleiste, `session-facts`, `last-result`, Wartezustand
- `frontend/src/app/session/session-page.scss`: ändern, Motiv-Variablen je `data-motif`, Seitenleiste
- `frontend/src/app/session/session-page.spec.ts`: ändern
- `frontend/src/app/session/session-facts.ts`: neu
- `frontend/src/app/session/session-facts.html`: neu
- `frontend/src/app/session/session-facts.scss`: neu
- `frontend/src/app/session/session-facts.spec.ts`: neu, A4
- `frontend/src/app/session/last-result.ts`: neu
- `frontend/src/app/session/last-result.html`: neu
- `frontend/src/app/session/last-result.scss`: neu
- `frontend/src/app/session/last-result.spec.ts`: neu, A5
- `frontend/src/app/session/participant-list.ts`: ändern
- `frontend/src/app/session/participant-list.html`: ändern
- `frontend/src/app/session/participant-list.scss`: ändern
- `frontend/src/app/session/participant-list.spec.ts`: neu, A3
- `frontend/src/app/session/share-session.html`: ändern
- `frontend/src/app/session/share-session.scss`: ändern
- `frontend/src/app/session/share-session.spec.ts`: ändern
- `frontend/src/app/session/timer-setting.html`: ändern
- `frontend/src/app/session/timer-setting.spec.ts`: ändern
- `frontend/src/app/session/session-history.html`: ändern
- `frontend/src/app/session/session-history.scss`: ändern
- `frontend/src/app/session/session-history.ts`: ändern
- `frontend/src/app/session/session-history.spec.ts`: neu, A6
- `frontend/src/app/shell/app-shell.html`: ändern, Motivfeld
- `frontend/src/app/shell/app-shell.scss`: ändern, Motivfeld
- `frontend/e2e/design-sidebar.spec.ts`: neu, A2 und A5
- `frontend/e2e/layout.spec.ts`: ändern, A7
- `project-rules/frontend.md`: ändern, Abschnitt „Design Werkbank“ für alle Teile B bis D: Quelle `docs/design/`, Motiv, Seitenleiste, Karte und Tisch (Teil C), Bedienfeld und Dialoge (Teil D), Bewegung und Fokus
- `project-rules/testing.md`: ändern, `design-sidebar.spec.ts`
- `docs/domain/glossary.md`: ändern, Kartenmotiv

Schritte:

1. `card-motif.ts` mit FNV-1a, Ausweichen bei gleichem Motiv wie die Vorrunde, Farben je Schema. Die CSS-Variablen hängen an `[data-motif]` in `session-page.scss`.
2. Seitenleiste: Teilnehmer, Teilen, Timer, `session-facts`, Protokoll.
3. `last-result` und der Wartezustand.
4. Motivfeld in der Kopfzeile.
5. Tests, `project-rules/`, Glossar, `make check`, `make e2e`. Dazu Screenshots hell und dunkel im PR.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `card-motif.spec.ts` |
| A2 | `design-sidebar.spec.ts` mit zwei Kontexten |
| A3 | `participant-list.spec.ts` je Phase |
| A4 | `session-facts.spec.ts`, `timer-setting.spec.ts` |
| A5 | `last-result.spec.ts`, `design-sidebar.spec.ts` |
| A6 | `session-history.spec.ts`, `make e2e` |
| A7 | `layout.spec.ts` |
| A8 | `make check`, `make e2e` |

Testdaten: Sitzung über die Startseite, Issue 42 des GitLab-Doubles; Übernahme über das Mapping für Notes.

Contracts zu regenerieren: keine.

## Offene Fragen

keine

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/session/*.spec.ts`, `frontend/src/app/shell/*.spec.ts`, `make e2e`
- Browser: Seitenleiste in allen Phasen, beide Rollen, hell und dunkel, 375 px; „Zuletzt geschätzt“ nach einer Übernahme
