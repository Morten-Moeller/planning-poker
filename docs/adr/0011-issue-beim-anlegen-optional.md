# 0011: Das Issue beim Anlegen einer Sitzung ist optional

Status: accepted
Datum: 2026-11-17
Spec: docs/specs/0033-issue-beim-anlegen-optional.md
Ersetzt Grundregeln: keine

## Kontext

R-01 der Challenge lautet: „Der Scrum Master legt eine Sitzung an und gibt GitLab-Projekt-ID und
das zu schätzende Issue an.“ Bisher ist `issueIid` im Vertrag Pflicht. Das Backend lädt das
Issue beim Anlegen und prüft damit zugleich, dass das Projekt erreichbar ist. Seit 0012 und 0023
wählt der Scrum Master Issues im Sitzungsraum bequemer aus, mit Suche, Gewicht und Filtern. Die
Person möchte die Sitzung deshalb auch ohne Issue anlegen können. Der Design-Entwurf zeigt das
Feld als „Optional: Issue, mit dem die Sitzung startet“.

## Optionen

### Option A: Issue optional

`issueIid` darf fehlen. Fehlt es, lädt das Backend stattdessen das Projekt. Antwortet GitLab mit
404, kommt 404 `PROJECT_NOT_FOUND`.

- Vorteile:
  - R-01 bleibt erfüllbar: Wer ein Issue angibt, bekommt es vorausgewählt wie bisher.
  - Ohne Issue geht es schneller in den Sitzungsraum.
  - Die Vertragsänderung ist additiv.
- Nachteile: ein neuer Fehlercode und ein zweiter Weg beim Anlegen.

### Option B: Issue-Feld ganz entfernen

- Vorteile: das einfachste Formular.
- Nachteile: Die Lösung weicht bewusst von R-01 ab. Das ist bei einer Abgabe riskant, und der
  Vertrag bricht.

### Option C: Issue bleibt Pflicht

- Vorteile: Nichts ändert sich.
- Nachteile: Die Person muss beim Anlegen ein Issue wählen, das sie im Raum ohnehin wechseln kann.

## Entscheidung

Option A, gewählt von der Person am 2026-11-17. Ohne Issue ist die Projektprüfung Pflicht. Eine
Sitzung für ein Projekt, das der Token nicht sieht, entsteht nicht. `loadForSession` bleibt für
den Weg mit Issue nachsichtig wie in 0030.

## Folgen

- Vertrag: `CreateSessionRequest.issueIid` optional, neuer `errorCode` `PROJECT_NOT_FOUND` (404). Version `3.2.0`, additiv.
- Umsetzungsplan: Eine neue Annahme A-18 legt fest: „Das Issue beim Anlegen ist optional; R-01 ist mit angegebenem Issue erfüllt.“
- Snapshot: `preselectedIssueIid` ist dann `null`. Das ist schon heute für Entwickler so und für den Scrum Master erlaubt.
