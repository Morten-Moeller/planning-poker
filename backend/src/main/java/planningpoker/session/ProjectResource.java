package planningpoker.session;

import jakarta.inject.Inject;
import jakarta.validation.constraints.Min;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import planningpoker.platform.ProblemDetail;
import planningpoker.session.api.IssueListResponse;
import planningpoker.session.api.ProjectListResponse;

@Path("/api/projects")
@Tag(name = "projects", description = "GitLab projects and their open issues before a session exists.")
@Produces(MediaType.APPLICATION_JSON)
public class ProjectResource {

    private static final String PROBLEM = ProblemDetail.MEDIA_TYPE;

    @Inject
    GitLabProjects gitLabProjects;

    @Inject
    GitLabIssues gitLabIssues;

    @Inject
    ProjectAllowlist allowlist;

    @GET
    @Operation(
            operationId = "listProjects",
            summary =
                    "Projects for a new session: the project allowlist when set, otherwise the projects of the GitLab token.")
    @APIResponse(
            responseCode = "200",
            description = "One page of projects.",
            content = @Content(schema = @Schema(implementation = ProjectListResponse.class)))
    @APIResponse(
            responseCode = "400",
            description = "VALIDATION_ERROR",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "502",
            description = "GITLAB_ACCESS_DENIED, GITLAB_ERROR",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    public Response listProjects(
            @QueryParam("search") @Parameter(description = "Text to search in name and path.") String search,
            @QueryParam("page") @DefaultValue("1") @Min(1) @Parameter(description = "Page number, starting at 1.")
                    int page) {
        return Response.ok(gitLabProjects.search(search, page)).build();
    }

    @GET
    @Path("/{projectId}/issues")
    @Operation(operationId = "listProjectIssues", summary = "Open issues of a project for a new session.")
    @APIResponse(
            responseCode = "200",
            description = "One page of open issues.",
            content = @Content(schema = @Schema(implementation = IssueListResponse.class)))
    @APIResponse(
            responseCode = "400",
            description = "VALIDATION_ERROR",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "403",
            description = "PROJECT_NOT_ALLOWED",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "502",
            description = "GITLAB_ACCESS_DENIED, GITLAB_ERROR",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    public Response listProjectIssues(
            @PathParam("projectId") @Parameter(description = "Id or path of the GitLab project.") String projectId,
            @QueryParam("search") @Parameter(description = "Text to search in title and description.") String search,
            @QueryParam("page") @DefaultValue("1") @Min(1) @Parameter(description = "Page number, starting at 1.")
                    int page) {
        String project = projectId.strip();
        allowlist.requireAllowed(project);
        return Response.ok(gitLabIssues.search(project, search, page)).build();
    }
}
