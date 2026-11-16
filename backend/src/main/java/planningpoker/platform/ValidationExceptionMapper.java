package planningpoker.platform;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import jakarta.ws.rs.core.Response;
import java.util.stream.Collectors;
import org.jboss.resteasy.reactive.server.ServerExceptionMapper;

public class ValidationExceptionMapper {

    @ServerExceptionMapper
    public Response toProblem(ConstraintViolationException exception) {
        String detail = exception.getConstraintViolations().stream()
                .map(ValidationExceptionMapper::describe)
                .sorted()
                .collect(Collectors.joining("; "));
        return ApiExceptionMapper.problemResponse(ErrorCode.VALIDATION_ERROR, detail);
    }

    private static String describe(ConstraintViolation<?> violation) {
        String path = violation.getPropertyPath().toString();
        String field = path.substring(path.lastIndexOf('.') + 1);
        return field + ": " + violation.getMessage();
    }
}
