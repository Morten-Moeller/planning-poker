# 0010: Diskussionsphase vor der Schätzung; der Timer startet mit „Schätzung starten“

Status: accepted
Datum: 2026-11-17
Spec: docs/specs/0026-diskussionsphase.md
Ersetzt Grundregeln: keine

## Kontext

Heute macht die Freigabe das Issue sichtbar und öffnet zugleich die Runde (`LOBBY` → `VOTING`,
Umsetzungsplan 4.3). Ist ein Timer eingestellt, beginnt die Frist mit diesem Moment (ADR 0006).
Beim Planning Poker kommt nach dem Vorstellen aber zuerst die Diskussion, und erst danach
schätzen alle gleichzeitig. Die Uhr läuft also während des Gesprächs, und der Server löst
womöglich mitten darin auf. Die Person hat am 2026-11-17 eine eigene Diskussionsphase gewählt
und nicht nur einen Button „Timer starten“.

## Optionen

### Option A: Button „Timer starten“ in `VOTING`

- Vorteile: kleine Änderung, kein neuer Zustand.
- Nachteile: Die Karten sind während der Diskussion schon offen. Wer früh wählt, legt sich vor
  dem Gespräch fest.

### Option B: Neue Phase `DISCUSSION` zwischen Freigabe und Schätzung

Die Freigabe führt nach `DISCUSSION`: Das Issue ist sichtbar, Karten sind gesperrt. Mit
„Schätzung starten“ (`POST …/round/start`) wechselt der Scrum Master nach `VOTING`, und erst dann
beginnt die Frist. „Neue Runde“ führt ebenfalls nach `DISCUSSION`.

- Vorteile: Der Ablauf entspricht dem üblichen Planning Poker. Die Frist begrenzt nur das
  Schätzen.
- Nachteile:
  - Die Antworten haben einen neuen Enum-Wert `Phase.DISCUSSION`.
  - Die Freigabe hat eine andere Folgephase. Das bricht den Vertrag.
  - Jeder Ablauf braucht einen Klick mehr.

## Entscheidung

Option B. Timer als Einstellung der Sitzung, Frist im Snapshot, `serverTime` und Auflösung durch
die periodische Prüfung bleiben wie in ADR 0006. Geändert wird nur der Zeitpunkt, an dem die
Frist gesetzt wird: mit „Schätzung starten“ statt mit dem Rundenstart. Damit ersetzt diese
Entscheidung ADR 0006.

## Folgen

- Zustandsautomat (4.3):
  - `LOBBY` → Freigabe → `DISCUSSION`.
  - `DISCUSSION` → Schätzung starten → `VOTING`.
  - `REVEALED` → Neue Runde → `DISCUSSION`.
  - Ein Issue-Wechsel ist in `DISCUSSION` erlaubt und führt nach `DISCUSSION`.
  - In `DISCUSSION` lehnt der Server Stimme und Auflösung mit 409 `INVALID_STATE` ab.
- Vertrag:
  - `Phase` bekommt `DISCUSSION`.
  - Neu ist der Endpunkt `POST /api/sessions/{id}/round/start`.
  - Die Folgephase der Freigabe ändert sich. Das ist ein Bruch, die Version steigt auf `3.0.0`.
  - Einziger Verbraucher ist das Frontend dieses Repositorys. Es zieht in derselben Änderung nach.
- ADR 0006: Status `superseded by 0010`.
- Invarianten I38 bis I40 und das Glossar (Phase, Freigabe, Neue Runde) werden angepasst.
