package planningpoker.session;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import java.util.stream.IntStream;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class ResultCommentTest {

    private static final Issue ISSUE = new Issue(42, "Login page", "", "https://gitlab.example/g/p/-/issues/42");

    @ParameterizedTest(name = "{0}")
    @MethodSource("cases")
    void writes_the_result_comment_from_the_template(
            String name, int roundNumber, List<Card> cards, Card finalCard, String expected) {
        List<Vote> votes = IntStream.range(0, cards.size())
                .mapToObj(i -> new Vote("p" + i, "Dev" + i, cards.get(i)))
                .toList();
        Confirmation confirmation = new Confirmation(ISSUE, roundNumber, RoundStats.of(votes), finalCard);

        assertEquals(expected, ResultComment.of(confirmation));
    }

    static Stream<Arguments> cases() {
        return Stream.of(
                Arguments.of(
                        "mixed cards after two rounds: average with a comma",
                        2,
                        List.of(Card.THREE, Card.FIVE, Card.FIVE, Card.FIVE, Card.EIGHT),
                        Card.FIVE,
                        "**Planning Poker: Ergebnis 5**\n\n"
                                + "Runden: 2. Letzte Runde: 3 (1 Stimme), 5 (3 Stimmen), 8 (1 Stimme). Durchschnitt 5,2."),
                Arguments.of(
                        "only ? and coffee: no average, coffee as a symbol",
                        1,
                        List.of(Card.COFFEE, Card.QUESTION, Card.COFFEE),
                        Card.COFFEE,
                        "**Planning Poker: Ergebnis ☕**\n\n"
                                + "Runden: 1. Letzte Runde: ? (1 Stimme), ☕ (2 Stimmen). Kein Durchschnitt."),
                Arguments.of(
                        "one vote: singular and a whole average",
                        3,
                        List.of(Card.THIRTEEN),
                        Card.THIRTEEN,
                        "**Planning Poker: Ergebnis 13**\n\n"
                                + "Runden: 3. Letzte Runde: 13 (1 Stimme). Durchschnitt 13,0."),
                Arguments.of(
                        "tie with a question mark: cards in deck order, numbers only in the average",
                        1,
                        List.of(Card.EIGHT, Card.QUESTION, Card.THREE, Card.EIGHT, Card.THREE),
                        Card.QUESTION,
                        "**Planning Poker: Ergebnis ?**\n\n"
                                + "Runden: 1. Letzte Runde: 3 (2 Stimmen), 8 (2 Stimmen), ? (1 Stimme). Durchschnitt 5,5."));
    }
}
