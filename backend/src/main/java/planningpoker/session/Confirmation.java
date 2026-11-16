package planningpoker.session;

public record Confirmation(Issue issue, int roundNumber, RoundStats stats, Card card) {}
