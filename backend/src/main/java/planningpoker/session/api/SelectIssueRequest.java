package planningpoker.session.api;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "Makes an issue the active issue and starts round 1.")
public record SelectIssueRequest(
        @NotNull @Positive @Schema(description = "Iid of the issue inside the project.", examples = "42")
                Long issueIid) {}
