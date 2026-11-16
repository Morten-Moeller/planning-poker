package planningpoker.realtime;

import com.fasterxml.jackson.annotation.JsonInclude;
import planningpoker.platform.ErrorCode;
import planningpoker.session.api.SessionView;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record WsMessage(String type, Object payload) {

    public static final String AUTH = "auth";
    public static final String SESSION_STATE = "session.state";
    public static final String ROUND_ALL_VOTED = "round.allVoted";
    public static final String ERROR = "error";
    public static final String PING = "ping";
    public static final String PONG = "pong";

    public record AllVoted(int roundNumber) {}

    public record Error(ErrorCode errorCode, String detail) {}

    static WsMessage sessionState(SessionView view) {
        return new WsMessage(SESSION_STATE, view);
    }

    static WsMessage allVoted(int roundNumber) {
        return new WsMessage(ROUND_ALL_VOTED, new AllVoted(roundNumber));
    }

    static WsMessage error(ErrorCode errorCode, String detail) {
        return new WsMessage(ERROR, new Error(errorCode, detail));
    }

    static WsMessage pong() {
        return new WsMessage(PONG, null);
    }
}
