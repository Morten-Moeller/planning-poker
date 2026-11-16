package planningpoker.realtime;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.websockets.next.CloseReason;
import io.quarkus.websockets.next.WebSocketConnection;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import java.io.UncheckedIOException;
import org.jboss.logging.Logger;

@ApplicationScoped
class MessageSender {

    static final CloseReason SEND_FAILED = new CloseReason(1011, "Send failed.");

    private static final Logger LOG = Logger.getLogger(MessageSender.class);

    @Inject
    ObjectMapper json;

    void send(WebSocketConnection connection, WsMessage message) {
        connection.sendText(encode(message)).subscribe().with(sent -> {}, failure -> {
            LOG.debugf("Send on connection %s failed: %s", connection.id(), failure.getMessage());
            close(connection, SEND_FAILED);
        });
    }

    void sendAndClose(WebSocketConnection connection, WsMessage message, CloseReason reason) {
        connection
                .sendText(encode(message))
                .onFailure()
                .recoverWithNull()
                .subscribe()
                .with(sent -> close(connection, reason), failure -> close(connection, reason));
    }

    void close(WebSocketConnection connection, CloseReason reason) {
        connection
                .close(reason)
                .subscribe()
                .with(
                        closed -> {},
                        failure ->
                                LOG.debugf("Close of connection %s failed: %s", connection.id(), failure.getMessage()));
    }

    private String encode(WsMessage message) {
        try {
            return json.writeValueAsString(message);
        } catch (JsonProcessingException e) {
            throw new UncheckedIOException(e);
        }
    }
}
