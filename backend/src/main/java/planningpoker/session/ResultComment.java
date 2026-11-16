package planningpoker.session;

import java.util.Locale;
import java.util.stream.Collectors;

final class ResultComment {

    private ResultComment() {}

    static String of(Confirmation confirmation) {
        RoundStats stats = confirmation.stats();
        String distribution = stats.distribution().stream()
                .map(cardCount -> label(cardCount.card()) + " (" + cardCount.count()
                        + (cardCount.count() == 1 ? " Stimme" : " Stimmen") + ")")
                .collect(Collectors.joining(", "));
        String average = stats.average().isPresent()
                ? "Durchschnitt "
                        + String.format(Locale.GERMANY, "%.1f", stats.average().getAsDouble()) + "."
                : "Kein Durchschnitt.";
        return "**Planning Poker: Ergebnis " + label(confirmation.card()) + "**\n\nRunden: "
                + confirmation.roundNumber() + ". Letzte Runde: " + distribution + ". " + average;
    }

    private static String label(Card card) {
        return card == Card.COFFEE ? "☕" : card.wireValue();
    }
}
