package planningpoker.platform;

import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(description = "Stable error code. Clients branch on it, never on the detail text.")
public enum ErrorCode {
    VALIDATION_ERROR(400),
    INVALID_CARD(400),
    UNAUTHORIZED(401),
    FORBIDDEN_ROLE(403),
    PROJECT_NOT_ALLOWED(403),
    INVITE_INVALID(403),
    SESSION_NOT_FOUND(404),
    ISSUE_NOT_FOUND(404),
    PROJECT_NOT_FOUND(404),
    NAME_TAKEN(409),
    INVALID_STATE(409),
    LIMIT_REACHED(409),
    GITLAB_ACCESS_DENIED(502),
    GITLAB_ERROR(502);

    private final int status;

    ErrorCode(int status) {
        this.status = status;
    }

    public int status() {
        return status;
    }

    public String title() {
        return Response.Status.fromStatusCode(status).getReasonPhrase();
    }
}
