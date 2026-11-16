package planningpoker.session.api;

import jakarta.validation.constraints.NotNull;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import planningpoker.session.Card;

@Schema(description = "Confirms a card as the final value of the revealed round and writes it to GitLab.")
public record ConfirmRequest(@NotNull @Schema(description = "Final card.") Card card) {}
