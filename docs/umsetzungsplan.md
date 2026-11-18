# Planning Poker – Umsetzungs-Roadmap

Nov 16, 2026 · @Morten

## 1. Ziel und Scope

Gebaut wird Variante A: ein Angular-Frontend und ein Quarkus-Backend, mit denen ein Scrum-Team GitLab-Issues synchron schätzt und das vereinbarte Ergebnis am Issue hinterlegt. Grundlage sind das [Frontend-README](https://github.com/buchner-org/coding-challenge/blob/main/planning-poker/frontend/README.md) und das [Backend-README](https://github.com/buchner-org/coding-challenge/blob/main/planning-poker/backend/README.md) der Coding Challenge, zuletzt abgeglichen am 16.11.2026.

Variante A statt B: Der Server erzwingt verdeckte Karten und Rollen, wie es das Backend-README verlangt („stellt sicher, dass Steuerungsaktionen ausschließlich dem Scrum Master vorbehalten sind“). Der GitLab-Token bleibt im Backend, und die Echtzeit-Synchronisation braucht keinen Drittdienst. In Variante B bräuchte jeder Browser einen Token mit Schreibrecht, und die Synchronisation liefe über einen externen Dienst oder über Abfragen der GitLab-API. Diese Begründung kommt ins README (R-24).

**Im Scope**

- Sitzung erstellen und beitreten, Rollen Scrum Master und Entwickler
- Issue-Auswahl und Freigabe, Schätzrunde, Auflösung, erneut schätzen, Ergebnisübernahme nach GitLab
- Echtzeit-Synchronisation aller Teilnehmer
- Sitzungsprotokoll der aufgelösten Runden
- README mit Setup, Variantenwahl, GitLab-Entscheidung und Schnittstellendefinition
- Optionale Features als letzter Meilenstein

**Nicht im Scope**

- Login, Benutzerverwaltung, Rechte außerhalb der beiden Rollen
- Persistenz über einen Backend-Neustart hinaus
- Übergabe der Scrum-Master-Rolle, mehrere Moderatoren
- Mehrere GitLab-Projekte in einer Sitzung
- Variante B (direkte GitLab-Anbindung ohne Backend)

## 2. Anforderungen aus den READMEs

Die IDs sind stabil und dienen der Nachverfolgung in Specs und Tests. FE = Frontend-README, BE = Backend-README.

| ID | Anforderung | Quelle |
| --- | --- | --- |
| R-01 | Der Scrum Master legt eine Sitzung an und gibt GitLab-Projekt-ID und das zu schätzende Issue an. Der Ersteller erhält automatisch die Scrum-Master-Rolle. Das Issue ist beim Anlegen optional (A-18). | FE, BE |
| R-02 | Teilnehmer treten über einen generierten Link oder eine Session-ID bei. Erfüllt über den Einladungslink (A-19). | FE |
| R-03 | Beim Beitreten gibt jeder einen Namen ein, der während der Sitzung sichtbar bleibt. | FE, BE |
| R-04 | Es gibt zwei Rollen: Scrum Master und Entwickler. Die Scrum-Master-Rolle ist für alle sichtbar gekennzeichnet. | FE |
| R-05 | Steuerungsaktionen sind dem Scrum Master vorbehalten; das Backend erzwingt das. Entwickler können ausschließlich schätzen. | FE, BE |
| R-06 | Nur der Scrum Master wählt das nächste Issue und gibt es explizit für die Schätzrunde frei. | FE, BE |
| R-07 | Erst nach der Freigabe sehen Teilnehmer das aktive Issue und können schätzen. | FE, BE |
| R-08 | Der Scrum Master kann das aktive Issue wechseln, solange die Runde nicht abgeschlossen ist. | FE, BE |
| R-09 | Issues eines Projekts werden über die GitLab-API abgerufen. Authentifizierung über einen konfigurierbaren Personal Access Token. | BE |
| R-10 | Alle Teilnehmer sehen Titel und Beschreibung des freigegebenen Issues. | FE |
| R-11 | Jeder Teilnehmer wählt verdeckt eine Karte. Kartensatz: 0, 1, 2, 3, 5, 8, 13, 21, 34, ?, ☕. | FE, BE |
| R-12 | Der Fortschritt ist für alle jederzeit sichtbar: namentlich mit Status „Hat geschätzt“ oder „Ausstehend“. Der Wert bleibt bis zur Auflösung verborgen. | FE, BE |
| R-13 | Sobald alle Teilnehmer geschätzt haben, wird der Scrum Master aktiv darauf hingewiesen. | FE, BE |
| R-14 | Nur der Scrum Master löst die Runde auf, jederzeit, auch wenn noch nicht alle abgestimmt haben. | FE, BE |
| R-15 | Nach der Auflösung sehen alle Karte und Name je Teilnehmer. | FE, BE |
| R-16 | Gruppierte Anzeige: pro abgegebenem Schätzwert die Anzahl der Teilnehmer. | FE, BE |
| R-17 | Durchschnitt und häufigster Wert werden als Orientierung angezeigt, sind aber nicht als Ergebnis wählbar. | FE, BE |
| R-18 | Option A: Der Scrum Master lässt dasselbe Issue erneut schätzen (neue Runde, ADR 0012); alle Karten werden zurückgesetzt. | FE, BE |
| R-19 | Abgeschlossene Runden werden im Sitzungsprotokoll festgehalten. Der verwiesene „Abschnitt 7“ fehlt im FE-README (A-05). | FE |
| R-20 | Option B: Der Scrum Master wählt den finalen Wert ausschließlich aus dem Kartensatz und bestätigt die Runde. | FE, BE |
| R-21 | Der gewählte Wert wird am GitLab-Issue hinterlegt. Die Form ist frei und im README zu dokumentieren. | FE, BE |
| R-22 | Alle sehen in Echtzeit: Teilnehmerliste mit Rolle, freigegebenes Issue, Abstimmungsstatus ohne Wert, aufgedeckte Karten mit Gruppenauswertung. | FE, BE |
| R-23 | Abgabe als Git-Repository, bevorzugt auf GitHub oder GitLab. Das README enthält eine Anleitung zu Einrichtung und Start. | FE, BE |
| R-24 | Das README dokumentiert die gewählte Variante und die Begründung. | FE |
| R-25 | Das README dokumentiert die Kommunikationsentscheidungen und die Schnittstellendefinition (Protokoll, Datenformat, Schnittstellen, Echtzeit-Mechanismus) so, dass das Frontend ohne Rückfragen integriert werden kann. | BE |
| R-26 | Technik-Vorgabe: Frontend in Angular, Backend in Java mit Quarkus und Jakarta EE. | FE, BE |
| O-01 | Optional: Countdown-Timer je Runde mit automatischer Auflösung nach Ablauf. | FE |
| O-02 | Optional: Hervorhebung von Ausreißern bei großer Streuung. | FE |
| O-03 | Optional: automatische Konsens-Erkennung mit visueller Bestätigung. | FE |

## 3. Annahmen und offene Fragen

Die READMEs lassen 17 Punkte offen; die folgenden Festlegungen gelten als verbindlich, bis sie hier geändert werden.

| ID | Thema | Festlegung |
| --- | --- | --- |
| A-01 | Variante | Variante A mit eigenem Backend. |
| A-02 | Scrum Master schätzt mit? | Nein. Er moderiert nur; das FE-README nennt den Scrum Master „Moderator“ und die Entwickler „Teilnehmer“. „Alle Teilnehmer“ in R-13 bedeutet: alle verbundenen Entwickler. Ohne verbundene Entwickler gilt die Runde nie als vollständig. |
| A-03 | Issue bei Sitzungserstellung | Das angegebene Issue ist vorausgewählt, aber nicht freigegeben. Die Freigabe bleibt ein eigener Schritt (R-06). |
| A-04 | Issue-Wechsel | Erlaubt in jedem Zustand vor der Bestätigung. Eine laufende, nicht aufgelöste Runde wird verworfen. Eine aufgelöste Runde bleibt ohne Endwert im Protokoll. |
| A-05 | Sitzungsprotokoll | Das Frontend-README verweist auf einen fehlenden „Abschnitt 7“. Festlegung: Jede aufgelöste Runde wird protokolliert (Issue, Rundennummer, Karten je Teilnehmer, Auswertung, Endwert falls bestätigt). Das Protokoll ist für alle sichtbar und lebt nur in der Sitzung. |
| A-06 | Auswertung | Die Gruppenauswertung nennt nur abgegebene Werte, in Kartenreihenfolge. Durchschnitt nur über Zahlenkarten, auf eine Nachkommastelle gerundet; `?` und ☕ zählen nicht. Ohne Zahlenkarte ist der Durchschnitt leer. Bei Gleichstand werden alle häufigsten Werte genannt. |
| A-07 | Ergebnis in GitLab | Ein Kommentar (Note) am Issue mit Endwert, Rundenzahl und Verteilung der letzten Runde. Das funktioniert in jedem GitLab-Tarif. Zusätzlich per Konfiguration: Zahlenwerte als `weight` setzen (nur Premium/Ultimate). Das Gewicht wird vor dem Kommentar gesetzt, weil das Setzen wiederholbar ist; ein erneuter Versuch nach einem Fehler schreibt den Kommentar so nur einmal. Bei `?` und ☕ wird nur kommentiert. |
| A-08 | Identität | Kein Login. Beim Erstellen oder Beitreten vergibt der Server eine Teilnehmer-ID und ein zufälliges Token. Das Frontend hält das Token im `sessionStorage` je Sitzung; so können mehrere Teilnehmer in Tabs eines Browsers sitzen (Vorführung, Prüfung). |
| A-09 | Persistenz | Sitzungen liegen im Arbeitsspeicher und verfallen nach 12 Stunden ohne Aktivität. |
| A-10 | Verbindungsabbruch | Der Teilnehmer bleibt in der Liste und wird als offline markiert. Er blockiert den Hinweis „alle haben geschätzt“ nicht. Eine abgegebene Karte bleibt erhalten. Mit dem Token ist ein Wiedereinstieg möglich; wer den Tab geschlossen hat, tritt unter einem anderen Namen neu bei. |
| A-11 | Nachzügler | Beitreten ist jederzeit möglich. In einer laufenden Runde darf geschätzt werden, nach der Auflösung nur zugesehen. |
| A-12 | Karte ändern | Bis zur Auflösung beliebig oft. |
| A-13 | Namen | 1 bis 30 Zeichen, getrimmt, je Sitzung eindeutig (ohne Beachtung der Groß-/Kleinschreibung). |
| A-14 | GitLab-Konfiguration | Basis-URL und Token sind je Backend-Instanz konfiguriert, nicht je Sitzung. Fehlt der Token, startet das Backend nicht und nennt den fehlenden Schlüssel. |
| A-15 | Sprache | Oberfläche auf Deutsch; Code, API, Fehlertexte der API und Commits auf Englisch. Die Oberfläche zeigt je `errorCode` einen eigenen deutschen Text, nie den Fehlertext der API. |
| A-16 | Nach der Bestätigung | Die Sitzung kehrt in den Zustand ohne aktives Issue zurück. Der Scrum Master wählt das nächste Issue aus demselben Projekt. |
| A-17 | Session-ID | 8 Zeichen aus Großbuchstaben und Ziffern ohne verwechselbare Zeichen (0, O, 1, I, L), weil Teilnehmer sie abtippen (R-02). Teilnehmer-IDs sind UUIDv7. |
| A-18 | Issue beim Anlegen | Das Issue beim Anlegen ist optional; R-01 ist mit angegebenem Issue erfüllt. Ohne Issue prüft das Backend, dass es das Projekt gibt (ADR 0011). |
| A-19 | Beitreten | Beitreten nur über den Einladungslink; R-02 ist über den generierten Link erfüllt. Es gibt einen Link für Entwickler und einen für Zuschauer, die Rolle folgt aus dem Einladungscode im Link. Zuschauer schätzen nicht und steuern nicht (ADR 0014). A-17 gilt für die Session-ID weiter, weil sie in Links, Fakten und Toolbar steht. |

**Offene Fragen**

- [x] Soll der Scrum Master doch mitschätzen können (A-02)? → Nein; das FE-README trennt „Scrum Master (Moderator)“ von „Entwickler (Teilnehmer)“. (Claude nach Abgleich der READMEs, 2026-11-16)
- [ ] Welcher GitLab-Tarif liegt vor: ist `weight` nutzbar (A-07)? Die READMEs sagen nichts dazu; bis zur Klärung bleibt `write-weight` aus.
- [ ] Testprojekt für die manuelle Prüfung in M13: eigenes Projekt auf gitlab.com mit Personal Access Token (Scope `api`)? Die Basis-URL ist konfigurierbar, eine selbst gehostete Instanz geht ebenso.
- [x] Sind Versionen von Angular, Java oder Quarkus vorgegeben? → Nein; die READMEs nennen nur Angular sowie Java mit Quarkus und Jakarta EE. Es gelten die Versionen aus 4.1. (Claude nach Abgleich der READMEs, 2026-11-16)
- [x] Reicht ein lokaler Start, oder wird ein Container-Setup erwartet? → Gefordert ist nur eine Anleitung zu Einrichtung und Start im README; ein lokaler Start reicht. (Claude nach Abgleich der READMEs, 2026-11-16)

## 4. Architektur und Schnittstellen

Der Server ist die einzige Quelle der Wahrheit: Befehle gehen per REST an das Backend, der Zustand kommt per WebSocket als vollständiger, je Teilnehmer gefilterter Snapshot zurück.

- Monorepo mit `backend/` (Quarkus), `frontend/` (Angular, End-to-End-Tests unter `frontend/e2e/`), `contracts/api/` (generierter Vertrag und Beispiele) und `docs/` (dieses Dokument, Specs, ADRs, Domänenbegriffe).
- Das Backend ist nach Fachfunktion gegliedert: `session` (Sitzung, Runden, Befehle), `gitlab` (Client), `realtime` (WebSocket). Token-Prüfung, Fehlerformat und ID-Erzeugung sind Plattform-Code ohne Fachbegriffe.
- Jeder Befehl läuft über `SessionRegistry.update(…)`: Sperre der Sitzung, Ausführung, danach ein Änderungs-Event. `realtime` beobachtet dieses Event und sendet die Snapshots; neue Befehle brauchen keinen Code in `realtime`.
- Nach jeder Zustandsänderung sendet der Server jedem verbundenen Teilnehmer einen neuen Snapshot. Es gibt keine Deltas, das Frontend ersetzt seinen Zustand vollständig.
- Verdeckte Kartenwerte verlassen den Server vor der Auflösung nie, außer an den Teilnehmer selbst.
- Der GitLab-Token liegt nur im Backend.
- Vertrag: Die Java-DTOs und REST-Ressourcen sind die Quelle. `quarkus-smallrye-openapi` schreibt beim Build `contracts/api/openapi.yaml`. Die WebSocket-Nachrichten stehen als Schemas unter `components` in einer statischen Ergänzung (`backend/src/main/resources/META-INF/openapi.yaml`), die smallrye mit den Annotationen zusammenführt. `openapi-typescript` erzeugt daraus die TypeScript-Typen des Frontends. `make contracts` erzeugt beides; das Gate `drift` schlägt fehl, wenn ein generierter Stand nicht committet ist. Handgeschriebene Kopien der Typen gibt es nicht.
- Die Schnittstellendefinition für Menschen steht im README (R-25): Endpunkte, Nachrichten, Fehlerformat und Echtzeit-Ablauf, mit Verweis auf `contracts/api/`.

### 4.1 Tech-Stack

| Bereich | Festlegung |
| --- | --- |
| Backend-Sprache und Build | Java 21, Maven Wrapper, Quarkus 3.x in der aktuellen stabilen Version |
| REST | Jakarta REST mit `quarkus-rest-jackson`, Jakarta Validation, Jakarta CDI |
| Echtzeit | `quarkus-websockets-next`. Falls Jakarta-EE-APIs strikt verlangt sind: `quarkus-websockets` mit Jakarta WebSocket (`@ServerEndpoint`). |
| GitLab-Client | MicroProfile REST Client mit `quarkus-rest-client-jackson` |
| Vertrag | `quarkus-smallrye-openapi` (erzeugt `contracts/api/openapi.yaml`, Swagger UI im Dev-Modus), `openapi-typescript` für die Frontend-Typen |
| Logs | `quarkus-logging-json`, Request-ID je Anfrage; keine Tokens und keine verdeckten Kartenwerte |
| Backend-Tests | JUnit 5, REST Assured, WireMock für GitLab, WebSocket-Client von Quarkus für die Echtzeit-Tests |
| Frontend | Angular in der aktuellen stabilen Version, Standalone Components, Signals, Router, HttpClient, RxJS `webSocket`; Paketmanager pnpm |
| UI | Angular Material; Farben, Abstände und Schrift aus den Systemvariablen des Material-3-Themes, keine festen Werte in Komponenten |
| Texte | `@angular/localize` mit Quellsprache `de`; jeder Text der Oberfläche trägt eine i18n-ID |
| Markdown | `marked`; Ausgabe über `[innerHTML]` mit der eingebauten Bereinigung von Angular, nie `bypassSecurityTrust…` |
| Lint und Format | angular-eslint mit den Regeln für Template-Barrierefreiheit und i18n, Prettier |
| Frontend-Tests | Standard-Unit-Test-Runner des Angular-CLI, Playwright für End-to-End |
| End-to-End-Umgebung | Backend im Profil `e2e` gegen ein GitLab-Double (WireMock Standalone mit festen Mappings), Frontend-Build, Playwright |

### 4.2 Domänenmodell

| Objekt | Felder |
| --- | --- |
| Session | `id` (A-17), `gitlabProjectId`, `project` (Name, Pfad und Link aus GitLab beim Anlegen, oder leer), `writeWeight`, `phase`, `participants`, `preselectedIssueIid`, `activeIssue`, `round`, `history`, `lastActivityAt` |
| Participant | `id` (UUIDv7), `name`, `role` (`SCRUM_MASTER` oder `DEVELOPER`), `token` (nur serverseitig), `connected` |
| Issue | `iid`, `title`, `description` (Markdown), `webUrl` |
| Round | `number` (ab 1 je Issue), `votes` (Teilnehmer-ID zu Karte), `revealed`, `confirming` (Ergebnis wird gerade nach GitLab geschrieben) |
| RoundStats | `distribution` (abgegebene Karten mit Anzahl, in Kartenreihenfolge), `average`, `mostFrequent` (Liste) |
| HistoryEntry | `issueIid`, `issueTitle`, `roundNumber`, `votes`, `stats`, `finalCard` (leer, solange nicht bestätigt), `revealedAt` (RFC 3339 mit Offset) |
| Card | Wire-Format als String: `"0"`, `"1"`, `"2"`, `"3"`, `"5"`, `"8"`, `"13"`, `"21"`, `"34"`, `"?"`, `"COFFEE"`. Die Oberfläche zeigt `COFFEE` als ☕. |

### 4.3 Zustandsautomat der Sitzung

Die Sitzung kennt vier Phasen: `LOBBY` (kein freigegebenes Issue), `DISCUSSION` (Issue sichtbar, Karten gesperrt), `VOTING` und `REVEALED` (ADR 0010). Jede nicht aufgeführte Kombination wird mit `409 INVALID_STATE` abgelehnt, in `DISCUSSION` also Karte wählen, Auflösen und Ergebnis bestätigen.

| Phase | Aktion | Wer | Folgephase | Wirkung |
| --- | --- | --- | --- | --- |
| LOBBY | Issue freigeben | Scrum Master | DISCUSSION | Issue wird aus GitLab geladen und aktiv, Runde 1 ohne Frist |
| DISCUSSION | Schätzung starten | Scrum Master | VOTING | Karten werden geöffnet; mit Timer gilt die Frist Start plus Timer (ADR 0010) |
| DISCUSSION | Issue wechseln | Scrum Master | DISCUSSION | Runde 1 für das neue Issue, ohne Frist |
| VOTING | Karte wählen oder ändern | Entwickler | VOTING | `hasVoted` wird wahr; hat der letzte verbundene Entwickler gewählt, geht der Hinweis an den Scrum Master |
| VOTING | Auflösen | Scrum Master | REVEALED | Auswertung wird berechnet, Protokolleintrag entsteht |
| VOTING | Frist erreicht | Server | REVEALED | Wie Auflösen, auch ohne Stimmen und ohne verbundenen Scrum Master; Prüfung alle 250 ms (ADR 0010) |
| VOTING | Issue wechseln | Scrum Master | DISCUSSION | Laufende Runde wird verworfen, Runde 1 für das neue Issue, ohne Frist |
| REVEALED | Erneut schätzen | Scrum Master | VOTING | Rundennummer plus 1, alle Karten gelöscht, Karten sofort offen; mit Timer gilt die Frist Start plus Timer (ADR 0012) |
| REVEALED | Ergebnis bestätigen | Scrum Master | LOBBY | `confirming` wird gesetzt, dann Schreiben nach GitLab; bei Erfolg `finalCard` im Protokoll und Phase LOBBY. Bei GitLab-Fehler wird `confirming` zurückgesetzt, die Phase bleibt REVEALED, Antwort 502. |
| REVEALED | Issue wechseln | Scrum Master | DISCUSSION | Runde bleibt ohne Endwert im Protokoll |
| jede | Beitreten, Verbinden, Trennen | alle | unverändert | Teilnehmerliste und `connected` werden aktualisiert |
| jede | Timer setzen | Scrum Master | unverändert | `timerSeconds` gilt ab dem nächsten „Schätzung starten“; erst dieser Start setzt die Frist Start plus Timer, eine laufende Schätzung behält ihre Frist |

Solange `confirming` gesetzt ist, lehnt der Server jede Steuerungsaktion mit `409 INVALID_STATE` ab. GitLab-Aufrufe laufen nie unter der Sperre der Sitzung: Beim Freigeben und Wechseln wird das Issue vorher geladen und der Zustand danach unter der Sperre erneut geprüft; die Bestätigung schützt sich über `confirming`.

### 4.4 REST-API

Alle Pfade liegen unter `/api`, das Format ist JSON. Außer beim Erstellen, beim Beitreten und bei der Projekt- und Issue-Auswahl vor dem Erstellen trägt jeder Aufruf `Authorization: Bearer <token>`. Befehle antworten ohne Zustand; der neue Zustand kommt über den WebSocket.

| Methode und Pfad | Rolle | Request | Erfolg | Fehler |
| --- | --- | --- | --- | --- |
| `GET /api/projects?search=&page=` | offen | keiner | 200 `{ items: [{ id, name, pathWithNamespace, webUrl }], nextPage }`: die Projekt-Allowlist, sonst die Projekte mit Mitgliedschaft des Tokens (ADR 0008) | 400, 502 |
| `GET /api/projects/{projectId}/issues?search=&page=` | offen | keiner | 200 `{ items, nextPage, total }`, offene Issues mit `iid`, `title`, `webUrl`, `weight` | 400, 403 `PROJECT_NOT_ALLOWED`, 502 |
| `POST /api/sessions` | offen | `{ name, gitlabProjectId, issueIid? }` | 201 `{ sessionId, participantId, token }`; mit `issueIid` lädt es nach dem Issue das Projekt (`GET /projects/{id}`), ein Fehler dort bricht das Anlegen nicht ab; ohne `issueIid` lädt es nur das Projekt, und ein Fehler dort bricht das Anlegen ab (A-18) | 400, 404 `ISSUE_NOT_FOUND` oder `PROJECT_NOT_FOUND`, 502 |
| `POST /api/sessions/{id}/participants` | offen | `{ name }` | 201 `{ participantId, token }` | 400, 404, 409 `NAME_TAKEN` |
| `GET /api/sessions/{id}` | beide | keiner | 200 SessionView | 401, 404 |
| `GET /api/sessions/{id}/issues?search=&page=&weight=&period=` | Scrum Master | keiner | 200 `{ items, nextPage, total }` mit `iid`, `title`, `webUrl`, `weight` (Zahl oder `null`) je Eintrag, nach letzter Änderung absteigend; `total` aus dem GitLab-Header `X-Total` oder `null`; `weight` `NONE`, `ANY` oder `ALL` und `period` `WEEK`, `MONTH`, `YEAR` oder `ALL`, beide Standard `ALL` (ADR 0009) | 400 `VALIDATION_ERROR`, 403, 502 |
| `POST /api/sessions/{id}/active-issue` | Scrum Master | `{ issueIid }` | 204 | 403, 404, 409, 502 |
| `PUT /api/sessions/{id}/timer` | Scrum Master | `{ seconds }` (5 bis 3600 oder `null`) | 204 | 400 `VALIDATION_ERROR`, 401, 403, 404 |
| `PUT /api/sessions/{id}/vote` | Entwickler | `{ card }` | 204 | 400 `INVALID_CARD`, 403, 409 |
| `POST /api/sessions/{id}/round/start` | Scrum Master | keiner | 204 | 403, 409 |
| `POST /api/sessions/{id}/round/reveal` | Scrum Master | keiner | 204 | 403, 409 |
| `POST /api/sessions/{id}/round/restart` | Scrum Master | keiner | 204 | 403, 409 |
| `POST /api/sessions/{id}/round/confirm` | Scrum Master | `{ card }` | 204 | 400 `INVALID_CARD`, 403, 409, 502 |

Fehlerantworten folgen RFC 9457 (`application/problem+json`) mit einem stabilen `errorCode`:

```json
{ "type": "about:blank", "title": "Conflict", "status": 409, "detail": "The round is already revealed.", "errorCode": "INVALID_STATE" }
```

Clients entscheiden nur anhand von `errorCode`, nie anhand von `detail`. Codes: `VALIDATION_ERROR` (400), `INVALID_CARD` (400), `UNAUTHORIZED` (401), `FORBIDDEN_ROLE` (403), `SESSION_NOT_FOUND` (404), `ISSUE_NOT_FOUND` (404), `PROJECT_NOT_FOUND` (404, Anlegen ohne Issue, ADR 0011), `NAME_TAKEN` (409), `INVALID_STATE` (409), `GITLAB_ACCESS_DENIED` (502, 401 oder 403 von GitLab, ADR 0007), `GITLAB_ERROR` (502). GitLab-Fehlertexte werden nicht ungefiltert weitergegeben.

### 4.5 WebSocket

Endpunkt: `/ws/sessions/{sessionId}`. Das Token steht nicht in der URL, sondern in der ersten Nachricht.

| Richtung | `type` | Payload | Wann |
| --- | --- | --- | --- |
| Client an Server | `auth` | `{ token }` | Erste Nachricht, innerhalb von 5 Sekunden |
| Server an Client | `session.state` | SessionView | Nach erfolgreichem `auth` und nach jeder Zustandsänderung |
| Server an Client | `round.allVoted` | `{ roundNumber }` | Nur an den Scrum Master, einmal je Vollständigkeit |
| Server an Client | `error` | `{ errorCode, detail }` | Bei fehlgeschlagenem `auth`; danach schließt der Server |
| Client an Server | `ping` | keiner | Alle 30 Sekunden; der Server antwortet mit `pong` |

Alle Nachrichten haben die Hülle `{ "type": "…", "payload": { … } }`.

### 4.6 SessionView

Der Snapshot ist je Empfänger gefiltert. Beispiel für einen Entwickler in der Phase `VOTING`:

```json
{
  "sessionId": "K7P2QX9M",
  "gitlabProjectId": "1234",
  "project": { "id": 1234, "name": "Frontend", "pathWithNamespace": "webshop/frontend", "webUrl": "https://gitlab.com/webshop/frontend" },
  "writeWeight": false,
  "phase": "VOTING",
  "me": { "participantId": "01973f5e-2a4c-7d2e-9f30-4b5c6d7e8f90", "role": "DEVELOPER" },
  "participants": [
    { "id": "01973f5e-2a4b-7c1d-8e2f-3a4b5c6d7e8f", "name": "Anna", "role": "SCRUM_MASTER", "connected": true, "hasVoted": false },
    { "id": "01973f5e-2a4c-7d2e-9f30-4b5c6d7e8f90", "name": "Ben", "role": "DEVELOPER", "connected": true, "hasVoted": true }
  ],
  "activeIssue": { "iid": 42, "title": "…", "description": "…", "webUrl": "…" },
  "round": {
    "number": 1,
    "deadline": "2026-11-16T09:15:30Z",
    "myVote": "5",
    "allVoted": false,
    "confirming": false,
    "votes": null,
    "stats": null
  },
  "history": [],
  "timerSeconds": 60,
  "serverTime": "2026-11-16T09:15:00Z"
}
```

Filterregeln:

- `round.votes` und `round.stats` sind bis zur Auflösung `null`. Danach: `votes` als Liste `{ participantId, name, card }`, `stats` als `{ distribution: [{ card, count }], average, mostFrequent }`.
- `round.myVote` enthält nur die eigene Karte.
- `preselectedIssueIid` erscheint nur im Snapshot des Scrum Masters.
- In der Phase `LOBBY` sind `activeIssue` und `round` `null`.
- In der Phase `DISCUSSION` ist `activeIssue` gesetzt; `round` hat `number`, `myVote` `null`, `allVoted` `false`, `votes`, `stats` und `deadline` `null` (ADR 0010).
- `history` enthält die HistoryEntry-Objekte aus 4.2, neueste zuerst.
- `timerSeconds`, `serverTime` und `round.deadline` sind für beide Rollen gleich; `round.deadline` ist ohne Timer und vor „Schätzung starten“ `null` (ADR 0010).

### 4.7 GitLab-Integration

Das Backend spricht die GitLab-REST-API v4 mit dem Header `PRIVATE-TOKEN` an. Die Endpunkte sind vor der Umsetzung gegen die aktuelle GitLab-Dokumentation zu prüfen.

| Zweck | Aufruf |
| --- | --- |
| Issues suchen | `GET /api/v4/projects/{id}/issues?state=opened&search=…&per_page=20&page=…` |
| Issue laden | `GET /api/v4/projects/{id}/issues/{iid}` |
| Ergebnis kommentieren | `POST /api/v4/projects/{id}/issues/{iid}/notes` mit `body` |
| Gewicht setzen (optional) | `PUT /api/v4/projects/{id}/issues/{iid}` mit `weight` |

Konfiguration:

| Schlüssel | Standard | Bedeutung |
| --- | --- | --- |
| `planningpoker.gitlab.base-url` | `https://gitlab.com` | Basis-URL der GitLab-Instanz |
| `planningpoker.gitlab.token` | keiner, aus `GITLAB_TOKEN` | Personal Access Token mit Scope `api`; fehlt er, startet das Backend nicht (A-14) |
| `planningpoker.gitlab.write-weight` | `false` | Zahlenwerte zusätzlich als `weight` setzen, vor dem Kommentar (A-07) |
| `planningpoker.gitlab.timeout` | `10s` | Verbindungs- und Lesezeit je GitLab-Aufruf; danach gilt GitLab als nicht erreichbar (Spec 0003) |
| `planningpoker.session.ttl` | `12h` | Verfall inaktiver Sitzungen |

Vorlage für den Kommentar:

```markdown
**Planning Poker: Ergebnis 5**

Runden: 2. Letzte Runde: 3 (1 Stimme), 5 (3 Stimmen), 8 (1 Stimme). Durchschnitt 5,0.
```

## 5. Meilensteine

Die Umsetzung läuft in 15 Meilensteinen. Der GitLab-Client (M4) entsteht schon neben dem Vertrag (M1); danach laufen Backend (M2, M3, M5 bis M7) und Frontend (M8 gegen einen Mock) parallel. Ab M9 braucht das Frontend das echte Backend.

| ID | Meilenstein | Bereich | Hängt ab von | Deckt ab |
| --- | --- | --- | --- | --- |
| M0 | Projektgerüst | beide | keiner | R-23 (Gerüst), R-26 |
| M1 | Schnittstellenvertrag | beide | M0 | R-25 (erste Fassung) |
| M2 | Domänenkern | Backend | M1 | Logik zu R-11, R-14, R-16 bis R-18 |
| M3 | Sitzungs-API und Rollen | Backend | M2 | R-01 (ohne Issue-Prüfung), R-03, R-05 |
| M4 | GitLab-Client | Backend | M0 | R-09 |
| M5 | Issue-Auswahl und Runden-Befehle | Backend | M3, M4 | R-01 (Issue-Prüfung), R-06 bis R-08, R-11 bis R-19 |
| M6 | Echtzeit | Backend | M5 | R-12, R-13, R-22 |
| M7 | Ergebnisübernahme | Backend | M5 | R-20, R-21 |
| M8 | Frontend-Grundgerüst | Frontend | M1 | Basis für alle Frontend-Anforderungen |
| M9 | Erstellen und Beitreten | Frontend | M8, M5 | R-01 bis R-03 |
| M10 | Sitzungsraum und Issue-Auswahl | Frontend | M9, M6 | R-04 bis R-08, R-10 |
| M11 | Schätzrunde | Frontend | M10 | R-11 bis R-14 |
| M12 | Auflösung und Abschluss | Frontend | M11, M7 | R-15 bis R-21 |
| M13 | Härtung und Abgabe | beide | M12 | R-22 bis R-25 |
| M14 | Optionale Features | beide | M13 | O-01 bis O-03 |

### M0 – Projektgerüst

Ziel: Beide Projekte starten lokal, alle Gates des Harness laufen mit echten Befehlen, und ein erster Weg von der Oberfläche zum Backend ist durch einen End-to-End-Test belegt.

Arbeitspakete:

- Monorepo-Struktur aus Abschnitt 4 anlegen.
- Quarkus-Projekt mit allen Extensions und Test-Abhängigkeiten aus 4.1 erzeugen; Health-Endpunkt `GET /api/health`. Alle Konfigurationsschlüssel aus 4.7 mit ihren Standardwerten in `application.properties`. Tests auf freiem Port (`quarkus.http.test-port=0`).
- Angular-Projekt mit Routing, Angular Material und Theme, `@angular/localize`, `marked`, Lint, Prettier und Playwright erzeugen. Dev-Proxy im Frontend: `/api` und `/ws` an `localhost:8080`.
- Alle Abhängigkeiten bis M13 kommen hier in `pom.xml` und `package.json`, damit parallel laufende Specs nicht an diesen Dateien kollidieren.
- Startseite zeigt den Zustand von `/api/health` (Text über i18n, `data-testid`), dazu der erste Playwright-Test.
- Harness: `make test`, `make typecheck`, `make lint` und `make e2e` für beide Projekte; `.github/actions/setup/action.yml` mit Java 21, Node und pnpm; `project-rules/testing.md`; in `harness/config.yml` die Schlüssel `worktree_setup` (Abhängigkeiten installieren) und `e2e_in_ci: true`.
- README als Abgabe-README gliedern (Start, Variante, GitLab, Schnittstellen, Entwicklung mit dem Harness) und `.env.example` mit `GITLAB_TOKEN` anlegen.

Akzeptanzkriterien:

- `./mvnw quarkus:dev` und `pnpm start` laufen ohne Fehler.
- Das Frontend erreicht `/api/health` über den Proxy (End-to-End-Test).
- `make check` ist grün, die CI ist grün und führt `make e2e` aus.
- Zwei Testläufe in zwei Worktrees laufen gleichzeitig grün durch.

### M1 – Schnittstellenvertrag

Ziel: Der Vertrag aus 4.4 bis 4.6 liegt generiert in `contracts/api/` vor und ist die Referenz für beide Seiten.

Arbeitspakete:

- DTOs als Java-Records und alle Ressourcen-Methoden aus 4.4 mit OpenAPI-Annotationen. Die Methoden antworten mit 501, bis ihr Meilenstein sie umsetzt.
- WebSocket-Nachrichten aus 4.5 als Schemas in der statischen OpenAPI-Ergänzung.
- Fehlerformat nach 4.4 als Exception-Mapper.
- Ziel `make contracts`: Der Build schreibt `contracts/api/openapi.yaml`, `openapi-typescript` erzeugt die Frontend-Typen. In `harness/config.yml` wird `contracts_generate_target: contracts` gesetzt.
- Beispiel-Snapshots je Phase und Rolle unter `contracts/api/examples/`.
- Erste Fassung des README-Abschnitts „Schnittstellen“.

Akzeptanzkriterien:

- Jede Zeile des Zustandsautomaten (4.3) hat einen Endpunkt in `contracts/api/openapi.yaml`.
- Für `LOBBY`, `DISCUSSION`, `VOTING` und `REVEALED` existiert je ein Beispiel-Snapshot für beide Rollen.
- Ein Backend-Test liest jedes Beispiel in die DTOs ein; unbekannte Felder lassen ihn fehlschlagen. Das Frontend bindet die Beispiele typisiert gegen die generierten Typen ein, `make typecheck` prüft sie.
- Eine DTO-Änderung ohne `make contracts` lässt `make drift` fehlschlagen.

### M2 – Domänenkern (Backend)

Ziel: Die gesamte Fachlogik läuft als reines Java ohne HTTP und ohne GitLab.

Arbeitspakete:

- `Card`, `Participant`, `Session`, `Round`, `RoundStats`, `HistoryEntry` nach 4.2.
- Zustandsübergänge aus 4.3 als Methoden der Session, einschließlich `confirming`; ungültige Übergänge werfen eine Domänen-Exception.
- Auswertung nach A-06.
- `SessionRegistry` im Arbeitsspeicher mit Verfall nach A-09. Jede Änderung läuft über `update(…)`: Sperre je Sitzung, Ausführung, danach ein Änderungs-Event.
- Erzeugung von Session-ID (A-17) und Token mit `SecureRandom`, Teilnehmer-IDs als UUIDv7.

Akzeptanzkriterien:

- Unit-Tests decken jede Zeile der Tabelle in 4.3 und mindestens einen ungültigen Übergang je Phase ab.
- Auswertungstests: nur `?` und ☕, Gleichstand, gemischte Karten, eine einzige Stimme.
- 50 parallele Stimmabgaben in einer Sitzung gehen nicht verloren.
- Jede erfolgreiche Änderung löst genau ein Änderungs-Event aus, eine abgelehnte keines.

### M3 – Sitzungs-API und Rollen (Backend)

Ziel: Sitzungen lassen sich per REST anlegen, betreten und lesen; Rollen werden serverseitig erzwungen.

Arbeitspakete:

- `POST /api/sessions`, `POST /api/sessions/{id}/participants`, `GET /api/sessions/{id}`. Das angegebene Issue wird als vorausgewählt gespeichert; die Prüfung gegen GitLab folgt in M5.
- Token-Prüfung als Filter; Rollenprüfung als Annotation oder Interceptor.
- Validierung der Eingaben, Namensregeln nach A-13.
- Mapper von Session auf SessionView mit den Filterregeln aus 4.6.

Akzeptanzkriterien:

- Der Ersteller hat die Rolle `SCRUM_MASTER`, jeder Beitretende `DEVELOPER`.
- Ohne Token: 401. Entwickler auf Scrum-Master-Endpunkt: 403. Doppelter Name: 409.
- Kein Snapshot enthält vor der Auflösung fremde Kartenwerte (Test über alle Phasen).
- Tokens erscheinen in keinem Snapshot und in keinem Log.

### M4 – GitLab-Client (Backend)

Ziel: Das Backend beherrscht alle vier GitLab-Aufrufe aus 4.7, noch ohne eigenen Endpunkt.

Arbeitspakete:

- REST-Client und Konfiguration nach 4.7; ein fehlender Token stoppt den Start mit dem Namen des Schlüssels (A-14).
- Issues suchen und laden, Kommentar schreiben, Gewicht setzen.
- Abbildung von GitLab-Fehlern (401, 403, 404, Timeout) auf eigene Fehlertypen, die M5 und M7 in `ISSUE_NOT_FOUND` oder `GITLAB_ERROR` übersetzen.

Akzeptanzkriterien:

- WireMock-Tests je Aufruf für Erfolg, 401, 404 und Timeout; für die Suche zusätzlich leere Liste und Paginierung.
- Der GitLab-Token erscheint weder in Fehlern noch in Logs.

### M5 – Issue-Auswahl und Runden-Befehle (Backend)

Ziel: Der vollständige Ablauf von der Issue-Auswahl bis zur neuen Runde ist per REST steuerbar.

Arbeitspakete:

- `GET …/issues` mit Suche und Paginierung; Prüfung von Projekt und Issue beim Anlegen einer Sitzung.
- `POST …/active-issue`, `PUT …/vote`, `POST …/round/reveal`, `POST …/round/restart`.
- Issue-Wechsel nach A-04; das Issue wird vor der Sperre geladen (4.3).
- Protokolleintrag bei jeder Auflösung nach A-05.
- Berechnung von `allVoted` nach A-02 und A-10.

Akzeptanzkriterien:

- Eine Sitzung mit unbekanntem Issue wird nicht angelegt (404 `ISSUE_NOT_FOUND`).
- Integrationstest für den Ablauf: freigeben, drei Stimmen, auflösen, erneut schätzen, auflösen.
- Stimmabgabe in `LOBBY` oder `REVEALED`: 409. Ungültige Karte: 400.
- Auflösen mit nur einer von drei Stimmen funktioniert; fehlende Stimmen erscheinen als nicht abgegeben.
- Nach einem Issue-Wechsel sind alle Stimmen gelöscht und die Rundennummer ist 1.

### M6 – Echtzeit (Backend)

Ziel: Jede Zustandsänderung erreicht alle verbundenen Teilnehmer als gefilterter Snapshot.

Arbeitspakete:

- WebSocket-Endpunkt mit `auth`-Handshake nach 4.5.
- Verbindungsregister je Sitzung; `connected` wird beim Öffnen und Schließen über `SessionRegistry.update(…)` gesetzt.
- Versand von `session.state` an jeden verbundenen Teilnehmer, ausgelöst durch das Änderungs-Event aus M2.
- `round.allVoted` nur an den Scrum Master.
- `ping` und `pong`; Schließen nicht authentifizierter Verbindungen nach 5 Sekunden.

Akzeptanzkriterien:

- Test mit zwei WebSocket-Clients: Ein Beitritt erscheint beim anderen Client innerhalb einer Sekunde.
- Nach einer Stimmabgabe sehen andere `hasVoted: true`, aber keinen Wert.
- Nach der Auflösung erhalten alle dieselben `votes` und `stats`.
- `round.allVoted` kommt genau einmal, wenn der letzte verbundene Entwickler gewählt hat, und nie bei einem Entwickler an.
- Eine Verbindung ohne gültiges `auth` wird geschlossen.

### M7 – Ergebnisübernahme (Backend)

Ziel: Der bestätigte Wert steht am GitLab-Issue und im Protokoll.

Arbeitspakete:

- `POST …/round/confirm` mit Prüfung gegen den Kartensatz und `confirming` nach 4.3.
- Kommentar nach der Vorlage in 4.7; mit `write-weight` vorher das Gewicht (A-07).
- `finalCard` im Protokolleintrag, Rückkehr nach `LOBBY` nach A-16.

Akzeptanzkriterien:

- WireMock prüft den Kommentartext und, falls aktiviert, den `weight`-Aufruf vor dem Kommentar.
- Ein Wert außerhalb des Kartensatzes, etwa `4.3`, wird mit 400 abgelehnt.
- Bei einem GitLab-Fehler: 502, Phase bleibt `REVEALED`, `confirming` ist zurückgesetzt, ein erneuter Versuch gelingt.
- Zwei schnelle Aufrufe erzeugen genau einen Kommentar; der zweite erhält 409.
- Während eines langsamen GitLab-Aufrufs gelingt ein Beitritt zur selben Sitzung.

### M8 – Frontend-Grundgerüst

Ziel: Routing, Zustand und Kommunikation stehen und laufen gegen einen Mock des Vertrags.

Arbeitspakete:

- Routen: `/` (Start), `/session/:id/join` (Beitreten), `/session/:id` (Sitzungsraum).
- `ApiService` für die REST-Endpunkte aus 4.4 mit den generierten Typen; zentrale Fehlerbehandlung, die je `errorCode` einen i18n-Text zeigt.
- `RealtimeService`: WebSocket mit `auth`, `ping`, automatischem Wiederverbinden mit wachsendem Abstand.
- `SessionStore` auf Signals-Basis, der jeden `session.state`-Snapshot vollständig übernimmt.
- Token-Ablage im `sessionStorage` je Sitzungs-ID; Route-Guard leitet ohne Token auf die Beitrittsseite.
- Mock-Backend für die Entwicklung auf Basis der Beispiel-Snapshots aus `contracts/api/examples/`.
- Grundlayout, Theme und globale Fehleranzeige.

Akzeptanzkriterien:

- Unit-Tests für Store und Guard.
- Nach einem Verbindungsabbruch verbindet sich der Client neu und zeigt den aktuellen Zustand.
- Ein Neuladen der Seite im Sitzungsraum behält Identität und Rolle.

### M9 – Erstellen und Beitreten (Frontend)

Ziel: Eine Sitzung lässt sich anlegen, teilen und betreten.

Arbeitspakete:

- Startseite mit zwei Wegen: Sitzung erstellen, per Session-ID beitreten.
- Formular zum Erstellen: Name, GitLab-Projekt-ID, Issue-Nummer; Validierung und Anzeige von GitLab-Fehlern.
- Nach dem Erstellen: Wechsel in den Sitzungsraum; Beitrittslink und Session-ID mit Kopier-Schaltfläche.
- Beitrittsseite: Namenseingabe; Fehler bei unbekannter Sitzung oder vergebenem Namen.
- GitLab-Double der End-to-End-Umgebung mit Projekt und Issues.

Akzeptanzkriterien:

- Der Ersteller landet als Scrum Master im Sitzungsraum.
- Der Beitritt funktioniert sowohl über den Link als auch über die Eingabe der Session-ID.
- Ein unbekanntes Issue zeigt eine verständliche Meldung und legt keine Sitzung an.

### M10 – Sitzungsraum und Issue-Auswahl (Frontend)

Ziel: Alle sehen die Teilnehmer; der Scrum Master wählt ein Issue und gibt es frei.

Arbeitspakete:

- Teilnehmerliste mit Namen, Rollenkennzeichen und Online-Status.
- Bedienfeld für den Scrum Master: Issue-Suche, Vorschau, Schaltfläche „Freigeben“; das vorausgewählte Issue aus A-03 ist vorbelegt. Die Suchergebnisse bleiben lokal in der Komponente.
- Wartezustand für Entwickler in der Phase `LOBBY`.
- Anzeige des aktiven Issues: Titel, Beschreibung als bereinigtes Markdown, Link zu GitLab.
- Issue-Wechsel mit Rückfrage, weil die laufende Runde verworfen wird.

Akzeptanzkriterien:

- Die Scrum-Master-Rolle ist in der Liste für alle erkennbar.
- Für Entwickler werden Steuerelemente nicht gerendert, nicht nur ausgeblendet.
- Vor der Freigabe sieht ein Entwickler kein Issue; nach der Freigabe erscheint es ohne Neuladen.
- Skript-Inhalte in einer Issue-Beschreibung werden nicht ausgeführt.

### M11 – Schätzrunde (Frontend)

Ziel: Entwickler wählen verdeckt eine Karte; alle sehen den Fortschritt.

Arbeitspakete:

- Kartenfächer mit den 11 Karten, per Tastatur bedienbar; gewählte Karte hervorgehoben, Änderung möglich.
- Fortschrittsliste je Teilnehmer: „Hat geschätzt“ oder „Ausstehend“, dazu ein Zähler.
- Hinweis an den Scrum Master bei `round.allVoted` oder `allVoted: true`: Banner und hervorgehobene Schaltfläche „Auflösen“.
- Schaltfläche „Auflösen“ nur für den Scrum Master, jederzeit aktiv.

Akzeptanzkriterien:

- Die eigene Karte ist sichtbar, fremde Werte sind es nicht, auch nicht im Netzwerk-Tab.
- Der Status eines anderen Teilnehmers wechselt ohne Neuladen.
- Der Scrum Master sieht den Hinweis, sobald alle verbundenen Entwickler gewählt haben.

### M12 – Auflösung und Abschluss (Frontend)

Ziel: Das Ergebnis wird dargestellt; der Scrum Master lässt erneut schätzen oder übernimmt einen Wert.

Arbeitspakete:

- Aufgedeckte Ansicht: Karte und Name je Teilnehmer.
- Gruppenauswertung je abgegebenem Wert in Kartenreihenfolge.
- Durchschnitt und häufigster Wert, als Orientierung beschriftet und nicht anklickbar.
- Aktionen für den Scrum Master: „Erneut schätzen“ und „Ergebnis übernehmen“ mit Auswahl aus dem Kartensatz und Bestätigungsdialog.
- Während `confirming` sehen alle einen Hinweis, die Aktionen sind gesperrt.
- Rückmeldung bei Erfolg und bei GitLab-Fehler mit Möglichkeit zum erneuten Versuch.
- Sitzungsprotokoll als einklappbarer Bereich für alle.

Akzeptanzkriterien:

- Alle Clients zeigen dieselben Karten und dieselbe Auswertung.
- Als Ergebnis sind nur die 11 Karten wählbar.
- Nach „Erneut schätzen“ sind alle Karten zurückgesetzt und die vorige Runde steht im Protokoll.
- Nach der Übernahme zeigt das Protokoll den Endwert, und die Sitzung ist zurück in der Issue-Auswahl.

### M13 – Härtung und Abgabe

Ziel: Die Anwendung ist abgabefertig und aus einem frischen Klon startbar.

Arbeitspakete:

- End-to-End-Test mit drei Browser-Kontexten (ein Scrum Master, zwei Entwickler) über den gesamten Ablauf gegen das GitLab-Double.
- Fehler- und Leerzustände: Sitzung abgelaufen, GitLab nicht erreichbar, keine Issues gefunden.
- Responsives Layout; Fokus, Beschriftungen und Kontrast prüfen (die Lint-Regeln laufen seit M0).
- README final: Einrichtung und Start, Variantenwahl mit Begründung, GitLab-Entscheidung aus A-07, vollständige Schnittstellendefinition (R-25) mit Verweis auf `contracts/api/`.
- Manuelle Prüfung gegen ein echtes GitLab-Projekt mit Checkliste.

Akzeptanzkriterien:

- Der End-to-End-Test läuft in der CI.
- Ein frischer Klon läuft nach höchstens fünf dokumentierten Befehlen.
- Jede Anforderung R-01 bis R-26 ist einem Test oder einem Punkt der Checkliste zugeordnet.

### M14 – Optionale Features

Ziel: Die drei optionalen Punkte der Challenge, jeweils einzeln lieferbar.

Arbeitspakete:

- O-01 Timer (ADR 0006, Spec 0016; ADR 0010, Spec 0026): Der Scrum Master stellt den Timer der Sitzung ein (`PUT …/timer`); die Frist entsteht mit „Schätzung starten“ (`POST …/round/start`), nicht schon mit der Freigabe. Seit Spec 0026 bricht der Vertrag (3.0.0). Die Frist liegt im Snapshot als Zeitstempel (RFC 3339) neben `serverTime`; der Server löst nach Ablauf automatisch auf. Der Vertrag ändert sich additiv (2.1.0).
- O-02 Ausreißer: Nach der Auflösung werden niedrigste und höchste Zahlenkarte markiert, wenn sie mehr als zwei Positionen im Kartensatz auseinanderliegen. Das Frontend berechnet die Markierung aus dem Snapshot.
- O-03 Konsens: Haben alle abgegebenen Karten denselben Wert, zeigt die Oberfläche eine Bestätigung mit Konfetti und schlägt den Wert für die Übernahme vor. Das Frontend berechnet den Konsens aus dem Snapshot; das Konfetti ist eine CSS-Animation ohne zusätzliche Bibliothek.

Akzeptanzkriterien:

- Der Timer läuft auf allen Clients synchron und löst auch ohne verbundenen Scrum Master auf.
- Markierung und Konsens-Anzeige erscheinen bei allen Teilnehmern gleich.
- Die Animation respektiert die Systemeinstellung für reduzierte Bewegung.

## 6. Querschnittsthemen

Ein Meilenstein gilt als fertig, wenn seine Akzeptanzkriterien als automatisierte Tests vorliegen und in der CI grün sind.

**Definition of Done je Meilenstein**

- Alle Akzeptanzkriterien sind durch Tests belegt; wo das nicht geht, durch einen Punkt der manuellen Checkliste.
- `make check`, `make e2e` und alle bestehenden Tests sind grün.
- Nach Änderungen an Endpunkten oder Nachrichten ist `make contracts` gelaufen und der README-Abschnitt „Schnittstellen“ nachgezogen.
- Das README ist aktuell, falls sich Setup oder Konfiguration geändert haben.

**Sicherheit**

- Der GitLab-Token kommt nur aus der Umgebung und erscheint nie in Antworten, Snapshots oder Logs.
- Teilnehmer-Tokens haben mindestens 128 Bit Zufall.
- Rollen- und Zustandsprüfungen liegen im Backend; das Frontend rendert Steuerelemente für Entwickler gar nicht erst.
- Kartenwerte werden vor der Auflösung nicht geloggt.
- Markdown aus GitLab geht nur über die eingebaute Bereinigung von Angular in die Seite.
- Kein CORS: Das Frontend erreicht das Backend über den Dev-Proxy unter demselben Origin.

**Nebenläufigkeit**

- Befehle einer Sitzung laufen nacheinander unter einer Sperre je Sitzung (`SessionRegistry.update(…)`).
- Snapshots werden erst nach Abschluss des Befehls versendet.
- GitLab-Aufrufe laufen nie unter der Sperre; die Ergebnisbestätigung schützt sich über `confirming` (4.3).

**Teststrategie**

- Backend: Unit-Tests für die Domäne, je Fall eine Tabellenzeile; REST-Assured-Tests je Endpunkt für jeden Status und Fehlercode aus 4.4; WireMock für GitLab; WebSocket-Tests mit zwei Clients, die auf Nachrichten mit Timeout warten statt mit festen Pausen.
- Frontend: Unit-Tests für Store, Services und Komponenten mit Logik.
- End-to-End: Jeder Frontend-Meilenstein ab M9 bringt einen Ablauf gegen das GitLab-Double mit; Selektoren über `data-testid`. M13 ergänzt den Gesamtablauf mit drei Browser-Kontexten.
- Tests nehmen freie Ports. Die für End-to-End gestartete Anwendung läuft unter `harness/scripts/app-lock.sh`, damit parallele Worktrees sich nicht stören.

## 7. Hinweise für den Harness

Jeder Meilenstein ergibt mindestens eine Spec; die Reihenfolge folgt der Spalte „Hängt ab von“ in Abschnitt 5.

- Zuschnitt: M5, M6, M10, M11 und M12 dürfen je Arbeitspaket in eigene Specs zerlegt werden. M14 ergibt drei unabhängige Specs.
- Verbindlich sind die Anforderungen (R-IDs), die Annahmen (A-IDs) und der Vertrag aus Abschnitt 4. Abweichungen werden zuerst in diesem Dokument geändert.
- Jede Spec nennt die abgedeckten R- und A-IDs und übernimmt die Akzeptanzkriterien als Testfälle.
- Die Punkte unter „Nicht im Scope“ in Abschnitt 1 werden nicht umgesetzt, auch nicht als Vorbereitung.
- Die offenen Fragen in Abschnitt 3 blockieren nicht; bis zur Klärung gilt die jeweilige Annahme.
- M0 ist die Gerüst-Spec der ersten Welle. Sie nimmt die ADRs der Grundentscheidungen mit auf; dieses Dokument liegt seit dem Bootstrap als `docs/umsetzungsplan.md` auf `main`.

**Grundentscheidungen** (je eine ADR in `docs/adr/`, angelegt von `/roadmap`)

| Thema | Entscheidung | Ersetzt Grundregeln |
| --- | --- | --- |
| Stack | Variante A mit Angular und Quarkus nach 4.1 | – |
| Persistenz | Sitzungen nur im Arbeitsspeicher (A-09); keine Datenbank, keine Migrationen; die Sperre je Sitzung tritt an die Stelle atomarer Datenbank-Anweisungen | A4.1, A4.3, A4.4, T1.2 |
| Identität | Kein Login; Token je Teilnehmer und Sitzung (A-08); Session-ID mit 8 Zeichen zum Abtippen (A-17); Teilnehmer-IDs als UUIDv7 | A4.2 (nur Session-ID) |
| Echtzeit und Frontend-Zustand | REST für Befehle, WebSocket mit vollständigem Snapshot; ein Signals-Store übernimmt jeden Snapshot; Einzelabfragen wie die Issue-Suche bleiben lokal in der Komponente | A7.1 |

Vertrag (A2.1) und Fehlerformat (A2.3) folgen den Grundregeln und brauchen keine ADR.

**Wellen** (Vorschlag bei `parallel_max: 3`; `wave-check.sh` prüft ihn beim Schreiben der Specs)

| Welle | Meilensteine | Warum sie zusammen laufen können |
| --- | --- | --- |
| 1 | M0 | Gerüst, alles hängt davon ab |
| 2 | M1, M4 | M1 ändert DTOs, Ressourcen und `contracts/`, M4 nur das Paket `gitlab`; Abhängigkeiten und Konfiguration stehen seit M0 fest |
| 3 | M2, M8 | Backend-Domäne und Frontend berühren getrennte Verzeichnisse |
| 4 | M3 | |
| 5 | M5 | zerlegt in Issue-Auswahl und Runden nacheinander, weil beide dieselbe Ressource ändern |
| 6 | M6, M7, M9 | `realtime` hört nur auf das Änderungs-Event, M7 ändert `session` und nutzt `gitlab`, M9 ist reines Frontend |
| 7 bis 9 | M10, M11, M12 | Frontend der Reihe nach |
| 10 | M13 | |
| 11 | M14 (O-01, O-02, O-03) | nur O-01 ändert den Vertrag; O-02 und O-03 können an derselben Ansicht kollidieren, dann nacheinander |
