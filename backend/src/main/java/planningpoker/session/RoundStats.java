package planningpoker.session;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.OptionalDouble;
import java.util.OptionalInt;

public record RoundStats(List<CardCount> distribution, OptionalDouble average, List<Card> mostFrequent) {

    public record CardCount(Card card, int count) {}

    public RoundStats {
        distribution = List.copyOf(distribution);
        mostFrequent = List.copyOf(mostFrequent);
    }

    public static RoundStats of(List<Vote> votes) {
        Map<Card, Integer> counts = new EnumMap<>(Card.class);
        for (Vote vote : votes) {
            counts.merge(vote.card(), 1, Integer::sum);
        }
        List<CardCount> distribution = new ArrayList<>();
        int highest = 0;
        for (Map.Entry<Card, Integer> entry : counts.entrySet()) {
            distribution.add(new CardCount(entry.getKey(), entry.getValue()));
            highest = Math.max(highest, entry.getValue());
        }
        List<Card> mostFrequent = new ArrayList<>();
        for (CardCount cardCount : distribution) {
            if (cardCount.count() == highest) {
                mostFrequent.add(cardCount.card());
            }
        }
        return new RoundStats(distribution, average(votes), mostFrequent);
    }

    private static OptionalDouble average(List<Vote> votes) {
        OptionalDouble raw = votes.stream()
                .map(vote -> number(vote.card()))
                .filter(OptionalInt::isPresent)
                .mapToInt(OptionalInt::getAsInt)
                .average();
        if (raw.isEmpty()) {
            return OptionalDouble.empty();
        }
        return OptionalDouble.of(Math.round(raw.getAsDouble() * 10.0) / 10.0);
    }

    private static OptionalInt number(Card card) {
        return switch (card) {
            case QUESTION, COFFEE -> OptionalInt.empty();
            default -> OptionalInt.of(Integer.parseInt(card.wireValue()));
        };
    }
}
