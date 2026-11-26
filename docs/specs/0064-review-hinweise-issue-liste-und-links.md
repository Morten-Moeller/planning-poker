---
id: "0064"
title: "Review-Hinweise: leerer Zustand der Issue-Liste nach einem Fehler und `rel` der Links"
status: Review
risk: medium
adrs: ["0016"]
owner: Morten Möller
created: 2026-11-26
updated: 2026-11-26
pr: ""
note: freigegeben in der Session
---

# Review-Hinweise: leerer Zustand der Issue-Liste nach einem Fehler und `rel` der Links

## Ziel

Drei Hinweise aus den Reviews der Specs 0059 und 0061 sind offen. Nach einem Fehler beim Laden der
Issue-Liste, der nicht `GITLAB_ACCESS_DENIED` oder `GITLAB_ERROR` ist, zeigt die Issue-Auswahl
neben dem Fehlerbanner „Keine Issues gefunden“; das ist falsch, die Liste ist nicht geladen. Drei
Links auf GitLab haben `rel="noopener"`, der vierte `rel="noopener noreferrer"`. Die Änderung gilt
für beide Frontends (ADR 0016). Am Ende zeigt die Issue-Auswahl den leeren Zustand nur nach einer
geladenen Liste ohne Treffer, und alle vier Links haben dasselbe `rel`.

## Scope

### Enthalten

- Issue-Auswahl beider Frontends: kein leerer Zustand nach einem fehlgeschlagenen Laden.
- Links `active-issue-link`, `issue-preview-link`, `confirm-success-open` beider Frontends:
  `rel="noopener noreferrer"`, wie `last-result-open`.
- Regeldateien und die Zeile der Roadmap zu Spec 0061 (Ort der Toast-Region).

### Nicht enthalten

- Die Toast-Region zieht nicht um. Sie steht in `frontend-react/src/session/confirm-success.tsx`;
  `project-rules/frontend-react-session.md` nennt sie so. `shell/` darf `session/` nicht
  importieren, und nur der Raum zeigt einen Toast. Die Roadmap nannte `shell/`; die Zeile wird
  berichtigt.
- Fehlertexte, Fehlercodes und das Fehlerbanner bleiben, wie sie sind.
- Links in der Markdown-Beschreibung eines Issues (eigene Regeln in `markdown.ts`).

## Begriffe

| Begriff | Bedeutung hier |
|---|---|
| Issue | wie im Glossar |
| Sitzung | wie im Glossar |

## Akzeptanzkriterien

| Nr | Kriterium | Prüfung |
|---|---|---|
| A1 | Schlägt das Laden der Issue-Liste mit einem Fehler fehl, der nicht `GITLAB_ACCESS_DENIED` oder `GITLAB_ERROR` ist, zeigt die Issue-Auswahl beider Frontends `issue-results-empty` und `issue-filter-reset` nicht. Das Fehlerbanner zeigt den Fehler wie bisher. | vitest: `frontend-react/src/session/issue-panel.spec.tsx`, `frontend/src/app/session/issue-panel.spec.ts` |
| A2 | Nach einem solchen Fehler zeigt die Issue-Auswahl den leeren Zustand wieder, sobald ein Laden gelingt und keine Treffer liefert. Treffer eines früheren Ladens bleiben nach einem Fehler sichtbar, wie bisher. | vitest: dieselben Dateien |
| A3 | Für `GITLAB_ACCESS_DENIED` und `GITLAB_ERROR` bleibt das Verhalten gleich: `issue-results-error` mit `issue-results-retry`, kein leerer Zustand. | vitest: bestehende Fälle in denselben Dateien, unverändert |
| A4 | `active-issue-link`, `issue-preview-link` und `confirm-success-open` haben in beiden Frontends `rel="noopener noreferrer"` und `target="_blank"`. | vitest: `active-issue.spec`, `issue-panel.spec`, `confirm-success.spec` (Angular), `session-page.spec.tsx` (React); e2e: `frontend/e2e/session-room.spec.ts` gegen beide Frontends |
| A5 | `project-rules/frontend-react-session.md` und `project-rules/frontend.md` nennen das `rel` der vier Links und die Regel für den leeren Zustand. `docs/roadmap.md` nennt die Toast-Region bei Spec 0061 unter `session/`. | Aufruf: `grep -rn 'rel="noopener"' project-rules frontend-react/src frontend/src/app` ohne Treffer; `grep -n "Toast-Region" docs/roadmap.md` |

## Contracts

keine Änderung.

## Risiko

Stufe: medium
Begründung: `harness/scripts/risk-level.sh` nennt für die Dateiliste medium (Quelltext unter
`frontend-react/src/session/` und `frontend/src/app/session/`, `project-rules/**`). Hebt eine
Regel die Stufe bei der Umsetzung, hält `/implement` an.
Gates: G2, das Label `human-approved` nach dem letzten Push; G3, der Status `verified`; Code- und
Sicherheits-Review.
ADR nötig: nein, weil keine Bedingung aus `harness/policies/adr.md` zutrifft: keine neue
Abhängigkeit, kein Vertrag, keine Abweichung von einer Regel. Die Änderung folgt ADR 0016 (eine
Änderung an der Oberfläche gilt für beide Frontends).

## Umsetzung

Entscheidungen:

- Kein neuer Zustand mit eigenem Text: Nach einem Fehler außerhalb der beiden GitLab-Codes zeigt
  die Issue-Auswahl keinen leeren Zustand und keinen eigenen Hinweis; das Fehlerbanner trägt die
  Meldung. Ein Wechsel eines Filters lädt neu.
- `rel="noopener noreferrer"` für alle vier Links auf GitLab. GitLab bekommt damit keine Adresse
  der Sitzung als `Referer`.
- Der Test `frontend/e2e/session-room.spec.ts` erwartet das neue `rel`; das ist eine Änderung der
  Erwartung, die diese Spec verlangt.
- Die Toast-Region bleibt in `session/`.

Dateien:

- `frontend-react/src/session/issue-list.ts`: ändern, Feld für ein fehlgeschlagenes Laden
- `frontend-react/src/session/issue-panel.tsx`: ändern, Bedingung des leeren Zustands, `rel`
- `frontend-react/src/session/issue-panel.spec.tsx`: ändern, Fälle zu A1, A2, A4
- `frontend-react/src/session/active-issue.tsx`: ändern, `rel`
- `frontend-react/src/session/active-issue.spec.tsx`: ändern, `rel`
- `frontend-react/src/session/confirm-success.tsx`: ändern, `rel`
- `frontend-react/src/session/session-page.spec.tsx`: ändern, `rel`
- `frontend/src/app/session/issue-panel.ts`: ändern, Signal für ein fehlgeschlagenes Laden
- `frontend/src/app/session/issue-panel.html`: ändern, Bedingung des leeren Zustands, `rel`
- `frontend/src/app/session/issue-panel.spec.ts`: ändern, Fälle zu A1, A2, A4
- `frontend/src/app/session/active-issue.html`: ändern, `rel`
- `frontend/src/app/session/active-issue.spec.ts`: ändern, `rel`
- `frontend/src/app/session/confirm-success.html`: ändern, `rel`
- `frontend/src/app/session/confirm-success.spec.ts`: ändern, `rel`
- `frontend/e2e/session-room.spec.ts`: ändern, `rel`
- `project-rules/frontend-react-session.md`: ändern
- `project-rules/frontend.md`: ändern
- `docs/roadmap.md`: ändern, Zeile zu 0061 und Stand

Schritte:

1. Tests zu A1 und A2 in beiden Frontends schreiben; sie schlagen fehl.
2. `issue-list.ts`: der Zustand bekommt ein Feld, das nach jedem fehlgeschlagenen Laden wahr ist
   und beim nächsten Start eines Ladens falsch wird. `issue-panel.tsx` zeigt den leeren Zustand
   nur, wenn es falsch ist. Dasselbe mit einem Signal in `issue-panel.ts` und `issue-panel.html`.
3. `rel` der drei Links in beiden Frontends, Erwartungen der Tests.
4. Regeldateien und Roadmap.
5. `make check`, `make e2e`.

Tests:

| Kriterium | Test |
|---|---|
| A1 | `frontend-react/src/session/issue-panel.spec.tsx`, `frontend/src/app/session/issue-panel.spec.ts`: Laden mit `INVALID_STATE` schlägt fehl (der Vertrag kennt kein `INTERNAL_ERROR`), kein `issue-results-empty`, kein `issue-filter-reset` |
| A2 | dieselben Dateien: Fehler, dann Laden ohne Treffer zeigt `issue-results-empty`; Treffer, dann Fehler beim Nachladen lässt die Treffer stehen |
| A3 | dieselben Dateien: bestehende Fälle zu `GITLAB_ERROR` und `GITLAB_ACCESS_DENIED` |
| A4 | `frontend-react/src/session/active-issue.spec.tsx`, `frontend-react/src/session/issue-panel.spec.tsx`, `frontend-react/src/session/session-page.spec.tsx`, `frontend/src/app/session/active-issue.spec.ts`, `frontend/src/app/session/issue-panel.spec.ts`, `frontend/src/app/session/confirm-success.spec.ts`; `frontend/e2e/session-room.spec.ts` in beiden Läufen |
| A5 | Aufrufe wie im Kriterium |

Testdaten: keine neuen.

## Offene Fragen

keine

## Verifikationsplan

- make check
- betroffene Tests: `pnpm -C frontend-react test`, `pnpm -C frontend test`, `make e2e`
- Browser: keiner. A1 und A2 brauchen einen Fehler des Backends, den das GitLab-Double nicht
  liefert; die Unit-Tests beider Frontends belegen sie. A4 belegt der End-to-End-Test.
