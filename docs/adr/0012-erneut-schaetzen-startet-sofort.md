# 0012: „Erneut schätzen“ startet die neue Runde sofort

Status: accepted
Datum: 2026-11-17
Spec: docs/specs/0034-erneut-schaetzen.md
Ersetzt Grundregeln: keine

## Kontext

Nach ADR 0010 führt „Neue Runde“ aus `REVEALED` nach `DISCUSSION`. Der Scrum Master muss danach
noch einmal „Schätzung starten“ klicken. Beim Test hat die Person das verwirrt: Nach dem Klick
auf „Neue Runde“ erschien nur wieder der Button „Schätzung starten“. Diskutiert wurde schon in der
aufgedeckten Ansicht, wo das Team über die Ausreißer spricht. Die Person wünscht den Text
„Erneut schätzen“ und den sofortigen Start der neuen Runde.

## Optionen

### Option A: „Erneut schätzen“ führt direkt nach `VOTING`

`POST …/round/restart` erhöht die Rundennummer, löscht die Stimmen, setzt die Frist wie
„Schätzung starten“ und wechselt nach `VOTING`.

- Vorteile: ein Klick; der Name sagt, was passiert; die Diskussion bleibt der Freigabe vorbehalten.
- Nachteile: Die Folgephase ändert sich gegenüber ADR 0010. Für das einzige Frontend ist das eine Änderung im Verhalten des Vertrags.

### Option B: Bei `DISCUSSION` bleiben und nur den Text ändern

- Vorteile: kein Eingriff ins Backend.
- Nachteile: Der zweite Klick bleibt, und genau der hat verwirrt.

## Entscheidung

Option A, gewählt von der Person am 2026-11-17. Dieses ADR ersetzt den Punkt „Neue Runde führt
nach `DISCUSSION`“ aus ADR 0010. Alles andere aus ADR 0010 gilt weiter: Die Freigabe führt nach
`DISCUSSION`, und die Frist startet mit dem Beginn der Schätzung.

## Folgen

- `Session.restart` führt nach `VOTING` und setzt die Frist. Die Beschreibung von `restartRound` im Vertrag ändert sich, ohne neues Feld, Version `3.3.0`.
- Die Oberfläche benennt „↻ Neue Runde“ in „↻ Erneut schätzen“ um. Die Testid `round-restart` bleibt.
- ADR 0010 bleibt `accepted`, weil nur ein Punkt ersetzt wird. ADRs werden nach der Annahme nicht geändert, deshalb steht der Zusammenhang in diesem ADR und in der Zeile von 0012 in `docs/adr/README.md`.
- Umsetzungsplan 4.3, Glossar („Neue Runde“ heißt jetzt „Erneut schätzen“), Invarianten und README werden nachgezogen.
