package planningpoker.session;

import io.vertx.mutiny.core.Vertx;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Event;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;
import java.time.Clock;
import java.time.Duration;

@ApplicationScoped
public class SessionRegistryProducer {

    static final Duration EXPIRY_INTERVAL = Duration.ofMinutes(10);
    static final Duration DEADLINE_INTERVAL = Duration.ofMillis(250);

    @Produces
    @Singleton
    SessionRegistry registry(Clock clock, SessionConfig config, Event<SessionChanged> changed, Vertx vertx) {
        SessionRegistry registry =
                new SessionRegistry(clock, config.ttl(), config.maxSessions(), config.maxParticipants(), changed::fire);
        vertx.setPeriodic(EXPIRY_INTERVAL.toMillis(), timerId -> registry.expire(clock.instant()));
        vertx.setPeriodic(DEADLINE_INTERVAL.toMillis(), timerId -> registry.revealDue(clock.instant()));
        return registry;
    }
}
