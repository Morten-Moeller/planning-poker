package planningpoker.platform;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(
        description = "Error response after RFC 9457. Clients branch on errorCode only.",
        requiredProperties = {"type", "title", "status", "detail", "errorCode"})
public record ProblemDetail(
        @Schema(description = "URI of the problem type.", examples = "about:blank") String type,
        @Schema(description = "HTTP reason phrase.", examples = "Conflict") String title,
        @Schema(description = "HTTP status code.", examples = "409") int status,
        @Schema(description = "Explanation for people; not stable.", examples = "The round is already revealed.")
                String detail,
        ErrorCode errorCode) {

    public static final String MEDIA_TYPE = "application/problem+json";

    public static ProblemDetail of(ErrorCode errorCode, String detail) {
        return new ProblemDetail("about:blank", errorCode.title(), errorCode.status(), detail, errorCode);
    }
}
