package planningpoker.session.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "Joins a session. The invite code sets the role: DEVELOPER or VIEWER.")
public record JoinSessionRequest(
        @NotBlank
                @Size(max = 30)
                @Schema(
                        description = "Name of the participant, 1 to 30 characters after trimming, unique per session.",
                        examples = "Ben",
                        minLength = 1,
                        maxLength = 30)
                String name,
        @NotBlank
                @Schema(
                        description =
                                "Invite code from the invite link of the scrum master. The code for developers gives DEVELOPER, the code for viewers gives VIEWER.",
                        examples = "q3Vx8LkP0aZ1bC2dE3fG4hI5jK6lM7nO",
                        minLength = 1)
                String invite) {

    public JoinSessionRequest {
        name = name == null ? null : name.strip();
    }
}
