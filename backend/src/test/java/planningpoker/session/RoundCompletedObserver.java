package planningpoker.session;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@ApplicationScoped
public class RoundCompletedObserver {

    private final Map<String, List<Integer>> rounds = new ConcurrentHashMap<>();

    void onRoundCompleted(@Observes RoundCompleted event) {
        rounds.computeIfAbsent(event.sessionId(), id -> new CopyOnWriteArrayList<>())
                .add(event.roundNumber());
    }

    public List<Integer> roundsOf(String sessionId) {
        return List.copyOf(rounds.getOrDefault(sessionId, List.of()));
    }
}
