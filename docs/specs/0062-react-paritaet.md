---
id: "0062"
title: "React-Frontend: Parität mit ganzer Suite, Favicon, Bundle-Grenze und Texten"
status: Review
risk: medium
adrs: ["0016"]
owner: Morten Möller
created: 2026-11-25
updated: 2026-11-25
pr: ""
note: freigegeben in der Session
---

# React-Frontend: Parität mit ganzer Suite, Favicon, Bundle-Grenze und Texten

## Ziel

Nach Spec 0061 hat das React-Frontend alle Seiten, und 77 der 78 Playwright-Tests laufen gegen
beide Frontends. Der React-Lauf ist aber noch auf Tests mit dem Tag `@react` beschränkt, ein Test
fehlt, die Größe des Bundles prüft kein Gate, und README und Architektur nennen das Frontend „im
Aufbau“. Diese Spec schließt die Roadmap Teil 2 ab. Gelöst ist es, wenn `make e2e` die ganze Suite
ohne Einschränkung gegen beide Frontends ausführt, drei Läufe in Folge grün sind und die Texte den
Stand nennen.

## Scope

### Enthalten

- Favicon-Verweise des React-Frontends wie im Angular-Frontend (Spec 0025).
- React-Lauf der Suite ohne `grep`; die Tags `@react` entfallen.
- React-Lauf gegen den gebauten Stand (`vite build`, `vite preview`) statt gegen den Dev-Server.
- Grenze für die Größe des ersten Ladens, geprüft in `make typecheck-frontend-react`.
- README, `docs/architecture/overview.md`, `docs/roadmap.md`, Regeldateien.

### Nicht enthalten

- Neue Funktionen, Änderungen an Aussehen oder Verhalten der Seiten.
- Die drei Hinweise aus den Reviews von 0059 und 0061 (leerer Zustand bei anderem Listenfehler,
  `rel` der Links, Region der Meldung); eigene Specs für beide Frontends.
- Update des UI SDK über `0.1.0-beta.7` hinaus (eigener Pull Request, ADR 0016).
- Änderungen am Angular-Frontend, am Backend und am Vertrag.

## Begriffe

keine neuen.

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `frontend-react/index.html` verweist auf `favicon.ico` (`sizes="16x16 32x32 48x48"`), `favicon.svg` (`type="image/svg+xml"`) und `apple-touch-icon.png` (`sizes="180x180"`) mit relativen Adressen und `<base href="/" />`, wie `frontend/src/index.html`; die drei Dateien werden unter `/` ausgeliefert, auch von einer Seite unter `/session/<id>/join`. | e2e: `frontend/e2e/theme.spec.ts` (Favicon) gegen beide Frontends |
| A2 | `frontend/playwright.config.ts` hat kein `grep` mehr; mit `E2E_FRONTEND=react` läuft jeder Test der Suite. Kein Test in `frontend/e2e/` trägt noch `@react`; die Tests stehen wieder in der Form ohne Tag. | Aufruf: `grep -rn "@react\|grep" frontend/e2e frontend/playwright.config.ts` ohne Treffer; e2e: beide Läufe mit je 78 Tests |
| A3 | Mit `E2E_FRONTEND=react` startet Playwright das gebaute React-Frontend: `vite build`, dann `vite preview` auf `FRONTEND_PORT` mit dem Proxy für `/api` und `/ws` auf `BACKEND_PORT`. Jeder Pfad der Anwendung (`/session/<id>`, `/session/<id>/join`) liefert `index.html`. | e2e: React-Lauf; vitest entfällt (Konfiguration) |
| A4 | `make e2e` ist dreimal in Folge grün (Angular-Lauf und React-Lauf mit je 78 Tests), ohne Wiederholung einzelner Tests. | e2e: drei Läufe, Zahl der Tests und Dauer im Pull Request |
| A5 | `make typecheck-frontend-react` bricht mit einer Meldung ab, wenn das erste Laden (JavaScript und CSS des Einstiegs mit seinen statischen Importen, ungepackt) über 1 MB liegt, und warnt über 500 kB; die Seiten des Raums und der Beitrittsseite bleiben eigene Chunks und zählen nicht dazu. Die Meldung nennt die Größe und die Grenze. | vitest: `frontend-react/scripts/bundle-budget.spec.ts` (Manifest über und unter der Grenze); Aufruf: `make typecheck-frontend-react` |
| A6 | README: Der Abschnitt zum zweiten Frontend nennt den Stand „alle Seiten, gleiche Playwright-Suite“ statt „im Aufbau“, die Befehle und dass das Angular-Frontend das Frontend der Abgabe bleibt. `docs/architecture/overview.md` nennt die Ordner des React-Frontends ohne „im Aufbau“. `docs/roadmap.md` nennt Teil 2 als abgeschlossen. | Aufruf: `grep -n "im Aufbau" README.md docs/architecture/overview.md` ohne Treffer |
| A7 | `project-rules/testing.md` und `project-rules/frontend-react.md` beschreiben den React-Lauf ohne Tag und gegen den gebauten Stand; die Regel „eine Spec versieht Tests mit `@react`“ entfällt. Eine Änderung an der Oberfläche nennt in ihrer Spec, ob sie für beide Frontends gilt (ADR 0016). | Aufruf: `grep -n "@react" project-rules/*.md` ohne Treffer |

## Contracts

keine Änderung.

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh` nennt für die Dateiliste medium (`frontend/playwright.config.ts`,
`frontend-react/vite.config.ts`, `frontend-react/index.html`, `Makefile`, `project-rules/**`). Die
Änderung an der Konfiguration der End-to-End-Tests erweitert die Prüfung (mehr Tests gegen React),
sie schaltet keine ab. Hebt eine Regel die Stufe bei der Umsetzung, hält `/implement` an.
Gates: G2, das Label `human-approved` nach dem letzten Push; G3, der Status `verified`; Code- und
Sicherheits-Review.
ADR nötig: nein, weil keine Bedingung aus `harness/policies/adr.md` zutrifft: keine neue
Abhängigkeit (`vite preview` ist Teil von Vite), kein Vertrag, keine Abweichung von einer Regel.
Die Änderung folgt ADR 0016 („Die Playwright-Suite läuft zweimal“).

## Umsetzung

Entscheidungen:

- Keine neue Abhängigkeit. Die Bundle-Grenze prüft ein eigenes Skript
  `frontend-react/scripts/bundle-budget.ts` aus dem Manifest von Vite (`build.manifest`); die
  Werte sind die des Angular-Frontends (Warnung 500 kB, Fehler 1 MB, Spec 0044). Das Skript ist
  TypeScript und läuft mit Node 26 ohne Übersetzung (`node scripts/bundle-budget.ts`), damit
  `tsc` und der Test es prüfen; freigegeben war die Endung `.mjs`.
- Der React-Lauf der Suite nutzt `vite preview` des Builds. Grund: Im Dev-Server waren drei Tests
  der Startseite je einmal rot, ohne belegte Ursache; der gebaute Stand lädt ohne Umwandlung zur
  Laufzeit und ist der Stand, den Nutzer bekommen. Der Angular-Lauf bleibt bei `ng serve`.
- Die Tags `@react` werden entfernt, nicht behalten: Ohne `grep` haben sie keine Wirkung.
- `<base href="/" />` in `frontend-react/index.html`, damit relative Verweise von jeder Route aus
  auf `/` zeigen.

Dateien:

- `frontend-react/index.html`: ändern, `base` und relative Verweise
- `frontend-react/vite.config.ts`: ändern, `preview` mit Proxy, `build.manifest`
- `frontend-react/package.json`: ändern, Skript `typecheck` mit der Grenze, Skript `preview`
- `frontend-react/scripts/bundle-budget.ts`: neu
- `frontend-react/scripts/bundle-budget.spec.ts`: neu
- `frontend-react/tsconfig.json`: ändern, Ordner `scripts`
- `project-rules/frontend-react-start.md`: ändern, Absatz End-to-end
- `project-rules/frontend-react-join.md`: ändern, Absatz End-to-end
- `frontend/playwright.config.ts`: ändern, ohne `grep`, React-Server aus dem Build
- `frontend/e2e/card-motion.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/confetti.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/consensus.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/create-and-join.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/design-sidebar.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/full-flow.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/health.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/issue-filter.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/layout.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/outliers.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/preferences.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/project-picker.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/recent-sessions.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/result-round.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/round-timer.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/session-access.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/session-room.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/symbols.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/theme-toggle.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/theme.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/viewer.spec.ts`: ändern, Tags entfernen
- `frontend/e2e/voting-round.spec.ts`: ändern, Tags entfernen
- `Makefile`: ändern, Hilfetext von `e2e`
- `README.md`: ändern
- `docs/architecture/overview.md`: ändern
- `docs/roadmap.md`: ändern, Teil 2 abgeschlossen
- `project-rules/testing.md`: ändern
- `project-rules/frontend-react.md`: ändern
- `project-rules/frontend-react-session.md`: ändern, Absatz End-to-end
- `docs/specs/0062-react-paritaet.md`: neu

Schritte:

1. `frontend-react/index.html`: `base`, relative Verweise; Favicon-Test gegen React.
2. `vite.config.ts`: `preview.proxy` wie `server.proxy`, `build.manifest: true`;
   `playwright.config.ts`: React-Server `vite build && vite preview --port … --strictPort`, ohne
   `grep`.
3. Tags aus `frontend/e2e/` entfernen, `prettier --write`; `git diff -w` gegen den Stand vor Spec
   0056 zeigt je Datei nur die Selektoren der Specs 0056 bis 0061 und die Wartezeile aus 0061.
4. `bundle-budget.ts` mit Test; Skript `typecheck`.
5. Texte: README, Architektur, Roadmap, Regeldateien.
6. `make check`; `make e2e` dreimal. Ist ein Lauf rot, hält `/implement` an und meldet den Test
   mit der Ausgabe; kein Test wird wiederholt, bis er grün ist.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `frontend/e2e/theme.spec.ts`: „the page links the favicon in three formats and serves them“, beide Läufe |
| A2 | Aufruf wie im Kriterium; beide Läufe von `make e2e` |
| A3 | React-Lauf von `make e2e` |
| A4 | drei Läufe von `make e2e` |
| A5 | `frontend-react/scripts/bundle-budget.spec.ts`; `make typecheck-frontend-react` |
| A6 | Aufruf wie im Kriterium |
| A7 | Aufruf wie im Kriterium |

Testdaten: keine neuen.

## Offene Fragen

keine

## Verifikationsplan

- make check
- betroffene Tests: `pnpm -C frontend-react test`; `make e2e` dreimal
- Browser: keiner. Kein Kriterium nennt einen Bildschirm, der nicht durch einen End-to-End-Test
  belegt ist.
