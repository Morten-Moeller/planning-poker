package planningpoker.session;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public record HistoryEntry(
        long issueIid,
        String issueTitle,
        int roundNumber,
        List<Vote> votes,
        RoundStats stats,
        Optional<Card> finalCard,
        Instant revealedAt) {

    public HistoryEntry {
        votes = List.copyOf(votes);
    }

    HistoryEntry withFinalCard(Card card) {
        return new HistoryEntry(issueIid, issueTitle, roundNumber, votes, stats, Optional.of(card), revealedAt);
    }
}
