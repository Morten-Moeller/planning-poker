package planningpoker.gitlab;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/v4/projects")
@Produces(MediaType.APPLICATION_JSON)
public interface GitLabProjectApi {

    @GET
    Response searchProjects(
            @QueryParam("membership") boolean membership,
            @QueryParam("simple") boolean simple,
            @QueryParam("search") String search,
            @QueryParam("order_by") String orderBy,
            @QueryParam("per_page") int perPage,
            @QueryParam("page") int page);

    @GET
    @Path("/{id}")
    GitLabProject loadProject(@PathParam("id") String projectId);
}
