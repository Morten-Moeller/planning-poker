# 0005: Obergrenzen und Projekt-Allowlist für die offenen Endpunkte, NOT_IMPLEMENTED entfällt

Status: accepted
Datum: 2026-11-16
Spec: docs/specs/0015-haertung.md
Ersetzt Grundregeln: keine

## Kontext

Erstellen und Beitreten brauchen kein Login (ADR 0003). Das Backend liest jedes Projekt, das der
GitLab-Token der Instanz sieht, und hält alle Sitzungen im Arbeitsspeicher (ADR 0002). Bisher ist
das als Risiko in `project-rules/backend.md` dokumentiert; die Entscheidung über Gegenmaßnahmen
wurde auf die Härtung verschoben (Specs 0006, 0007). Außerdem enthält der Vertrag noch den
`errorCode` `NOT_IMPLEMENTED` (501) aus 0002, den seit 0010 kein Endpunkt mehr liefert. Ihn zu
entfernen streicht einen Enum-Wert und bricht damit den Vertrag (`contracts/README.md`).

## Optionen

### Option A: Nichts ändern, Risiko dokumentiert lassen

- Vorteile: kein Aufwand, kein Vertragsbruch.
- Nachteile: ein Aufrufer kann beliebig viele Sitzungen und Teilnehmer anlegen und so den
  Arbeitsspeicher füllen; jeder kann Issues jedes Projekts lesen, das der Token sieht; der
  Vertrag nennt einen Code, den es nicht mehr gibt.

### Option B: Obergrenzen und Projekt-Allowlist

- Vorteile: der Speicherbedarf ist begrenzt; der Betreiber legt fest, welche Projekte Sitzungen
  bekommen; beides ist Konfiguration ohne neue Abhängigkeit.
- Nachteile: zwei neue `errorCode`s im Vertrag; Zahl-ID und Pfad eines Projekts sind getrennte
  Einträge der Allowlist.

### Option C: zusätzlich Rate-Limit je Client-IP und Grenzen für WebSocket-Verbindungen vor `auth`

- Vorteile: bremst auch schnelle Wiederholungen und offene Verbindungen ohne Anmeldung.
- Nachteile: ein Rate-Limit braucht einen Zähler je IP und hinter einem Proxy die echte
  Client-Adresse; für eine Team-Anwendung ohne öffentlichen Betrieb ist der Nutzen gering.

## Entscheidung

Option B, von der Person am 2026-11-16 gewählt. Das Backend begrenzt die Zahl der lebenden
Sitzungen (`planningpoker.session.max-sessions`, Standard 1000) und der Teilnehmer je Sitzung
(`planningpoker.session.max-participants`, Standard 50, der Scrum Master zählt mit) und antwortet
beim Überschreiten mit 409 `LIMIT_REACHED`. Ist `planningpoker.session.allowed-projects` gesetzt,
legt es Sitzungen nur für diese Projekt-IDs an (exakter Vergleich nach dem Trimmen) und antwortet
sonst mit 403 `PROJECT_NOT_ALLOWED`, ohne GitLab zu fragen; ohne den Schlüssel bleiben alle
Projekte erlaubt. Rate-Limit und WebSocket-Grenzen (Option C) bleiben dokumentiertes Risiko.
`NOT_IMPLEMENTED` entfällt. Die Antworten 404 für eine unbekannte und 401 für ein fremdes Token
einer bestehenden Sitzung bleiben getrennt, weil der Beitritt die Existenz einer Sitzung ohnehin
mit 404 meldet.

## Folgen

- Vertrag: `ErrorCode` erhält `PROJECT_NOT_ALLOWED` (403) und `LIMIT_REACHED` (409) und verliert
  `NOT_IMPLEMENTED`; `info.version` geht von `1.0.0` auf `2.0.0`. Einziger Verbraucher ist das
  Frontend dieses Repositorys; es zieht in derselben Änderung nach (`make contracts`,
  Fehlertexte). Eine alte Vertragsversion bleibt deshalb nicht parallel bestehen.
- `project-rules/backend.md`: der Absatz „Accepted risk“ nennt die Allowlist und die Obergrenzen
  und behält Rate-Limit und WebSocket-Grenzen als Risiko.
- `docs/domain/invariants.md`: neue Invarianten für beide Obergrenzen und die Allowlist.
- README: drei neue Konfigurationsschlüssel, die neuen Codes, das Verhalten bei 401 und 404.
