---
id: "0025"
title: Nicht geschätzt in der aufgedeckten Runde
status: done
risk: medium
adrs: []
owner: Morten Möller
created: 2026-11-17
updated: 2026-11-17
pr: "#24"
note: alle Kriterien erfüllt
---

# Nicht geschätzt in der aufgedeckten Runde

Wunsch der Person nach der Frage zum Timer (0016): Wer bis zur Auflösung keine Karte gewählt hat,
soll sichtbar sein, statt automatisch die Kaffeetasse zu bekommen. Bezug: R-15 (Karte und Name je
Teilnehmer nach der Auflösung), R-22, A-02, A-06. Konsens aus 0018.

## Ziel

Nach der Auflösung sieht jeder Teilnehmer, welche Entwickler nicht geschätzt haben. Der
Konsens-Hinweis nennt, auf wie vielen Stimmen er beruht. So ist ein Konsens aus zwei von fünf
Stimmen als solcher erkennbar.

## Scope

### Enthalten

- **Aufgedeckte Ansicht:** Unter den Karten steht „Nicht geschätzt: Ben, Cem“ (`data-testid="not-voted"`), mit einem Eintrag je Entwickler (`data-testid="not-voted-name"`).
  - Ist ein Entwickler nicht verbunden, steht „(nicht verbunden)“ dahinter.
  - Haben alle geschätzt, fehlt die Zeile.
  - Hat niemand geschätzt, erscheinen alle Entwickler, und statt der Kartenliste steht „Keine Karten abgegeben.“
- **Berechnung:** Gezählt werden die Entwickler aus `participants` des Snapshots, deren `id` nicht in `round.votes` steht. Der Scrum Master zählt nicht (A-02). Das gilt für alle Rollen gleich.
- **Konsens-Hinweis:** Aus „Konsens: Alle haben 5 gewählt.“ wird „Konsens: Alle 3 abgegebenen Stimmen zeigen 5.“ Haben nicht alle Entwickler geschätzt, kommt „3 von 5 Entwicklern haben geschätzt.“ dazu. Konfetti und Vorauswahl bleiben wie in 0018.

### Nicht enthalten

- Die automatische Kaffeetasse. Die Person hat sie verworfen, weil ☕ ein aktives Signal eines Anwesenden ist.
- Änderungen an Backend, Vertrag, Protokolleintrag oder GitLab-Kommentar. Das Protokoll zeigt weiter nur die abgegebenen Karten.
- Die Anzeige im Sitzungsprotokoll.
- Eine Grenze: Ein Entwickler, der erst nach der Auflösung beitritt, erscheint auch unter „Nicht geschätzt“. Ohne Backend-Änderung lässt sich nicht erkennen, wer bei der Auflösung da war. Die Zeile ist ein Hinweis, kein Protokoll.

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Abstimmungsstatus, Auflösung, Konsens, Entwickler | wie im Glossar; „Nicht geschätzt“ ist der Abstimmungsstatus „Ausstehend“ nach der Auflösung, kein neuer Begriff |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Bei den Entwicklern Ben, Cem und Dana, von denen nur Ben gestimmt hat und Dana nicht verbunden ist, zeigt die aufgedeckte Ansicht „Nicht geschätzt: Cem, Dana (nicht verbunden)“. Der Scrum Master steht nie in der Liste. Haben alle gestimmt, fehlt `not-voted`. | Unit `frontend/src/app/session/round-result.spec.ts` |
| A2 | Ohne Stimmen zeigt die Ansicht „Keine Karten abgegeben.“ und alle Entwickler unter „Nicht geschätzt“. | Unit `round-result.spec.ts` |
| A3 | Konsens aus 3 Stimmen bei 5 Entwicklern zeigt „Konsens: Alle 3 abgegebenen Stimmen zeigen 5.“ und „3 von 5 Entwicklern haben geschätzt.“ Bei 3 von 3 fehlt der zweite Satz. | Unit `round-result.spec.ts` |
| A4 | Im Browser schätzt von zwei Entwicklern nur einer, und der Scrum Master löst auf. Alle drei Kontexte zeigen „Nicht geschätzt“ mit dem Namen des anderen. | End-to-End `frontend/e2e/consensus.spec.ts` (neuer Fall) |
| A5 | `make check` und `make e2e` sind grün; die Lint-Regeln für Template-Barrierefreiheit gelten. | Aufruf `make check`, `make e2e` |

## Contracts

keine

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh` meldet medium für `frontend/src/app/session/`
(Anwendungscode). Tests und E2E sind low.
Gates: G0 und G1 in dieser Session, G2 über das Label `human-approved`; `verify` läuft auch bei
medium. Reviews: Code und Sicherheit.
ADR nötig: nein. Es gibt keine neue Abhängigkeit, keine Vertragsänderung und keine Alternative mit Wirkung
auf andere Module. Die Berechnung folgt aus dem Snapshot nach ADR 0004.

## Umsetzung

Entscheidungen:

- keine

Dateien:

- `frontend/src/app/session/round-result.ts`: ändern, `notVoted` und `developerCount` als `computed`, Konsens-Text
- `frontend/src/app/session/round-result.html`: ändern, Zeile „Nicht geschätzt“, Leerzustand, Konsens-Text
- `frontend/src/app/session/round-result.scss`: ändern, Zeile „Nicht geschätzt“
- `frontend/src/app/session/round-result.spec.ts`: ändern, A1 bis A3
- `frontend/e2e/consensus.spec.ts`: ändern, A4 als neuer Fall

Schritte:

1. `RoundResult`: `notVoted = computed(...)` aus `store.session().participants` (Rolle `DEVELOPER`, nicht in `votes`) mit `connected`. Der Konsens-Text nennt die Zahl der Stimmen, und bei fehlenden Stimmen kommt der Satz „x von y Entwicklern“ dazu. Alle Texte laufen über `$localize`, Plural über ICU.
2. Template und Stil.
3. Unit-Tests und E2E-Fall in `consensus.spec.ts`. Es gibt keine neue E2E-Datei, damit `project-rules/testing.md` unverändert bleibt.
4. `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `round-result.spec.ts`: Snapshot mit drei Entwicklern, einer getrennt |
| A2 | `round-result.spec.ts`: Snapshot ohne Stimmen |
| A3 | `round-result.spec.ts`: Konsens 3 von 5 und 3 von 3 |
| A4 | `consensus.spec.ts`: drei Kontexte, ein Entwickler schätzt nicht |
| A5 | `make check`, `make e2e` |

Testdaten: Unit-Tests über den Store mit Snapshots wie in `round-result.spec.ts`. End-to-End: Sitzung über die Startseite, Issue 42 des GitLab-Doubles.

Contracts zu regenerieren: keine.

## Offene Fragen

keine

## Verifikationsplan

- make check
- betroffene Tests: `frontend/src/app/session/round-result.spec.ts`, `make e2e`
- Browser: aufgedeckte Ansicht mit einem Entwickler ohne Stimme in drei Kontexten
