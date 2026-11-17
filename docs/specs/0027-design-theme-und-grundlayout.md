---
id: "0027"
title: Design Werkbank, Teil A, Theme und Grundlayout
status: Review
risk: high
adrs: []
owner: Morten Möller
created: 2026-11-17
updated: 2026-11-17
pr: ""
note: freigegeben in der Session
---

# Design Werkbank, Teil A, Theme und Grundlayout

Erster Teil des Design-Reworks nach dem Entwurf „Werkbank“ aus Claude Design (Projekt
`08b204b3-956a-49ff-9d44-6f2e64fba627`, Dateien `Design-System.dc.html`, `Raum.dc.html` und
`Sitzungsraum.dc.html`). Die Teile B (Seitenleiste), C (Tisch und Karten), D (Bedienfeld,
Dialoge, Banner) und E (Start und Beitritt) bauen auf diesem Teil auf. Die Spec hängt ab von 0026,
weil sie den Sitzungsraum nach der Diskussionsphase gestaltet. Bezug: Qualitätsziel
Barrierefreiheit und Layout (M13).

## Ziel

Die Anwendung hat das Theme „Werkbank“, hell nach One Light und dunkel nach One Dark, je nach
Systemeinstellung. Schriften sind IBM Plex Sans und IBM Plex Mono. Abstände, Radien und Fokus
folgen dem Design-System. Die Kopfzeile zeigt im Sitzungsraum die Session-ID und „Name · Rolle“.
Die Design-Dateien liegen versioniert unter `docs/design/`.

## Scope

### Enthalten

- **`docs/design/`:**
  - `Design-System.dc.html`, `Raum.dc.html` und `Sitzungsraum.dc.html` in der Fassung vom 2026-11-17.
  - `assets/coffee-break.svg` und `assets/question-mark.svg`.
  - Ein `README.md` mit Herkunft, Stand und den Abweichungen dieser Umsetzung, zum Beispiel die Benennung „Diskussion“ und „Schätzung starten“ nach 0026 statt „Besprechung“ und „Timer starten“ sowie die automatische Auflösung bei Ablauf des Timers (O-01), die das Design-System anders beschreibt.
- **Theme in `frontend/src/styles.scss`** nach Abschnitt 3 von `Design-System.dc.html`:
  - `mat.theme` mit Blau und `theme-type: color-scheme`.
  - `mat.theme-overrides` mit den festen Werten von One Light und, unter `@media (prefers-color-scheme: dark)`, mit den Werten von One Dark aus der rechten Farbtabelle.
  - Eigene Tokens:
    - `--app-on-surface-muted`, die `--app-success…` und `--app-warning…` mit ihren Containern,
    - `--app-font-mono`,
    - `--app-space-xs` bis `--app-space-3xl`, `--app-corner-control`.
  - Komponenten-Overrides für Button, Button-Toggle und Dialog wie im Design.
- **Typografie:**
  - IBM Plex Sans für Text, IBM Plex Mono für Werte wie Session-ID, Issue-Nummern, Restzeit und Kartenwerte, nach den Tokens aus Abschnitt 4.
  - Die Fonts kommen von Google Fonts statt Roboto, Material Symbols bleibt.
- **Fokus:** Nach Abschnitt 11 ein 3-px-Rahmen in `--mat-sys-primary` mit 3 px Abstand, nur bei `:focus-visible`. Auf gefüllten Flächen kommt ein innerer Ring dazu.
- **Kopfzeile (`app-shell`):**
  - Höhe 56 px, Fläche `surface-container-low` und Trennlinie, Titel „Planning Poker“.
  - Im Sitzungsraum steht daneben die Session-ID als Mono-Chip (`data-testid="toolbar-session-id"`) und rechts „Anna · Scrum Master“ bzw. „Ben · Entwickler“ (`data-testid="toolbar-me"`). Auf 375 px entfällt „Name · Rolle“.
  - Das Motivfeld links neben dem Titel kommt mit Teil C.
- **Grundlayout des Sitzungsraums:** Auf dem Desktop eine Spalte von 320 px für die Seitenleiste und eine Hauptspalte mit 32/48 px Innenabstand. Mobil wird gestapelt, die Seitenleiste steht unter dem Hauptbereich. Der Inhalt der Komponenten bleibt unverändert, er kommt mit B bis D.

### Nicht enthalten

- **Inhalte der Teile B bis E:** Teilnehmer-Eintrag, Karten und Motive, Tisch, Bedienfeld, Dialoge, Verbindungsbanner, Start- und Beitrittsseite.
- **Schalter für hell und dunkel in der Oberfläche:** Es gilt die Systemeinstellung.
- **Änderungen an Texten außer der Kopfzeile.**

## Begriffe

keine neuen; „Werkbank“ ist der Name des Designs, kein Domänenbegriff

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Unter `emulateMedia({ colorScheme: 'dark' })` sind auf der Startseite `--mat-sys-surface` gleich `#282c34`, `--mat-sys-primary` gleich `#61afef` und `--app-success` gleich `#98c379`. Unter `light` sind sie `#fafafa`, `#2f5fd0` und `#3a7a39`. Der Hintergrund von `body` folgt `--mat-sys-surface`. | End-to-End `frontend/e2e/theme.spec.ts` |
| A2 | Die berechnete `font-family` von `body` beginnt mit „IBM Plex Sans“. Die Session-ID in der Kopfzeile nutzt „IBM Plex Mono“. | End-to-End `theme.spec.ts` |
| A3 | Im Sitzungsraum zeigt die Kopfzeile die Session-ID und „Anna · Scrum Master“ für den Ersteller und „Ben · Entwickler“ für einen Beigetretenen. Auf der Startseite fehlen beide. Bei 375 px fehlt `toolbar-me`. | Unit `frontend/src/app/shell/app-shell.spec.ts`; End-to-End `theme.spec.ts` |
| A4 | Ein Button mit Tastaturfokus hat einen sichtbaren Rahmen in Primärfarbe (`outline-width` 3px). Bei Fokus per Maus fehlt er. | End-to-End `theme.spec.ts` |
| A5 | Bei 375 px hat die Sitzungsseite in allen Phasen keinen horizontalen Scrollbalken, wie bisher. Auf dem Desktop ist die Seitenleiste 320 px breit. | End-to-End `frontend/e2e/layout.spec.ts` |
| A6 | `docs/design/` enthält die drei Design-Dateien, die zwei SVGs und `README.md` mit Herkunft, Stand und Abweichungen. | Browser: Dateien im PR |
| A7 | `make check` und `make e2e` sind grün, alle bestehenden `data-testid` bleiben. | Aufruf `make check`, `make e2e` |

## Contracts

keine

## Risiko

Stufe: high (bei der Umsetzung gemessen, siehe Offene Fragen)
Begründung: Der Schlüsselwort-Eskalator hebt medium auf high, weil zwei neue Zeilen in
`project-rules/` das Wort „tokens“ für Design-Tokens nutzen. Ohne ihn meldet `harness/scripts/risk-level.sh` medium für `frontend/src/` (Anwendungscode und
Styles). `docs/` und Tests sind low.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`; `verify` läuft auch bei
medium. Reviews: Code und Sicherheit.
ADR nötig: nein. Es gibt keine neue Abhängigkeit, denn die Fonts kommen von Google Fonts wie bisher Roboto. Der Vertrag
ändert sich nicht. Das Theme bleibt Angular Material 3 nach ADR 0001.

## Umsetzung

Entscheidungen:

- keine

Dateien:

- `docs/design/README.md`: neu
- `docs/design/Design-System.dc.html`: neu, aus Claude Design
- `docs/design/Raum.dc.html`: neu, aus Claude Design
- `docs/design/Sitzungsraum.dc.html`: neu, aus Claude Design
- `docs/design/assets/coffee-break.svg`: neu, aus Claude Design
- `docs/design/assets/question-mark.svg`: neu, aus Claude Design
- `frontend/src/styles.scss`: ändern, Theme, Tokens, Overrides, Fokus
- `frontend/src/index.html`: ändern, IBM Plex statt Roboto
- `frontend/src/app/shell/app-shell.ts`: ändern, Session-ID und eigener Teilnehmer aus `SessionStore`
- `frontend/src/app/shell/app-shell.html`: ändern, Kopfzeile
- `frontend/src/app/shell/app-shell.scss`: ändern, Kopfzeile
- `frontend/src/app/shell/app-shell.spec.ts`: neu, A3
- `frontend/src/app/session/session-page.scss`: ändern, Grundraster 320 px und Hauptspalte, mobil gestapelt
- `frontend/e2e/theme.spec.ts`: neu, A1 bis A4
- `frontend/e2e/layout.spec.ts`: ändern, A5
- `project-rules/frontend.md`: ändern, Theme, Tokens, Schriften, Fokus
- `project-rules/testing.md`: ändern, `theme.spec.ts`

Schritte:

1. Die Design-Dateien mit `DesignSync` (`get_file`, Projekt `08b204b3-956a-49ff-9d44-6f2e64fba627`) lesen und unverändert unter `docs/design/` ablegen, dazu `README.md`. Ist `DesignSync` im Worker nicht verfügbar, endet der Lauf mit `Frage`, und die Session legt die Dateien ab.
2. `styles.scss` nach Abschnitt 3 bis 5 und 11 des Design-Systems umsetzen, `index.html` auf IBM Plex umstellen.
3. Kopfzeile mit `SessionStore` und Grundraster der Sitzungsseite.
4. Tests, `project-rules/`.
5. `make check`, `make e2e`. Dazu Screenshots hell und dunkel von Start- und Sitzungsseite im PR.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `theme.spec.ts`: `emulateMedia`, `getComputedStyle(document.documentElement).getPropertyValue(...)` |
| A2 | `theme.spec.ts`: `getComputedStyle(...).fontFamily` |
| A3 | `app-shell.spec.ts` mit Store-Snapshot; `theme.spec.ts` mit zwei Kontexten und Viewport 375 |
| A4 | `theme.spec.ts`: Fokus per Tastatur und per Klick |
| A5 | `layout.spec.ts` |
| A6 | PR |
| A7 | `make check`, `make e2e` |

Testdaten: Sitzung über die Startseite, Issue 42 des GitLab-Doubles.

Contracts zu regenerieren: keine.

## Offene Fragen

- [x] Benennung der neuen Phase? → Wie in 0026: „Diskussion“ und „Schätzung starten“; die Design-Dateien bleiben unverändert, `docs/design/README.md` nennt die Abweichung. (Morten Möller, 2026-11-17)
- [x] Design-Dateien ins Repository? → Ja, unter `docs/design/`. (Morten Möller, 2026-11-17)
- [x] Schnitt? → A Theme und Grundlayout, B Seitenleiste, C Tisch und Karten, D Bedienfeld, Dialoge und Banner (mit Vertragsänderung für Projektname, Gesamtzahl und `write-weight`), E Start und Beitritt. (Morten Möller, 2026-11-17)
- [x] Automatische Auflösung bei Ablauf des Timers trotz Hinweis im Design-System? → Ja, wie O-01 und 0016; `docs/design/README.md` nennt die Abweichung. (Morten Möller, 2026-11-17)
- [x] DesignSync im Worker nicht verfügbar, wer legt die Dateien ab? → Die Person exportiert sie aus Claude Design; die SVGs sind ihre lokalen Fassungen ohne die C2PA-Signatur-Metadaten der Originale, `docs/design/README.md` nennt das. (Morten Möller, 2026-11-17)
- [x] Risikostufe: Eskalator „token“ meldet high für Design-Tokens in project-rules? → Formulierung auf „variables“ ändern, Stufe medium. Die Rechteprüfung des Workers hat die Änderung abgelehnt; es geht mit Stufe high weiter. (Morten Möller, 2026-11-17)

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/shell/*.spec.ts`, `frontend/e2e/theme.spec.ts`, `frontend/e2e/layout.spec.ts`, `make e2e`
- Browser: Start- und Sitzungsseite hell und dunkel, Desktop und 375 px, Tastaturfokus
