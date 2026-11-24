---
id: "0063"
title: "React-Frontend: Textkatalog je Feature, Fehlerhinweis und Regeln je Bereich"
status: done
risk: medium
adrs: ["0016"]
owner: Morten Möller
created: 2026-11-24
updated: 2026-11-24
pr: "#65"
note: alle Kriterien erfüllt; Status nach dem Merge nachgetragen
---

# React-Frontend: Textkatalog je Feature, Fehlerhinweis und Regeln je Bereich

## Ziel

Startseite (0056), Beitrittsseite (0057) und Raum (0058) sollen in einer Welle parallel entstehen.
Heute würden alle drei dieselben Dateien ändern: den einen Textkatalog
`frontend-react/src/i18n/messages.ts`, `project-rules/frontend-react.md` und die Bereichstabelle in
`project-rules/testing.md`; `harness/scripts/wave-check.sh` ließe dann nur eine Spec zur Zeit zu.
Diese Spec trennt diese Stellen je Feature, ergänzt Texte mit Zahlform und den Fehlerhinweis, den
Start und Beitritt beide brauchen, und zieht die Regeln zu `ui/` nach, die nach Spec 0055 fehlen.
Gelöst ist es, wenn die Oberfläche unverändert ist, alle Tests grün sind und ein neues Feature
seine Texte und Regeln in eigenen Dateien anlegt.

## Scope

### Enthalten

- `defineMessages` in `frontend-react/src/i18n/messages.ts`; ein Katalog `messages.ts` je Ordner
  `shell`, `start`, `session`; die Texte `error.<CODE>` und `error.unknown` bleiben im
  gemeinsamen Katalog.
- Texte mit Zahlform (ein Text für 1, ein Text für alle anderen Werte).
- Ein Test, der jeden Katalog findet und unbenutzte und doppelte Schlüssel meldet.
- `ErrorNote` in `frontend-react/src/ui/` mit Beispiel auf der Musterseite; der Hinweis
  `health-down` der Startseite nutzt ihn.
- Regeln: `project-rules/frontend-react.md` (Katalog je Feature, `ui/`, Regeldatei je Bereich),
  `project-rules/frontend-react-ui.md` (`ErrorNote`), `project-rules/testing.md` (eine Zeile für
  alle Feature-Ordner), `project-rules/README.md`.
- `docs/roadmap.md`: diese Spec als Welle 3, die Wellen danach um eins verschoben.

### Nicht enthalten

- Neue Texte, neue Seiten, neue Routen.
- Umstellung der Buttons von Banner und Startseite auf `AppButton` (0056, 0057).
- Änderungen am Angular-Frontend und an `frontend/e2e/`.

## Begriffe

Keine Fachbegriffe aus `docs/domain/glossary.md`.

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `defineMessages(catalog)` liefert eine Funktion `t(key, values?)`, die nur Schlüssel dieses Katalogs annimmt und `{name}` durch den Wert ersetzt. Ein unbekannter Schlüssel lässt `make typecheck` scheitern. | vitest: `frontend-react/src/i18n/messages.spec.ts`; Aufruf: `make typecheck` mit einer Probe-Datei im Scratchpad |
| A2 | Ein Eintrag kann `{ one, other }` sein; `t(key, { count })` nimmt `one` für `count` 1 und sonst `other` und ersetzt `{count}`. Ein solcher Eintrag ohne `count` im Aufruf lässt `make typecheck` scheitern. | vitest: `frontend-react/src/i18n/messages.spec.ts` (Tabelle mit 0, 1, 2) |
| A3 | Es gibt die Kataloge `frontend-react/src/shell/messages.ts` (`shell.*`, `connection.*`, `error.close`), `frontend-react/src/start/messages.ts` (`start.*`) und `frontend-react/src/session/messages.ts` (`session.*`); `frontend-react/src/i18n/messages.ts` hat nur noch `error.<CODE>` und `error.unknown`. Jeder Text hat den Wortlaut von vorher; die Seiten zeigen dieselben Texte. | vitest: die vorhandenen Tests von Shell, Banner, Startseite, Sitzungsseite und `error-messages` bleiben ohne Änderung ihrer Erwartungen grün; Playwright: React-Lauf (7 Tests) |
| A4 | Der Katalogtest findet jede Datei `messages.ts` unter `frontend-react/src/` ohne feste Liste. Er scheitert für einen Schlüssel, den kein Quelltext verwendet, für einen Schlüssel, der in zwei Katalogen steht, und für eine Datei `messages.ts`, die keinen Katalog `MESSAGES` exportiert. | vitest: `frontend-react/src/i18n/messages.spec.ts` |
| A5 | `ErrorNote` rendert einen Kasten mit `role="alert"` in `--mat-sys-error-container` und `--mat-sys-on-error-container`, Radius `--app-corner-control`, davor das Symbol ⚠ in einem `aria-hidden`-`span`; mit `icon={false}` ohne Symbol. `data-testid` und `className` gehen an den Kasten. Die Musterseite `ui.html` zeigt beide Formen. | vitest: `frontend-react/src/ui/error-note.spec.tsx`; Bildschirm: `ui.html` hell und dunkel |
| A6 | Der Hinweis `health-down` der Startseite ist ein `ErrorNote` ohne Symbol und sieht aus wie vorher: gleiche Maße, Farben und Texte, Button `health-retry` an derselben Stelle. | vitest: `frontend-react/src/start/start-page.spec.tsx` ohne Änderung der Erwartungen; Bildschirm: Startseite ohne Backend vor und nach der Änderung im Vergleich |
| A7 | `project-rules/frontend-react.md` beschreibt: ein Katalog je Feature mit `defineMessages`, Zahlform, `ui/` als vorhandenes Modul, die globalen Klassen `motif-0` bis `motif-4`, und dass ein Feature seine Regeln in `project-rules/frontend-react-<feature>.md` mit `sources:` auf seinen Ordner schreibt. `project-rules/README.md` nennt dieses Muster. | Aufruf: `grep -n "defineMessages\|frontend-react-<feature>\|motif-0" project-rules/frontend-react.md project-rules/README.md` |
| A8 | `project-rules/testing.md` hat für das React-Frontend eine Zeile für alle Ordner `frontend-react/src/<feature>/` (Unit-Tests neben der Datei; End-to-End: die Tests mit `@react`, `grep -l "@react" frontend/e2e/*.spec.ts`) statt einer Zeile je Ordner. | Aufruf: `grep -n "frontend-react/src" project-rules/testing.md` |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh`: Dateien unter `frontend-react/src/` und
`project-rules/**` sind medium; kein Manifest, kein Schlüsselwort erwartet.
Gates: G2, das Label `human-approved` nach dem letzten Push; Code- und Sicherheits-Review.
ADR nötig: nein, weil die Änderung ADR 0016 folgt (eigener typisierter Katalog ohne i18n-Paket)
und keine Abhängigkeit hinzufügt.

## Umsetzung

Entscheidungen:

- Ein Textkatalog je Feature-Ordner statt eines Katalogs für alles; die Schlüssel behalten ihre
  Namen. Gemeinsam bleiben nur die Fehlertexte je `errorCode`.
- Zahlform nur mit zwei Formen (`one`, `other`), ohne `Intl.PluralRules`; die Oberfläche ist nur
  deutsch.
- Regeln je Feature in eigenen Dateien `project-rules/frontend-react-<feature>.md`, nach dem
  Muster von `frontend-react-ui.md`.
- `ErrorNote` kommt nach `ui/`, weil Startseite und Beitrittsseite ihn nutzen (A1.3).
- Keine neue Abhängigkeit.

Dateien:

- `frontend-react/src/i18n/messages.ts`: ändern, `defineMessages`, Zahlform, nur noch `error.<CODE>` und `error.unknown`
- `frontend-react/src/i18n/messages.spec.ts`: ändern, Kataloge finden, unbenutzte und doppelte Schlüssel, Zahlform
- `frontend-react/src/shell/messages.ts`: neu
- `frontend-react/src/start/messages.ts`: neu
- `frontend-react/src/session/messages.ts`: neu
- `frontend-react/src/shell/app-shell.tsx`: ändern, Import des Katalogs
- `frontend-react/src/shell/error-banner.tsx`: ändern, Import des Katalogs
- `frontend-react/src/start/start-page.tsx`: ändern, Import des Katalogs, `ErrorNote`
- `frontend-react/src/start/start-page.module.css`: ändern, Stile des Kastens entfallen
- `frontend-react/src/session/session-page.tsx`: ändern, Import des Katalogs
- `frontend-react/src/api/error-messages.ts`: ändern, Typ des Schlüssels aus dem gemeinsamen Katalog
- `frontend-react/src/ui/error-note.tsx`: neu
- `frontend-react/src/ui/error-note.module.css`: neu
- `frontend-react/src/ui/error-note.spec.tsx`: neu
- `frontend-react/src/ui/gallery/ui-gallery.tsx`: ändern, Beispiel für `ErrorNote`
- `frontend-react/src/ui/gallery/main.tsx`: ändern, `createThemeStore` mit `PreferencesStore` (behebt den Typfehler auf `main`)
- `project-rules/frontend-react.md`: ändern
- `project-rules/frontend-react-ui.md`: ändern, `ErrorNote`
- `project-rules/testing.md`: ändern, eine Zeile für die Feature-Ordner
- `project-rules/README.md`: ändern, Muster der Regeldateien
- `docs/roadmap.md`: ändern, Welle 3 und Verschiebung
- `docs/specs/0063-react-kataloge-je-feature.md`: neu

Schritte:

1. `defineMessages` mit den Typen für Schlüssel, Werte und Zahlform; Tests zu A1 und A2.
2. Die drei Kataloge anlegen, die Texte unverändert verschieben, Importe umstellen.
3. Katalogtest mit `import.meta.glob('../**/messages.ts', { eager: true })`; Tests zu A4 mit
   kleinen Katalogen als Eingabe der Prüffunktionen.
4. `ErrorNote` nach `.note` und `.note-error` in `frontend/src/app/start/start-page.scss`;
   Startseite umstellen; Beispiel auf der Musterseite.
5. Regeldateien.
6. `make check`, `E2E_FRONTEND=react pnpm -C frontend exec playwright test`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `frontend-react/src/i18n/messages.spec.ts`: Ersetzung; Aufruf `make typecheck` mit Probe-Datei |
| A2 | `frontend-react/src/i18n/messages.spec.ts`: Tabelle 0, 1, 2 |
| A3 | vorhandene Tests unter `frontend-react/src/shell/`, `start/`, `session/`, `api/error-messages.spec.ts`; React-Lauf der Playwright-Suite |
| A4 | `frontend-react/src/i18n/messages.spec.ts`: unbenutzt, doppelt, Datei ohne `MESSAGES` |
| A5 | `frontend-react/src/ui/error-note.spec.tsx`; Browser: `ui.html` |
| A6 | `frontend-react/src/start/start-page.spec.tsx`; Browser: Startseite ohne Backend |
| A7 | Aufruf `grep` wie im Kriterium |
| A8 | Aufruf `grep` wie im Kriterium |

Testdaten: keine.

## Offene Fragen

- [x] `make typecheck` scheitert auf `main`: `frontend-react/src/ui/gallery/main.tsx` ruft
  `createThemeStore(window)` mit einem Argument auf (Spec 0055), Spec 0054 hat den Parameter
  `preferences` eingeführt. Wo wird das behoben? → In dieser Spec, die Datei kommt in den Plan.
  (Morten Möller, 2026-11-24)

## Verifikationsplan

- make check
- betroffene Tests: `pnpm -C frontend-react test`; React-Lauf der Playwright-Suite (7 Tests)
- Browser: `ui.html` hell und dunkel (A5); Startseite des React-Frontends ohne laufendes Backend,
  Vergleich mit dem Stand von `main` (A6)
