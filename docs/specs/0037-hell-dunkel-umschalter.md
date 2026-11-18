---
id: "0037"
title: Umschalter für helles und dunkles Design
status: Review
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-18
updated: 2026-11-18
pr: ""
note: freigegeben in der Session
---

# Umschalter für helles und dunkles Design

Wunsch der Person: ein Knopf, der zwischen hellem und dunklem Design wechselt, mit Mond- oder
Sonnen-Emoji. Bezug: Theme aus 0027 (folgt heute nur `prefers-color-scheme`), Einstellungsspeicher
aus 0036. Die Spec hängt ab von 0036.

## Ziel

Rechts in der Toolbar steht auf jeder Seite ein Knopf. Im hellen Design zeigt er 🌙 und schaltet
auf dunkel, im dunklen zeigt er ☀️ und schaltet auf hell. Die Wahl bleibt im Browser gespeichert.
Ohne Wahl folgt die App wie bisher dem System.

## Scope

### Enthalten

- **Knopf** in `app-shell` am rechten Ende der Toolbar, auf Start-, Beitritts- und Sitzungsseite. Testid `theme-toggle`. Inhalt 🌙 (Design ist hell) oder ☀️ (Design ist dunkel), Emoji mit `aria-hidden`, dazu `aria-label` und Tooltip „Dunkles Design“ oder „Helles Design“ über i18n. `aria-pressed` ist `true` im dunklen Design.
- **Zustand:** `system` (Standard), `light` oder `dark`. Der erste Klick wechselt vom aktuell sichtbaren Design ins andere und speichert die Wahl. Ein Zurück auf `system` gibt es nicht (siehe Nicht enthalten).
- **Anwendung:** Das Attribut `data-theme="light|dark"` auf `<html>` setzt `color-scheme: light` oder `dark`. Alle Dark-Regeln, heute `@media (prefers-color-scheme: dark)` in `styles.scss`, `app-shell.scss`, `session-page.scss` und `join-page.scss`, laufen über ein gemeinsames Mixin in `frontend/src/styles/_theme.scss`. Das Mixin gibt die Regeln für `html[data-theme='dark']` aus und für `prefers-color-scheme: dark` nur ohne `data-theme='light'`. Die Motivfarben der Karten (`_motifs.scss`) folgen damit dem Umschalter.
- **Speicher:** Feld `theme` im `PreferencesStore` aus 0036 (`system`, `light`, `dark`; unbekannte Werte ergeben `system`). Das Attribut wird vor dem ersten Rendern gesetzt (`provideAppInitializer`), damit kein helles Bild aufblitzt. `index.html` bekommt kein Inline-Skript.
- **Doku:** `project-rules/frontend.md` (Mixin statt direkter Media-Query, Testid), `project-rules/testing.md` (E2E-Fall).

### Nicht enthalten

- Ein dritter Zustand „System“ im Knopf oder ein Menü.
- Weitere Themes oder Farbänderungen.
- Änderungen an Backend oder Vertrag.

## Begriffe

keine neuen

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `ThemeService`: ohne Speicherwert folgt das Design dem System. `toggle()` wechselt vom sichtbaren Design ins andere, setzt `data-theme` und speichert. Ein gespeicherter Wert wird beim Start gesetzt. | Unit `frontend/src/app/shell/theme.service.spec.ts` |
| A2 | Der Knopf zeigt 🌙 und „Dunkles Design“ im hellen Design, ☀️ und „Helles Design“ im dunklen; ein Klick ruft `toggle()` auf. | Unit `frontend/src/app/shell/app-shell.spec.ts` |
| A3 | Im Browser mit System hell: Klick auf `theme-toggle` ergibt `--mat-sys-surface` `#282c34` und den dunklen Seitenhintergrund; nach Neuladen bleibt es dunkel. Mit System dunkel: Klick ergibt `#fafafa`, nach Neuladen hell. | End-to-End `frontend/e2e/theme-toggle.spec.ts` (neu) |
| A4 | Im Sitzungsraum wechseln nach dem Klick auch die Motivfarbe der Karten (Variable `--app-card-accent`) und das Toolbar-Motiv in die andere Variante. | End-to-End `frontend/e2e/theme-toggle.spec.ts` |
| A5 | Ohne Klick bleibt alles wie heute: Die Fälle „uses the light/dark theme of the system“ in `frontend/e2e/theme.spec.ts` bleiben unverändert grün. | End-to-End `frontend/e2e/theme.spec.ts` |
| A6 | Im Browser: Knopf in beiden Designs gut sichtbar, mit Tastatur erreichbar, Fokusring sichtbar, bei 375 px ohne horizontale Scrollleiste. | `/verify`, Browser; Fall „no horizontal scroll bar at 375 px“ in `frontend/e2e/layout.spec.ts` bleibt grün |
| A7 | `make check` und `make e2e` sind grün. | Aufruf `make check`, `make e2e` |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh` meldet medium für Code unter `frontend/src/` und für
`project-rules/**`. Kein Backend, kein Vertrag, keine neue Abhängigkeit.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`. `verified` ist nicht
erforderlich, `implement` führt `verify` trotzdem aus. Reviews: Code, Sicherheit.
ADR nötig: nein, weil sich nur die Darstellung im Frontend ändert, ohne neue Abhängigkeit, ohne
Vertrag und ohne Abweichung von einer Regel aus `harness/architecture.md` oder
`harness/testing.md`.

## Umsetzung

Entscheidungen:

- Neuer `ThemeService` in `frontend/src/app/shell/`, Wert im `PreferencesStore` (0036, Feld `theme`).
- Dark-Regeln über ein SCSS-Mixin mit `html[data-theme]`, statt direkter `prefers-color-scheme`-Abfragen.

Dateien:

- `frontend/src/styles/_theme.scss`: neu, Mixin `dark`
- `frontend/src/styles.scss`: ändern, Mixin, `color-scheme` je `data-theme`
- `frontend/src/app/shell/app-shell.scss`: ändern, Mixin, Stil des Knopfs
- `frontend/src/app/shell/app-shell.html`: ändern, Knopf
- `frontend/src/app/shell/app-shell.ts`: ändern, `ThemeService`
- `frontend/src/app/shell/app-shell.spec.ts`: ändern, A2
- `frontend/src/app/shell/theme.service.ts`: neu
- `frontend/src/app/shell/theme.service.spec.ts`: neu, A1
- `frontend/src/app/session/session-page.scss`: ändern, Mixin
- `frontend/src/app/join/join-page.scss`: ändern, Mixin
- `frontend/src/app/api/preferences-store.ts`: ändern, Feld `theme`
- `frontend/src/app/api/preferences-store.spec.ts`: ändern, Feld `theme`
- `frontend/src/app/app.config.ts`: ändern, `provideAppInitializer`
- `frontend/e2e/theme-toggle.spec.ts`: neu, A3 und A4
- `project-rules/frontend.md`: ändern, Mixin und Testid
- `project-rules/testing.md`: ändern, E2E-Fall

Schritte:

1. Mixin `dark` und Umstellung der vier SCSS-Dateien; `theme.spec.ts` und `layout.spec.ts` bleiben grün.
2. `ThemeService`, Feld `theme` im `PreferencesStore`, App-Initializer.
3. Knopf in der Toolbar mit i18n-Texten.
4. E2E-Fall, `project-rules`, `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `theme.service.spec.ts` |
| A2 | `app-shell.spec.ts` |
| A3, A4 | `theme-toggle.spec.ts` |
| A5 | `theme.spec.ts` (unverändert) |
| A6 | `/verify`, `layout.spec.ts` |
| A7 | `make check`, `make e2e` |

Testdaten: GitLab-Double wie bisher; Playwright mit `page.emulateMedia({ colorScheme })`, frischer
Browserkontext je Fall.

Contracts zu regenerieren: keine.

## Offene Fragen

- [x] Wie sieht der Knopf aus? → Mond- oder Sonnen-Emoji, je nach Design. (Morten Möller, 2026-11-18)

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/shell/`, `frontend/src/app/api/preferences-store.spec.ts`, `make e2e` (`theme.spec.ts`, `theme-toggle.spec.ts`, `layout.spec.ts`)
- Browser: Start-, Beitritts- und Sitzungsseite, Umschalten in beide Richtungen, Neuladen, 1440 und 375 px
