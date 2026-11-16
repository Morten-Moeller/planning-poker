# Roadmap: Planning Poker

Stand: 2026-11-16

Verbindliche Grundlage ist `docs/umsetzungsplan.md`: die Anforderungen (R-IDs), die Annahmen
(A-IDs) und der Vertrag in Abschnitt 4. Jede Spec nennt die R- und A-IDs, die sie abdeckt, und
übernimmt die Akzeptanzkriterien ihres Meilensteins als Testfälle. Eine Abweichung wird zuerst im
Umsetzungsplan geändert.

## Ziel

Ein Scrum-Team schätzt GitLab-Issues synchron in einer gemeinsamen Sitzung: der Scrum Master
wählt ein Issue und gibt es frei, die Entwickler wählen verdeckt eine Karte, der Scrum Master
löst auf, startet eine neue Runde oder übernimmt den vereinbarten Wert als Kommentar an das
GitLab-Issue. Gebaut wird Variante A: Angular-Frontend und Quarkus-Backend in einem Monorepo,
abgabefertig aus einem frischen Klon nach höchstens fünf dokumentierten Befehlen.

## Nutzer

| Nutzer | Was sie damit tun |
|---|---|
| Scrum Master | legt die Sitzung an, teilt Link oder Session-ID, wählt Issues, gibt sie frei, löst Runden auf, startet neue Runden, bestätigt den Endwert |
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
Runden-Befehle zerlegt, M14 in drei Specs. Die Wellen folgen dem Vorschlag in Abschnitt 7 mit
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
| 0015 | Härtung und Abgabe (M13) | 11 | 0014 | `frontend/e2e/` (Gesamtablauf mit drei Kontexten), `frontend/src/app/` (Fehler- und Leerzustände, Layout), `README.md`, `docs/` (Checkliste) | medium |
| 0016 | Countdown-Timer (M14, O-01) | 12 | 0015 | `contracts/api/`, `backend/src/main/java/planningpoker/session/`, `frontend/src/app/session/` (Rundenansicht) | high |
| 0017 | Ausreißer (M14, O-02) | 12 | 0015 | `frontend/src/app/session/` (aufgedeckte Ansicht) | medium |
| 0018 | Konsens (M14, O-03) | 13 | 0017 | `frontend/src/app/session/` (aufgedeckte Ansicht, Animation) | medium |

Hinweise zu den Wellen:

- Welle 2: 0002 ändert DTOs, Ressourcen und `contracts/`, 0003 nur das Paket `gitlab`; die Abhängigkeiten und die Konfiguration stehen seit 0001 fest.
- Welle 5 und 6: beide Teile von M5 ändern dieselbe Ressource und laufen nacheinander.
- Welle 7: `realtime` hört nur auf das Änderungs-Event, 0010 ändert `session` und nutzt `gitlab`, 0011 ist reines Frontend.
- Welle 12 und 13: 0016 ändert den Vertrag, 0017 und 0018 dieselbe Ansicht, deshalb nacheinander. `wave-check.sh` prüft die Dateilisten, sobald die Specs geschrieben sind.
- Die Specs ab Welle 2 werden mit `/roadmap next` aus dem dann vorhandenen Code geschrieben.

## Offene Fragen

- [x] Wer setzt die Schlüssel in `harness/config.yml` (`e2e_in_ci: true`, `worktree_setup`, `contracts_generate_target`), die der Umsetzungsplan M0 und M1 zuordnet? → Die Person selbst, auf `main`; die Specs nennen die Werte unter ihren offenen Fragen. (Morten Möller, 2026-11-16)
- [x] Java-Basispaket des Backends? → `planningpoker` mit den Unterpaketen `session`, `gitlab`, `realtime` und `platform`. (Morten Möller, 2026-11-16)
- [x] Gibt es einen Abgabetermin, der die Reihenfolge der Wellen ändert? → Nein; M14 bleibt der letzte Meilenstein. (Morten Möller, 2026-11-16)
- [x] Testprojekt für die manuelle Prüfung in M13? → Ein eigenes Projekt auf gitlab.com mit Personal Access Token (Scope `api`) liegt vor. (Morten Möller, 2026-11-16)
- [x] Welcher GitLab-Tarif liegt vor: ist `weight` nutzbar (A-07)? → Premium oder Ultimate; `write-weight` wird in 0010 umgesetzt und in der Checkliste von 0015 gegen das echte Projekt geprüft. Der Standardwert bleibt `false` (A-07). (Morten Möller, 2026-11-16)
