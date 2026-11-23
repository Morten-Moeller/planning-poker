package planningpoker.session.api;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "Creates a session; the caller becomes the scrum master.")
public record CreateSessionRequest(
        @NotBlank
        @Size(max = 30)
        @Schema(
                description = "Name of the scrum master, 1 to 30 characters after trimming.",
                examples = "Anna",
                minLength = 1,
                maxLength = 30)
        String name,

        @NotBlank @Schema(description = "Id or path of the GitLab project.", examples = "1234")
        String gitlabProjectId,

        @Positive
        @Schema(
                description = "Iid of the preselected issue. Without it the session starts without a preselection.",
                examples = "42")
        Long issueIid) {

    public CreateSessionRequest {
        name = name == null ? null : name.strip();
    }
}
