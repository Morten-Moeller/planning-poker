---
id: "0054"
title: "React-Frontend: API-Schicht, Zustand und Fehlerbanner"
status: approved
risk: high
adrs: ["0003", "0004", "0013", "0016"]
owner: Morten Möller
created: 2026-11-24
updated: 2026-11-24
pr: ""
note: freigegeben in der Session
---

# React-Frontend: API-Schicht, Zustand und Fehlerbanner

## Ziel

Das React-Frontend (Spec 0053) hat nur den Health-Aufruf. Die Seiten der nächsten Welle (Start,
Beitritt, Raum) brauchen die Aufrufe des Vertrags, den Zustand der Sitzung aus dem WebSocket, die
Ablage von Zugang und Einstellungen und den Fehlerpfad. Diese Spec baut diese Schicht in
`frontend-react/src/api/` mit dem Verhalten des Angular-Frontends (`frontend/src/app/api/`), dazu
das Banner in der Shell und die geschützte Route des Raums mit den Zuständen „wird geladen“ und
„abgelaufen“. Gelöst ist es, wenn die Unit-Tests das Verhalten je Dienst belegen und zwei neue
Playwright-Tests in beiden Frontends grün sind.

## Scope

### Enthalten

- `Api`: alle 14 Aufrufe von `ApiService` mit `fetch`, `Authorization` aus dem `TokenStore`,
  Fehler als `ApiError` mit Meldung an den `ErrorState`.
- `TokenStore`, `RecentSessions` mit der Einstellung aus `GET /api/config`, `PreferencesStore`;
  der `ThemeStore` nutzt den `PreferencesStore`.
- `Realtime` (WebSocket mit `auth`, `ping`, Wiederverbindung) und `SessionStore`.
- Fehlertexte je `errorCode` im Katalog, `errorMessage` und `formErrorMessage`.
- `ErrorBanner` in der Shell: Fehlertext mit „Schließen“ und Verbindungsbanner mit „Jetzt
  verbinden“.
- Route `/session/:id` mit `RequireSession` und einer Sitzungsseite, die nur `session-loading` und
  `session-gone` zeigt.
- Beispiel-Snapshots aus `contracts/api/examples/` mit Typprüfung, Regel für Teilnehmernamen,
  Test-Doppel für den WebSocket.

### Nicht enthalten

- Inhalt des Raums (Specs 0058 bis 0061), Beitrittsseite und Route `/session/:id/join` (0057),
  Formular der Startseite und Liste „Letzte Sitzungen“ (0056).
- Sitzung, Motiv und „Name · Rolle“ in der Toolbar (0057).
- Gemeinsame Bedienelemente in `frontend-react/src/ui/` (0055); die Buttons des Banners haben
  eigenes CSS, bis 0057 sie umstellt.
- Mock-Backend (Nicht-Ziel der Roadmap).
- Änderungen an Backend, Vertrag und Angular-Frontend außer der neuen Testdatei in
  `frontend/e2e/`.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Sitzung, Teilnehmer, Scrum Master, Entwickler, Zuschauer | wie in `docs/domain/glossary.md` |
| Snapshot | Nachricht `session.state` mit dem vollständigen Zustand der Sitzung für einen Teilnehmer (ADR 0004) |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | `Api` hat die Aufrufe `config`, `createSession`, `joinSession`, `getSession`, `listIssues`, `searchProjects`, `searchProjectIssues`, `selectIssue`, `setTimer`, `vote`, `startVoting`, `revealRound`, `restartRound`, `confirmRound` mit Methode, Pfad, Query (`search`, `page`, `weight`, `period`; nicht gesetzte Werte fehlen) und Body wie `frontend/src/app/api/api.service.ts`. Typen kommen aus `schema.d.ts`. Eine Antwort 204 ergibt `undefined`. | vitest: `frontend-react/src/api/api.spec.ts`, ein Fall je Aufruf |
| A2 | Jeder Aufruf unter `/api/sessions/{id}` außer `POST …/participants` sendet `Authorization: Bearer <token>` aus dem `TokenStore`; ohne Zugang und für alle anderen Pfade fehlt der Header. | vitest: `frontend-react/src/api/api.spec.ts` |
| A3 | Eine Antwort mit `errorCode` im Body (`application/problem+json`) wirft `ApiError` mit `errorCode`, `status` und `detail` und meldet ihn an den `ErrorState`. Eine andere Fehlerantwort und ein Netzfehler werfen einen Fehler, der kein `ApiError` ist, und melden nichts. | vitest: `frontend-react/src/api/api.spec.ts` |
| A4 | `TokenStore`: `store` schreibt `{ participantId, token }` in `sessionStorage` unter `planningpoker.session.<id>`; nur mit `RecentSessions.enabled` `true` und Angaben zu Rolle und Name auch den Eintrag der letzten Sitzungen. `identity` liest `sessionStorage`, fällt mit `enabled` `true` auf den Eintrag zurück und kopiert ihn; ungültiges JSON ergibt `null`. `remove` entfernt beides. | vitest: `frontend-react/src/api/token-store.spec.ts` |
| A5 | `RecentSessions`: höchstens fünf Einträge unter `planningpoker.recent-sessions`, neuester zuerst, erneutes Speichern rückt nach vorn; ungültiges JSON, ein ungültiger Eintrag oder ein Fehler von `localStorage` ergibt eine leere Liste. `loadSetting` setzt `enabled` aus `GET /api/config`; bei Fehler oder nach 3 s bleibt es `null`, und der Fehler steht nicht im `ErrorState`. `main.tsx` wartet darauf vor dem ersten Rendern. | vitest: `frontend-react/src/api/recent-sessions.spec.ts` |
| A6 | `PreferencesStore`: `read` und `save` unter `planningpoker.preferences` mit den Feldern, erlaubten Werten und Standardwerten von `frontend/src/app/api/preferences-store.ts`; ein Fehler von `localStorage` ergibt die Standardwerte. Der `ThemeStore` liest und schreibt `theme` nur über diesen Store; die Tests aus Spec 0053 bleiben grün. | vitest: `frontend-react/src/api/preferences-store.spec.ts`, `frontend-react/src/shell/theme-store.spec.ts` |
| A7 | `Realtime.connect` öffnet `ws(s)://<host>/ws/sessions/<id>`, sendet `auth` mit dem Token als erste Nachricht und alle 30 s `ping`, liefert jeden Snapshot und merkt sich die letzte Nachricht `round.allVoted`. | vitest: `frontend-react/src/api/realtime.spec.ts` mit `fake-web-socket.ts` und falscher Uhr |
| A8 | Nach einem Verbindungsende verbindet `Realtime` neu nach 1, 2, 4, 8, 16, dann je 30 s; ein Snapshot setzt die Folge zurück. Der Zustand ist `WAITING` mit `retryAt`, dann `CONNECTING`, nach einem Snapshot `OPEN`. `reconnectNow` verbindet sofort. Eine Nachricht `error` meldet einen `ApiError` an den `ErrorState` und beendet die Verbindung ohne neuen Versuch. Das Ende durch den Aufrufer schließt den Socket und stoppt Ping und Versuche. | vitest: `frontend-react/src/api/realtime.spec.ts` |
| A9 | `SessionStore.enter` lädt `getSession`, übernimmt die Antwort und danach jeden Snapshot vollständig; `leave`, ein Fehler und das Ende der Verbindung setzen den Snapshot auf `null`. Ohne Zugang geschieht nichts. `serverNow()` ist die Client-Uhr plus dem Abstand zu `serverTime` des letzten Snapshots; eine ungültige `serverTime` ergibt Abstand 0. | vitest: `frontend-react/src/api/session-store.spec.ts` mit den Beispiel-Snapshots |
| A10 | Der Katalog hat die Texte `error.<CODE>` für alle 14 Werte von `ErrorCode` und `error.unknown` mit dem Wortlaut von `frontend/src/app/api/error-messages.ts`. Ein neuer Wert von `ErrorCode` ohne Text lässt `make typecheck` scheitern. `formErrorMessage` liefert den Text nur für einen `ApiError` mit einem Code aus der übergebenen Menge. | vitest: `frontend-react/src/api/error-messages.spec.ts`; Aufruf: `make typecheck` |
| A11 | Die acht Dateien aus `contracts/api/examples/` sind als `SessionView` typgeprüft: ein zusätzliches oder fehlendes Feld oder ein falscher Grundtyp lässt `make typecheck` scheitern. | Aufruf: `make typecheck` mit einer geänderten Kopie im Scratchpad |
| A12 | Das Banner zeigt unter der Toolbar `error-banner` (`role="alert"`) mit dem Text zum `errorCode` in `error-message`, nie `detail`, und „Schließen“ (`error-close`), das den `ErrorState` leert. Ist die Verbindung nicht `OPEN`, zeigt es `connection-banner` mit „⚠ Verbindung zum Server unterbrochen.“, in `connection-retry` „Neuer Versuch in n s. Deine Karte bleibt erhalten.“ oder „Verbindung wird aufgebaut … Deine Karte bleibt erhalten.“ und den Button `connection-reconnect` „Jetzt verbinden“, der während `CONNECTING` gesperrt ist. Beide Buttons sind `Button` aus dem UI SDK. | vitest: `frontend-react/src/shell/error-banner.spec.tsx` |
| A13 | `/session/<id>` ohne Zugang für die Sitzung leitet auf `/session/<id>/join`. Mit Zugang lädt der Browser die Sitzungsseite als eigenen Chunk; sie ruft `enter` auf, zeigt `session-loading` „Sitzung wird geladen“ und beim Verlassen `leave`. | Playwright: `frontend/e2e/session-access.spec.ts` „a room without a stored token leads to the join page“ (`@react`); vitest: `frontend-react/src/api/require-session.spec.tsx`, `frontend-react/src/session/session-page.spec.tsx` |
| A14 | Meldet `getSession` oder der WebSocket `SESSION_NOT_FOUND`, zeigt die Sitzungsseite `session-gone` (`role="alert"`) „Diese Sitzung ist abgelaufen oder existiert nicht.“ mit dem Link `session-gone-home` „Zur Startseite“, entfernt den Zugang aus dem `TokenStore`, verlässt den `SessionStore` und leert den `ErrorState`; `error-banner` erscheint nicht. | Playwright: `frontend/e2e/session-access.spec.ts` „a stored token of an unknown session shows the state session gone“ (`@react`); vitest: `frontend-react/src/session/session-page.spec.tsx` |
| A15 | Die Namensregel `participantNameError` meldet leer oder nur Leerzeichen und mehr als 30 Zeichen wie `frontend/src/app/api/participant-name.ts`. | vitest: `frontend-react/src/api/participant-name.spec.ts` |
| A16 | `project-rules/frontend-react.md` beschreibt Struktur, Zustand, Fehlerpfad und Echtzeit der neuen Schicht; `project-rules/testing.md` nennt die Bereiche und die neue Testdatei. | Aufruf: `grep -n "session-store\|realtime\|session-access" project-rules/frontend-react.md project-rules/testing.md` |

## Contracts

keine Änderung. Die Schicht liest `frontend-react/src/api/schema.d.ts` (generiert) und die
Beispiele unter `contracts/api/examples/`.

## Risiko

Stufe: high
Begründung: `harness/scripts/risk-level.sh`: die Dateien unter `frontend-react/src/`,
`project-rules/**` sind medium; der Eskalator Schlüsselwörter (`token` in hinzugefügten Zeilen
von `token-store.ts`, `api.ts`, `realtime.ts`) hebt medium auf high. Inhaltlich trifft das zu: die
Schicht verwaltet die Teilnehmer-Tokens (ADR 0003, ADR 0013).
Gates: G2, das Label `human-approved` nach dem letzten Push; G3, der Status `verified`; Code-,
Sicherheits- und Architektur-Review.
ADR nötig: nein, kein neues. Die Änderung folgt ADR 0003 (Token je Teilnehmer), ADR 0004
(Snapshot in einen Store), ADR 0013 (letzte Sitzungen) und ADR 0016 (React ohne Zustands- und
i18n-Paket); sie fügt keine Abhängigkeit hinzu.

## Umsetzung

Entscheidungen:

- Keine neue Abhängigkeit, kein RxJS: `fetch`, der `WebSocket` des Browsers und Stores mit
  `subscribe` und `useSyncExternalStore`.
- `createBackend(window)` in `api/backend.tsx` baut alle Dienste einmal in `main.tsx`;
  Komponenten bekommen sie über `BackendProvider` und `useBackend()` (React Context), nie als
  Instanz auf Modulebene (A6.3).
- Die Route `/session/:id` kommt mit `React.lazy`; die Route `/session/:id/join` fehlt bis Spec
  0057, die Weiterleitung dorthin zeigt bis dahin einen leeren Hauptbereich.
- `main.tsx` wartet höchstens 3 s auf `GET /api/config`, bevor React rendert (wie der
  App-Initializer des Angular-Frontends).
- Neue Testdatei `frontend/e2e/session-access.spec.ts` mit zwei Tests, die gegen beide Frontends
  laufen.

Dateien:

- `frontend-react/src/api/api-error.ts`: neu, `ApiError`, `isProblemDetail`
- `frontend-react/src/api/error-state.ts`: neu, Store des letzten Fehlers
- `frontend-react/src/api/api.ts`: neu, die 14 Aufrufe, Kopf `Authorization`, Fehlerpfad
- `frontend-react/src/api/api.spec.ts`: neu
- `frontend-react/src/api/token-store.ts`: neu
- `frontend-react/src/api/token-store.spec.ts`: neu
- `frontend-react/src/api/recent-sessions.ts`: neu, Liste und `loadSetting`
- `frontend-react/src/api/recent-sessions.spec.ts`: neu
- `frontend-react/src/api/preferences-store.ts`: neu
- `frontend-react/src/api/preferences-store.spec.ts`: neu
- `frontend-react/src/api/ws-messages.ts`: neu, Typen der WebSocket-Nachrichten
- `frontend-react/src/api/realtime.ts`: neu
- `frontend-react/src/api/realtime.spec.ts`: neu
- `frontend-react/src/api/session-store.ts`: neu
- `frontend-react/src/api/session-store.spec.ts`: neu
- `frontend-react/src/api/error-messages.ts`: neu, `errorMessage`, `formErrorMessage`
- `frontend-react/src/api/error-messages.spec.ts`: neu
- `frontend-react/src/api/examples.ts`: neu, die acht Beispiel-Snapshots mit dem Typ `Exact`
- `frontend-react/src/api/participant-name.ts`: neu
- `frontend-react/src/api/participant-name.spec.ts`: neu
- `frontend-react/src/api/backend.tsx`: neu, `createBackend`, `BackendProvider`, `useBackend`, Hook für Stores
- `frontend-react/src/api/require-session.tsx`: neu, Weiterleitung ohne Zugang
- `frontend-react/src/api/require-session.spec.tsx`: neu
- `frontend-react/src/api/testing/fake-web-socket.ts`: neu, Test-Doppel für den WebSocket
- `frontend-react/src/api/testing/test-backend.tsx`: neu, Backend für Tests mit ersetztem `fetch` und WebSocket
- `frontend-react/src/session/session-page.tsx`: neu, `session-loading`, `session-gone`
- `frontend-react/src/session/session-page.module.css`: neu
- `frontend-react/src/session/session-page.spec.tsx`: neu
- `frontend-react/src/shell/error-banner.tsx`: neu
- `frontend-react/src/shell/error-banner.module.css`: neu
- `frontend-react/src/shell/error-banner.spec.tsx`: neu
- `frontend-react/src/shell/app-shell.tsx`: ändern, Banner zwischen Toolbar und Hauptbereich
- `frontend-react/src/shell/app-shell.spec.tsx`: ändern, Aufbau mit Test-Backend
- `frontend-react/src/shell/theme-store.ts`: ändern, Ablage über den `PreferencesStore`
- `frontend-react/src/shell/theme-store.spec.ts`: ändern, Aufbau mit `PreferencesStore`
- `frontend-react/src/app.tsx`: ändern, `BackendProvider`, Route `/session/:id`
- `frontend-react/src/main.tsx`: ändern, `createBackend`, `loadSetting`
- `frontend-react/src/i18n/messages.ts`: ändern, Schlüssel `error.*`, `connection.*`, `session.loading`, `session.gone`, `session.goneHome`
- `frontend-react/tsconfig.json`: ändern, `include` für `../contracts/api/examples`
- `frontend/e2e/session-access.spec.ts`: neu, zwei Tests mit `@react`
- `project-rules/frontend-react.md`: ändern, Struktur, Zustand, Fehlerpfad, Echtzeit, Routen
- `project-rules/testing.md`: ändern, Bereiche `frontend-react/src/api/`, `frontend-react/src/session/`, Testdatei
- `docs/roadmap.md`: ändern, Zeilen und Hinweise zu Welle 2 und 0055
- `docs/specs/0054-react-api-schicht-und-zustand.md`: neu

Schritte:

1. `api-error.ts`, `error-state.ts`, `ws-messages.ts`, `participant-name.ts`, `examples.ts`
   (Importpfad `../../../contracts/api/examples/…`), `tsconfig.json`.
2. `preferences-store.ts`, `recent-sessions.ts`, `token-store.ts` als Fabriken mit `Storage` und
   Uhr als Parameter; Tests je Datei, tabellengetrieben für die ungültigen Werte.
3. `api.ts`: eine Funktion `request` für Methode, Pfad, Query und Body; `Authorization` nach der
   Regel von `frontend/src/app/api/auth.interceptor.ts`; Fehlerpfad nach
   `api-error.interceptor.ts`. `health-api.ts` der Startseite bleibt unverändert.
4. `realtime.ts`: Fabrik mit `createSocket(url)`, `setTimeout`, `setInterval` und `Date.now` als
   Parameter; `connect(sessionId, token, onSnapshot, onEnd)` liefert die Funktion zum Beenden.
   Tests mit `fake-web-socket.ts` und den falschen Timern von vitest.
5. `session-store.ts`, `error-messages.ts` mit einem `Record<ErrorCode, MessageKey>`.
6. `backend.tsx`, `testing/test-backend.tsx`; `theme-store.ts` auf den `PreferencesStore`
   umstellen, `main.tsx` und `app.tsx`.
7. `error-banner.tsx` mit `Button` aus `@ui-sdk/react/button`; `app-shell.tsx`.
8. `require-session.tsx`, `session-page.tsx` (`React.lazy` in `app.tsx`).
9. `frontend/e2e/session-access.spec.ts`: Test 1 öffnet `/session/ABCDEFGH` und erwartet die URL
   `/session/ABCDEFGH/join`; Test 2 legt mit `page.addInitScript` einen Zugang für eine
   unbekannte Sitzungs-ID in `sessionStorage` und erwartet `session-gone` ohne `error-banner`.
10. `project-rules/frontend-react.md`, `project-rules/testing.md`.
11. `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `frontend-react/src/api/api.spec.ts`: Tabelle mit Aufruf, Methode, URL, Body; Antwort 204 |
| A2 | `frontend-react/src/api/api.spec.ts`: Kopf für Sitzungspfade, kein Kopf für Beitritt, andere Pfade, fehlenden Zugang |
| A3 | `frontend-react/src/api/api.spec.ts`: `problem+json`, Antwort 500 ohne `errorCode`, Netzfehler |
| A4 | `frontend-react/src/api/token-store.spec.ts` |
| A5 | `frontend-react/src/api/recent-sessions.spec.ts`: Liste, Grenze fünf, ungültige Werte, `loadSetting` mit Erfolg, Fehler und 3 s |
| A6 | `frontend-react/src/api/preferences-store.spec.ts`; `frontend-react/src/shell/theme-store.spec.ts` |
| A7 | `frontend-react/src/api/realtime.spec.ts`: URL, `auth`, `ping`, Snapshot, `round.allVoted` |
| A8 | `frontend-react/src/api/realtime.spec.ts`: Folge der Wartezeiten, Rücksetzen, Zustände, `reconnectNow`, `error`, Beenden |
| A9 | `frontend-react/src/api/session-store.spec.ts` |
| A10 | `frontend-react/src/api/error-messages.spec.ts`; Aufruf `make typecheck` |
| A11 | Aufruf `make typecheck` mit geänderter Kopie |
| A12 | `frontend-react/src/shell/error-banner.spec.tsx` |
| A13 | `frontend/e2e/session-access.spec.ts` (`@react`); `frontend-react/src/api/require-session.spec.tsx`; `frontend-react/src/session/session-page.spec.tsx` |
| A14 | `frontend/e2e/session-access.spec.ts` (`@react`); `frontend-react/src/session/session-page.spec.tsx` |
| A15 | `frontend-react/src/api/participant-name.spec.ts` |
| A16 | Aufruf `grep` wie im Kriterium |

Testdaten: Beispiel-Snapshots aus `contracts/api/examples/`. Test-Doppel nur für `fetch`, den
WebSocket, `Storage` und die Uhr (Netz- und Plattformgrenze, T1.4); keine Doppel eigener Module.
Die Playwright-Tests brauchen keine Sitzung.

## Offene Fragen

keine

## Verifikationsplan

- make check
- betroffene Tests: `pnpm -C frontend-react test`; `make e2e` (React-Lauf mit sieben Tests)
- Browser: `/session/ABCDEFGH` ohne Zugang (Weiterleitung) und mit einem Zugang für eine unbekannte
  Sitzung (`session-gone`), hell und dunkel; Banner mit gestopptem Backend nach geladenem Raum ist
  erst mit Spec 0058 im Browser prüfbar
