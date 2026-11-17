# Design „Werkbank“

Entwurf für Oberfläche, Theme und Komponenten von Planning Poker. Die Dateien sind die Vorlage
für den Design-Rework (Specs 0027 und folgende); sie werden hier nicht bearbeitet.

## Herkunft

- Quelle: Claude Design, Projekt `08b204b3-956a-49ff-9d44-6f2e64fba627`
- Stand: 2026-11-17, exportiert von Morten Möller
- Dateien:

| Datei                      | Inhalt                                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Design-System.dc.html`    | Konzept, Farben, Theme in Angular, Typografie, Abstände, Radien, Karte, Kartenmotive, Teilnehmer-Eintrag, Statushinweise, Timer, Fokus und Bewegung |
| `Raum.dc.html`             | Komponente des Sitzungsraums mit allen Zuständen (Rolle, Phase, Dialog, mobil, hell und dunkel)                                                     |
| `Sitzungsraum.dc.html`     | Übersicht aller Screens des Sitzungsraums, setzt `Raum.dc.html` ein                                                                                 |
| `Einstieg.dc.html`         | Komponente von Startseite und Beitrittsseite mit allen Zuständen (Backend, Autocomplete, Fehler, mobil, hell und dunkel)                            |
| `Start & Beitritt.dc.html` | Übersicht aller Screens von Start und Beitritt, setzt `Einstieg.dc.html` ein                                                                        |
| `assets/coffee-break.svg`  | Bildkarte Kaffeepause                                                                                                                               |
| `assets/question-mark.svg` | Bildkarte Unklar                                                                                                                                    |

Die fünf `.dc.html`-Dateien sind unverändert aus dem Export. Sie laden `support.js` aus Claude
Design; die Datei liegt nicht im Repository, die `.dc.html`-Dateien sind deshalb als Quelltext
zu lesen, nicht im Browser. Die beiden SVGs sind die lokalen
Fassungen der Person ohne die C2PA-Signatur-Metadaten der Originale in Claude Design; die
Zeichnung ist gleich.

## Umsetzung in Teilen

| Teil | Inhalt                                                                    | Spec  |
| ---- | ------------------------------------------------------------------------- | ----- |
| A    | Theme, Tokens, Schriften, Fokus, Kopfzeile, Grundraster des Sitzungsraums | 0027  |
| B    | Seitenleiste                                                              | folgt |
| C    | Tisch und Karten                                                          | folgt |
| D    | Bedienfeld, Dialoge, Banner                                               | folgt |
| E    | Start und Beitritt                                                        | 0031  |

## Abweichungen der Umsetzung

- **Benennung der Phase:** Das Design nennt die Phase nach dem Freigeben „Besprechung“ und den
  Button „Timer starten“. Die Anwendung heißt sie „Diskussion“ und „Schätzung starten“
  (Spec 0026, ADR 0010).
- **Ablauf des Timers:** Das Design-System (Abschnitt 10) sagt, bei Ablauf der Zeit werde nicht
  automatisch aufgelöst. Der Server deckt die Runde bei Ablauf weiterhin selbst auf (O-01,
  Spec 0016).
- **`on-surface-variant` hell:** Der Code in Abschnitt 3 setzt `#5d606b`, die Farbtabelle in
  Abschnitt 2 `#383a42` für Fließtext und `#5d606b` für `--app-on-surface-muted`. Die Umsetzung
  folgt der Farbtabelle, wie für das dunkle Theme.
- **Trennlinie der Kopfzeile:** Der Entwurf nutzt eine eigene Linienfarbe. Die Umsetzung nimmt
  `--mat-sys-outline-variant`, damit keine Farbe außerhalb der Tokens entsteht.
- **Hell und dunkel:** Es gilt die Systemeinstellung; einen Schalter in der Oberfläche gibt es
  nicht.
- **Issue beim Anlegen (Teil E):** Der Entwurf nennt das Issue „Optional: Issue, mit dem die
  Sitzung startet“. Die Anwendung verlangt das Issue beim Anlegen weiterhin (R-01, Spec 0031).
- **Höchstzahl (Teil E):** Der Entwurf nennt die Zahl laufender Sitzungen („Es laufen bereits 20
  Sitzungen“). Das Backend liefert diese Zahl nicht; die Anwendung zeigt den bestehenden Text zu
  `LIMIT_REACHED`.
- **Kartenrücken der Beitrittsseite (Teil E):** Die Reihe der fünf Kartenrücken über dem Titel
  entfällt. Die Farben der Motive stehen nur im Sitzungsraum und in der Kopfzeile; eine dritte
  Kopie entsteht dafür nicht.
