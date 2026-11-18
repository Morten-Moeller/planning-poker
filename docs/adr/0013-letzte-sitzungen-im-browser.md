# 0013: Letzte Sitzungen mit Zugang im localStorage, abschaltbar

Status: accepted
Datum: 2026-11-18
Spec: docs/specs/0039-letzte-sitzungen.md
Ersetzt Grundregeln: keine; ändert einen Punkt aus ADR 0003 (Ablage nur im `sessionStorage`), solange das Feature eingeschaltet ist

## Kontext

ADR 0003 legt das Teilnehmer-Token nur in den `sessionStorage` je Sitzung. Ein geschlossener Tab
verliert damit die Identität. Für den Scrum Master heißt das: Er kommt nicht mehr als Scrum Master
in seine Sitzung zurück, und sein Name bleibt in der Sitzung belegt. Die Person möchte auf der
Startseite die letzten aktiven Sitzungen sehen und mit derselben Rolle zurückkehren.

Die Anwendung soll hinter einem Microsoft-SSO-Proxy laufen, sodass nur berechtigte Nutzer sie
erreichen. Für einen Betrieb in einem offenen Umfeld soll das Feature abschaltbar sein.

## Optionen

### Option A: Zugang je Sitzung im localStorage, über eine Einstellung des Backends abschaltbar

Der Browser merkt sich die letzten fünf Sitzungen mit Sitzungs-ID, Teilnehmer-ID, Token, Rolle,
Name und Zeitpunkt. Das Backend meldet über `GET /api/config`, ob das Feature an ist.

- Vorteile:
  - Zurückkehren mit Rolle nach geschlossenem Tab oder Neustart des Browsers.
  - Der Betreiber entscheidet je Instanz.
  - Kein Login, ADR 0003 bleibt sonst gültig.
- Nachteile:
  - Das Token liegt dauerhaft im Browser. Ein Skript, das durch eine Lücke (XSS) in der Seite läuft, kann es lesen. Wer am selben Rechner im selben Browserprofil sitzt, kann die Sitzung in dieser Rolle öffnen.
  - SSO schützt davor nicht: Es regelt, wer die Anwendung erreicht, nicht, wer an einem Browser sitzt oder welches Skript in der Seite läuft.
  - Gemildert wird das dadurch, dass ein Token nur für eine Sitzung gilt und mit ihr verfällt (`planningpoker.session.ttl`, Standard 12 h ohne Aktivität). Die Liste hält höchstens fünf Einträge, und Issue-Beschreibungen gehen durch die Bereinigung von Angular und die Content-Security-Policy.

### Option B: Liste ohne Token, Klick führt zur Beitrittsseite

- Vorteile: kein Token im `localStorage`.
- Nachteile: Zurückkehren als Scrum Master geht nicht, der eigentliche Nutzen fehlt.

### Option C: Anmeldung über Microsoft-Identität in der Anwendung

- Vorteile: echte Identität, Rückkehr über das Konto.
- Nachteile: Login ist nicht im Scope (ADR 0003), viel größerer Umbau.

## Entscheidung

Option A, gewählt von der Person am 2026-11-18. Standard ist **an**
(`planningpoker.session.remember=true`), weil der geplante Betrieb hinter Microsoft SSO liegt. Wer
die Anwendung in einem offenen Umfeld betreibt, setzt `PLANNINGPOKER_SESSION_REMEMBER=false`.
Ist das Feature aus, speichert das Frontend nichts und löscht beim Laden der Startseite eine
vorhandene Liste.

## Folgen

- Vertrag: neuer Endpunkt `GET /api/config` mit `{ "rememberSessions": boolean }`, ohne Anmeldung. Version `3.4.0`, additiv.
- ADR 0003 gilt weiter für die Ablage im `sessionStorage`. Nur bei eingeschaltetem Feature liegt das Token zusätzlich im `localStorage`.
- README: Abschnitt „Verbleibendes Risiko“ und die Tabelle der Umgebungsvariablen nennen die Einstellung und ihr Risiko.
- `project-rules/frontend.md` nennt den Schlüssel und die Regeln der Liste.
