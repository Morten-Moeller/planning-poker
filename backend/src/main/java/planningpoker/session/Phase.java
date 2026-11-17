package planningpoker.session;

import org.eclipse.microprofile.openapi.annotations.media.Schema;

@Schema(
        description =
                "Phase of the session: LOBBY without an active issue, DISCUSSION while the team discusses the active issue and the cards are locked, VOTING while the cards are open, REVEALED after the reveal.")
public enum Phase {
    LOBBY,
    DISCUSSION,
    VOTING,
    REVEALED
}
