# 0004: REST für Befehle, WebSocket mit vollständigem Snapshot, Signals-Store im Frontend

Status: accepted
Datum: 2026-11-16
Spec: docs/specs/0001-projektgeruest.md
Ersetzt Grundregeln: A7.1

## Kontext

Alle Teilnehmer sehen Teilnehmerliste, freigegebenes Issue, Abstimmungsstatus und aufgedeckte
Karten in Echtzeit (R-22); der Scrum Master wird aktiv hingewiesen, sobald alle geschätzt haben
(R-13). Der Snapshot ist je Empfänger gefiltert: verdeckte Karten anderer Teilnehmer fehlen bis
zur Auflösung. A7.1 verlangt im Frontend einen Query-Cache für Serverdaten; A7.2 verlangt, dass
ein Schreibvorgang die betroffenen Lesevorgänge ungültig macht.

## Optionen

### Option A: REST-Befehle, WebSocket sendet nach jeder Änderung den vollständigen Snapshot

- Vorteile: Der Server ist die einzige Quelle der Wahrheit; das Frontend ersetzt seinen Zustand
  vollständig, es gibt keine Delta-Logik und keine Reihenfolgeprobleme; die Filterung je Rolle
  liegt an einer Stelle (Mapper); neue Befehle brauchen keinen Code in `realtime`; Befehle
  antworten 204 und sind mit REST Assured einfach zu testen.
- Nachteile: Jede Änderung sendet den ganzen Snapshot; bei den Datenmengen einer Schätzrunde
  (wenige Teilnehmer, Protokoll einer Sitzung) ohne Bedeutung.

### Option B: WebSocket mit Ereignissen und Deltas

- Vorteile: Kleinere Nachrichten.
- Nachteile: Jeder Client baut den Zustand aus Deltas nach; verlorene oder doppelte Nachrichten
  führen zu abweichenden Zuständen; die Filterung je Rolle muss je Ereignis geprüft werden.

### Option C: Abfragen (Polling) mit Query-Cache nach A7.1

- Vorteile: Erfüllt A7.1 wörtlich; keine WebSocket-Verbindung.
- Nachteile: Echtzeit nur mit kurzen Intervallen; Hinweis an den Scrum Master (R-13) verzögert;
  mehr Last pro Teilnehmer; ein Query-Cache als zusätzliche Bibliothek für Daten, die der Server
  ohnehin vollständig schickt.

## Entscheidung

Option A. Befehle gehen per REST unter `/api` und antworten ohne Zustand. Nach jeder
Zustandsänderung sendet der Server jedem verbundenen Teilnehmer `session.state` mit dem
vollständigen, gefilterten `SessionView`; `round.allVoted` geht nur an den Scrum Master. Im
Frontend übernimmt ein `SessionStore` auf Signals-Basis jeden Snapshot vollständig; der
`RealtimeService` verbindet neu mit wachsendem Abstand, sendet `ping` alle 30 Sekunden und
`auth` als erste Nachricht. Einzelabfragen wie die Issue-Suche bleiben lokal in der Komponente.

## Folgen

- A7.1 wird ersetzt: Serverdaten der Sitzung liegen im `SessionStore` statt in einem Query-Cache;
  globaler Client-Zustand bleibt auf Sitzung und Identität beschränkt. Ein Query-Cache wird nicht
  eingeführt.
- A7.2 gilt in der Form: Ein Befehl löst keinen Neuladevorgang aus; der nächste Snapshot ersetzt
  den Zustand. Nichts wird von Hand nachgeladen.
- Der Vertrag für REST und WebSocket entsteht in Spec 0002 aus den Java-DTOs
  (`quarkus-smallrye-openapi`) und einer statischen Ergänzung für die WebSocket-Nachrichten;
  `openapi-typescript` erzeugt die Frontend-Typen.
- `project-rules/frontend.md` nennt unter „State and data“ dieses Muster.
