package planningpoker.realtime;

import io.quarkus.websockets.next.WebSocketConnection;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import planningpoker.session.Role;

@ApplicationScoped
public class ConnectionRegistry {

    public record Entry(WebSocketConnection connection, String sessionId, String participantId, Role role) {}

    private final Map<String, Set<Entry>> bySession = new ConcurrentHashMap<>();
    private final Map<String, Entry> byConnection = new ConcurrentHashMap<>();

    public void register(Entry entry) {
        byConnection.put(entry.connection().id(), entry);
        bySession.compute(entry.sessionId(), (sessionId, entries) -> {
            Set<Entry> target = entries == null ? ConcurrentHashMap.newKeySet() : entries;
            target.add(entry);
            return target;
        });
    }

    public Optional<Entry> remove(WebSocketConnection connection) {
        Entry entry = byConnection.remove(connection.id());
        if (entry == null) {
            return Optional.empty();
        }
        bySession.computeIfPresent(entry.sessionId(), (sessionId, entries) -> {
            entries.remove(entry);
            return entries.isEmpty() ? null : entries;
        });
        return Optional.of(entry);
    }

    public Optional<Entry> entryOf(WebSocketConnection connection) {
        return Optional.ofNullable(byConnection.get(connection.id()));
    }

    public Set<Entry> of(String sessionId) {
        return Set.copyOf(bySession.getOrDefault(sessionId, Set.of()));
    }

    public boolean isConnected(String sessionId, String participantId) {
        return of(sessionId).stream().anyMatch(entry -> entry.participantId().equals(participantId));
    }
}
