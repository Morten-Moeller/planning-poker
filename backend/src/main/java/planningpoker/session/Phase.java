package planningpoker.session;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(
        description =
                "Phase of the session: LOBBY without an active issue, VOTING while a round runs, REVEALED after the reveal.")
public enum Phase {
    LOBBY,
    VOTING,
    REVEALED
}
