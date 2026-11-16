---
id: "0005"
title: Frontend-Grundgerüst (M8)
status: approved
risk: high
adrs: ["0003", "0004"]
owner: Morten Möller
created: 2026-11-16
updated: 2026-11-16
pr: ""
note: freigegeben in der Session
---

# Frontend-Grundgerüst (M8)

Meilenstein M8 aus `docs/umsetzungsplan.md`. Basis für alle Frontend-Anforderungen (R-01 bis
R-22 ab 0011). Annahmen: A-08 (Token im `sessionStorage` je Sitzung), A-10 (Wiedereinstieg mit
Token), A-15 (deutsche Texte je `errorCode`, nie der Fehlertext der API). Grundlage: Abschnitte
4.4 bis 4.6 des Plans und der Vertrag aus 0002.

## Ziel

Routing, Zustand und Kommunikation des Frontends stehen und laufen gegen einen Mock des Vertrags:
ein `ApiService` für alle REST-Endpunkte mit den generierten Typen und zentraler Fehlerbehandlung,
ein `RealtimeService` für den WebSocket mit `auth`, `ping` und Wiederverbindung, ein
`SessionStore` auf Signals-Basis, die Token-Ablage je Sitzung, ein Route-Guard, das Grundlayout
mit globaler Fehleranzeige und ein Mock-Backend aus den Beispiel-Snapshots für die Entwicklung,
bis das echte Backend die Endpunkte liefert.

## Scope

### Enthalten

- Routen `/` (Startseite), `/session/:id/join` (Beitreten, Platzhalter bis 0011), `/session/:id` (Sitzungsraum, Platzhalter bis 0012: Session-ID, Phase, eigene Rolle, Teilnehmerzahl).
- `ApiService` mit einer Methode je Endpunkt aus 4.4, Typen aus `schema.d.ts`; Interceptor setzt `Authorization: Bearer` aus dem `TokenStore`; eine Problem-Detail-Antwort wird zu `ApiError` mit `errorCode`.
- `ErrorMessages`: je `errorCode` ein deutscher Text über `$localize`; `ErrorBanner` im Layout zeigt den letzten Fehler und lässt ihn schließen.
- `RealtimeService`: RxJS `webSocket` auf `/ws/sessions/{id}`, erste Nachricht `auth`, `ping` alle 30 Sekunden, Wiederverbindung mit wachsendem Abstand (1, 2, 4, 8, 16, 30 Sekunden), `session.state` in den Store, `round.allVoted` als Signal, `error` beendet die Verbindung und zeigt den Fehler.
- `SessionStore`: übernimmt jeden Snapshot vollständig; abgeleitete Signale `me`, `role`, `isScrumMaster`, `phase`, `participants`, `activeIssue`, `round`, `history`; lädt beim Betreten des Raums `GET /api/sessions/{id}` und startet den `RealtimeService`.
- `TokenStore`: Token und Teilnehmer-ID je Sitzungs-ID im `sessionStorage`.
- `sessionGuard`: ohne Token für die Sitzungs-ID Weiterleitung auf `/session/:id/join`.
- Mock-Backend für `pnpm -C frontend start:mock`: HTTP-Interceptor und Fake-WebSocket aus den Beispielen in `frontend/src/app/api/examples.ts`; aktiviert über die Build-Konfiguration `mock` (`fileReplacements`), im normalen Build nicht enthalten.
- Grundlayout: Toolbar mit Titel, `router-outlet`, Fehlerbanner, Material-Theme aus 0001.

### Nicht enthalten

- Formulare zum Erstellen und Beitreten (0011), Teilnehmerliste und Issue-Auswahl (0012), Kartenfächer (0013), Auflösung (0014).
- End-to-End-Tests gegen das echte Backend: die Endpunkte antworten bis 0006 noch 501; die Abläufe kommen mit 0011. `frontend/e2e/health.spec.ts` bleibt grün.
- Änderungen am Vertrag, am Backend und an `package.json`-Abhängigkeiten.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Sitzung, Session-ID, Teilnehmer, Rolle, Scrum Master, Entwickler, Token, Phase, Snapshot, Befehl | wie im Glossar |
| Mock-Backend | Ersatz für REST und WebSocket im Browser, nur in der Build-Konfiguration `mock`, antwortet mit den Beispiel-Snapshots |
| Fehlerbanner | Bereich im Layout, der den deutschen Text zum letzten `errorCode` zeigt |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Die Routen `/`, `/session/:id/join` und `/session/:id` sind erreichbar; `/session/K7P2QX9M` ohne Token für diese ID leitet auf `/session/K7P2QX9M/join` um, mit Token bleibt der Raum. | Test `frontend/src/app/api/session.guard.spec.ts`; Browser (Mock) |
| A2 | Jede Methode des `ApiService` ruft Methode und Pfad aus 4.4 auf, mit `Authorization: Bearer <token>` aus dem `TokenStore` außer bei Erstellen und Beitreten; eine Antwort `application/problem+json` wird zu `ApiError` mit `errorCode` und Status. | Test `frontend/src/app/api/api.service.spec.ts` |
| A3 | Zu jedem `errorCode` aus 4.4 gibt es einen deutschen Text mit i18n-ID `@@error.<code>`; das Fehlerbanner zeigt diesen Text und nie `detail`; ein unbekannter Code zeigt einen allgemeinen Text. | Test `frontend/src/app/shell/error-banner.spec.ts` |
| A4 | Der `RealtimeService` sendet nach dem Öffnen als erste Nachricht `auth` mit dem Token, danach `ping` alle 30 Sekunden; ein `session.state` ersetzt den Store-Zustand vollständig; nach einem Verbindungsabbruch verbindet er mit wachsendem Abstand (1, 2, 4, 8, 16, dann 30 Sekunden) neu und sendet `auth` erneut; nach einer Nachricht `error` verbindet er nicht neu. | Test `frontend/src/app/api/realtime.service.spec.ts` mit Fake-Socket und Fake-Timern |
| A5 | Der `SessionStore` übernimmt jeden Snapshot vollständig; `me`, `role`, `isScrumMaster`, `phase` und `round` entsprechen den sechs Beispielen; ein neuer Snapshot ersetzt alle Felder, auch auf `null`. | Test `frontend/src/app/api/session-store.spec.ts` |
| A6 | Ein Neuladen des Sitzungsraums behält Identität und Rolle: der `TokenStore` liefert Token und Teilnehmer-ID je Sitzungs-ID aus dem `sessionStorage`, der Store lädt `GET /api/sessions/{id}` damit und zeigt die Rolle; zwei Tabs mit verschiedenen Sitzungen stören sich nicht. | Test `frontend/src/app/api/token-store.spec.ts`; Browser (Mock): Raum neu laden |
| A7 | `pnpm -C frontend start:mock` läuft ohne Backend: Erstellen liefert Session-ID und Token, der Raum zeigt Phase und Rolle aus dem Snapshot, `data-testid` `session-id`, `session-phase`, `session-role`; der normale Build enthält den Mock nicht. | Browser (Mock); Aufruf (`grep` im Build-Output) |
| A8 | Das Layout hat Toolbar mit Titel, Inhalt und Fehlerbanner; Farben, Abstände und Schrift kommen aus `--mat-sys-*`-Variablen; `make lint` ist grün. | Aufruf, Browser |

## Contracts

keine. Das Frontend liest `frontend/src/app/api/schema.d.ts` aus 0002; keine Änderung an
`contracts/`.

## Risiko

Stufe: high
Begründung: `frontend/src/**` ist medium (kein Muster); der Eskalator `token` greift über den
`TokenStore` und die `auth`-Nachricht. `frontend/angular.json` und `frontend/package.json`
(Skript `start:mock`, Manifest) sind medium. Tests low.
Gates: G0 und G1 in dieser Session. G2: Label `human-approved`. G3: Status `verified`. Reviews:
Code, Sicherheit, Architektur.
ADR nötig: nein, weil ADR 0004 (Snapshot und Signals-Store) und ADR 0003 (Token im
`sessionStorage`) die Entscheidungen festlegen und diese Spec ihnen folgt.

## Umsetzung

Entscheidungen:

- Keine neuen Abhängigkeiten; `package.json` erhält nur das Skript `start:mock` (`ng serve --configuration mock`).
- Mock-Backend im Browser statt eigenem Server: `angular.json` bekommt die Build-Konfiguration `mock` mit `fileReplacements` von `frontend/src/app/api/backend.providers.ts` durch `frontend/src/app/api/backend.providers.mock.ts`; der Mock besteht aus einem `HttpInterceptorFn` (Erstellen, Beitreten, Sitzung lesen, Stubs für die Befehle) und einer Fake-`WebSocketSubject`-Fabrik, die nach `auth` den Snapshot zur Rolle liefert.
- WebSocket über ein `InjectionToken` `WEB_SOCKET_FACTORY` (`(url) => WebSocketSubject<WsMessage>`), damit Tests und Mock die Verbindung ersetzen; die URL ist `ws(s)://<host>/ws/sessions/{id}` aus `location`.
- Fehlerweg: `apiErrorInterceptor` wandelt jede `HttpErrorResponse` mit Problem Detail in `ApiError`, `ErrorState` (Signal) hält den letzten Fehler für das Banner; Komponenten entscheiden nur anhand von `errorCode`.
- Platzhalterseiten für Beitreten und Sitzungsraum mit `data-testid`; 0011 und 0012 ersetzen sie.

Dateien:

- `frontend/src/app/api/ws-messages.ts`: neu, Typen der WebSocket-Nachrichten aus `schema.d.ts` (`components['schemas']['WebSocket…']`) und die Hülle `WsMessage`
- `frontend/src/app/api/api-error.ts`: neu, Klasse `ApiError` mit `errorCode`, `status`
- `frontend/src/app/api/api.service.ts`: neu, neun Methoden mit Typen aus `schema.d.ts`
- `frontend/src/app/api/api.service.spec.ts`: neu, A2
- `frontend/src/app/api/auth.interceptor.ts`: neu, `Authorization`-Header aus dem `TokenStore` für `/api/sessions/{id}/…`
- `frontend/src/app/api/api-error.interceptor.ts`: neu, Problem Detail zu `ApiError`, meldet an `ErrorState`
- `frontend/src/app/api/error-state.ts`: neu, Signal mit dem letzten `ApiError`, `clear()`
- `frontend/src/app/api/error-messages.ts`: neu, `$localize`-Texte je `errorCode`
- `frontend/src/app/api/token-store.ts`: neu, `sessionStorage` je Sitzungs-ID
- `frontend/src/app/api/token-store.spec.ts`: neu, A6
- `frontend/src/app/api/web-socket-factory.ts`: neu, `InjectionToken` und Standardfabrik
- `frontend/src/app/api/realtime.service.ts`: neu, `auth`, `ping`, Wiederverbindung, Weitergabe an den Store
- `frontend/src/app/api/realtime.service.spec.ts`: neu, A4
- `frontend/src/app/api/session-store.ts`: neu, Signals-Store, `enter(sessionId)`, `leave()`
- `frontend/src/app/api/session-store.spec.ts`: neu, A5
- `frontend/src/app/api/session.guard.ts`: neu, `CanActivateFn`
- `frontend/src/app/api/session.guard.spec.ts`: neu, A1
- `frontend/src/app/api/backend.providers.ts`: neu, Provider für HttpClient mit Interceptoren und `WEB_SOCKET_FACTORY`
- `frontend/src/app/api/backend.providers.mock.ts`: neu, dieselben Provider mit Mock-Interceptor und Fake-Fabrik
- `frontend/src/app/api/mock/mock-backend.interceptor.ts`: neu, Antworten aus `examples.ts`
- `frontend/src/app/api/mock/mock-web-socket.ts`: neu, Fake-`WebSocketSubject`
- `frontend/src/app/shell/app-shell.ts`: neu, Toolbar, `router-outlet`, Banner
- `frontend/src/app/shell/app-shell.html`: neu
- `frontend/src/app/shell/error-banner.ts`: neu
- `frontend/src/app/shell/error-banner.html`: neu
- `frontend/src/app/shell/error-banner.spec.ts`: neu, A3
- `frontend/src/app/join/join-page.ts`: neu, Platzhalter mit Session-ID
- `frontend/src/app/join/join-page.html`: neu
- `frontend/src/app/session/session-page.ts`: neu, Platzhalter aus dem Store
- `frontend/src/app/session/session-page.html`: neu
- `frontend/src/app/app.ts`: ändern, Shell einbinden
- `frontend/src/app/app.html`: ändern
- `frontend/src/app/app.config.ts`: ändern, `provideBackend()` aus `backend.providers.ts`
- `frontend/src/app/app.routes.ts`: ändern, drei Routen, Guard
- `frontend/angular.json`: ändern, Konfiguration `mock` für `build` und `serve`
- `frontend/package.json`: ändern, Skript `start:mock`
- `project-rules/frontend.md`: ändern, Struktur (`shell`, `join`, `session`, `api/mock`), Fehlerweg, Mock
- `project-rules/testing.md`: ändern, Browser-Prüfung mit `start:mock` unter „What /verify runs“

Schritte:

1. `ws-messages.ts`, `api-error.ts`, `error-state.ts`, `error-messages.ts` (ein Text je Code aus 4.4 und ein allgemeiner).
2. `TokenStore` (Schlüssel `planningpoker.session.<id>`, Wert `{ participantId, token }`), `auth.interceptor.ts`, `api-error.interceptor.ts`, `ApiService`.
3. `web-socket-factory.ts`, `RealtimeService` (RxJS `webSocket` mit `openObserver` für `auth`, `interval(30000)` für `ping`, `retry` mit `delay` nach Versuchszahl, Stopp bei `error`-Nachricht), `SessionStore` mit `enter(sessionId)`: Token holen, `getSession`, Snapshot setzen, `RealtimeService` starten; `leave()`.
4. `session.guard.ts`, Routen, Shell mit Toolbar (`mat-toolbar`) und Banner, Platzhalterseiten mit `data-testid`.
5. Mock: Interceptor für `POST /api/sessions` (Session-ID `K7P2QX9M`, Token), `POST …/participants`, `GET /api/sessions/{id}` (Snapshot zur Rolle aus dem Token), Befehle 204; Fake-Socket liefert nach `auth` den Snapshot; `backend.providers.mock.ts`; `angular.json`-Konfiguration `mock` mit `fileReplacements`; Skript `start:mock`.
6. Tests: Guard, `ApiService` (`HttpTestingController`), `TokenStore`, `RealtimeService` (Fake-Fabrik mit `Subject`, `vi.useFakeTimers`), `SessionStore` (Beispiele aus `examples.ts`), `ErrorBanner`.
7. `project-rules/frontend.md` und `testing.md` nachziehen; `make check`, `make e2e`; `pnpm -C frontend start:mock` und Browser-Gang (Erstellen über den Mock, Raum, Neuladen).

Tests:

| Kriterium | Test |
|---|---|
| A1 | `frontend/src/app/api/session.guard.spec.ts`: ohne Token Umleitung auf `/session/:id/join`, mit Token Zugriff / Browser (Mock): `/session/K7P2QX9M` ohne und mit Token |
| A2 | `frontend/src/app/api/api.service.spec.ts`: je Methode Pfad, HTTP-Methode, Header; Problem Detail zu `ApiError` |
| A3 | `frontend/src/app/shell/error-banner.spec.ts`: Text je Code, nie `detail`, allgemeiner Text bei unbekanntem Code |
| A4 | `frontend/src/app/api/realtime.service.spec.ts`: `auth` zuerst, `ping` nach 30 s, Snapshot in den Store, Abstände 1, 2, 4, 8, 16, 30 s, kein Neuversuch nach `error` |
| A5 | `frontend/src/app/api/session-store.spec.ts`: sechs Beispiele, Ersetzen auf `null` |
| A6 | `frontend/src/app/api/token-store.spec.ts`: je Sitzungs-ID getrennt, fehlendes Token / Browser (Mock): Raum neu laden, Rolle bleibt |
| A7 | Browser (Mock): Startseite, Erstellen, Raum mit `session-id`, `session-phase`, `session-role` / Aufruf: `pnpm -C frontend build` und `grep -r "mock" dist/` ohne Treffer |
| A8 | Aufruf `make lint` / Browser: Toolbar, Banner |

Testdaten: die Beispiele aus `frontend/src/app/api/examples.ts`; der Mock erzeugt Token und IDs selbst.

Contracts zu regenerieren: keine.

## Offene Fragen

- [ ] keine

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/api/*.spec.ts`, `frontend/src/app/shell/*.spec.ts`, `make e2e` (`health.spec.ts`)
- Browser: `pnpm -C frontend start:mock`, dann `http://localhost:4200/` (Erstellen über den Mock), `/session/K7P2QX9M` (Raum, Neuladen), `/session/K7P2QX9M` ohne Token (Umleitung auf `/join`)
- Aufruf: Build ohne Mock (A7), `make lint` (A8)
