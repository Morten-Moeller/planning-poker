# Systemübersicht

Verbindliche Beschreibung: `docs/umsetzungsplan.md`, Abschnitt 4. Entscheidungen: ADR 0001 bis
0004 in `docs/adr/`.

## Kontext

| Akteur / System | Rolle | Schnittstelle |
|---|---|---|
| Scrum Master | erstellt die Sitzung, wählt Issues, gibt frei, löst auf, bestätigt | Browser, Frontend |
| Entwickler | tritt bei, wählt verdeckt Karten | Browser, Frontend |
| GitLab | Quelle der Issues und Ziel des Ergebnisses | REST-API v4 mit `PRIVATE-TOKEN`, nur vom Backend aus |

## Container

| Container | Technik | Verantwortung | Spricht mit |
|---|---|---|---|
| Frontend | Angular (Standalone Components, Signals, Angular Material), pnpm, Dev-Server auf Port 4200 | Oberfläche auf Deutsch; Befehle per REST, Zustand per WebSocket-Snapshot in einem Signals-Store | Backend über `/api` und `/ws` (Dev-Proxy, derselbe Origin) |
| Frontend (React) | React 19 mit UI SDK, Vite, pnpm, Dev-Server auf Port 4300 (`frontend-react/`, ADR 0016) | dieselbe Oberfläche wie das Angular-Frontend mit denselben `data-testid`, Texten und Tokens; dieselbe Playwright-Suite | Backend über `/api` und `/ws` (Vite-Proxy, derselbe Origin) |
| Backend | Quarkus 3 auf Java 25, Port 8080 | Einzige Quelle der Wahrheit: Sitzungen im Arbeitsspeicher, Rollen- und Zustandsprüfung, GitLab-Zugriff, Snapshots | GitLab (REST-Client), Frontend (REST, WebSocket) |
| GitLab-Double | WireMock Standalone mit festen Mappings (ab Spec 0011) | Ersatz für GitLab in End-to-End-Tests | Backend im Profil `e2e` |

## Modulgrenzen

Backend, Basispaket `planningpoker`, gegliedert nach Fachfunktion (A1.1):

| Paket | Verantwortung | Darf verwenden |
|---|---|---|
| `session` | Sitzung, Teilnehmer, Runden, Protokoll, Befehle, `SessionRegistry`, Mapper auf `SessionView` | `gitlab`, `platform` |
| `gitlab` | REST-Client für GitLab, Konfiguration, Abbildung der GitLab-Fehler auf eigene Fehlertypen | `platform` |
| `realtime` | WebSocket-Endpunkt, `auth`-Handshake, Verbindungsregister, Versand der Snapshots auf das Änderungs-Event | `session`, `platform` |
| `platform` | Code ohne Fachbegriffe: Health, Token-Prüfung, Fehlerformat, ID-Erzeugung | nichts aus den Fachpaketen (A1.6) |

Frontend, `frontend/src/app`, ein Ordner je Feature (`start`, `join`, `session`) und `api` für
die generierten Typen und die Dienste `ApiService`, `RealtimeService`, `SessionStore` (ab Spec
0005). Komponenten lesen den Zustand aus dem `SessionStore` und senden Befehle über den
`ApiService`; Einzelabfragen wie die Issue-Suche bleiben in der Komponente (ADR 0004).

Zweites Frontend, `frontend-react/src`, ein Ordner je Feature (`start`, `join`, `session`,
`shell`), dazu `api` (generierte Typen, Aufrufe, Stores), `ui` (gemeinsame Bedienelemente), `i18n`
(Texte) und `styles` (Tokens). Regeln:
`project-rules/frontend-react.md`.

Jeder Befehl läuft über `SessionRegistry.update(…)`: Sperre je Sitzung, Ausführung,
Änderungs-Event (ADR 0002). GitLab-Aufrufe laufen nie unter der Sperre.

## Querschnitt

- Authentifizierung: Token je Teilnehmer aus der Antwort auf Erstellen oder Beitreten, als
  `Authorization: Bearer` und als erste WebSocket-Nachricht `auth` (ADR 0003).
- Autorisierung: Rolle aus dem Token; Rollenprüfung im Backend je Endpunkt
  (`docs/umsetzungsplan.md`, 4.4).
- Fehler: RFC 9457 `application/problem+json` mit stabilem `errorCode`; Clients entscheiden nur
  anhand des Codes (A2.3).
- Logging: `quarkus-logging-json`, Request-ID je Anfrage; keine Tokens und keine verdeckten
  Kartenwerte in Logs (A6.4).
- Konfiguration: `planningpoker.gitlab.base-url`, `planningpoker.gitlab.token` (aus
  `GITLAB_TOKEN`), `planningpoker.gitlab.write-weight`, `planningpoker.session.ttl` in
  `backend/src/main/resources/application.properties` (A6.1).
- Vertrag: `contracts/api/openapi.yaml` aus den Java-DTOs, TypeScript-Typen aus dem Vertrag
  (ab Spec 0002, A2.1), für beide Frontends von `make contracts` geschrieben.
