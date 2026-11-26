---
id: "0065"
title: "End-to-End-Tests: unstete Läufe der Startseite und `ECONNRESET` im Protokoll untersuchen"
status: approved
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-26
updated: 2026-11-26
pr: ""
note: freigegeben in der Session
---

# End-to-End-Tests: unstete Läufe der Startseite und `ECONNRESET` im Protokoll untersuchen

## Ziel

Drei End-to-End-Tests der Startseite waren je einmal rot, ohne belegte Ursache: in
`frontend/e2e/project-picker.spec.ts` „shows the empty state of the issue search and keeps a typed
issue number“ und „opens the project list on a click into the empty field and then the issue
list“, in `frontend/e2e/create-and-join.spec.ts` „creates a session and opens the room as scrum
master with the share block“. Die roten Läufe liefen gegen den Dev-Server des React-Frontends;
seit Spec 0062 läuft die Suite gegen den Build. In grünen Läufen schreibt der Webserver
`[vite] ws proxy error: Error: read ECONNRESET` ins Protokoll. Am Ende ist für beide Punkte die
Ursache belegt und behoben, oder es steht mit Zahlen fest, dass der Fehler nicht wieder auftritt.

## Scope

### Enthalten

- Die drei Tests wiederholt laufen lassen, gegen beide Frontends, und jeden roten Lauf mit der
  Trace von Playwright auswerten.
- Die Quelle der Zeile `ECONNRESET` bestimmen: welcher Lauf, welcher Test, welches Ereignis.
- Eine belegte Ursache in den Tests beheben. Abschnitt „Unstete Tests“ in
  `project-rules/testing.md`.

### Nicht enthalten

- Wiederholungen (`retries`), längere Timeouts oder das Abschalten eines Tests (T4.4 in
  `harness/testing.md`).
- Eine Ursache im Code der Anwendung oder in der Konfiguration der Server: `/implement` hält an
  und fragt.
- Andere Tests der Suite.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Sitzung | wie im Glossar |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Die drei Tests laufen je 30-mal (`--repeat-each=30`, Zahl der Worker wie in `make e2e`) gegen das Angular-Frontend, gegen den Build des React-Frontends und gegen den Dev-Server des React-Frontends. Der Pull Request nennt je Ziel die Zahl der grünen und roten Läufe. Der Lauf gegen den Dev-Server nutzt eine lokale Änderung des Startbefehls, die nicht committet wird. | Aufruf: Zahlen im Pull Request |
| A2 | Für jeden roten Lauf nennt der Pull Request die Ursache mit dem Schritt der Trace, an dem der Test abweicht. Eine Ursache im Test ist behoben, und die Wiederholung aus A1 ist danach für dieses Ziel grün. Ist kein Lauf rot, bleiben die Tests unverändert, und `project-rules/testing.md` nennt den Fehler als nicht reproduzierbar mit den Zahlen. | Aufruf: Zahlen und Trace im Pull Request; e2e: `make e2e` |
| A3 | Der Pull Request nennt für `ECONNRESET`, in welchem Lauf (Angular oder React) und bei welchem Ereignis die Zeile entsteht, mit einem Aufruf, der sie erzeugt. `project-rules/testing.md` nennt die Zeile mit dieser Ursache und sagt, ob sie einen Fehler anzeigt. | Aufruf: `grep -n "ECONNRESET" project-rules/testing.md` |
| A4 | `project-rules/testing.md` hat den Abschnitt „Unstete Tests“: der Aufruf, der einen Test wiederholt, und die Regel T4.4. `frontend/playwright.config.ts` bleibt bei `retries: 0`. | Aufruf: `grep -n "retries: 0" frontend/playwright.config.ts`; `grep -n "repeat-each" project-rules/testing.md` |

## Contracts

keine Änderung.

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh` nennt für die Dateiliste medium (`project-rules/**`).
Die Tests in `frontend/e2e/` sind low. Hebt eine Regel die Stufe bei der Umsetzung, hält
`/implement` an.
Gates: G2, das Label `human-approved` nach dem letzten Push; G3, der Status `verified`; Code- und
Sicherheits-Review.
ADR nötig: nein, weil keine Bedingung aus `harness/policies/adr.md` zutrifft: keine neue
Abhängigkeit, kein Vertrag, keine Abweichung von einer Regel.

## Umsetzung

Entscheidungen:

- Keine Wiederholung in der Konfiguration, kein längerer Timeout, kein abgeschalteter Test.
- Eine Ursache außerhalb der Tests (Anwendung, Proxy, Server) wird nicht in dieser Spec behoben;
  `/implement` hält an und fragt.
- Tritt in 30 Wiederholungen je Ziel kein Fehler auf, gilt der Fehler als nicht reproduzierbar;
  die Tests bleiben unverändert.

Dateien:

- `project-rules/testing.md`: ändern, Abschnitt „Unstete Tests“, Zeile zu `ECONNRESET`
- `frontend/e2e/project-picker.spec.ts`: ändern, nur bei belegter Ursache im Test
- `frontend/e2e/create-and-join.spec.ts`: ändern, nur bei belegter Ursache im Test
- `docs/roadmap.md`: ändern, Welle 10

Schritte:

1. Die drei Tests mit `--repeat-each=30` gegen das Angular-Frontend, den React-Build und den
   React-Dev-Server laufen lassen, unter dem Lock (`harness/scripts/app-lock.sh`). Die Traces der
   roten Läufe sichern.
2. Jeden roten Lauf an der Trace auswerten: Schritt, Zustand der Seite, Anfragen.
3. `ECONNRESET`: die Suite mit einem Worker laufen lassen und den Test bestimmen, nach dem die
   Zeile steht; den Vorgang einzeln nachstellen.
4. Ursache im Test: beheben und die Wiederholung erneut laufen lassen. Ursache außerhalb:
   anhalten und fragen.
5. `project-rules/testing.md` ergänzen. `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | Aufruf `pnpm -C frontend exec playwright test project-picker create-and-join -g "<Titel>" --repeat-each=30` je Ziel |
| A2 | derselbe Aufruf nach einer Behebung; `make e2e` |
| A3 | Aufruf wie im Kriterium |
| A4 | Aufrufe wie im Kriterium |

Testdaten: keine neuen.

## Offene Fragen

keine

## Verifikationsplan

- make check
- betroffene Tests: `make e2e`; die Wiederholung aus A1
- Browser: keiner. Kein Kriterium nennt einen Bildschirm.
