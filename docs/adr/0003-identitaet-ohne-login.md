# 0003: Identität ohne Login: Token je Teilnehmer, Session-ID mit 8 Zeichen, UUIDv7

Status: accepted
Datum: 2026-11-16
Spec: docs/specs/0001-projektgeruest.md
Ersetzt Grundregeln: A4.2 (nur für die Session-ID)

## Kontext

Login und Benutzerverwaltung sind nicht im Scope. Trotzdem erzwingt das Backend die Rollen
(R-05): Steuerungsaktionen nur für den Scrum Master, Schätzen nur für Entwickler. Dafür muss der
Server jeden Aufruf einem Teilnehmer zuordnen, ohne dass der Client seine Rolle selbst setzt
(A5.1). Teilnehmer tippen die Session-ID ab (R-02). Für die Vorführung sitzen mehrere Teilnehmer in
Tabs eines Browsers (A-08). A4.2 verlangt UUIDv7 für alle IDs.

## Optionen

### Option A: Token je Teilnehmer, von der Server-Antwort beim Erstellen oder Beitreten

- Vorteile: Kein Login, kein Identitätsanbieter; die Rolle hängt am Token, nicht an Request-Daten
  (A5.1); `sessionStorage` je Sitzung erlaubt mehrere Teilnehmer in einem Browser; Wiedereinstieg
  nach Verbindungsabbruch mit demselben Token (A-10).
- Nachteile: Ein geschlossener Tab verliert die Identität; wer den Token weitergibt, handelt als
  dieser Teilnehmer. Beides ist für eine Schätzrunde im Team hinnehmbar.

### Option B: Anmeldung über GitLab (OAuth)

- Vorteile: Echte Identität; der GitLab-Token könnte je Nutzer gelten.
- Nachteile: Login ist ausdrücklich nicht im Scope; OAuth-Anwendung in GitLab nötig; gegen die
  Vorführung mit mehreren Teilnehmern in einem Browser.

### Option C: Keine Authentifizierung, Rolle und Teilnehmer-ID im Request

- Vorteile: Am wenigsten Code.
- Nachteile: Verstößt gegen A5.1 und R-05; jeder Client kann sich zum Scrum Master erklären oder
  fremde Karten setzen.

## Entscheidung

Option A. Beim Erstellen oder Beitreten vergibt der Server eine Teilnehmer-ID (UUIDv7) und ein
Token mit mindestens 128 Bit aus `SecureRandom`. Jeder weitere REST-Aufruf trägt
`Authorization: Bearer <token>`; der WebSocket erhält das Token in der ersten Nachricht `auth`,
nie in der URL. Das Token liegt nur serverseitig am Teilnehmer und im `sessionStorage` des
Browsers je Sitzungs-ID; es erscheint in keinem Snapshot und keinem Log. Die Session-ID hat 8
Zeichen aus Großbuchstaben und Ziffern ohne 0, O, 1, I und L (A-17), weil Teilnehmer sie abtippen.

## Folgen

- A4.2 gilt für Teilnehmer-IDs unverändert (UUIDv7) und wird nur für die Session-ID ersetzt.
- A5.1 bis A5.3 gelten: Rolle aus dem Token; die Teilnehmer-Zuordnung prüft derselbe Filter, der
  das Token prüft; ein fehlendes Token ist nie Scrum-Master-Zugang.
- Token-Prüfung ist Plattform-Code (`platform`), ohne Fachbegriffe; die Rollenprüfung ist eine
  Annotation oder ein Interceptor (Spec 0006).
- `project-rules/backend.md` nennt unter „APIs“ dieses Muster; `project-rules/frontend.md` die
  Ablage im `sessionStorage` je Sitzung.
