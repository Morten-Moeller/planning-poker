package planningpoker.session;

import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

public final class Round {

    private final int number;
    private Instant deadline;
    private final Map<String, Card> votes = new LinkedHashMap<>();
    private boolean revealed;
    private boolean confirming;
    private RoundStats stats;

    Round(int number) {
        this.number = number;
    }

    public int number() {
        return number;
    }

    public Optional<Instant> deadline() {
        return Optional.ofNullable(deadline);
    }

    public Map<String, Card> votes() {
        return Collections.unmodifiableMap(votes);
    }

    public boolean hasVoted(String participantId) {
        return votes.containsKey(participantId);
    }

    public Optional<Card> cardOf(String participantId) {
        return Optional.ofNullable(votes.get(participantId));
    }

    public boolean revealed() {
        return revealed;
    }

    public boolean confirming() {
        return confirming;
    }

    public Optional<RoundStats> stats() {
        return Optional.ofNullable(stats);
    }

    void start(Instant deadline) {
        this.deadline = deadline;
    }

    void vote(String participantId, Card card) {
        votes.put(participantId, card);
    }

    void reveal(RoundStats stats) {
        this.stats = stats;
        this.revealed = true;
    }

    void confirming(boolean confirming) {
        this.confirming = confirming;
    }
}
