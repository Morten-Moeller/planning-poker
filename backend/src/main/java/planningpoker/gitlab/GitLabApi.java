package planningpoker.gitlab;

import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

@Path("/api/v4/projects/{id}/issues")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public interface GitLabApi {

    @GET
    Response searchIssues(
            @PathParam("id") String projectId,
            @QueryParam("state") String state,
            @QueryParam("search") String search,
            @QueryParam("per_page") int perPage,
            @QueryParam("page") int page);

    @GET
    @Path("/{iid}")
    GitLabIssue loadIssue(@PathParam("id") String projectId, @PathParam("iid") long iid);

    @POST
    @Path("/{iid}/notes")
    Response addNote(@PathParam("id") String projectId, @PathParam("iid") long iid, NoteRequest note);

    @PUT
    @Path("/{iid}")
    Response setWeight(@PathParam("id") String projectId, @PathParam("iid") long iid, WeightRequest weight);
}
