# 0009: Gewicht und Zeitraum der Issue-Liste filtert GitLab

Status: accepted
Datum: 2026-11-17
Spec: docs/specs/0023-issue-filter-gewicht-zeitraum.md
Ersetzt Grundregeln: keine

## Kontext

Die Issue-Liste im Sitzungsraum zeigt die offenen Issues seitenweise mit 20 Einträgen
(`GET /api/sessions/{id}/issues`). In einem größeren Projekt sucht der Scrum Master die Issues,
die noch nicht geschätzt sind. Die Person wünscht drei Dinge:

- eine Anzeige des Gewichts,
- einen Filter, der standardmäßig nur Issues ohne Gewicht zeigt,
- einen Zeitraum nach dem Änderungsdatum (1 Woche, 1 Monat, 1 Jahr, Alle).

Die GitLab-API kann das selbst: `weight=None` oder `weight=Any` (Premium und Ultimate),
`updated_after`, `order_by=updated_at` und das Feld `weight` je Issue.

## Optionen

### Option A: Filter als Parameter an GitLab

Der Endpunkt bekommt die Parameter `weight` (`NONE`, `ANY`, `ALL`) und `period` (`WEEK`,
`MONTH`, `YEAR`, `ALL`). Das Backend übersetzt sie in GitLab-Parameter.

- Vorteile:
  - Das Seitenblättern bleibt korrekt.
  - Es werden nur passende Issues übertragen.
  - Die Sortierung nach Änderungsdatum kommt von GitLab.
- Nachteile:
  - Im Free-Tarif kennt GitLab den Gewichtsfilter nicht. Die Liste ist dann ungefiltert, und `weight` ist `null`.

### Option B: Filter im Backend oder im Frontend nach dem Laden

- Vorteile: Die Lösung ist unabhängig vom Tarif.
- Nachteile:
  - Seiten mit 20 Einträgen werden nach dem Filtern unvollständig oder leer, obwohl weitere Treffer existieren.
  - Für korrekte Seiten müsste das Backend alle Issues laden.

## Entscheidung

Option A. Die Standardwerte der API bleiben `ALL` und `ALL`, damit bestehende Aufrufe sich nicht
ändern. Die Oberfläche schickt standardmäßig `weight=NONE` und `period=ALL`. Den Zeitraum
rechnet das Backend aus seiner `Clock`. Die Liste ist nach Änderungsdatum absteigend sortiert.

## Folgen

- Der Vertrag wird additiv erweitert: zwei Query-Parameter mit Enums und das Feld `weight` (nullbar) in `IssueSummary`. Die Version steigt auf `2.4.0`.
- Im Free-Tarif wirkt der Gewichtsfilter nicht. Das README nennt das neben `write-weight`.
- Ein vorausgewähltes Issue mit Gewicht steht unter dem Standardfilter nicht in der Liste. Die Vorschau zeigt es weiter (0012).
