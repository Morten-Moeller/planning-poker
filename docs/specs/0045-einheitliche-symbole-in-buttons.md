---
id: "0045"
title: Einheitliche Symbolgröße in Buttons und Links
status: approved
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-18
updated: 2026-11-18
pr: ""
note: freigegeben in der Session
---

# Einheitliche Symbolgröße in Buttons und Links

## Ziel

Die App zeigt Symbole in Buttons und Links als Unicode-Zeichen. Nur drei Stellen vergrößern das
Zeichen auf 1,25em, jede mit einer eigenen Kopie der Klasse `.symbol`; an den übrigen Stellen hat
das Zeichen die Textgröße und wirkt zu klein, zum Beispiel ↻ in „Erneut prüfen“ bei der
Backend-Fehlermeldung der Startseite. Nach der Änderung haben alle Symbole in Buttons und Links
dieselbe Größe relativ zur Beschriftung, aus einer globalen Klasse.

Bestand (2026-11-18):

| Stelle | Symbol | heute |
|---|---|---|
| Startseite, „Erneut prüfen“ | ↻ | Textgröße |
| Issue-Liste, „Erneut versuchen“ | ↻ | Textgröße |
| Teilen, „Kopieren“ (zweimal) | ⧉ | Textgröße |
| Aktives Issue, „Ganze Beschreibung anzeigen“ / „einklappen“ | ▾ ▴ | Textgröße |
| Aktives Issue, „In GitLab öffnen“ | ↗ | `.symbol` lokal, 1,25em |
| Letztes Ergebnis, „In GitLab öffnen“ | ↗ | `.symbol` lokal, 1,25em |
| Rundenfuß, „Erneut schätzen“ | ↻ | `.symbol` lokal, 1,25em |
| Toolbar, Hell-Dunkel-Umschalter (Icon-Button) | ☀️ 🌙 | `.theme-symbol`, 18px |

## Scope

### Enthalten

- Globale Klasse `app-symbol` in `frontend/src/styles.scss` mit den Werten der heutigen
  `.symbol`: `display: inline-block`, `font-family: system-ui, sans-serif`, `font-size: 1.25em`,
  `line-height: 1`, `vertical-align: middle`.
- Alle Stellen der Tabelle nutzen `app-symbol`; die lokalen Regeln `.symbol` und `.theme-symbol`
  entfallen. Der Hell-Dunkel-Umschalter bekommt damit 1,25em der Button-Schrift statt fester 18px.
- Ein Symbol steht in einem eigenen `<span class="app-symbol" aria-hidden="true">`; der Abstand zur
  Beschriftung ist ein Leerzeichen außerhalb des Spans.

### Nicht enthalten

- Symbole außerhalb von Buttons und Links (Statuszeichen ● ✕ ◌ der Startseite, ⚠ in
  Fehlermeldungen, Hinweis-Symbole); sie ändern sich mit Spec 0046 oder bleiben.
- Umstieg auf eine Icon-Schrift oder SVG-Icons.
- Die Karten-Glyphen in `card.scss`.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Symbol | technischer Begriff, kein Domänenbegriff: ein Unicode-Zeichen als Icon in einem Button oder Link |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Jedes Symbol der Tabelle im Ziel steht in einem Element mit der Klasse `app-symbol` und `aria-hidden="true"`. | Test |
| A2 | Keine Komponente definiert noch eine eigene Regel `.symbol` oder `.theme-symbol`. | Aufruf (`grep`) |
| A3 | Im Raum ist die Schriftgröße von ⧉ in „Kopieren“ und von ↻ in „Erneut schätzen“ das 1,25-fache der Schriftgröße der Beschriftung. | Test (e2e) |
| A4 | Startseite bei nicht erreichbarem Backend: ↻ in „Erneut prüfen“ ist so groß wie ↻ in „Erneut schätzen“ im Raum; der Hell-Dunkel-Umschalter zeigt sein Symbol mittig im runden Button. | Browser |
| A5 | Die zugänglichen Namen der Buttons und Links bleiben gleich. | Test |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh`: Templates, Styles und `styles.scss` ohne Muster sind
medium, die Testdateien low; keine Eskalation durch Größe oder Schlüsselwörter.
Gates: G2, das Label `human-approved` einer Person vor dem Merge; `/verify` nach CI, G3 ist für
medium nicht verlangt.
ADR nötig: nein, weil keine Abhängigkeit, kein Contract und keine Abweichung von einer Regel; eine
globale CSS-Klasse für ein Stilmittel, das zwei oder mehr Features nutzen, ist lokal im Frontend.

## Umsetzung

Entscheidungen:

- Eine globale Klasse `app-symbol` in `styles.scss` statt Kopien je Komponente.
- Der Hell-Dunkel-Umschalter verliert die feste Größe 18px und folgt derselben Klasse.

Dateien:

- `frontend/src/styles.scss`: ändern, Klasse `app-symbol`
- `frontend/src/app/start/start-page.html`: ändern, ↻ in „Erneut prüfen“
- `frontend/src/app/start/start-page.spec.ts`: ändern, Test A1 und A5
- `frontend/src/app/session/issue-panel.html`: ändern, ↻
- `frontend/src/app/session/issue-panel.spec.ts`: ändern, Test A1 und A5
- `frontend/src/app/session/share-session.html`: ändern, ⧉ zweimal
- `frontend/src/app/session/share-session.spec.ts`: ändern, Test A1 und A5
- `frontend/src/app/session/active-issue.html`: ändern, ▾ ▴ ↗
- `frontend/src/app/session/active-issue.scss`: ändern, `.symbol` entfernen
- `frontend/src/app/session/active-issue.spec.ts`: ändern, Test A1 und A5
- `frontend/src/app/session/last-result.html`: ändern, ↗
- `frontend/src/app/session/last-result.scss`: ändern, `.symbol` entfernen
- `frontend/src/app/session/last-result.spec.ts`: ändern, Test A1 und A5
- `frontend/src/app/session/round-footer.html`: ändern, ↻
- `frontend/src/app/session/round-footer.scss`: ändern, `.symbol` entfernen
- `frontend/src/app/session/round-footer.spec.ts`: ändern, Test A1 und A5
- `frontend/src/app/shell/app-shell.html`: ändern, Symbol des Umschalters
- `frontend/src/app/shell/app-shell.scss`: ändern, `.theme-symbol` entfernen
- `frontend/src/app/shell/app-shell.spec.ts`: ändern, Test A1 und A5
- `frontend/e2e/symbols.spec.ts`: neu, Test A3

Schritte:

1. `styles.scss`: Klasse `.app-symbol` mit den Werten aus dem Scope.
2. Jede Stelle der Tabelle: Symbol in `<span class="app-symbol" aria-hidden="true">`, Leerzeichen
   außerhalb; die bisherigen Spans ohne Klasse oder mit `symbol` / `theme-symbol` werden ersetzt.
3. Lokale Regeln `.symbol` (drei) und `.theme-symbol` entfernen.
4. Unit-Tests je Komponente: das Symbol hat `app-symbol` und `aria-hidden`, der zugängliche Name
   des Buttons oder Links ist unverändert.
5. `frontend/e2e/symbols.spec.ts`: Sitzung anlegen, Runde aufdecken, Schriftgrößen von Symbol und
   Beschriftung in „Kopieren“ und „Erneut schätzen“ vergleichen (Faktor 1,25, Toleranz 0,5px).
6. `make check`, `make e2e` mit `BACKEND_PORT`/`FRONTEND_PORT`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | Unit-Tests in den sieben genannten `*.spec.ts`: Symbol mit `app-symbol` und `aria-hidden` |
| A2 | Aufruf `grep -rnE '^\.(symbol\|theme-symbol)\b' frontend/src/app` ohne Treffer |
| A3 | `frontend/e2e/symbols.spec.ts`: Faktor 1,25 bei „Kopieren“ und „Erneut schätzen“ |
| A4 | Browser: Startseite mit gestopptem Backend, Raum nach Aufdecken, Toolbar hell und dunkel |
| A5 | Unit-Tests in den sieben genannten `*.spec.ts`: zugänglicher Name unverändert |

## Offene Fragen

- keine

## Verifikationsplan

- make check
- betroffene Tests: die sieben Unit-Test-Dateien oben, `frontend/e2e/symbols.spec.ts`,
  `frontend/e2e/create-and-join.spec.ts`, `frontend/e2e/full-flow.spec.ts`
- Browser: Startseite mit nicht erreichbarem Backend, Raum mit aufgedeckter Runde, Toolbar
