# 0002: Sitzungen nur im Arbeitsspeicher, keine Datenbank

Status: accepted
Datum: 2026-11-16
Spec: docs/specs/0001-projektgeruest.md
Ersetzt Grundregeln: A4.1, A4.3, A4.4, T1.2

## Kontext

Persistenz über einen Backend-Neustart hinaus ist nicht im Scope (`docs/umsetzungsplan.md`,
Abschnitt 1). Sitzungen verfallen nach 12 Stunden ohne Aktivität (A-09). Jede Sitzung wird von
wenigen Teilnehmern gleichzeitig geändert; Befehle derselben Sitzung müssen nacheinander laufen,
und ein Snapshot darf erst nach Abschluss eines Befehls versendet werden. Die Grundregeln A4.1,
A4.3 und A4.4 setzen eine Datenbank mit Migrationen, Zeitstempeln je Tabelle und atomaren
Anweisungen voraus; T1.2 verlangt Integrationstests gegen die echte Datenbank-Engine.

## Optionen

### Option A: Arbeitsspeicher mit Sperre je Sitzung

- Vorteile: Kein Betrieb einer Datenbank, kein Container für Tests, keine Migrationen; ein
  frischer Klon startet mit zwei Befehlen; die Sperre je Sitzung (`SessionRegistry.update(…)`)
  macht jeden Befehl atomar und ist einfach zu testen (50 parallele Stimmabgaben).
- Nachteile: Ein Neustart löscht alle Sitzungen; nur eine Backend-Instanz; der Verfall muss im
  Code laufen.

### Option B: Eingebettete Datenbank (H2 oder SQLite) mit Migrationen

- Vorteile: Grundregeln A4 gelten unverändert; Sitzungen überleben einen Neustart.
- Nachteile: Schema, Migrationen und Mapping für Daten, die laut Scope nach 12 Stunden verfallen;
  Nebenläufigkeit braucht trotzdem eine Sperre oder optimistisches Sperren je Sitzung; mehr Code
  ohne Anforderung dahinter.

### Option C: PostgreSQL im Container

- Vorteile: Mehrere Backend-Instanzen möglich.
- Nachteile: Docker als Voraussetzung für Start und Tests; gegen „lokaler Start reicht“; weit
  über dem Scope der Challenge.

## Entscheidung

Option A. `SessionRegistry` hält die Sitzungen in einer `ConcurrentHashMap`; jede Änderung läuft
über `update(sessionId, befehl)`: Sperre je Sitzung, Ausführung, Änderungs-Event nach dem
Verlassen der Sperre. GitLab-Aufrufe laufen nie unter der Sperre (Abschnitt 4.3 des Plans).
Ein Verfall nach `planningpoker.session.ttl` räumt inaktive Sitzungen ab.

## Folgen

- A4.1 und A4.3 entfallen: kein Schema, keine Migrationen, keine Tabellen. Die Regeln A4.5 bis
  A4.8 haben keinen Gegenstand.
- A4.4 wird ersetzt: Eine zustandsabhängige Änderung ist ein Befehl unter der Sperre der Sitzung,
  der den Zustand prüft und bei einem ungültigen Übergang `INVALID_STATE` liefert. Lesen, ändern,
  speichern außerhalb der Sperre gibt es nicht.
- T1.2 wird ersetzt: Integrationstests laufen gegen die echte `SessionRegistry` im Arbeitsspeicher
  über die HTTP-Schnittstelle; es gibt keine Datenbank-Engine, gegen die sie laufen könnten.
- A3.1 bis A3.5 gelten sinngemäß: Eingabeprüfung an der Grenze, Zustandsprüfung unter der Sperre,
  kein externer Aufruf unter der Sperre (A3.3), Snapshots erst nach dem Befehl (A3.4).
- `project-rules/backend.md` nennt unter „Data“ diese ADR statt einer Datenbank und eines
  Migrationswerkzeugs. `wave_exclusive` für Migrationen bleibt ohne Treffer.
