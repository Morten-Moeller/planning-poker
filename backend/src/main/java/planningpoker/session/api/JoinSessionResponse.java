package planningpoker.session.api;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(
        description = "Id and token of the new participant.",
        requiredProperties = {"participantId", "token"})
public record JoinSessionResponse(
        @Schema(description = "Participant id (UUIDv7).", examples = "01973f5e-2a4c-7d2e-9f30-4b5c6d7e8f90")
        String participantId,

        @Schema(description = "Bearer token of the participant.", examples = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6")
        String token) {}
