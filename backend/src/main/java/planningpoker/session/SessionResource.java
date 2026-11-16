package planningpoker.session;

import jakarta.enterprise.event.Event;
import jakarta.inject.Inject;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DefaultValue;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SecuritySchemeType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.security.SecurityRequirement;
import org.eclipse.microprofile.openapi.annotations.security.SecurityScheme;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import planningpoker.platform.ApiException;
import planningpoker.platform.Authenticated;
import planningpoker.platform.ErrorCode;
import planningpoker.platform.ProblemDetail;
import planningpoker.session.api.ConfirmRequest;
import planningpoker.session.api.CreateSessionRequest;
import planningpoker.session.api.CreateSessionResponse;
import planningpoker.session.api.IssueListResponse;
import planningpoker.session.api.JoinSessionRequest;
import planningpoker.session.api.JoinSessionResponse;
import planningpoker.session.api.SelectIssueRequest;
import planningpoker.session.api.SessionView;
import planningpoker.session.api.VoteRequest;

@Path("/api/sessions")
@Tag(name = "sessions", description = "Sessions, participants and the commands of a round.")
@SecurityScheme(
        securitySchemeName = SessionResource.BEARER_TOKEN,
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        description = "Token of the participant from the create or join response.")
@Produces(MediaType.APPLICATION_JSON)
public class SessionResource {

    static final String BEARER_TOKEN = "bearerToken";
    private static final String PROBLEM = ProblemDetail.MEDIA_TYPE;
    private static final String SESSION_ID = "Session id, 8 characters.";
    private static final String UNAUTHORIZED_RESPONSE = "401";
    private static final String SESSION_NOT_FOUND_RESPONSE = "404";

    private final SessionViewMapper mapper = new SessionViewMapper();

    @Inject
    SessionRegistry registry;

    @Inject
    GitLabIssues gitLabIssues;

    @Inject
    ResultPublisher publisher;

    @Inject
    Event<RoundCompleted> roundCompleted;

    @Inject
    SessionConfig config;

    private record VoteOutcome(boolean completed, int roundNumber) {}

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Operation(operationId = "createSession", summary = "Create a session; the caller becomes the scrum master.")
    @APIResponse(
            responseCode = "201",
            description = "Session created.",
            content = @Content(schema = @Schema(implementation = CreateSessionResponse.class)))
    @APIResponse(
            responseCode = "400",
            description = "VALIDATION_ERROR",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "403",
            description = "PROJECT_NOT_ALLOWED",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "404",
            description = "ISSUE_NOT_FOUND",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "409",
            description = "LIMIT_REACHED",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "502",
            description = "GITLAB_ERROR",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    public Response createSession(@NotNull @Valid CreateSessionRequest request) {
        String projectId = request.gitlabProjectId().strip();
        requireAllowedProject(projectId);
        gitLabIssues.loadIssue(projectId, request.issueIid());
        SessionRegistry.Created created = registry.create(projectId, request.issueIid(), request.name());
        return Response.status(Response.Status.CREATED)
                .entity(new CreateSessionResponse(
                        created.session().id(),
                        created.scrumMaster().id(),
                        created.scrumMaster().token()))
                .build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Path("/{id}/participants")
    @Operation(operationId = "joinSession", summary = "Join a session as developer.")
    @APIResponse(
            responseCode = "201",
            description = "Participant added.",
            content = @Content(schema = @Schema(implementation = JoinSessionResponse.class)))
    @APIResponse(
            responseCode = "400",
            description = "VALIDATION_ERROR",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "404",
            description = "SESSION_NOT_FOUND",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "409",
            description = "NAME_TAKEN, LIMIT_REACHED",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    public Response joinSession(
            @PathParam("id") @Parameter(description = SESSION_ID) String id,
            @NotNull @Valid JoinSessionRequest request) {
        Participant participant = registry.update(id, session -> session.join(request.name()));
        return Response.status(Response.Status.CREATED)
                .entity(new JoinSessionResponse(participant.id(), participant.token()))
                .build();
    }

    @GET
    @Path("/{id}")
    @SecurityRequirement(name = BEARER_TOKEN)
    @Authenticated
    @Operation(operationId = "getSession", summary = "Snapshot of the session, filtered for the caller.")
    @APIResponse(
            responseCode = "200",
            description = "Snapshot.",
            content = @Content(schema = @Schema(implementation = SessionView.class)))
    @APIResponse(
            responseCode = "401",
            description = "UNAUTHORIZED",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "404",
            description = "SESSION_NOT_FOUND",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    public Response getSession(
            @PathParam("id") @Parameter(description = SESSION_ID) String id, @Context ContainerRequestContext context) {
        Actor actor = ActorFilter.actorOf(context);
        SessionView view = registry.read(id, session -> mapper.toView(session, actor.participantId()));
        return Response.ok(view).build();
    }

    @GET
    @Path("/{id}/issues")
    @SecurityRequirement(name = BEARER_TOKEN)
    @Authenticated
    @RequiresRole(Role.SCRUM_MASTER)
    @Operation(operationId = "listIssues", summary = "Issues of the project of the session; scrum master only.")
    @APIResponse(
            responseCode = "200",
            description = "One page of issues.",
            content = @Content(schema = @Schema(implementation = IssueListResponse.class)))
    @APIResponse(
            responseCode = "401",
            description = "UNAUTHORIZED",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "403",
            description = "FORBIDDEN_ROLE",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "404",
            description = "SESSION_NOT_FOUND",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "502",
            description = "GITLAB_ERROR",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    public Response listIssues(
            @PathParam("id") @Parameter(description = SESSION_ID) String id,
            @QueryParam("search") @Parameter(description = "Text to search in title and description.") String search,
            @QueryParam("page") @DefaultValue("1") @Min(1) @Parameter(description = "Page number, starting at 1.")
                    int page) {
        String projectId = registry.read(id, Session::gitlabProjectId);
        return Response.ok(gitLabIssues.search(projectId, search, page)).build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Path("/{id}/active-issue")
    @SecurityRequirement(name = BEARER_TOKEN)
    @Authenticated
    @RequiresRole(Role.SCRUM_MASTER)
    @Operation(
            operationId = "selectIssue",
            summary = "Make an issue active and start round 1; scrum master only. A running round is dropped.")
    @APIResponse(responseCode = "204", description = "Issue active.")
    @APIResponse(
            responseCode = "400",
            description = "VALIDATION_ERROR",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "401",
            description = "UNAUTHORIZED",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "403",
            description = "FORBIDDEN_ROLE",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "404",
            description = "ISSUE_NOT_FOUND, SESSION_NOT_FOUND",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "409",
            description = "INVALID_STATE",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "502",
            description = "GITLAB_ERROR",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    public Response selectIssue(
            @PathParam("id") @Parameter(description = SESSION_ID) String id,
            @NotNull @Valid SelectIssueRequest request,
            @Context ContainerRequestContext context) {
        Actor actor = ActorFilter.actorOf(context);
        String projectId = registry.read(id, Session::gitlabProjectId);
        Issue issue = gitLabIssues.loadIssue(projectId, request.issueIid());
        registry.update(id, session -> {
            session.selectIssue(actor.participantId(), issue);
            return null;
        });
        return Response.noContent().build();
    }

    @PUT
    @Consumes(MediaType.APPLICATION_JSON)
    @Path("/{id}/vote")
    @SecurityRequirement(name = BEARER_TOKEN)
    @Authenticated
    @RequiresRole(Role.DEVELOPER)
    @Operation(operationId = "vote", summary = "Choose or change the hidden card; developer only.")
    @APIResponse(responseCode = "204", description = "Card stored.")
    @APIResponse(
            responseCode = "400",
            description = "INVALID_CARD",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "401",
            description = "UNAUTHORIZED",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "403",
            description = "FORBIDDEN_ROLE",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "404",
            description = "SESSION_NOT_FOUND",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "409",
            description = "INVALID_STATE",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    public Response vote(
            @PathParam("id") @Parameter(description = SESSION_ID) String id,
            @NotNull @Valid VoteRequest request,
            @Context ContainerRequestContext context) {
        Actor actor = ActorFilter.actorOf(context);
        VoteOutcome outcome = registry.update(id, session -> {
            boolean completed = session.vote(actor.participantId(), request.card());
            return new VoteOutcome(completed, session.round().map(Round::number).orElse(0));
        });
        if (outcome.completed()) {
            roundCompleted.fire(new RoundCompleted(id, outcome.roundNumber()));
        }
        return Response.noContent().build();
    }

    @POST
    @Path("/{id}/round/reveal")
    @SecurityRequirement(name = BEARER_TOKEN)
    @Authenticated
    @RequiresRole(Role.SCRUM_MASTER)
    @Operation(operationId = "revealRound", summary = "Reveal every card of the round; scrum master only.")
    @APIResponse(responseCode = "204", description = "Round revealed.")
    @APIResponse(
            responseCode = "401",
            description = "UNAUTHORIZED",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "403",
            description = "FORBIDDEN_ROLE",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "404",
            description = "SESSION_NOT_FOUND",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "409",
            description = "INVALID_STATE",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    public Response revealRound(
            @PathParam("id") @Parameter(description = SESSION_ID) String id, @Context ContainerRequestContext context) {
        Actor actor = ActorFilter.actorOf(context);
        registry.update(id, session -> {
            session.reveal(actor.participantId());
            return null;
        });
        return Response.noContent().build();
    }

    @POST
    @Path("/{id}/round/restart")
    @SecurityRequirement(name = BEARER_TOKEN)
    @Authenticated
    @RequiresRole(Role.SCRUM_MASTER)
    @Operation(operationId = "restartRound", summary = "Start a new round for the active issue; scrum master only.")
    @APIResponse(responseCode = "204", description = "New round started.")
    @APIResponse(
            responseCode = "401",
            description = "UNAUTHORIZED",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "403",
            description = "FORBIDDEN_ROLE",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "404",
            description = "SESSION_NOT_FOUND",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "409",
            description = "INVALID_STATE",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    public Response restartRound(
            @PathParam("id") @Parameter(description = SESSION_ID) String id, @Context ContainerRequestContext context) {
        Actor actor = ActorFilter.actorOf(context);
        registry.update(id, session -> {
            session.restart(actor.participantId());
            return null;
        });
        return Response.noContent().build();
    }

    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Path("/{id}/round/confirm")
    @SecurityRequirement(name = BEARER_TOKEN)
    @Authenticated
    @RequiresRole(Role.SCRUM_MASTER)
    @Operation(
            operationId = "confirmRound",
            summary = "Confirm the final card, write it to GitLab and return to LOBBY; scrum master only.")
    @APIResponse(responseCode = "204", description = "Result written to GitLab.")
    @APIResponse(
            responseCode = "400",
            description = "INVALID_CARD",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "401",
            description = "UNAUTHORIZED",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "403",
            description = "FORBIDDEN_ROLE",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "404",
            description = "SESSION_NOT_FOUND",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "409",
            description = "INVALID_STATE",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    @APIResponse(
            responseCode = "502",
            description = "GITLAB_ERROR",
            content = @Content(mediaType = PROBLEM, schema = @Schema(implementation = ProblemDetail.class)))
    public Response confirmRound(
            @PathParam("id") @Parameter(description = SESSION_ID) String id,
            @NotNull @Valid ConfirmRequest request,
            @Context ContainerRequestContext context) {
        Actor actor = ActorFilter.actorOf(context);
        String projectId = registry.read(id, Session::gitlabProjectId);
        Confirmation confirmation =
                registry.update(id, session -> session.beginConfirm(actor.participantId(), request.card()));
        try {
            publisher.publish(projectId, confirmation);
        } catch (RuntimeException e) {
            registry.update(id, session -> {
                session.failConfirm();
                return null;
            });
            throw e;
        }
        registry.update(id, session -> {
            session.finishConfirm(request.card());
            return null;
        });
        return Response.noContent().build();
    }

    private void requireAllowedProject(String projectId) {
        boolean allowed = config.allowedProjects()
                .map(projects -> projects.stream().map(String::strip).anyMatch(projectId::equals))
                .orElse(true);
        if (!allowed) {
            throw new ApiException(ErrorCode.PROJECT_NOT_ALLOWED, "Sessions for this GitLab project are not allowed.");
        }
    }
}
