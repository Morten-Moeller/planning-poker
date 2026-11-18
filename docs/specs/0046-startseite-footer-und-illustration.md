---
id: "0046"
title: Backend-Status im Footer und Karten-Illustration auf der Startseite
status: Review
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-18
updated: 2026-11-18
pr: ""
note: freigegeben in der Session; Umsetzung nach Merge von #46
---

# Backend-Status im Footer und Karten-Illustration auf der Startseite

## Ziel

Auf der Startseite steht der Backend-Status heute als erste Zeile über der Überschrift, bei nicht
erreichbarem Backend zusätzlich der rote Hinweis `health-down` mit „Erneut prüfen“. Das wirkt zu
präsent. Nach der Änderung stehen Status und Hinweis in einem Footer am Ende der Startseite, und
oben mittig steht die Karten-Illustration `card-hand` wie auf der Beitrittsseite. Die Startseite
wirkt dadurch einladender.

## Scope

### Enthalten

- Footer `start-footer` als letztes Element der Startseite, nach dem Formular „Sitzung
  erstellen“, mit Trennlinie oben. Er zeigt den Status `health-status` mit Zeichen (● ✕ ◌) in
  der heutigen Farbe und Schrift `label-large`.
- Bei nicht erreichbarem Backend zeigt der Footer den Hinweis `health-down` („Ohne Backend lassen
  sich keine Sitzungen erstellen oder betreten.“) mit dem Button `health-retry` („↻ Erneut
  prüfen“) wie heute, nur im Footer.
- Oben mittig über der Überschrift „Issues gemeinsam schätzen“ steht `app-card-hand` in der Größe
  `large`, zentriert wie auf der Beitrittsseite (Spec 0038).
- Überschrift und Einleitung stehen zentriert; das Formular „Sitzung erstellen“ und die Liste
  „Letzte Sitzungen“ stehen mittig mit höchstens 600px Breite. Der Footer bleibt linksbündig
  (Wunsch der Person nach Ansicht des Stands, 2026-11-18).
- `project-rules/frontend.md` nennt Footer und Illustration der Startseite.

### Nicht enthalten

- Footer auf Beitrittsseite oder im Raum; ein globaler Footer im Seitenrahmen.
- Das globale Fehlerbanner `error-banner` unter der Toolbar; es bleibt, wo es ist.
- Logik der Backend-Prüfung, Sperre des Formulars und Text „Sitzung erstellen (Backend fehlt)“;
  sie bleiben unverändert.
- Ein fest am Fensterrand stehender Footer (`position: fixed` oder `sticky`).

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Sitzung | wie im Glossar |
| Footer | technischer Begriff, kein Domänenbegriff: Abschluss der Startseite unter dem Formular |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `health-status` und, bei nicht erreichbarem Backend, `health-down` mit `health-retry` stehen im Element `start-footer`; über der Überschrift steht kein Status mehr. | Test |
| A2 | `start-footer` ist das letzte Element der Startseite und steht im Browser unter dem Formular „Sitzung erstellen“, auch bei 375px Breite. | Test (e2e) |
| A3 | Über der Überschrift steht `card-hand` in der Größe `large`, horizontal mittig zur Seite (Abweichung höchstens 1px). | Test, Test (e2e) |
| A4 | „Erneut prüfen“ im Footer startet eine neue Prüfung; bei Erfolg verschwindet `health-down` und das Formular ist frei. | Test |
| A6 | Überschrift, Einleitung und das Formular „Sitzung erstellen“ stehen horizontal mittig (Abweichung höchstens 1px), der Status im Footer beginnt am linken Rand der Seite. | Test (e2e) |
| A5 | Startseite hell und dunkel, breit und 375px: Illustration oben mittig, Footer dezent am Ende, bei nicht erreichbarem Backend der rote Hinweis im Footer. | Browser |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh`: Template, Styles und Komponente der Startseite sowie
`project-rules/**` sind medium, die Tests low; keine Eskalation.
Gates: G2, das Label `human-approved` einer Person vor dem Merge; `/verify` nach CI, G3 für medium
nicht verlangt.
ADR nötig: nein, weil keine Abhängigkeit, kein Contract und keine Abweichung von einer Regel; die
Änderung betrifft nur das Layout einer Seite und nutzt die vorhandene Komponente `CardHand` aus
`api/`.

## Umsetzung

Entscheidungen:

- Der Footer gehört zur Startseite (Komponente `StartPage`), nicht zum Seitenrahmen `shell`.
- Abhängig von Spec 0045 (PR #46): beide ändern `start-page.html`; die Umsetzung beginnt nach dem
  Merge von #46 auf dem dann aktuellen `main`.

Dateien:

- `frontend/src/app/start/start-page.html`: ändern, Illustration oben, Status und Hinweis in den Footer
- `frontend/src/app/start/start-page.ts`: ändern, `CardHand` importieren
- `frontend/src/app/start/start-page.scss`: ändern, Footer und Illustration
- `frontend/src/app/start/start-page.spec.ts`: ändern, Tests A1, A3, A4
- `frontend/e2e/health.spec.ts`: ändern, Test A2 und A3
- `project-rules/frontend.md`: ändern, Footer und Illustration der Startseite

Schritte:

1. `start-page.html`: `<app-card-hand class="hand" [size]="'large'" />` als erstes Element von
   `.intro`; die Blöcke `.health` und `health-down` aus `.intro` entfernen.
2. Am Ende der Vorlage `<footer class="start-footer" data-testid="start-footer">` mit `.health`
   (`role="status"`) und darunter `health-down` mit `health-retry`, Markup und Test-IDs wie bisher.
3. `start-page.ts`: `CardHand` in `imports`.
4. `start-page.scss`: `.hand` mit `align-self: center`; `.start-footer` mit Trennlinie
   `outline-variant`, Abstand oben, Spalte mit Lücke `space-s`; die heutigen Regeln `.health` und
   `.health-note` bleiben.
5. Unit-Tests: Status und Hinweis liegen im Footer, Hand vor `h1`, Retry funktioniert im Footer.
6. `e2e/health.spec.ts`: Footer unter dem Formular und letztes Kind der Seite (breit und 375px),
   Hand mittig.
7. `project-rules/frontend.md`: Zeile zu Spec 0031 ergänzen um Footer `start-footer` und
   `card-hand` oben mittig (Spec 0046).
8. `make check`, `make e2e` mit `BACKEND_PORT`/`FRONTEND_PORT`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `frontend/src/app/start/start-page.spec.ts`: Status und Hinweis im Footer, keiner in `.intro` |
| A2 | `frontend/e2e/health.spec.ts`: Footer unter `create-submit` und letztes Kind, breit und 375px |
| A3 | `frontend/src/app/start/start-page.spec.ts`: `card-hand` mit Klasse `large` vor `h1`; `frontend/e2e/health.spec.ts`: Mitte der Hand gleich Mitte der Seite ±1px |
| A4 | `frontend/src/app/start/start-page.spec.ts`: bestehender Test „locks the create form without backend and frees it after a new check“ mit Retry im Footer |
| A5 | Browser: Startseite hell, dunkel, 375px, Backend gestoppt |
| A6 | `frontend/e2e/health.spec.ts`: Mitte von `h1`, Einleitung und Formular gleich Mitte der Seite ±1px; Status links |

## Offene Fragen

- keine

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/start/start-page.spec.ts`, `frontend/e2e/health.spec.ts`,
  `frontend/e2e/create-and-join.spec.ts`
- Browser: Startseite hell und dunkel, breit und 375px, mit erreichbarem und nicht erreichbarem
  Backend
