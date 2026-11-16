package planningpoker.session;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;
import java.util.Arrays;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import planningpoker.platform.ApiException;
import planningpoker.platform.ErrorCode;

@Schema(
        type = SchemaType.STRING,
        description = "Card of the deck in wire format; COFFEE stands for the coffee card.",
        enumeration = {"0", "1", "2", "3", "5", "8", "13", "21", "34", "?", "COFFEE"},
        examples = "5")
public enum Card {
    ZERO("0"),
    ONE("1"),
    TWO("2"),
    THREE("3"),
    FIVE("5"),
    EIGHT("8"),
    THIRTEEN("13"),
    TWENTY_ONE("21"),
    THIRTY_FOUR("34"),
    QUESTION("?"),
    COFFEE("COFFEE");

    private final String wireValue;

    Card(String wireValue) {
        this.wireValue = wireValue;
    }

    @JsonValue
    public String wireValue() {
        return wireValue;
    }

    @JsonCreator
    public static Card fromWire(String value) {
        return Arrays.stream(values())
                .filter(card -> card.wireValue.equals(value))
                .findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.INVALID_CARD, "Unknown card: " + value));
    }
}
