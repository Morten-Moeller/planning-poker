package planningpoker.session.api;

import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(
        description = "One page of the issues of the project.",
        requiredProperties = {"items", "nextPage", "total"})
public record IssueListResponse(
        @Schema(description = "Issues of this page.") List<IssueSummary> items,

        @Schema(description = "Number of the next page; null on the last page.", nullable = true, examples = "2")
        Integer nextPage,

        @Schema(
                description =
                        "Number of issues that match the query, from the GitLab header X-Total; null when GitLab omits it for large results.",
                nullable = true,
                examples = "23")
        Integer total) {

    @Schema(
            description = "Issue of the project without its description.",
            requiredProperties = {"iid", "title", "webUrl", "weight"})
    public record IssueSummary(
            @Schema(description = "Iid of the issue inside the project.", examples = "42")
            long iid,

            @Schema(description = "Title of the issue.", examples = "Login page")
            String title,

            @Schema(
                    description = "Link to the issue in GitLab.",
                    examples = "https://gitlab.com/group/project/-/issues/42")
            String webUrl,

            @Schema(
                    description = "Weight of the issue; null without weight or when GitLab has no weight.",
                    nullable = true,
                    examples = "5")
            Integer weight) {}
}
