package planningpoker.session.api;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(
        description = "Ids and token of the new session and its scrum master.",
        requiredProperties = {"sessionId", "participantId", "token"})
public record CreateSessionResponse(
        @Schema(description = "Session id, 8 characters.", examples = "K7P2QX9M")
        String sessionId,

        @Schema(
                description = "Participant id of the scrum master (UUIDv7).",
                examples = "01973f5e-2a4b-7c1d-8e2f-3a4b5c6d7e8f")
        String participantId,

        @Schema(description = "Bearer token of the scrum master.", examples = "d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9")
        String token) {}
