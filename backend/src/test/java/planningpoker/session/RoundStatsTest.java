package planningpoker.session;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.OptionalDouble;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import planningpoker.session.RoundStats.CardCount;

class RoundStatsTest {

    @ParameterizedTest(name = "{0}")
    @MethodSource("cases")
    void evaluates_the_votes_of_a_round(
            String name,
            List<Card> cards,
            List<CardCount> distribution,
            OptionalDouble average,
            List<Card> mostFrequent) {
        List<Vote> votes = IntStream.range(0, cards.size())
                .mapToObj(i -> new Vote("p" + i, "Dev" + i, cards.get(i)))
                .toList();

        RoundStats stats = RoundStats.of(votes);

        assertEquals(distribution, stats.distribution());
        assertEquals(average, stats.average());
        assertEquals(mostFrequent, stats.mostFrequent());
    }

    static Stream<Arguments> cases() {
        return Stream.of(
                Arguments.of(
                        "only ? and coffee: empty average",
                        List.of(Card.QUESTION, Card.COFFEE, Card.QUESTION),
                        List.of(new CardCount(Card.QUESTION, 2), new CardCount(Card.COFFEE, 1)),
                        OptionalDouble.empty(),
                        List.of(Card.QUESTION)),
                Arguments.of(
                        "tie: every most frequent card in deck order",
                        List.of(Card.EIGHT, Card.THREE, Card.THREE, Card.EIGHT),
                        List.of(new CardCount(Card.THREE, 2), new CardCount(Card.EIGHT, 2)),
                        OptionalDouble.of(5.5),
                        List.of(Card.THREE, Card.EIGHT)),
                Arguments.of(
                        "mixed cards: average over number cards, one decimal",
                        List.of(Card.FIVE, Card.EIGHT, Card.QUESTION, Card.TWO, Card.COFFEE),
                        List.of(
                                new CardCount(Card.TWO, 1),
                                new CardCount(Card.FIVE, 1),
                                new CardCount(Card.EIGHT, 1),
                                new CardCount(Card.QUESTION, 1),
                                new CardCount(Card.COFFEE, 1)),
                        OptionalDouble.of(5.0),
                        List.of(Card.TWO, Card.FIVE, Card.EIGHT, Card.QUESTION, Card.COFFEE)),
                Arguments.of(
                        "rounding: 1, 2 and 2 give 1.7",
                        List.of(Card.ONE, Card.TWO, Card.TWO),
                        List.of(new CardCount(Card.ONE, 1), new CardCount(Card.TWO, 2)),
                        OptionalDouble.of(1.7),
                        List.of(Card.TWO)),
                Arguments.of(
                        "a single vote",
                        List.of(Card.THIRTEEN),
                        List.of(new CardCount(Card.THIRTEEN, 1)),
                        OptionalDouble.of(13.0),
                        List.of(Card.THIRTEEN)),
                Arguments.of(
                        "distribution names only chosen cards in deck order",
                        List.of(Card.THIRTY_FOUR, Card.ZERO, Card.THIRTY_FOUR, Card.COFFEE),
                        List.of(
                                new CardCount(Card.ZERO, 1),
                                new CardCount(Card.THIRTY_FOUR, 2),
                                new CardCount(Card.COFFEE, 1)),
                        OptionalDouble.of(22.7),
                        List.of(Card.THIRTY_FOUR)),
                Arguments.of("no votes", List.of(), List.of(), OptionalDouble.empty(), List.of()));
    }
}
