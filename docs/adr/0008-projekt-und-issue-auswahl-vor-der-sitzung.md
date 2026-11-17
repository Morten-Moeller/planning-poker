# 0008: Offene Projekt- und Issue-Auswahl vor dem Anlegen einer Sitzung

Status: accepted
Datum: 2026-11-17
Spec: docs/specs/0022-projekt-und-issue-auswahl.md
Ersetzt Grundregeln: keine

## Kontext

Wer eine Sitzung anlegt, tippt heute GitLab-Projekt-ID und Issue-iid ein. Die Person wünscht eine
Auswahl mit Namen. Vor dem Anlegen gibt es noch keine Sitzung, kein Teilnehmer-Token und keine
Rolle (ADR 0003). Eine Liste auf der Startseite ist deshalb ein offener Endpunkt. ADR 0005 hat das
Risiko des offenen Erstellens akzeptiert: Jeder, der das Backend erreicht, kann Issues jedes
Projekts lesen, das der GitLab-Token sieht, wenn er eine Projekt-ID kennt. Als Schutz dient die
Projekt-Allowlist. Eine Liste macht die Projekte ohne Raten sichtbar, und jede Suche löst Aufrufe
an GitLab aus.

## Optionen

### Option A: Allowlist, sonst Projekte mit Mitgliedschaft des Tokens

Ist `planningpoker.session.allowed-projects` gesetzt, liefert die Liste nur diese Projekte. Namen
und Pfade kommen aus GitLab. Ohne Allowlist liefert sie
`GET /projects?membership=true&simple=true`.

- Vorteile: Wer die Offenlegung begrenzen will, setzt die Allowlist und begrenzt damit auch die
  Liste. Für einen Project Access Token ist die Liste ohnehin ein Projekt.
- Nachteile: Ohne Allowlist sieht jeder, der das Backend erreicht, die Namen aller Projekte mit
  Mitgliedschaft des Tokens.

### Option B: Liste nur mit Allowlist

- Vorteile: Ohne Konfiguration gibt es keine zusätzliche Offenlegung.
- Nachteile: Der häufigste Fall, eine lokale Instanz mit eigenem Token, bekommt die Auswahl nur
  mit zusätzlicher Konfiguration.

### Option C: Immer alle Projekte, die der Token sieht

- Vorteile: Die Auswahl ist am größten.
- Nachteile: Die Offenlegung ist am größten, und die Allowlist begrenzt die Liste nicht.

## Entscheidung

Option A, gewählt von der Person am 2026-11-17. Die Issue-Suche vor dem Anlegen
(`GET /api/projects/{projectId}/issues`) prüft die Allowlist wie das Anlegen und liest nur offene
Issues. Beide Endpunkte sind offen und lesen nur.

## Folgen

- Zwei neue offene Endpunkte im Vertrag, Version `2.3.0` (nach 0021 mit `2.2.0`).
- Der Absatz zum verbleibenden Risiko im README und „Accepted risk“ in `project-rules/backend.md`
  nennen die Liste und empfehlen die Allowlist für erreichbare Instanzen.
- Jede Suche ruft GitLab auf. Das Frontend wartet 300 ms nach der letzten Eingabe, eine Seite hat
  20 Einträge. Ein Rate-Limit bleibt dokumentiertes Risiko (ADR 0005).
- Die Prüfung der Allowlist zieht aus `SessionResource` in eine gemeinsame Klasse um.
