package planningpoker.realtime;

import static org.junit.jupiter.api.Assertions.fail;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.websockets.next.BasicWebSocketConnector;
import io.quarkus.websockets.next.CloseReason;
import io.quarkus.websockets.next.WebSocketClientConnection;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.URI;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.function.Predicate;

final class SocketClient implements AutoCloseable {

    static final Duration TIMEOUT = Duration.ofSeconds(5);

    private static final ObjectMapper JSON = new ObjectMapper();

    private final BlockingQueue<JsonNode> inbox = new LinkedBlockingQueue<>();
    private final List<JsonNode> received = new CopyOnWriteArrayList<>();
    private final CompletableFuture<CloseReason> closed = new CompletableFuture<>();
    private final String name;
    private WebSocketClientConnection connection;

    private SocketClient(String name) {
        this.name = name;
    }

    static SocketClient connect(URI baseUri, String path, String name) {
        SocketClient client = new SocketClient(name);
        client.connection = BasicWebSocketConnector.create()
                .baseUri(baseUri)
                .path(path)
                .onTextMessage((connection, text) -> client.receive(text))
                .onClose((connection, reason) -> client.closed.complete(reason))
                .connectAndAwait();
        return client;
    }

    static SocketClient connect(URI baseUri, String sessionId) {
        return connect(baseUri, "/ws/sessions/" + sessionId, sessionId);
    }

    private void receive(String text) {
        try {
            JsonNode message = JSON.readTree(text);
            received.add(message);
            inbox.add(message);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    void send(String text) {
        connection.sendTextAndAwait(text);
    }

    void auth(String token) {
        send("{\"type\":\"auth\",\"payload\":{\"token\":\"" + token + "\"}}");
    }

    JsonNode await(String type) {
        return await(type, message -> true, TIMEOUT, "any " + type);
    }

    JsonNode awaitState(Predicate<JsonNode> payload, String expected) {
        return awaitState(payload, TIMEOUT, expected);
    }

    JsonNode awaitState(Predicate<JsonNode> payload, Duration timeout, String expected) {
        return await(WsMessage.SESSION_STATE, payload, timeout, expected).path("payload");
    }

    JsonNode await(String type, Predicate<JsonNode> payload, Duration timeout, String expected) {
        long deadline = System.nanoTime() + timeout.toNanos();
        while (true) {
            long left = deadline - System.nanoTime();
            JsonNode message = poll(left);
            if (message == null) {
                return fail("Client " + name + " got no " + type + " with " + expected + " within " + timeout
                        + "; inspect backend/target/quarkus-test.log. Received: " + received);
            }
            if (type.equals(message.path("type").asText()) && payload.test(message.path("payload"))) {
                return message;
            }
        }
    }

    List<JsonNode> untilPong() {
        send("{\"type\":\"ping\"}");
        List<JsonNode> before = new ArrayList<>();
        long deadline = System.nanoTime() + TIMEOUT.toNanos();
        while (true) {
            JsonNode message = poll(deadline - System.nanoTime());
            if (message == null) {
                return fail("Client " + name + " got no pong within " + TIMEOUT
                        + "; inspect backend/target/quarkus-test.log. Received: " + received);
            }
            if (WsMessage.PONG.equals(message.path("type").asText())) {
                return before;
            }
            before.add(message);
        }
    }

    CloseReason awaitClose() {
        try {
            return closed.get(TIMEOUT.toMillis(), TimeUnit.MILLISECONDS);
        } catch (TimeoutException e) {
            return fail("Connection of client " + name + " was not closed within " + TIMEOUT
                    + "; inspect the auth deadline planningpoker.realtime.auth-timeout. Received: " + received);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        } catch (ExecutionException e) {
            throw new IllegalStateException(e);
        }
    }

    List<JsonNode> received() {
        return List.copyOf(received);
    }

    long count(String type) {
        return received.stream()
                .filter(message -> type.equals(message.path("type").asText()))
                .count();
    }

    private JsonNode poll(long nanos) {
        if (nanos <= 0) {
            return null;
        }
        try {
            return inbox.poll(nanos, TimeUnit.NANOSECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException(e);
        }
    }

    @Override
    public void close() {
        if (connection != null && connection.isOpen()) {
            connection.closeAndAwait();
        }
    }
}
