# 0018: Demo-Modus ohne GitLab-Token mit eingebautem GitLab-Ersatz im Backend

Status: accepted
Datum: 2026-11-26
Spec: docs/specs/0068-demo-modus.md
Ersetzt Grundregeln: A6.1 für den Schlüssel planningpoker.gitlab.token; ändert das Verhalten „ohne `GITLAB_TOKEN` startet das Backend nicht“ aus Spec 0003

## Kontext

Das Repository ist öffentlich. Wer es ausprobieren will, braucht bisher ein GitLab-Projekt und
einen Token mit Scope `api`; ohne `GITLAB_TOKEN` startet das Backend nicht. Die Person möchte, dass
die Anwendung ohne Token läuft und Beispieldaten zeigt, und dass das README eine kurze
Bildschirmaufnahme davon enthält.

Der GitLab-Zugriff liegt in einer Klasse, `planningpoker.gitlab.GitLabClient`. Drei Klassen des
Moduls `session` rufen sie auf. Die Frontends kennen GitLab nicht; sie lesen Einstellungen des
Backends über `GET /api/config`.

## Optionen

### Option A: Ohne Token schaltet das Backend von selbst auf einen Ersatz im Arbeitsspeicher

Ist `planningpoker.gitlab.token` nicht gesetzt oder leer, beantwortet `GitLabClient` jeden Aufruf
aus einer Klasse `DemoGitLab` mit festen Projekten und Issues. `GET /api/config` meldet
`demo: true`, beide Frontends zeigen einen Hinweis.

- Vorteile:
  - Ein frischer Klon läuft mit `make backend` und `make frontend`, ohne Konto und ohne Token.
  - Kein weiterer Prozess, keine Änderung an `session`, beide Frontends bleiben bis auf den Hinweis gleich.
  - Der Demo-Modus macht keinen Aufruf nach außen.
- Nachteile:
  - Ein Betrieb, in dem der Token fehlt, fällt nicht mehr beim Start auf. Er zeigt Demo-Daten.
  - Der Vertrag bekommt ein Feld.

### Option B: Eigener Schalter `planningpoker.demo=true`

- Vorteile:
  - Ein fehlender Token bleibt ein Startfehler.
- Nachteile:
  - Ein weiterer Schritt für den Besucher; die Person will den Demo-Modus genau dann, wenn kein Token hinterlegt ist.

### Option C: Das GitLab-Double der End-to-End-Tests als dritter Prozess

- Vorteile:
  - Kein neuer Code im Backend.
- Nachteile:
  - WireMock als Laufzeit-Teil, ein dritter Prozess, feste Antworten ohne Suche, Filter und Schreiben.

## Entscheidung

Option A, von der Person in der Session gewählt (2026-11-26). Der fehlende Startfehler wird durch
drei Dinge ausgeglichen: eine Zeile auf `WARN` beim Start, das Feld `demo` in `GET /api/config` und
der sichtbare Hinweis in beiden Frontends. `GitLabClient` bleibt die einzige Klasse, die andere
Module aufrufen; es gibt kein Interface und keine zweite Bean (A1.2).

## Folgen

- `planningpoker.gitlab.token` ist optional. Ein Betreiber erkennt einen fehlenden Token am Log und
  am Hinweis in der Oberfläche, nicht mehr am Start.
- Der Vertrag steigt auf `4.1.0`: `ConfigResponse` bekommt das Pflichtfeld `demo`. Die Änderung ist
  additiv.
- Demo-Daten leben je Backend-Instanz im Arbeitsspeicher und sind nach einem Neustart wieder im
  Ausgangszustand. Kommentar und Gewicht einer Bestätigung gehen nur dorthin.
- Die Links der Demo-Issues zeigen auf `https://gitlab.example.com` und führen zu keiner Seite.
- `project-rules/backend.md`, `project-rules/frontend.md`, `project-rules/frontend-react.md` und
  `project-rules/testing.md` nennen den Demo-Modus.
