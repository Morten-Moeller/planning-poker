package planningpoker.session.api;

import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(
        description = "One page of the GitLab projects that a session can use.",
        requiredProperties = {"items", "nextPage"})
public record ProjectListResponse(
        @Schema(description = "Projects of this page.") List<ProjectSummary> items,
        @Schema(description = "Number of the next page; null on the last page.", nullable = true, examples = "2")
                Integer nextPage) {

    @Schema(
            description = "GitLab project with name, path and link.",
            requiredProperties = {"id", "name", "pathWithNamespace", "webUrl"})
    public record ProjectSummary(
            @Schema(description = "Numeric id of the project in GitLab.", examples = "1234") long id,
            @Schema(description = "Name of the project.", examples = "Planning Poker") String name,
            @Schema(description = "Path of the project with its group.", examples = "group/planning-poker")
                    String pathWithNamespace,
            @Schema(
                            description = "Link to the project in GitLab.",
                            examples = "https://gitlab.com/group/planning-poker")
                    String webUrl) {}
}
