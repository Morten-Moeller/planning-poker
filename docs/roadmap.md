# Roadmap: Planning Poker

Stand: 2026-11-16

Verbindliche Grundlage ist `docs/umsetzungsplan.md`: die Anforderungen (R-IDs), die Annahmen
(A-IDs) und der Vertrag in Abschnitt 4. Jede Spec nennt die R- und A-IDs, die sie abdeckt, und
übernimmt die Akzeptanzkriterien ihres Meilensteins als Testfälle. Eine Abweichung wird zuerst im
Umsetzungsplan geändert.

## Ziel

Ein Scrum-Team schätzt GitLab-Issues synchron in einer gemeinsamen Sitzung: der Scrum Master
wählt ein Issue und gibt es frei, die Entwickler wählen verdeckt eine Karte, der Scrum Master
löst auf, lässt erneut schätzen oder übernimmt den vereinbarten Wert als Kommentar an das
GitLab-Issue. Gebaut wird Variante A: Angular-Frontend und Quarkus-Backend in einem Monorepo,
abgabefertig aus einem frischen Klon nach höchstens fünf dokumentierten Befehlen.

## Nutzer

| Nutzer | Was sie damit tun |
|---|---|
| Scrum Master | legt die Sitzung an, teilt Link oder Session-ID, wählt Issues, gibt sie frei, löst Runden auf, lässt erneut schätzen, bestätigt den Endwert |
| Entwickler | tritt mit Namen bei, sieht das freigegebene Issue, wählt verdeckt eine Karte, sieht nach der Auflösung alle Karten und die Auswertung |
| Prüfer der Coding Challenge | startet beide Projekte nach dem README, liest Variantenwahl, GitLab-Entscheidung und Schnittstellendefinition |

## Nicht-Ziele

- Login, Benutzerverwaltung, Rechte außerhalb der Rollen Scrum Master und Entwickler
- Persistenz über einen Backend-Neustart hinaus
- Übergabe der Scrum-Master-Rolle, mehrere Moderatoren
- Mehrere GitLab-Projekte in einer Sitzung
- Variante B (direkte GitLab-Anbindung ohne Backend)
- Container-Setup; ein lokaler Start reicht

## Qualitätsziele

- Echtzeit: Eine Zustandsänderung erreicht jeden verbundenen Teilnehmer innerhalb einer Sekunde (M6).
- Vertraulichkeit: Verdeckte Kartenwerte verlassen den Server vor der Auflösung nie, außer an den Teilnehmer selbst. Der GitLab-Token liegt nur im Backend und erscheint in keiner Antwort und keinem Log. Teilnehmer-Tokens haben mindestens 128 Bit Zufall.
- Rollen und Zustandsprüfungen liegen im Backend; das Frontend rendert Steuerelemente für Entwickler nicht.
- Sprache: Oberfläche auf Deutsch (`@angular/localize`, Quellsprache `de`); Code, API, Fehlertexte der API und Commits auf Englisch (A-15).
- Barrierefreiheit: Tastaturbedienung, Beschriftungen und Kontrast; die Lint-Regeln von angular-eslint für Template-Barrierefreiheit laufen ab M0, die manuelle Prüfung in M13.
- Datenhaltung: Sitzungen nur im Arbeitsspeicher, Verfall nach 12 Stunden ohne Aktivität (A-09).
- Abgabe: Ein frischer Klon läuft nach höchstens fünf dokumentierten Befehlen; `make check` und `make e2e` sind in der CI grün.
- Parallelität: Zwei Testläufe in zwei Worktrees laufen gleichzeitig grün (T3.6).

## Grundentscheidungen

| Thema | Entscheidung | ADR |
|---|---|---|
| Stack | Variante A: Angular-Frontend und Quarkus-Backend nach Abschnitt 4.1 des Umsetzungsplans | `docs/adr/0001-angular-und-quarkus-variante-a.md` |
| Persistenz | Sitzungen nur im Arbeitsspeicher (A-09); keine Datenbank, keine Migrationen; die Sperre je Sitzung tritt an die Stelle atomarer Datenbank-Anweisungen (ersetzt A4.1, A4.3, A4.4, T1.2) | `docs/adr/0002-sitzungen-im-arbeitsspeicher.md` |
| Identität | Kein Login; Token je Teilnehmer und Sitzung (A-08); Session-ID mit 8 Zeichen zum Abtippen (A-17); Teilnehmer-IDs als UUIDv7 (ersetzt A4.2 nur für die Session-ID) | `docs/adr/0003-identitaet-ohne-login.md` |
| Echtzeit und Frontend-Zustand | REST für Befehle, WebSocket mit vollständigem, je Teilnehmer gefiltertem Snapshot; ein Signals-Store übernimmt jeden Snapshot; Einzelabfragen wie die Issue-Suche bleiben lokal in der Komponente (ersetzt A7.1) | `docs/adr/0004-rest-befehle-websocket-snapshot.md` |

Vertrag (A2.1) und Fehlerformat (A2.3) folgen den Grundregeln und brauchen keine ADR.

## Specs

Eine Spec je Meilenstein aus Abschnitt 5 des Umsetzungsplans; M5 ist in Issue-Auswahl und
Runden-Befehle zerlegt, M13 in Härtung (0015) und Abgabe (0019), M14 in drei Specs. Die Wellen folgen dem Vorschlag in Abschnitt 7 mit
`parallel_max: 3`. Spalte „Bereiche“: die Verzeichnisse, die die Spec ändert; Specs einer Welle
ändern getrennte Bereiche. Die Risikostufe ist der erwartete Wert; der Eskalator `token` der
Risikomatrix hebt eine Stufe an, sobald eine hinzugefügte Zeile das Wort enthält.

| Spec | Titel | Welle | Hängt ab von | Bereiche | Risiko |
|---|---|---|---|---|---|
| 0001 | Projektgerüst (M0) | 1 | – | ganzes Repository: `backend/`, `frontend/`, `Makefile`, `.github/actions/setup/`, `project-rules/`, `docs/`, `README.md` | high |
| 0002 | Schnittstellenvertrag (M1) | 2 | 0001 | `backend/src/main/java/planningpoker/session/` (DTOs, Ressourcen mit 501), `backend/src/main/java/planningpoker/platform/` (Fehlerformat), `backend/src/main/resources/META-INF/openapi.yaml`, `contracts/api/`, `frontend/src/app/api/` (generierte Typen), `Makefile` (`contracts`), `README.md` | high |
| 0003 | GitLab-Client (M4) | 2 | 0001 | `backend/src/main/java/planningpoker/gitlab/`, `backend/src/test/java/planningpoker/gitlab/` | high |
| 0004 | Domänenkern (M2) | 3 | 0002 | `backend/src/main/java/planningpoker/session/` (Domäne, `SessionRegistry`), `backend/src/test/java/planningpoker/session/` | high |
| 0005 | Frontend-Grundgerüst (M8) | 3 | 0002 | `frontend/src/app/` (Routen, `ApiService`, `RealtimeService`, `SessionStore`, Guard, Mock-Backend, Layout) | high |
| 0006 | Sitzungs-API und Rollen (M3) | 4 | 0004 | `backend/src/main/java/planningpoker/session/` (Erstellen, Beitreten, Lesen, Mapper), `backend/src/main/java/planningpoker/platform/` (Token-Prüfung, Rollenprüfung) | high |
| 0007 | Issue-Auswahl (M5, Teil 1) | 5 | 0003, 0006 | `backend/src/main/java/planningpoker/session/` (Issue-Liste, `active-issue`, Issue-Prüfung beim Anlegen) | medium |
| 0008 | Runden-Befehle (M5, Teil 2) | 6 | 0007 | `backend/src/main/java/planningpoker/session/` (`vote`, `reveal`, `restart`, Protokoll, `allVoted`) | medium |
| 0009 | Echtzeit (M6) | 7 | 0008 | `backend/src/main/java/planningpoker/realtime/`, `backend/src/test/java/planningpoker/realtime/` | high |
| 0010 | Ergebnisübernahme (M7) | 7 | 0008 | `backend/src/main/java/planningpoker/session/` (`confirm`, Kommentarvorlage) | medium |
| 0011 | Erstellen und Beitreten (M9) | 7 | 0005, 0007 | `frontend/src/app/start/`, `frontend/src/app/join/`, `frontend/e2e/` (GitLab-Double) | high |
| 0012 | Sitzungsraum und Issue-Auswahl (M10) | 8 | 0009, 0011 | `frontend/src/app/session/` (Teilnehmerliste, Bedienfeld, Issue-Anzeige), `frontend/e2e/` | medium |
| 0013 | Schätzrunde (M11) | 9 | 0012 | `frontend/src/app/session/` (Kartenfächer, Fortschritt, Hinweis), `frontend/e2e/` | medium |
| 0014 | Auflösung und Abschluss (M12) | 10 | 0010, 0013 | `frontend/src/app/session/` (aufgedeckte Ansicht, Auswertung, Aktionen, Protokoll), `frontend/e2e/` | medium |
| 0015 | Härtung (M13, Teil 1) | 11 | 0014 | `backend/src/main/java/planningpoker/session/` und `platform/` (Obergrenzen, Allowlist, `ErrorCode`), `contracts/api/`, `frontend/src/app/api/` (generierte Typen, Fehlertexte), `frontend/src/app/start/`, `frontend/src/app/join/`, `README.md`, `project-rules/`, `docs/adr/` (ADR 0005) | high |
| 0016 | Countdown-Timer (M14, O-01) | 12 | 0015 | `contracts/api/`, `backend/src/main/java/planningpoker/session/`, `frontend/src/app/api/`, `frontend/src/app/session/` (Timer-Auswahl, Restzeit, Sitzungsseite), `docs/umsetzungsplan.md`, `docs/domain/`, `docs/adr/` (ADR 0006) | high |
| 0017 | Ausreißer (M14, O-02) | 12 | 0015 | `frontend/src/app/session/` (aufgedeckte Ansicht `round-result`, `outliers.ts`), `frontend/e2e/` | medium |
| 0018 | Konsens (M14, O-03) | 13 | 0017 | `frontend/src/app/session/` (aufgedeckte Ansicht, Animation), `docs/domain/glossary.md` (Ausreißer, Konsens) | medium |
| 0019 | Abgabe (M13, Teil 2) | 14 | 0015, 0016, 0017, 0018 | `frontend/e2e/` (Gesamtablauf mit drei Kontexten), `frontend/src/app/` (Fehler- und Leerzustände, Layout, Hinweise aus den Reviews von 0011 bis 0014), `README.md` (final), `docs/` (Checkliste, Zuordnung R-01 bis R-26) | medium |

Hinweise zu den Wellen:

- Welle 2: 0002 ändert DTOs, Ressourcen und `contracts/`, 0003 nur das Paket `gitlab`; die Abhängigkeiten und die Konfiguration stehen seit 0001 fest.
- Welle 5 und 6: beide Teile von M5 ändern dieselbe Ressource und laufen nacheinander.
- Welle 7: `realtime` hört nur auf das Änderungs-Event, 0010 ändert `session` und nutzt `gitlab`, 0011 ist reines Frontend.
- Welle 11 und 14: M13 ist geteilt (Entscheidung der Person, 2026-11-16). 0015 härtet Backend und Vertrag vor den optionalen Features; 0019 schreibt README und Checkliste zuletzt, damit sie den Stand nach 0016 bis 0018 beschreiben.
- Welle 12 und 13: 0016 ändert den Vertrag, 0017 und 0018 dieselbe Ansicht, deshalb nacheinander. 0016 setzt den Timer als Einstellung der Sitzung um (ADR 0006); Freigabe und aufgedeckte Ansicht bleiben unverändert, deshalb läuft 0017 parallel. Das Glossar ändert in Welle 12 nur 0016; „Ausreißer“ kommt mit 0018 ins Glossar. `wave-check.sh` meldet für 0016 und 0017 keine Überschneidung.
- Die Specs ab Welle 2 werden mit `/roadmap next` aus dem dann vorhandenen Code geschrieben.

## Offene Fragen

- [x] Wer setzt die Schlüssel in `harness/config.yml` (`e2e_in_ci: true`, `worktree_setup`, `contracts_generate_target`), die der Umsetzungsplan M0 und M1 zuordnet? → `e2e_in_ci` und `worktree_setup` die Person selbst auf `main`; `contracts_generate_target` der Implementer von 0002 in derselben Änderung wie das Makefile-Ziel, geprüft von der Person im PR. (Morten Möller, 2026-11-16)
- [x] Neuer Konfigurationsschlüssel `planningpoker.gitlab.timeout` (Standard `10s`) für Spec 0003, Ergänzung zu Abschnitt 4.7? → Ja; die Person trägt ihn im Umsetzungsplan nach, 0007 ergänzt die README-Tabelle. (Morten Möller, 2026-11-16) Nachtrag: 0019 trägt ihn in 4.7 ein. (Morten Möller, 2026-11-17)
- [x] Java-Basispaket des Backends? → `planningpoker` mit den Unterpaketen `session`, `gitlab`, `realtime` und `platform`. (Morten Möller, 2026-11-16)
- [x] Gibt es einen Abgabetermin, der die Reihenfolge der Wellen ändert? → Nein; M14 bleibt der letzte Meilenstein. (Morten Möller, 2026-11-16)
- [x] Testprojekt für die manuelle Prüfung in M13? → Ein eigenes Projekt auf gitlab.com mit Personal Access Token (Scope `api`) liegt vor. (Morten Möller, 2026-11-16)
- [x] Welcher GitLab-Tarif liegt vor: ist `weight` nutzbar (A-07)? → Premium oder Ultimate; `write-weight` wird in 0010 umgesetzt und in der Checkliste von 0015 gegen das echte Projekt geprüft. Der Standardwert bleibt `false` (A-07). (Morten Möller, 2026-11-16)

---

# Roadmap Teil 2: React-Frontend mit UI SDK

Stand: 2026-11-25 (Welle 5 gemergt, Welle 6 geschrieben)

Teil 1 oben ist abgeschlossen (Specs 0001 bis 0019) und bleibt unverändert.

## Ziel

Die Anwendung bekommt ein zweites Frontend in `frontend-react/`: React 19 mit den Komponenten des
UI SDK (<https://ui-sdk.dev>), gegen dasselbe Backend und denselben Vertrag. Am Ende hat es alle
Seiten, Rollen und Zustände des Angular-Frontends im Design „Werkbank“, und die Playwright-Suite in
`frontend/e2e/` läuft ohne Einschränkung gegen beide Frontends. Das Angular-Frontend bleibt
bestehen (ADR 0001, R-26).

## Nutzer

| Nutzer | Was sie damit tun |
|---|---|
| Scrum Master, Entwickler, Zuschauer | dasselbe wie im Angular-Frontend, unter einer zweiten Adresse (`make frontend-react`) |
| Die Person, die das Projekt führt | vergleicht Angular mit Angular Material und React mit UI SDK an derselben Anwendung |

## Nicht-Ziele

- Ablösung oder Änderung des Angular-Frontends; Änderungen dort nur an Selektoren der
  End-to-End-Tests, die sonst nur für Angular gelten
- Änderungen am Backend oder am Vertrag in `contracts/`
- Ein neues Design; Abweichungen von `docs/design/` nur dort, wo das Angular-Frontend sie auch hat
- Tailwind CSS, ein Zustands-Paket, ein i18n-Paket, Server-Rendering
- Ein Mock-Backend wie `pnpm -C frontend start:mock`; Browser-Prüfungen des React-Frontends laufen
  gegen das Backend
- Vue, Svelte, Solid oder Web Components des UI SDK

## Qualitätsziele

- Gleichheit: Jeder Test der Playwright-Suite, der gegen Angular läuft, läuft am Ende auch gegen
  React. Bis dahin trägt jeder freigeschaltete Test das Tag `@react`.
- Gleiche `data-testid`, gleiche deutsche Texte, gleiche Token-Namen (`--mat-sys-*`, `--app-*`)
  und gleiche Schlüssel in `localStorage` und `sessionStorage` wie im Angular-Frontend.
- Barrierefreiheit: Tastatur, Beschriftungen, Fokusring der Werkbank; `eslint-plugin-jsx-a11y` in
  `make lint`.
- Sprache: Oberfläche auf Deutsch aus einem typisierten Katalog; ein Test meldet unbenutzte
  Schlüssel, der Compiler fehlende.
- Die Gates `test`, `typecheck`, `lint`, `deps` und `e2e` schließen `frontend-react/` ein.
- Bedienelemente kommen aus dem UI SDK, wo es eine passende Komponente hat; Tabelle, Karte und
  Chip sind eigenes HTML und CSS.

## Grundentscheidungen

| Thema | Entscheidung | ADR |
|---|---|---|
| Stack des zweiten Frontends | React 19, Vite 8, TypeScript 6.0, React Router 8, UI SDK (Beta, exakte Version), CSS Modules mit den Werkbank-Tokens, vitest und React Testing Library, ESLint 10 mit `jsx-a11y`; eigenes pnpm-Projekt `frontend-react/` (weicht für die Oberfläche von A1.7 ab) | `docs/adr/0016-zweites-frontend-mit-react-und-ui-sdk.md` |
| Echtzeit und Zustand | unverändert ADR 0004: Befehle per REST, Snapshot per WebSocket in einen Store (`useSyncExternalStore`) | `docs/adr/0004-rest-befehle-websocket-snapshot.md` |
| Identität und Ablage | unverändert ADR 0003, 0013 und 0014 | – |

## Specs

| Spec | Titel | Welle | Hängt ab von | Bereiche | Risiko |
|---|---|---|---|---|---|
| 0053 | React-Frontend: Gerüst mit Gates, Theme, Shell und Health | 1 | – | `frontend-react/` (neu), `Makefile`, `frontend/playwright.config.ts`, `frontend/e2e/health.spec.ts`, `.github/actions/setup/`, `.github/dependabot.yml`, `project-rules/`, `docs/`, `README.md`, `.env.example` | high |
| 0054 | API-Schicht, Zustand und Fehlerbanner: `Api`, `TokenStore`, `RecentSessions`, `PreferencesStore`, `Realtime`, `SessionStore`, `ErrorBanner`, Route `/session/:id` mit `session-loading` und `session-gone` | 2 | 0053 | `frontend-react/src/api/`, `frontend-react/src/session/` (Seite mit zwei Zuständen), `frontend-react/src/shell/`, `frontend-react/src/app.tsx`, `frontend-react/src/main.tsx`, `frontend-react/src/i18n/`, `frontend/e2e/session-access.spec.ts`, `project-rules/frontend-react.md`, `project-rules/testing.md` | high |
| 0055 | Gemeinsame Bausteine: Button, Textfeld, Kartenhand, Motive, Musterseite `ui.html` | 2 | 0053 | `frontend-react/src/ui/`, `frontend-react/src/styles/motifs.css`, `frontend-react/ui.html`, `project-rules/frontend-react-ui.md` | medium |
| 0063 | Vorbereitung der Welle 4: Textkatalog je Feature, Zahlform, `ErrorNote`, Regeln je Bereich | 3 | 0054, 0055 | `frontend-react/src/i18n/`, Kataloge in `shell/`, `start/`, `session/`, `frontend-react/src/ui/` (`ErrorNote`), `project-rules/` | medium |
| 0056 | Startseite: Sitzung anlegen, Projekt- und Issue-Auswahl (Autocomplete), Einstellungen merken, letzte Sitzungen | 4 | 0054, 0055, 0063 | `frontend-react/src/start/`, `project-rules/frontend-react-start.md`, `frontend/e2e/` (Tags der Tests, die nur die Startseite brauchen) | high |
| 0057 | Beitrittsseite mit Route `/session/:id/join`: Einladung, Rollenhinweise, Fehlerzustände; Sitzung in der Toolbar; Banner mit `AppButton` | 4 | 0054, 0055, 0063 | `frontend-react/src/join/`, `frontend-react/src/shell/`, `frontend-react/src/app.tsx`, `project-rules/frontend-react-join.md` | high |
| 0058 | Raum, Teil 1: Raster, Seitenleiste (Timer mit Select, Teilnehmer, Teilen, Fakten), Lobby, Kartenmotiv | 4 | 0054, 0055, 0063 | `frontend-react/src/session/`, `project-rules/frontend-react-session.md` | high |
| 0059 | Raum, Teil 2: Issue-Auswahl mit Filtern (Segmented Control, Select), aktives Issue mit Markdown, Wechsel-Dialog; Motiv in der Toolbar; Tags für die Abläufe über Start, Beitritt und Raum | 5 | 0056, 0057, 0058 | `frontend-react/src/session/`, `frontend-react/src/shell/`, `frontend-react/src/api/card-motif.ts`, `frontend-react/package.json` (`marked`, `dompurify`), `frontend/src/app/session/session-page.html` (`data-testid`), `frontend/e2e/` (Tags) | high |
| 0060 | Raum, Teil 3: Diskussion und Schätzrunde: Karte, Kartensatz, Tisch, Rundenstatus mit Fortschrittsbalken, Timer, Footer | 6 | 0059 | `frontend-react/src/session/`, `frontend/e2e/` (Tags) | medium |
| 0061 | Raum, Teil 4: Auflösung und Abschluss: Ergebnis, Ausreißer, Konsens, Konfetti, Bestätigen (Dialog, Toast), letztes Ergebnis, Protokoll (Collapsible), erneut schätzen, Zuschauer | 7 | 0060 | `frontend-react/src/session/`, `frontend-react/src/shell/` (Toast-Region), `frontend/e2e/` (Tags) | medium |
| 0062 | Parität: ganze Suite ohne Tag gegen React, Bundle-Grenze, README und Architektur final | 8 | 0056, 0057, 0061 | `frontend/e2e/`, `frontend/playwright.config.ts`, `frontend-react/vite.config.ts`, `README.md`, `docs/` | medium |

Hinweise zu den Wellen:

- Welle 1 ist das Gerüst allein. 0053 trägt ADR 0016.
- Welle 2: 0054 ändert `api/`, `shell/`, die Routen und den Textkatalog, 0055 nur `ui/`,
  `styles/motifs.css` und die Musterseite; beide ändern `frontend-react/package.json` nicht.
  `wave-check.sh` meldet keine Überschneidung. 0055 schreibt seine Regeln in
  `project-rules/frontend-react-ui.md`, damit beide Specs keine gemeinsame Datei ändern. Das
  Banner aus 0054 hat eigenes Button-CSS; 0057 stellt es auf `AppButton` um.
- Ein Bedienelement mit nur einem Feature als Nutzer (Select, Autocomplete, Segmented Control,
  Dialog, Toast, Collapsible, Fortschrittsbalken) entsteht in diesem Feature, nicht in `ui/`
  (A1.3).
- Die Schlüsselwort-Regel der Risikomatrix (`token`) hebt 0054 auf high. Dasselbe ist für 0056
  und 0057 zu erwarten, sobald ihr Code den `TokenStore` aufruft.
- Welle 3 (eingefügt am 2026-11-24): 0063 trennt den Textkatalog, die Regeldateien und die
  Bereichstabelle der Tests je Feature. Ohne diese Spec würden 0056, 0057 und 0058 dieselben
  Dateien ändern und könnten nur nacheinander laufen.
- Welle 4: drei Feature-Ordner. In `frontend/e2e/` ändert nur 0056 Dateien: es versieht die Tests
  mit `@react`, die nur die Startseite brauchen. Die Abläufe über Start, Beitritt und Raum
  (`create-and-join.spec.ts`, `theme.spec.ts`, `session-room.spec.ts`) bekommen ihre Tags von
  0059, wenn alle drei Seiten auf `main` sind; 0057 und 0058 belegen ihre Kriterien mit
  Unit-Tests und dem Gang durch den Browser mit Sitzungen aus der REST-API. Die Shell (Toolbar
  mit Sitzung, Klasse `room` am Hauptbereich) ändert nur 0057.
- Aus Welle 4 nach 0059 verschoben: Farbe und Muster der Runde im Feld `toolbar-motif` (0057
  zeigt den Platzhalter; die Berechnung des Motivs entsteht in 0058 in `session/` und zieht mit
  0059 nach `api/`) und die Tags `@react` für alle Abläufe über Start, Beitritt und Raum. Der
  Test der Favicon-Verweise (`theme.spec.ts`) braucht relative Verweise in
  `frontend-react/index.html`; das gehört zu 0062.
- Welle 5 bis 7 ändern denselben Ordner `session/` und laufen nacheinander. 0059 fügt `marked`
  und DOMPurify hinzu.
- Welle 5 (geschrieben am 2026-11-25): Das aktive Issue steht ohne den Rahmen des Rundenstatus
  im Hauptbereich; 0060 setzt es in den Rundenstatus. Ohne Tag bleiben die Tests, die
  `discussion-hint`, `round-number` oder eine laufende Runde brauchen (0060), eine ganze Runde
  (`design-sidebar.spec.ts`, 0061) und der Test der Favicon-Verweise (0062).
- Welle 6 (geschrieben am 2026-11-25): 0060 baut den Tisch schon mit dem aufgedeckten Zustand;
  in `REVEALED` zeigt der Hauptbereich bis 0061 das aktive Issue und den Tisch, ohne Footer. Die
  Zeichnungen für `?` und `☕` sind React-Komponenten, kein Abruf der SVG-Dateien. Der Footer in
  `REVEALED`, das Ergebnis, der Dialog und das Protokoll bleiben bei 0061.
- Selektoren der Suite, die nur im Angular-Frontend existieren (`app-start-page`,
  `app-session-page .room`, `mat-button-toggle-checked`), ersetzt die Spec, die den Test
  freischaltet, in beiden Frontends durch `data-testid` oder ein ARIA-Attribut.
- Die Specs ab Welle 2 werden mit `/roadmap next` aus dem dann vorhandenen Code geschrieben.

## Offene Fragen

- [x] Umfang? → Volle Parität in Wellen, als zweites Projekt neben dem Angular-Frontend. (Morten Möller, 2026-11-24)
- [x] Design? → Werkbank übernehmen. (Morten Möller, 2026-11-24)
- [x] Styling? → CSS Modules und CSS-Variablen, kein Tailwind. (Morten Möller, 2026-11-24)
- [x] End-to-End-Tests? → Die bestehende Playwright-Suite wiederverwenden. (Morten Möller, 2026-11-24)
- [x] Wann setzt die Person `"react 19"` in `stack` und `frontend-react/src` in `source_paths` von `harness/config.yml`: vor oder nach dem Merge von 0053? → Nach dem Merge von 0053, in einem eigenen Pull Request auf `main`. (Morten Möller, 2026-11-24)
