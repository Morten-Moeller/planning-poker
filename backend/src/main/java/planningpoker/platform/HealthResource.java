package planningpoker.platform;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/api/health")
public class HealthResource {

    public record HealthStatus(String status) {}

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public HealthStatus get() {
        return new HealthStatus("UP");
    }
}
