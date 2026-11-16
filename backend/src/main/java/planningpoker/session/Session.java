package planningpoker.session;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import planningpoker.platform.ErrorCode;
import planningpoker.platform.Ids;
import planningpoker.platform.UuidV7;

public final class Session {

    static final int NAME_MAX_LENGTH = 30;

    private final String id;
    private final String gitlabProjectId;
    private final Map<String, Participant> participants = new LinkedHashMap<>();
    private final List<HistoryEntry> history = new ArrayList<>();
    private Phase phase = Phase.LOBBY;
    private Long preselectedIssueIid;
    private Issue activeIssue;
    private Round round;
    private volatile Instant lastActivityAt;

    public Session(String id, String gitlabProjectId, long preselectedIssueIid, Instant now) {
        this.id = id;
        this.gitlabProjectId = gitlabProjectId;
        this.preselectedIssueIid = preselectedIssueIid;
        this.lastActivityAt = now;
    }

    public String id() {
        return id;
    }

    public String gitlabProjectId() {
        return gitlabProjectId;
    }

    public Phase phase() {
        return phase;
    }

    public List<Participant> participants() {
        return List.copyOf(participants.values());
    }

    public Optional<Participant> participant(String participantId) {
        return Optional.ofNullable(participants.get(participantId));
    }

    public Optional<Long> preselectedIssueIid() {
        return Optional.ofNullable(preselectedIssueIid);
    }

    public Optional<Issue> activeIssue() {
        return Optional.ofNullable(activeIssue);
    }

    public Optional<Round> round() {
        return Optional.ofNullable(round);
    }

    public List<HistoryEntry> history() {
        return Collections.unmodifiableList(history);
    }

    public Instant lastActivityAt() {
        return lastActivityAt;
    }

    public void touch(Instant now) {
        lastActivityAt = now;
    }

    public Participant join(String name) {
        String trimmed = name.strip();
        if (trimmed.isEmpty() || trimmed.length() > NAME_MAX_LENGTH) {
            throw new SessionException(ErrorCode.VALIDATION_ERROR, "The name needs 1 to 30 characters.");
        }
        boolean taken = participants.values().stream()
                .anyMatch(participant -> participant.name().equalsIgnoreCase(trimmed));
        if (taken) {
            throw new SessionException(ErrorCode.NAME_TAKEN, "The name is already taken in this session.");
        }
        Role role = participants.isEmpty() ? Role.SCRUM_MASTER : Role.DEVELOPER;
        Participant participant = new Participant(UuidV7.next(), trimmed, role, Ids.token());
        participants.put(participant.id(), participant);
        return participant;
    }

    public void connect(String participantId) {
        actor(participantId).connected(true);
    }

    public void disconnect(String participantId) {
        actor(participantId).connected(false);
    }

    public void selectIssue(String actorId, Issue issue) {
        requireRole(actorId, Role.SCRUM_MASTER);
        requireNotConfirming();
        activeIssue = issue;
        round = new Round(1);
        phase = Phase.VOTING;
    }

    public boolean vote(String actorId, Card card) {
        requireRole(actorId, Role.DEVELOPER);
        requirePhase(Phase.VOTING, "A card can only be chosen while the round runs.");
        boolean before = allVoted();
        round.vote(actorId, card);
        return !before && allVoted();
    }

    public void reveal(String actorId) {
        requireRole(actorId, Role.SCRUM_MASTER);
        requirePhase(Phase.VOTING, "Only a running round can be revealed.");
        List<Vote> votes = votes();
        RoundStats stats = RoundStats.of(votes);
        round.reveal(stats);
        history.add(
                0,
                new HistoryEntry(
                        activeIssue.iid(),
                        activeIssue.title(),
                        round.number(),
                        votes,
                        stats,
                        Optional.empty(),
                        lastActivityAt));
        phase = Phase.REVEALED;
    }

    public void restart(String actorId) {
        requireRole(actorId, Role.SCRUM_MASTER);
        requireNotConfirming();
        requirePhase(Phase.REVEALED, "A new round needs a revealed round.");
        round = new Round(round.number() + 1);
        phase = Phase.VOTING;
    }

    public Confirmation beginConfirm(String actorId, Card card) {
        requireRole(actorId, Role.SCRUM_MASTER);
        requireNotConfirming();
        requirePhase(Phase.REVEALED, "Only a revealed round can be confirmed.");
        round.confirming(true);
        return new Confirmation(activeIssue, round.number(), round.stats().orElseThrow(), card);
    }

    public void finishConfirm(Card card) {
        requireConfirming();
        history.set(0, history.get(0).withFinalCard(card));
        round = null;
        activeIssue = null;
        preselectedIssueIid = null;
        phase = Phase.LOBBY;
    }

    public void failConfirm() {
        requireConfirming();
        round.confirming(false);
    }

    public boolean allVoted() {
        if (round == null) {
            return false;
        }
        List<Participant> connectedDevelopers = participants.values().stream()
                .filter(participant -> participant.role() == Role.DEVELOPER && participant.connected())
                .toList();
        return !connectedDevelopers.isEmpty()
                && connectedDevelopers.stream().allMatch(developer -> round.hasVoted(developer.id()));
    }

    private List<Vote> votes() {
        return participants.values().stream()
                .filter(participant -> round.hasVoted(participant.id()))
                .map(participant -> new Vote(
                        participant.id(),
                        participant.name(),
                        round.cardOf(participant.id()).orElseThrow()))
                .toList();
    }

    private Participant actor(String participantId) {
        Participant participant = participants.get(participantId);
        if (participant == null) {
            throw new SessionException(ErrorCode.UNAUTHORIZED, "Unknown participant.");
        }
        return participant;
    }

    private void requireRole(String actorId, Role role) {
        if (actor(actorId).role() != role) {
            throw new SessionException(ErrorCode.FORBIDDEN_ROLE, "This action needs the role " + role + ".");
        }
    }

    private void requirePhase(Phase expected, String detail) {
        if (phase != expected) {
            throw new SessionException(ErrorCode.INVALID_STATE, detail);
        }
    }

    private void requireNotConfirming() {
        if (round != null && round.confirming()) {
            throw new SessionException(ErrorCode.INVALID_STATE, "The result is being written to GitLab.");
        }
    }

    private void requireConfirming() {
        if (round == null || !round.confirming()) {
            throw new SessionException(ErrorCode.INVALID_STATE, "No confirmation is running.");
        }
    }
}
