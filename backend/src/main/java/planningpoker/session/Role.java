package planningpoker.session;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(
        description =
                "Role of a participant. The server takes it from the token; at the join the invite code sets DEVELOPER or VIEWER.")
public enum Role {
    SCRUM_MASTER,
    DEVELOPER,
    VIEWER
}
