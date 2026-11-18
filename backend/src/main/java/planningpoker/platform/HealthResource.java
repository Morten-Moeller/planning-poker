package planningpoker.platform;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

@Path("/api/health")
@Tag(name = "platform", description = "Health and settings of the backend.")
public class HealthResource {

    @Schema(description = "Health of the backend.", requiredProperties = "status")
    public record HealthStatus(@Schema(description = "UP while the backend answers.", examples = "UP") String status) {}

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @Operation(operationId = "health", summary = "Whether the backend answers.")
    @APIResponse(
            responseCode = "200",
            description = "Backend up.",
            content = @Content(schema = @Schema(implementation = HealthStatus.class)))
    public HealthStatus get() {
        return new HealthStatus("UP");
    }
}
