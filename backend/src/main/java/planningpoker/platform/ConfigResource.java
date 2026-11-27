package planningpoker.platform;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/api/config")
@Tag(name = "platform", description = "Health and settings of the backend.")
public class ConfigResource {

    @Schema(
            description = "Settings of the backend for the frontend.",
            requiredProperties = {"rememberSessions", "demo"})
    public record ConfigResponse(
            @Schema(
                    description =
                            "Whether the browser keeps the last sessions with their token in localStorage (planningpoker.session.remember).")
            boolean rememberSessions,

            @Schema(
                    description =
                            "Whether the backend runs in demo mode: no GitLab token is set (planningpoker.gitlab.token), projects and issues are examples in memory.")
            boolean demo) {}

    private final boolean rememberSessions;
    private final boolean demo;

    public ConfigResource(
            @ConfigProperty(name = "planningpoker.session.remember", defaultValue = "true") boolean rememberSessions,
            @ConfigProperty(name = "planningpoker.gitlab.token") Optional<String> gitLabToken) {
        this.rememberSessions = rememberSessions;
        this.demo = gitLabToken.map(String::isBlank).orElse(true);
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(operationId = "getConfig", summary = "Settings of the backend for the frontend.")
    @APIResponse(
            responseCode = "200",
            description = "Settings.",
            content = @Content(schema = @Schema(implementation = ConfigResponse.class)))
    public ConfigResponse get() {
        return new ConfigResponse(rememberSessions, demo);
    }
}
