# 0014: Dritte Rolle „Zuschauer“, Beitreten nur über Einladungscodes je Rolle

Status: accepted
Datum: 2026-11-18
Spec: docs/specs/0040-zuschauer.md
Ersetzt Grundregeln: keine; erweitert die Rollen aus ADR 0003 und ändert den Weg zum Beitreten aus A-17 und R-02 (nur noch per Link)

## Kontext

Beim Planning Poker sitzen oft Personen dabei, die nicht schätzen: der Product Owner, der das
Issue vorstellt und Fragen beantwortet, Stakeholder oder neue Teammitglieder. Heute treten sie als
Entwickler bei. Sie bekommen dann Karten, zählen bei „Alle haben geschätzt“ mit und erscheinen ohne
Stimme als „Nicht geschätzt“.

Die Person möchte eine Rolle „Zuschauer“. Der Scrum Master vergibt sie über zwei Einladungslinks,
beim Beitreten wählt niemand etwas. Die Rolle soll fest am Link hängen: Wer den Zuschauer-Link hat,
soll nicht als Entwickler beitreten können.

R-02 lautet: „Teilnehmer treten über einen generierten Link oder eine Session-ID bei.“ Bisher
gehen beide Wege.

## Optionen

### Option A: Rolle als Parameter im Link

Der Link trägt `?as=viewer`, beim Beitreten wird die Rolle als Feld mitgeschickt.

- Vorteile: einfach, und das Beitreten über die Session-ID bleibt.
- Nachteile: Der Link lenkt die Rolle, er sperrt sie nicht. Wer den Parameter entfernt, tritt als Entwickler bei.

### Option B: Ein Einladungscode je Rolle, Beitreten nur per Link

Beim Anlegen erzeugt der Server zwei zufällige Codes mit mindestens 128 Bit aus `SecureRandom`,
einen für Entwickler und einen für Zuschauer. Der Link ist `/session/<id>/join?invite=<code>`. Beim
Beitreten schickt der Client den Code, und der Server leitet die Rolle daraus ab. Das Beitreten nur
mit der Session-ID entfällt.

- Vorteile: Die Rolle hängt wirklich am Link, und die Codes sind nicht zu erraten.
- Nachteile:
  - Das Feld „Sitzung beitreten“ auf der Startseite entfällt.
  - R-02 ist nur noch über den Link erfüllt. Die Anforderung sagt „oder“.
  - Es gibt neue Geheimnisse im Snapshot des Scrum Masters.

### Option C: Session-ID plus kurzer Rollen-Code zum Abtippen

- Vorteile: Abtippen bleibt möglich.
- Nachteile:
  - Kurze Codes sind ohne Rate-Limit zu erraten, und ein Rate-Limit gibt es bisher nicht.
  - Die Oberfläche wird größer.

## Entscheidung

Option B, gewählt von der Person am 2026-11-18. Beitreten geht nur über einen der beiden Links.
Zuschauer schätzen nicht, steuern nicht und zählen nicht als Schätzer.

## Folgen

- Vertrag:
  - `Role` bekommt `VIEWER`.
  - `JoinSessionRequest` bekommt das Pflichtfeld `invite`.
  - Der Snapshot bekommt `invites` mit `developer` und `viewer`, nur für den Scrum Master gefüllt, für alle anderen `null`.
  - Neuer `errorCode` `INVITE_INVALID` (403).
  - Die Version steigt von `3.4.0` auf `4.0.0`, weil das Pflichtfeld beim Beitreten die Änderung brechen lässt. Verbraucher ist nur das Frontend dieses Repositorys, es zieht in derselben Änderung nach.
- Die Codes erscheinen in keinem Log. Der Server vergleicht sie in konstanter Zeit.
- Umsetzungsplan: Eine neue Annahme A-19 legt fest: „Beitreten nur über den Einladungslink; R-02 ist über den generierten Link erfüllt.“ A-17 gilt für die Session-ID weiter, weil sie in Links, Fakten und Toolbar steht.
- Glossar: neue Begriffe „Zuschauer“ und „Einladungslink“. „Rolle“ nennt drei Rollen.
- Invarianten:
  - Nur Entwickler stimmen ab.
  - „Alle haben geschätzt“ und „Nicht geschätzt“ zählen nur Entwickler.
  - Zuschauer zählen zur Obergrenze der Teilnehmer.
  - Die Rolle eines Beitretenden folgt nur aus dem Code.
