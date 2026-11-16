package planningpoker.session;

import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.server.ServerExceptionMapper;
import planningpoker.platform.ProblemDetail;

public class SessionExceptionMapper {

    @ServerExceptionMapper
    public Response toProblem(SessionException exception) {
        ProblemDetail problem = ProblemDetail.of(exception.errorCode(), exception.detail());
        return Response.status(problem.status())
                .type(ProblemDetail.MEDIA_TYPE)
                .entity(problem)
                .build();
    }
}
