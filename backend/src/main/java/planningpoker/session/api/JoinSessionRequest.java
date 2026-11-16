package planningpoker.session.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "Joins a session as developer.")
public record JoinSessionRequest(
        @NotBlank
                @Size(max = 30)
                @Schema(
                        description = "Name of the participant, 1 to 30 characters after trimming, unique per session.",
                        examples = "Ben",
                        minLength = 1,
                        maxLength = 30)
                String name) {

    public JoinSessionRequest {
        name = name == null ? null : name.strip();
    }
}
