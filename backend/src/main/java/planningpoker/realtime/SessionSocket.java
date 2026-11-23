package planningpoker.realtime;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.websockets.next.CloseReason;
import io.quarkus.websockets.next.OnClose;
import io.quarkus.websockets.next.OnOpen;
import io.quarkus.websockets.next.OnTextMessage;
import io.quarkus.websockets.next.WebSocket;
import io.quarkus.websockets.next.WebSocketConnection;
import io.vertx.mutiny.core.Vertx;
import jakarta.inject.Inject;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.jboss.logging.Logger;
import planningpoker.platform.ErrorCode;
import planningpoker.session.SessionException;
import planningpoker.session.SessionRegistry;

@WebSocket(path = "/ws/sessions/{sessionId}")
public class SessionSocket {

    static final CloseReason AUTH_TIMEOUT = new CloseReason(1008, "No auth within the deadline.");

    private static final Logger LOG = Logger.getLogger(SessionSocket.class);

    @Inject
    ConnectionRegistry connections;

    @Inject
    SessionRegistry registry;

    @Inject
    RealtimeConfig config;

    @Inject
    MessageSender sender;

    @Inject
    ObjectMapper json;

    @Inject
    Vertx vertx;

    private final Map<String, Long> authTimers = new ConcurrentHashMap<>();

    @OnOpen
    void open(WebSocketConnection connection) {
        long timer = vertx.setTimer(config.authTimeout().toMillis(), timerId -> {
            authTimers.remove(connection.id());
            if (connections.entryOf(connection).isEmpty()) {
                sender.close(connection, AUTH_TIMEOUT);
            }
        });
        authTimers.put(connection.id(), timer);
    }

    @OnTextMessage
    void message(String text, WebSocketConnection connection) {
        String type = typeOf(text);
        boolean authenticated = connections.entryOf(connection).isPresent();
        if (!authenticated && WsMessage.AUTH.equals(type)) {
            authenticate(connection, tokenOf(text));
        } else if (!authenticated) {
            sender.send(connection, WsMessage.error(ErrorCode.UNAUTHORIZED, "The first message must be auth."));
        } else if (WsMessage.PING.equals(type)) {
            sender.send(connection, WsMessage.pong());
        } else {
            sender.send(connection, WsMessage.error(ErrorCode.VALIDATION_ERROR, "Unknown message type."));
        }
    }

    @OnClose
    void close(WebSocketConnection connection) {
        cancelTimer(connection);
        connections.remove(connection).ifPresent(entry -> {
            if (connections.isConnected(entry.sessionId(), entry.participantId())) {
                return;
            }
            try {
                registry.update(entry.sessionId(), session -> {
                    session.disconnect(entry.participantId());
                    return null;
                });
            } catch (SessionException e) {
                LOG.debugf("Disconnect in session %s skipped: %s", entry.sessionId(), e.errorCode());
            }
        });
    }

    private void authenticate(WebSocketConnection connection, String token) {
        String sessionId = connection.pathParam("sessionId");
        try {
            ConnectionRegistry.Entry entry = registry.read(
                    sessionId,
                    session -> session.participantByToken(token)
                            .map(participant -> new ConnectionRegistry.Entry(
                                    connection, sessionId, participant.id(), participant.role()))
                            .orElseThrow(() -> new SessionException(ErrorCode.UNAUTHORIZED, "Unknown token.")));
            cancelTimer(connection);
            connections.register(entry);
            registry.update(sessionId, session -> {
                session.connect(entry.participantId());
                return null;
            });
        } catch (SessionException e) {
            cancelTimer(connection);
            connections.remove(connection);
            sender.sendAndClose(
                    connection,
                    WsMessage.error(e.errorCode(), e.detail()),
                    new CloseReason(1008, e.errorCode().name()));
        }
    }

    private String typeOf(String text) {
        return parse(text).path("type").asText("");
    }

    private String tokenOf(String text) {
        return parse(text).path("payload").path("token").asText("");
    }

    private JsonNode parse(String text) {
        try {
            return json.readTree(text);
        } catch (IOException e) {
            return json.missingNode();
        }
    }

    private void cancelTimer(WebSocketConnection connection) {
        Long timer = authTimers.remove(connection.id());
        if (timer != null) {
            vertx.cancelTimer(timer);
        }
    }
}
