# Checkliste zur Abgabe

Manuelle Prüfpunkte, die kein automatischer Test abdeckt (Spec 0019). Die Person prüft sie vor
dem Label `human-approved` und trägt je Punkt Ergebnis, Datum und Bemerkung ein. Ergebnis ist
`ok` oder `nicht ok`; bei `nicht ok` nennt die Bemerkung die Abweichung.

Voraussetzungen: ein Projekt auf gitlab.com mit mindestens zwei offenen Issues, ein Personal
Access Token mit Scope `api` in `.env`, Start nach dem Schnellstart in `README.md`. Für die
Barrierefreiheit: Chrome oder Firefox, VoiceOver (macOS) oder NVDA (Windows).

## Echtes GitLab-Projekt

### K-01 Schnellstart

Die Befehle aus dem README-Abschnitt „Schnellstart“ laufen in einem frischen Klon; die
Startseite meldet das Backend als erreichbar. (R-23)

- Ergebnis:
- Datum:
- Bemerkung:

### K-02 Sitzung zu einem echten Issue

Eine Sitzung mit Projekt-ID und Issue-Nummer des Testprojekts anlegen. Der Ersteller landet als
Scrum Master im Raum, das Issue ist im Bedienfeld vorausgewählt. Eine unbekannte Issue-Nummer
zeigt „Das Issue wurde im GitLab-Projekt nicht gefunden.“ (R-01, R-09)

- Ergebnis:
- Datum:
- Bemerkung:

### K-03 Issue-Suche

Die Suche im Bedienfeld findet Issues des Testprojekts nach Titel; „Mehr laden“ erscheint erst
ab mehr als 20 Treffern. Eine Suche ohne Treffer zeigt „Keine Issues gefunden“. (R-09)

- Ergebnis:
- Datum:
- Bemerkung:

### K-04 Beschreibung des Issues

Ein Issue mit Markdown (Überschrift, Liste, Link) und einem eingebetteten Bild von einem
fremden Host freigeben. Alle Teilnehmer sehen Titel und formatierte Beschreibung; das fremde
Bild lädt nicht (Content-Security-Policy `img-src 'self' data:`), die Konsole meldet die
blockierte Anfrage. (R-10)

- Ergebnis:
- Datum:
- Bemerkung:

### K-05 Kommentar am Issue

Eine Runde auflösen, „Ergebnis übernehmen“ mit einem Zahlenwert bestätigen. Am Issue in GitLab
steht ein Kommentar nach der Vorlage im README (Endwert, Rundenzahl, Verteilung, Durchschnitt).
Danach eine Runde mit `?` bestätigen: der Kommentar endet mit „Kein Durchschnitt.“ (R-20, R-21)

- Ergebnis:
- Datum:
- Bemerkung:

### K-06 Gewicht (optional)

Nur mit GitLab Premium oder Ultimate: Backend mit `PLANNINGPOKER_GITLAB_WRITE_WEIGHT=true` in
`.env` starten (Vorschlag aus `.env.example`), einen Zahlenwert bestätigen. Das Issue hat danach
das Gewicht des Endwerts und den Kommentar. Ohne passenden Tarif: Punkt als „entfällt“ vermerken.
(R-21, A-07)

- Ergebnis:
- Datum:
- Bemerkung:

### K-07 GitLab nicht erreichbar

Backend mit `planningpoker.gitlab.base-url=http://localhost:9` neu starten (oder Netzwerk
trennen), eine bestehende Sitzung öffnen. Die Issue-Suche zeigt „GitLab ist nicht erreichbar.“
mit „Erneut versuchen“; die Bestätigung zeigt den Fehler im Dialog, die Runde bleibt aufgelöst.

- Ergebnis:
- Datum:
- Bemerkung:

## Barrierefreiheit

### K-08 Tastatur

Den ganzen Ablauf ohne Maus durchspielen: Sitzung erstellen, beitreten, Issue suchen und
freigeben, Karte wählen, auflösen, neue Runde, Ergebnis übernehmen, Protokoll aufklappen. Jedes
Bedienelement ist mit Tab erreichbar, die Reihenfolge folgt der Anzeige, Dialoge halten den
Fokus und geben ihn beim Schließen zurück.

- Ergebnis:
- Datum:
- Bemerkung:

### K-09 Sichtbarer Fokus

Der Fokus ist auf jedem Element sichtbar: Karten, Suchergebnisse, Schaltflächen, Radiobuttons
im Dialog, Link „Zur Startseite“ im Zustand „Sitzung abgelaufen“.

- Ergebnis:
- Datum:
- Bemerkung:

### K-10 Beschriftungen im Screenreader

Mit VoiceOver oder NVDA: Formularfelder nennen ihre Beschriftung, Karten ihren Wert (☕ als
„Kaffeepause“), die Teilnehmerliste Name, Rolle und Status, das Ergebnis Name und Karte je
Stimme.

- Ergebnis:
- Datum:
- Bemerkung:

### K-11 Ansagen im Screenreader

Der Screenreader liest ohne Fokuswechsel vor: den Hinweis „Alle verbundenen Entwickler haben
geschätzt“, „Kopiert“ und „Kopieren nicht möglich, bitte von Hand kopieren.“, den
Konsens-Hinweis (0018) und den Text „Ausreißer“ in der Zeile der Stimme (0017).

- Ergebnis:
- Datum:
- Bemerkung:

### K-12 Kontrast

Kontrast mindestens 4,5:1 für Text und 3:1 für Bedienelemente, gemessen mit den
Entwicklerwerkzeugen des Browsers: gewählte Karte, Hervorhebung der Ausreißer (0017),
Konsens-Hinweis (0018), Hinweis an den Scrum Master, Fehlertexte. Abweichungen an Farbwerten
werden gemeldet, nicht im Code geändert (`project-rules/frontend.md`).

- Ergebnis:
- Datum:
- Bemerkung:

### K-13 Schmaler Bildschirm

Auf einem Telefon oder in der Geräteansicht des Browsers mit 375 px Breite: Startseite,
Beitrittsseite und Sitzungsseite in allen drei Phasen ohne waagrechtes Scrollen, Texte nicht
abgeschnitten, Karten bedienbar.

- Ergebnis:
- Datum:
- Bemerkung:

## Abgabe

### K-14 Repository

Das Repository ist auf GitHub erreichbar, der Stand von `main` enthält diese Checkliste und
`README.md` mit Schnellstart. (R-23)

- Ergebnis:
- Datum:
- Bemerkung:

### K-15 Variante im README

Der README-Abschnitt „Variante“ nennt Variante A und begründet sie. (R-24)

- Ergebnis:
- Datum:
- Bemerkung:

### K-16 Schnittstellen im README

Mit dem README-Abschnitt „Schnittstellen“ und `contracts/api/` lässt sich ein Frontend ohne
Rückfrage anbinden: Protokoll, Datenformat, REST-Endpunkte, WebSocket-Nachrichten,
Fehlerformat. (R-25)

- Ergebnis:
- Datum:
- Bemerkung:

### K-17 Technik

Frontend in Angular (`frontend/package.json`), Backend in Java mit Quarkus und Jakarta EE
(`backend/pom.xml`). (R-26)

- Ergebnis:
- Datum:
- Bemerkung:
