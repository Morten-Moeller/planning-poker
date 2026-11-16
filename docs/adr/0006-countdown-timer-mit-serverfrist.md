# 0006: Countdown-Timer als Sitzungseinstellung mit Frist im Snapshot und Auflösung durch den Server

Status: accepted
Datum: 2026-11-16
Spec: docs/specs/0016-countdown-timer.md
Ersetzt Grundregeln: keine

## Kontext

O-01 aus `docs/umsetzungsplan.md` (M14): Der Scrum Master setzt beim Start einer Runde eine Dauer.
Die Frist liegt im Snapshot als Zeitstempel (RFC 3339), und der Server löst nach Ablauf
automatisch auf, auch ohne verbundenen Scrum Master. Der Timer soll auf allen Clients synchron
laufen. Eine Runde startet heute an zwei Stellen: beim Freigeben eines Issues
(`POST …/active-issue`) und mit `POST …/round/restart`. Beide Befehle liegen in getrennten
Komponenten des Frontends: die Freigabe im Bedienfeld, „Neue Runde“ in der aufgedeckten Ansicht.
Die aufgedeckte Ansicht ändert auch O-02 (Spec 0017). Jede Auflösung ist bisher ein Befehl des
Scrum Masters. Zustandsänderungen laufen über `SessionRegistry.update` (ADR 0002), und Snapshots
gehen nach jedem `SessionChanged` hinaus (ADR 0004). Für den Verfall der Sitzungen gibt es
bereits einen periodischen Vert.x-Timer in `SessionRegistryProducer`.

## Optionen

### Option A: Dauer im Befehl, der die Runde startet

`SelectIssueRequest` bekommt `timerSeconds`, `POST …/round/restart` bekommt einen optionalen
Body.

- Vorteile: Die Dauer gehört genau zu dieser einen Runde, so wie der Umsetzungsplan sie
  beschreibt.
- Nachteile: Zwei Endpunkte und zwei Komponenten ändern sich, darunter die aufgedeckte Ansicht.
  Damit kann 0017 nicht in derselben Welle laufen. Der Scrum Master wählt die Dauer bei jeder
  Runde neu.

### Option B: Dauer als Einstellung der Sitzung

Ein neuer Endpunkt `PUT …/timer` mit `{ seconds }` setzt sie, `null` schaltet sie ab. Jede
Runde, die danach startet, bekommt die Frist „Start plus Dauer“.

- Vorteile: Freigabe und „Neue Runde“ bleiben unverändert. Ein Team schätzt meist mit
  derselben Dauer. 0016 und 0017 laufen parallel.
- Nachteile: Ein neuer Endpunkt und ein neues Feld der Sitzung. Eine geänderte Dauer wirkt erst
  ab dem nächsten Rundenstart, nicht auf die laufende Runde.

### Auslösen der automatischen Auflösung

- Client löst aus: Der erste Client, der den Ablauf sieht, ruft `reveal` auf. Verworfen: Nur der
  Scrum Master darf auflösen, und ohne ihn passiert nichts.
- Eine Aufgabe je Runde (`vertx.setTimer` zur Frist): Sie ist genau, muss aber bei Neustart,
  Issue-Wechsel und Bestätigung abgebrochen werden.
- Periodische Prüfung (`vertx.setPeriodic`, alle 250 ms): Sie löst jede Sitzung in `VOTING` auf,
  deren Frist erreicht ist, unter der Sperre der Sitzung. Es gibt nichts abzubrechen, denn
  eine verworfene Runde hat einfach keine fällige Frist mehr. Das Muster entspricht dem
  vorhandenen Verfall.

### Gleichlauf der Clients

Die Frist allein reicht nicht, wenn die Uhr eines Clients falsch geht. Jeder Snapshot trägt
deshalb `serverTime`, die Serverzeit beim Erzeugen. Das Frontend rechnet die Abweichung seiner
Uhr aus `serverTime` und zeigt die Restzeit als `deadline - (Date.now() + Abweichung)`.

## Entscheidung

Wir nehmen Option B mit periodischer Prüfung und `serverTime` im Snapshot. Option B lässt
Freigabe und aufgedeckte Ansicht unverändert, sodass O-02 parallel laufen kann. Die periodische
Prüfung folgt dem vorhandenen Verfall und braucht keine Abbruchlogik. `serverTime` macht die
Anzeige unabhängig von falsch gehenden Client-Uhren. Die Vertragsänderung ist nur additiv: ein
neuer Endpunkt sowie neue Felder `timerSeconds`, `serverTime` und `round.deadline`. Die Version
steigt von 2.0.0 auf 2.1.0.

## Folgen

- Der Zustandsautomat (4.3) bekommt die Zeile „VOTING, Frist erreicht, Server, REVEALED“. Die
  REST-Tabelle (4.4) bekommt `PUT …/timer`, das Snapshot-Beispiel (4.6) die neuen Felder. Der
  Umsetzungsplan wird in derselben Änderung nachgezogen.
- `SessionRegistry` bekommt `revealDue(Instant)`. Dieser Aufruf feuert `SessionChanged` nur für
  Sitzungen, die er tatsächlich aufgelöst hat.
- Die automatische Auflösung erzeugt denselben Protokolleintrag wie die manuelle Auflösung.
  Auch ohne Stimmen wird aufgelöst.
- Die Dauer liegt zwischen 5 und 3600 Sekunden. Das Frontend bietet feste Werte an.
- Die Genauigkeit liegt bei höchstens 250 ms nach der Frist plus Versandzeit, also innerhalb
  des Echtzeitziels von einer Sekunde.
