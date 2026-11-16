package planningpoker.session;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

class SessionBuilder {

    static final Instant CREATED_AT = Instant.parse("2026-11-16T09:00:00Z");
    static final Issue ISSUE =
            new Issue(42, "Login page", "As a user I want to log in.", "https://gitlab.example/i/42");
    static final Issue OTHER_ISSUE = new Issue(43, "Logout", "", "https://gitlab.example/i/43");

    static final int MAX_PARTICIPANTS = 50;

    private int developers = 2;
    private Phase phase = Phase.LOBBY;
    private boolean confirming;
    private Integer timerSeconds;

    static SessionBuilder session() {
        return new SessionBuilder();
    }

    SessionBuilder developers(int developers) {
        this.developers = developers;
        return this;
    }

    SessionBuilder timer(int seconds) {
        this.timerSeconds = seconds;
        return this;
    }

    SessionBuilder inPhase(Phase phase) {
        this.phase = phase;
        return this;
    }

    SessionBuilder voting() {
        return inPhase(Phase.VOTING);
    }

    SessionBuilder revealed() {
        return inPhase(Phase.REVEALED);
    }

    SessionBuilder confirming() {
        this.confirming = true;
        return revealed();
    }

    Session build() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Session session = new Session("K7P2QX9M", "4711", ISSUE.iid(), CREATED_AT, MAX_PARTICIPANTS);
        Participant master = session.join("Master " + suffix);
        session.connect(master.id());
        for (int i = 1; i <= developers; i++) {
            Participant developer = session.join("Dev" + i + " " + suffix);
            session.connect(developer.id());
        }
        if (timerSeconds != null) {
            session.setTimer(master.id(), timerSeconds);
        }
        if (phase == Phase.LOBBY) {
            return session;
        }
        session.selectIssue(master.id(), ISSUE, CREATED_AT);
        if (phase == Phase.VOTING) {
            return session;
        }
        List<Participant> developerList = developers(session);
        for (int i = 0; i < developerList.size(); i++) {
            session.vote(developerList.get(i).id(), i % 2 == 0 ? Card.FIVE : Card.EIGHT);
        }
        session.reveal(master.id());
        if (confirming) {
            session.beginConfirm(master.id(), Card.FIVE);
        }
        return session;
    }

    static Participant master(Session session) {
        return session.participants().stream()
                .filter(participant -> participant.role() == Role.SCRUM_MASTER)
                .findFirst()
                .orElseThrow();
    }

    static List<Participant> developers(Session session) {
        return session.participants().stream()
                .filter(participant -> participant.role() == Role.DEVELOPER)
                .toList();
    }

    static Participant developer(Session session, int index) {
        return developers(session).get(index);
    }
}
