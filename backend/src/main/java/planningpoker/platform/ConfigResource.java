package planningpoker.platform;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/api/config")
@Tag(name = "platform", description = "Health and settings of the backend.")
public class ConfigResource {

    @Schema(description = "Settings of the backend for the frontend.", requiredProperties = "rememberSessions")
    public record ConfigResponse(
            @Schema(
                            description =
                                    "Whether the browser keeps the last sessions with their token in localStorage (planningpoker.session.remember).")
                    boolean rememberSessions) {}

    private final boolean rememberSessions;

    public ConfigResource(
            @ConfigProperty(name = "planningpoker.session.remember", defaultValue = "true") boolean rememberSessions) {
        this.rememberSessions = rememberSessions;
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(operationId = "getConfig", summary = "Settings of the backend for the frontend.")
    @APIResponse(
            responseCode = "200",
            description = "Settings.",
            content = @Content(schema = @Schema(implementation = ConfigResponse.class)))
    public ConfigResponse get() {
        return new ConfigResponse(rememberSessions);
    }
}
