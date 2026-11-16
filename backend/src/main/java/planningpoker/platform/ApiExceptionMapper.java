package planningpoker.platform;

import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.core.Response;
import org.jboss.resteasy.reactive.server.ServerExceptionMapper;

public class ApiExceptionMapper {

    @ServerExceptionMapper
    public Response toProblem(ApiException exception) {
        return problemResponse(exception.errorCode(), exception.detail());
    }

    @ServerExceptionMapper
    public Response unwrapApiException(WebApplicationException exception) {
        for (Throwable cause = exception.getCause(); cause != null; cause = cause.getCause()) {
            if (cause instanceof ApiException apiException) {
                return toProblem(apiException);
            }
        }
        if (exception.getResponse().getStatus() == ErrorCode.VALIDATION_ERROR.status()) {
            return problemResponse(ErrorCode.VALIDATION_ERROR, "The request body is not readable.");
        }
        return exception.getResponse();
    }

    static Response problemResponse(ErrorCode errorCode, String detail) {
        ProblemDetail problem = ProblemDetail.of(errorCode, detail);
        return Response.status(problem.status())
                .type(ProblemDetail.MEDIA_TYPE)
                .entity(problem)
                .build();
    }
}
