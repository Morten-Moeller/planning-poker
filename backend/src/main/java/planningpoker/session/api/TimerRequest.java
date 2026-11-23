package planningpoker.session.api;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(
        description =
                "Sets the timer of the session for every round that starts from now on; null switches it off. A running round keeps its deadline.",
        requiredProperties = {"seconds"})
public record TimerRequest(
        @Min(5)
        @Max(3600)
        @Schema(
                description = "Duration of a round in seconds, 5 to 3600; null switches the timer off.",
                nullable = true,
                examples = "30")
        Integer seconds) {}
