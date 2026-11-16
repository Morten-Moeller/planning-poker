package planningpoker.session.api;

import jakarta.validation.constraints.NotNull;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import planningpoker.session.Card;

@Schema(description = "Chooses or changes the hidden card of the caller in the running round.")
public record VoteRequest(@NotNull @Schema(description = "Chosen card.") Card card) {}
