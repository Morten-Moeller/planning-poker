package planningpoker.session;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Consumer;
import java.util.function.Function;
import planningpoker.platform.ErrorCode;
import planningpoker.platform.Ids;

public class SessionRegistry {

    public record Created(Session session, Participant scrumMaster) {}

    private record Entry(Session session, ReentrantLock lock) {}

    private final Map<String, Entry> sessions = new ConcurrentHashMap<>();
    private final Clock clock;
    private final Duration ttl;
    private final Consumer<SessionChanged> changed;

    public SessionRegistry(Clock clock, Duration ttl, Consumer<SessionChanged> changed) {
        this.clock = clock;
        this.ttl = ttl;
        this.changed = changed;
    }

    public Created create(String gitlabProjectId, long issueIid, String creatorName) {
        while (true) {
            Session session = new Session(Ids.sessionId(), gitlabProjectId, issueIid, clock.instant());
            Participant scrumMaster = session.join(creatorName);
            if (sessions.putIfAbsent(session.id(), new Entry(session, new ReentrantLock())) == null) {
                return new Created(session, scrumMaster);
            }
        }
    }

    public Optional<Session> find(String sessionId) {
        return live(sessionId).map(Entry::session);
    }

    public <R> R read(String sessionId, Function<Session, R> query) {
        Entry entry = live(sessionId).orElseThrow(SessionRegistry::notFound);
        entry.lock().lock();
        try {
            if (sessions.get(sessionId) != entry) {
                throw notFound();
            }
            return query.apply(entry.session());
        } finally {
            entry.lock().unlock();
        }
    }

    public <R> R update(String sessionId, Function<Session, R> command) {
        Entry entry = live(sessionId).orElseThrow(SessionRegistry::notFound);
        R result;
        entry.lock().lock();
        try {
            if (sessions.get(sessionId) != entry) {
                throw notFound();
            }
            Session session = entry.session();
            Instant previousActivity = session.lastActivityAt();
            session.touch(clock.instant());
            try {
                result = command.apply(session);
            } catch (RuntimeException e) {
                session.touch(previousActivity);
                throw e;
            }
        } finally {
            entry.lock().unlock();
        }
        changed.accept(new SessionChanged(sessionId));
        return result;
    }

    public void expire(Instant now) {
        sessions.forEach((sessionId, entry) -> {
            if (expired(entry, now)) {
                entry.lock().lock();
                try {
                    if (expired(entry, now)) {
                        sessions.remove(sessionId, entry);
                    }
                } finally {
                    entry.lock().unlock();
                }
            }
        });
    }

    private Optional<Entry> live(String sessionId) {
        Entry entry = sessions.get(sessionId);
        if (entry == null) {
            return Optional.empty();
        }
        if (expired(entry, clock.instant())) {
            sessions.remove(sessionId, entry);
            return Optional.empty();
        }
        return Optional.of(entry);
    }

    private boolean expired(Entry entry, Instant now) {
        return entry.session().lastActivityAt().plus(ttl).isBefore(now);
    }

    private static SessionException notFound() {
        return new SessionException(ErrorCode.SESSION_NOT_FOUND, "Session not found.");
    }
}
