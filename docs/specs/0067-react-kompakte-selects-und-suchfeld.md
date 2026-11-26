---
id: "0067"
title: "React-Frontend: kompakte Selects und kompaktes Suchfeld im Raum"
status: approved
risk: medium
adrs: ["0016"]
owner: Morten Möller
created: 2026-11-26
updated: 2026-11-26
pr: ""
note: freigegeben in der Session
---

# React-Frontend: kompakte Selects und kompaktes Suchfeld im Raum

## Ziel

Im Raum des React-Frontends sind die Selects „Timer“ und „Geändert in“ 60 px hoch und gefüllt, das
Suchfeld „Issues suchen“ ist 56 px hoch. Neben dem Umschalter für das Gewicht (42 px) und dem
Button „Suchen“ (40 px) wirken sie zu groß, und die Zeilen stehen nicht bündig. Am Ende haben die
beiden Selects und das Suchfeld einen Rahmen wie der Umschalter und dieselbe Höhe wie ihr Nachbar
in der Zeile.

Die Änderung gilt nur für das React-Frontend (Aussage nach ADR 0016, Folgen: „Jede Änderung an der
Oberfläche nach der Parität braucht eine Aussage in ihrer Spec, ob sie für beide Frontends gilt“).
Das Angular-Frontend bleibt unverändert. (Morten Möller, 2026-11-26)

## Scope

### Enthalten

- Select „Timer“ in der Seitenleiste und Select „Geändert in“ in der Issue-Auswahl: Rahmen, 42 px.
- Suchfeld „Issues suchen“: 40 px, bündig mit dem Button „Suchen“.
- Regeldateien des React-Frontends.

### Nicht enthalten

- Das Angular-Frontend.
- Die Textfelder der Startseite und der Beitrittsseite; sie bleiben 56 px hoch.
- Die Liste der Optionen eines Selects (Höhe der Zeilen, Farben) und das Verhalten mit Tastatur.
- `data-testid`, Rollen und Texte der Optionen: Die Playwright-Suite läuft unverändert gegen beide
  Frontends.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Issue | wie im Glossar |
| Runde | wie im Glossar |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Der Select „Timer“ (`timer-select`) hat einen Rahmen von 1 px in `--mat-sys-outline`, den Radius `--app-corner-control`, einen durchsichtigen Hintergrund und ist außen 42 px hoch. Im Feld steht nur der Wert und der Pfeil. Das sichtbare Label im Feld entfällt; der Name für Hilfstechnik bleibt „Timer“. Der Hinweis „Gilt ab der nächsten Runde.“ steht darunter wie bisher. | Browser: Seitenleiste des Raums, hell und dunkel; vitest: `frontend-react/src/session/timer-setting.spec.tsx` (Name) |
| A2 | Der Select „Geändert in“ (`issue-filter-period`) sieht aus wie in A1 und ist so hoch wie der Umschalter für das Gewicht; beide stehen auf einer Linie. Das Label „Geändert in“ steht sichtbar links vom Feld und ist der Name des Selects. | Browser: Issue-Auswahl bei 1440 px und 375 px; vitest: `frontend-react/src/session/issue-panel.spec.tsx` (Name) |
| A3 | Hover, Fokus und der offene Zustand eines Selects zeigen den Rahmen in `--mat-sys-on-surface` (Hover) und 2 px in `--mat-sys-primary` (Fokus, offen), ohne dass der Inhalt springt. Der gesperrte Zustand hat Rahmen und Text mit 38 % von `--mat-sys-on-surface`. | Browser: beide Selects |
| A4 | Das Suchfeld (`issue-search-input`) ist 40 px hoch; seine obere und untere Kante stehen auf einer Linie mit dem Button `issue-search-submit`. Das Label „Issues suchen“ steht darüber wie bisher. | Browser: Issue-Auswahl bei 1440 px und 375 px; vitest: `frontend-react/src/ui/text-field.spec.tsx` (Größe `compact` setzt `data-size`) |
| A5 | Die Textfelder der Startseite und der Beitrittsseite sind 56 px hoch wie bisher. | Browser: Startseite, Beitrittsseite; vitest: `frontend-react/src/ui/text-field.spec.tsx` (ohne Angabe kein `data-size`) |
| A6 | `make e2e` ist gegen beide Frontends grün, ohne Änderung an einem Test in `frontend/e2e/`. | e2e: beide Läufe |

## Contracts

keine Änderung.

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh` nennt für die Dateiliste medium (Quelltext unter
`frontend-react/src/`, `project-rules/**`). Hebt eine Regel die Stufe bei der Umsetzung, hält
`/implement` an.
Gates: G2, das Label `human-approved` nach dem letzten Push; G3, der Status `verified`; Code- und
Sicherheits-Review.
ADR nötig: nein, weil keine Bedingung aus `harness/policies/adr.md` zutrifft: keine neue
Abhängigkeit, kein Vertrag. ADR 0016 lässt eine Änderung für ein Frontend zu, wenn die Spec es
sagt; diese Spec sagt es unter „Ziel“.

## Umsetzung

Entscheidungen:

- Die Änderung gilt nur für das React-Frontend; das Aussehen der beiden Frontends weicht an
  diesen drei Feldern ab (ADR 0016, Aussage in der Spec).
- `TextField` bekommt die Eigenschaft `size` (`'compact'`, sonst wie bisher); nur das Suchfeld
  nutzt sie.
- `filled-select.module.css` wird zu `outlined-select.module.css`; beide Selects nutzen die Datei
  weiter gemeinsam.
- Der Select „Timer“ hat kein sichtbares Label mehr; die Überschrift „TIMER“ der Seitenleiste
  steht direkt darüber.

Dateien:

- `frontend-react/src/session/filled-select.module.css`: löschen
- `frontend-react/src/session/outlined-select.module.css`: neu
- `frontend-react/src/session/timer-setting.tsx`: ändern
- `frontend-react/src/session/timer-setting.spec.tsx`: ändern
- `frontend-react/src/session/issue-panel.tsx`: ändern
- `frontend-react/src/session/issue-panel.module.css`: ändern
- `frontend-react/src/session/issue-panel.spec.tsx`: ändern
- `frontend-react/src/ui/text-field.tsx`: ändern, `size`
- `frontend-react/src/ui/text-field.module.css`: ändern
- `frontend-react/src/ui/text-field.spec.tsx`: ändern
- `project-rules/frontend-react-session.md`: ändern
- `project-rules/frontend-react-ui.md`: ändern
- `docs/roadmap.md`: ändern, Welle 11

Schritte:

1. Tests zu A1, A2, A4, A5 schreiben; sie schlagen fehl.
2. `TextField` mit `size`; das Suchfeld nutzt `compact`.
3. Die Stile der Selects neu: Rahmen, 42 px, Zustände aus A3. Label des Timers als
   `aria-label` oder unsichtbares Label, Label „Geändert in“ links vom Feld.
4. Regeldateien. `make check`, `make e2e`.
5. Gang durch den Raum im Browser, hell und dunkel, 1440 px und 375 px; Bildschirmfotos in den
   Pull Request-Text als Maße (Höhe, Kanten).

Tests:

| Kriterium | Test |
|---|---|
| A1 | `frontend-react/src/session/timer-setting.spec.tsx`: der Select hat den Namen „Timer“, kein sichtbares Label im Feld; Browser: Seitenleiste |
| A2 | `frontend-react/src/session/issue-panel.spec.tsx`: der Select hat den Namen „Geändert in“; Browser: Issue-Auswahl |
| A3 | Browser: Hover, Fokus, offen, gesperrt |
| A4 | `frontend-react/src/ui/text-field.spec.tsx`: `size="compact"` setzt `data-size="compact"`; Browser: Issue-Auswahl |
| A5 | `frontend-react/src/ui/text-field.spec.tsx`: ohne `size` kein `data-size`; Browser: Startseite, Beitrittsseite |
| A6 | `make e2e` |

Testdaten: eine Sitzung mit Scrum Master im Raum, über die Oberfläche angelegt.

## Offene Fragen

- [x] Für welche Frontends gilt die Änderung? → Nur React. (Morten Möller, 2026-11-26)
- [x] Wie sollen Selects und Suchfeld aussehen? → Kompakt mit Rahmen, 40 px. (Morten Möller, 2026-11-26)

## Verifikationsplan

- make check
- betroffene Tests: `pnpm -C frontend-react test`, `make e2e`
- Browser: Raum (Seitenleiste, Issue-Auswahl) hell und dunkel bei 1440 px und 375 px; Startseite
  und Beitrittsseite
