# 0017: Markdown im React-Frontend mit marked, bereinigt mit DOMPurify

Status: accepted
Datum: 2026-11-25
Spec: docs/specs/0059-react-raum-teil-2.md
Ersetzt Grundregeln: keine

## Kontext

Die Beschreibung eines Issues kommt als Markdown aus GitLab und ist fremder Text. Das
Angular-Frontend wandelt sie mit `marked` in HTML und setzt sie über `[innerHTML]` ein; Angular
bereinigt dabei mit seinem eingebauten Sanitizer. Das React-Frontend (ADR 0016) zeigt dieselbe
Beschreibung. React hat keinen Sanitizer; HTML gelangt nur über `dangerouslySetInnerHTML` in die
Seite. Die Content-Security-Policy beider Frontends (`img-src 'self' data:`) verhindert Anfragen
für Bilder an fremde Hosts, sie verhindert kein Script. Jede neue Abhängigkeit braucht ein ADR
(`harness/policies/adr.md`, Bedingung 2).

Lookups vom 2026-11-25 (npm-Registry):

| Paket | Version | Stand |
|---|---|---|
| `marked` | 18.2.1 vom 2026-11-16 | wie im Angular-Frontend (`^18.2.1`); 18.3.0 vom 2026-11-24 ist jünger als 7 Tage |
| `dompurify` | 3.4.18 vom 2026-11-14 | 3.5.0 vom 2026-11-22 ist jünger als 7 Tage (`minimumReleaseAge`); Lizenz MPL-2.0 oder Apache-2.0; eine Abhängigkeit (`@types/trusted-types`) |
| `sanitize-html` | 2.18.2 vom 2026-11-11 | Lizenz MIT; mehrere Abhängigkeiten (HTML-Parser) |

## Optionen

### Option A: `marked` und DOMPurify

- Vorteile: `marked` liefert dasselbe HTML wie im Angular-Frontend. DOMPurify arbeitet mit dem
  DOM des Browsers, hat eine Abhängigkeit und ist für genau diesen Zweck verbreitet. Die
  Filterregeln lassen sich an den Sanitizer von Angular angleichen.
- Nachteile: Zwei Abhängigkeiten; die Filterregeln beider Frontends sind zwei Listen, die
  gleich bleiben müssen.

### Option B: `marked` und `sanitize-html`

- Vorteile: Läuft ohne DOM; Lizenz MIT.
- Nachteile: Eigener HTML-Parser mit mehr Abhängigkeiten und größerem Bundle; der Parser kann
  vom Browser abweichen.

### Option C: Markdown-Komponente, die React-Elemente erzeugt (ohne HTML-Text)

- Vorteile: Kein `dangerouslySetInnerHTML`.
- Nachteile: Ein anderer Parser als im Angular-Frontend, also anderes HTML für dieselbe
  Beschreibung; mehr Abhängigkeiten; HTML im Markdown fällt weg oder braucht doch einen
  Sanitizer.

### Option D: Eigener Sanitizer

- Vorteile: Keine Abhängigkeit.
- Nachteile: Eine Sicherheitsfunktion in eigenem Code, ohne die Prüfung durch viele Nutzer.

## Entscheidung

Option A. `frontend-react/src/session/markdown.ts` ist die einzige Stelle: `marked.parse`, dann
`DOMPurify.sanitize` mit dem HTML-Profil (ohne SVG und MathML), ohne `form`, `input`, `button`,
`textarea`, `select`, `option`, `optgroup`, `style` und ohne das Attribut `style`. Damit bleibt
übrig, was der Sanitizer von Angular auch lässt. Nur das Ergebnis dieser Funktion geht in
`dangerouslySetInnerHTML`, und nur in `active-issue.tsx`.

## Folgen

- `project-rules/frontend-react-session.md` nennt die Stelle und die Filterregeln.
- `markdown.spec.ts` belegt je Regel einen Fall; `frontend/e2e/session-room.spec.ts` prüft Script
  und externes Bild gegen beide Frontends.
- Bilder bleiben erlaubt; den Abruf von fremden Hosts verhindert weiter die
  Content-Security-Policy. Fällt sie weg, muss `img` in die Liste.
- Eine Änderung der Filterregeln oder ein Major-Update eines der Pakete braucht eine Spec; Patch-
  und Minor-Updates laufen über Dependabot mit grüner End-to-End-Suite.
