# 0007: Eigener Fehlercode GITLAB_ACCESS_DENIED für 401 und 403 von GitLab

Status: accepted
Datum: 2026-11-17
Spec: docs/specs/0021-gitlab-zugriff-verweigert.md
Ersetzt Grundregeln: keine

## Kontext

Das Backend bildet heute jede Fehlerantwort von GitLab außer 404 auf `GITLAB_ERROR` (502) ab. Das
gilt für 401 und 403 (Token ungültig oder ohne Rechte), für 5xx und für fehlende Antworten. Das
Frontend zeigt dazu „GitLab hat nicht geantwortet.“. Bei der manuellen Prüfung von 0019 hatte ein
fine-grained Token keine Projektrechte. GitLab antwortete 403, die Oberfläche meldete eine
fehlende Antwort, und das Log enthielt keine Zeile. Clients entscheiden nur anhand von
`errorCode`, nie anhand von `detail` (Umsetzungsplan 4.4). Eine genauere Meldung braucht deshalb
einen eigenen Code.

## Optionen

### Option A: Neuer Code `GITLAB_ACCESS_DENIED` (502)

- Vorteile:
  - Die Oberfläche nennt die Ursache und was zu tun ist (Token, Scope `api`, Rechte im Projekt).
  - `GITLAB_ERROR` meint danach nur noch „nicht erreichbar oder gestört“.
  - Die Änderung ist additiv für den Vertrag.
- Nachteile:
  - Ein Enum-Wert mehr im Vertrag (Version 2.2.0).
  - Das Frontend muss den Code an drei Formularen kennen.

### Option B: Kein neuer Code, nur neutraler Text und Log

`GITLAB_ERROR` bekommt den Text „Die Anfrage an GitLab ist fehlgeschlagen.“, und das Backend
loggt den Status.

- Vorteile: Der Vertrag bleibt unverändert, das Risiko ist medium.
- Nachteile: Die Person an der Oberfläche erfährt nicht, dass der Token das Problem ist. Die
  Ursache steht nur im Log des Backends.

## Entscheidung

Option A. Der häufigste Einrichtungsfehler, ein Token ohne passende Rechte, wird dort sichtbar,
wo er auffällt. Der Status bleibt 502, weil der Fehler beim vorgelagerten System liegt und nicht
beim Aufrufer. Zusätzlich loggt das Backend jede Fehlerantwort von GitLab mit Operation und
Status, ohne Token und ohne Antworttext.

## Folgen

- `ErrorCode` bekommt `GITLAB_ACCESS_DENIED(502)`, `info.version` wird `2.2.0`, `make contracts`.
- `GitLabIssues` und `ResultPublisher` bilden `Reason.UNAUTHORIZED` auf den neuen Code ab.
- `GITLAB_ERROR` bekommt den Text „GitLab ist gerade nicht erreichbar. Bitte später erneut
  versuchen.“
- Ein privates Projekt, das der Token nicht sieht, beantwortet GitLab weiterhin mit 404, also
  `ISSUE_NOT_FOUND`. Das README nennt diesen Fall.
