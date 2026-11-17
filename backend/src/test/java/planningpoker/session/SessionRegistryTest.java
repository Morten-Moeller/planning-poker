package planningpoker.session;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import planningpoker.platform.ErrorCode;

class SessionRegistryTest {

    private static final Instant START = Instant.parse("2026-11-16T09:00:00Z");
    private static final Duration TTL = Duration.ofHours(12);
    private static final int DEVELOPERS = 50;
    private static final int MAX_SESSIONS = 1000;

    private final TestClock clock = new TestClock(START);
    private final List<SessionChanged> events = new CopyOnWriteArrayList<>();
    private final AtomicBoolean probeNestedUpdate = new AtomicBoolean();
    private final List<Phase> seenByNestedUpdate = new CopyOnWriteArrayList<>();
    private final SessionRegistry registry =
            new SessionRegistry(clock, TTL, MAX_SESSIONS, DEVELOPERS + 1, this::onChanged);
    private final ExecutorService pool = Executors.newFixedThreadPool(DEVELOPERS);

    private void onChanged(SessionChanged event) {
        events.add(event);
        if (probeNestedUpdate.compareAndSet(true, false)) {
            Future<Phase> nested = pool.submit(() -> registry.update(event.sessionId(), Session::phase));
            try {
                seenByNestedUpdate.add(nested.get(5, TimeUnit.SECONDS));
            } catch (Exception e) {
                throw new IllegalStateException("nested update blocked: the lock is still held", e);
            }
        }
    }

    @AfterEach
    void shutdown() {
        pool.shutdownNow();
    }

    @Test
    void fifty_developers_vote_at_the_same_time_and_no_vote_is_lost() throws Exception {
        SessionRegistry.Created created = registry.create("4711", 42L, "Master", null, false);
        String sessionId = created.session().id();
        List<String> developers = new ArrayList<>();
        for (int i = 0; i < DEVELOPERS; i++) {
            String name = "Dev" + i;
            developers.add(
                    registry.update(sessionId, session -> session.join(name).id()));
        }
        registry.update(sessionId, session -> {
            session.selectIssue(created.scrumMaster().id(), SessionBuilder.ISSUE);
            session.startVoting(created.scrumMaster().id(), SessionBuilder.CREATED_AT);
            return null;
        });
        CountDownLatch start = new CountDownLatch(1);
        List<Future<Boolean>> results = new ArrayList<>();
        for (String developer : developers) {
            results.add(pool.submit(() -> {
                start.await();
                return registry.update(sessionId, session -> session.vote(developer, Card.FIVE));
            }));
        }

        start.countDown();
        for (Future<Boolean> result : results) {
            result.get(10, TimeUnit.SECONDS);
        }

        Round round = registry.find(sessionId).orElseThrow().round().orElseThrow();
        assertEquals(DEVELOPERS, round.votes().size());
    }

    @Test
    void every_successful_command_fires_exactly_one_event() {
        SessionRegistry.Created created = registry.create("4711", 42L, "Master", null, false);
        String sessionId = created.session().id();
        events.clear();

        registry.update(sessionId, session -> session.join("Anna"));
        registry.update(sessionId, session -> {
            session.selectIssue(created.scrumMaster().id(), SessionBuilder.ISSUE);
            return null;
        });

        assertEquals(List.of(new SessionChanged(sessionId), new SessionChanged(sessionId)), events);
    }

    @Test
    void the_event_fires_after_the_lock_is_released() {
        SessionRegistry.Created created = registry.create("4711", 42L, "Master", null, false);
        String sessionId = created.session().id();
        probeNestedUpdate.set(true);

        registry.update(sessionId, session -> session.join("Anna"));

        assertEquals(List.of(Phase.LOBBY), seenByNestedUpdate);
        assertEquals(2, events.size());
    }

    @Test
    void a_rejected_command_fires_no_event_and_changes_nothing() {
        SessionRegistry.Created created = registry.create("4711", 42L, "Master", null, false);
        String sessionId = created.session().id();
        String developer =
                registry.update(sessionId, session -> session.join("Anna").id());
        events.clear();
        Instant lastActivity = created.session().lastActivityAt();
        clock.advance(Duration.ofMinutes(5));

        SessionException forbidden = assertThrows(
                SessionException.class,
                () -> registry.update(
                        sessionId, session -> session.vote(created.scrumMaster().id(), Card.FIVE)));
        SessionException invalid = assertThrows(
                SessionException.class,
                () -> registry.update(sessionId, session -> session.vote(developer, Card.FIVE)));

        assertEquals(ErrorCode.FORBIDDEN_ROLE, forbidden.errorCode());
        assertEquals(ErrorCode.INVALID_STATE, invalid.errorCode());
        assertEquals(List.of(), events);
        Session session = registry.find(sessionId).orElseThrow();
        assertEquals(Phase.LOBBY, session.phase());
        assertEquals(Optional.empty(), session.round());
        assertEquals(lastActivity, session.lastActivityAt());
    }

    @Test
    void read_answers_under_the_lock_without_an_event() {
        SessionRegistry.Created created = registry.create("4711", 42L, "Master", null, false);
        events.clear();

        clock.advance(Duration.ofMinutes(5));

        Phase phase = registry.read(created.session().id(), Session::phase);

        assertEquals(Phase.LOBBY, phase);
        assertEquals(List.of(), events);
        assertEquals(START, created.session().lastActivityAt());
        assertEquals(
                ErrorCode.SESSION_NOT_FOUND,
                assertThrows(SessionException.class, () -> registry.read("MISSING1", Session::phase))
                        .errorCode());
    }

    @Test
    void an_unknown_session_is_not_found() {
        assertEquals(Optional.empty(), registry.find("MISSING1"));
        SessionException exception =
                assertThrows(SessionException.class, () -> registry.update("MISSING1", Session::phase));
        assertEquals(ErrorCode.SESSION_NOT_FOUND, exception.errorCode());
        assertEquals(List.of(), events);
    }

    @Test
    void create_returns_the_session_with_its_scrum_master() {
        SessionRegistry.Created created = registry.create("4711", 42L, "  Master ", null, false);

        assertEquals(8, created.session().id().length());
        assertEquals("4711", created.session().gitlabProjectId());
        assertEquals(Optional.of(42L), created.session().preselectedIssueIid());
        assertEquals(Role.SCRUM_MASTER, created.scrumMaster().role());
        assertEquals("Master", created.scrumMaster().name());
        assertEquals(START, created.session().lastActivityAt());
        assertEquals(
                Optional.of(created.session()), registry.find(created.session().id()));
    }

    @Test
    void create_without_issue_returns_a_session_without_preselection() {
        SessionRegistry.Created created = registry.create("4711", null, "Master", null, false);

        assertEquals(Optional.empty(), created.session().preselectedIssueIid());
        assertEquals(Phase.LOBBY, created.session().phase());
    }

    @Test
    void every_command_sets_the_last_activity_from_the_clock() {
        SessionRegistry.Created created = registry.create("4711", 42L, "Master", null, false);
        clock.advance(Duration.ofMinutes(5));

        registry.update(created.session().id(), session -> session.join("Anna"));

        assertEquals(START.plus(Duration.ofMinutes(5)), created.session().lastActivityAt());
    }

    @Test
    void a_session_without_activity_for_longer_than_the_ttl_expires() {
        SessionRegistry.Created created = registry.create("4711", 42L, "Master", null, false);
        String sessionId = created.session().id();

        registry.expire(START.plus(TTL));
        assertTrue(registry.find(sessionId).isPresent());

        registry.expire(START.plus(TTL).plusSeconds(1));
        assertEquals(Optional.empty(), registry.find(sessionId));
        assertEquals(
                ErrorCode.SESSION_NOT_FOUND,
                assertThrows(SessionException.class, () -> registry.update(sessionId, Session::phase))
                        .errorCode());
    }

    @Test
    void find_removes_an_expired_session_on_access() {
        SessionRegistry.Created created = registry.create("4711", 42L, "Master", null, false);
        String sessionId = created.session().id();
        clock.advance(TTL.plusSeconds(1));

        assertEquals(Optional.empty(), registry.find(sessionId));
    }

    @Test
    void activity_keeps_a_session_alive() {
        SessionRegistry.Created created = registry.create("4711", 42L, "Master", null, false);
        String sessionId = created.session().id();
        clock.advance(TTL.minusMinutes(1));
        registry.update(sessionId, session -> session.join("Anna"));
        clock.advance(TTL.minusMinutes(1));

        registry.expire(clock.instant());

        assertTrue(registry.find(sessionId).isPresent());
    }

    @Test
    void create_beyond_the_session_limit_is_rejected() {
        SessionRegistry limited = new SessionRegistry(clock, TTL, 2, 50, this::onChanged);
        limited.create("4711", 42L, "Anna", null, false);
        limited.create("4711", 42L, "Ben", null, false);
        events.clear();

        SessionException exception =
                assertThrows(SessionException.class, () -> limited.create("4711", 42L, "Cleo", null, false));

        assertEquals(ErrorCode.LIMIT_REACHED, exception.errorCode());
        assertEquals(List.of(), events);
    }

    @Test
    void an_expired_session_does_not_count_against_the_session_limit() {
        SessionRegistry limited = new SessionRegistry(clock, TTL, 2, 50, this::onChanged);
        String first =
                limited.create("4711", 42L, "Anna", null, false).session().id();
        clock.advance(TTL.minusMinutes(1));
        String second =
                limited.create("4711", 42L, "Ben", null, false).session().id();
        clock.advance(Duration.ofMinutes(2));

        SessionRegistry.Created third = limited.create("4711", 42L, "Cleo", null, false);

        assertEquals(Optional.empty(), limited.find(first));
        assertTrue(limited.find(second).isPresent());
        assertTrue(limited.find(third.session().id()).isPresent());
        assertEquals(
                ErrorCode.LIMIT_REACHED,
                assertThrows(SessionException.class, () -> limited.create("4711", 42L, "Dora", null, false))
                        .errorCode());
    }

    @Test
    void the_registry_passes_the_participant_limit_to_every_session() {
        SessionRegistry limited = new SessionRegistry(clock, TTL, MAX_SESSIONS, 2, this::onChanged);
        String sessionId =
                limited.create("4711", 42L, "Master", null, false).session().id();
        limited.update(sessionId, session -> session.join("Anna"));
        events.clear();
        Instant lastActivity = limited.find(sessionId).orElseThrow().lastActivityAt();
        clock.advance(Duration.ofMinutes(5));

        SessionException exception =
                assertThrows(SessionException.class, () -> limited.update(sessionId, session -> session.join("Ben")));

        assertEquals(ErrorCode.LIMIT_REACHED, exception.errorCode());
        assertEquals(List.of(), events);
        Session session = limited.find(sessionId).orElseThrow();
        assertEquals(2, session.participants().size());
        assertEquals(lastActivity, session.lastActivityAt());
    }

    private String votingSessionWithTimer(int seconds) {
        SessionRegistry.Created created = registry.create("4711", 42L, "Master", null, false);
        String sessionId = created.session().id();
        String master = created.scrumMaster().id();
        registry.update(sessionId, session -> session.join("Anna"));
        registry.update(sessionId, session -> {
            session.setTimer(master, seconds);
            session.selectIssue(master, SessionBuilder.ISSUE);
            session.startVoting(master, clock.instant());
            return null;
        });
        events.clear();
        return sessionId;
    }

    @Test
    void revealDue_reveals_a_round_at_and_after_its_deadline_only() {
        String sessionId = votingSessionWithTimer(30);
        Session session = registry.find(sessionId).orElseThrow();

        registry.revealDue(START.plusSeconds(30).minusMillis(1));
        assertEquals(Phase.VOTING, session.phase());
        assertEquals(List.of(), events);

        registry.revealDue(START.plusSeconds(30));
        assertEquals(Phase.REVEALED, session.phase());
        assertEquals(List.of(new SessionChanged(sessionId)), events);
        assertEquals(START.plusSeconds(30), session.lastActivityAt());

        registry.revealDue(START.plusSeconds(31));
        assertEquals(1, events.size());
        assertEquals(1, session.history().size());
    }

    @Test
    void revealDue_writes_a_history_entry_without_votes() {
        String sessionId = votingSessionWithTimer(30);

        registry.revealDue(START.plusSeconds(45));

        Session session = registry.find(sessionId).orElseThrow();
        assertEquals(1, session.history().size());
        HistoryEntry entry = session.history().get(0);
        assertTrue(entry.votes().isEmpty());
        assertEquals(1, entry.roundNumber());
        assertEquals(START.plusSeconds(45), entry.revealedAt());
    }

    @Test
    void revealDue_leaves_a_round_revealed_by_hand_alone() {
        String sessionId = votingSessionWithTimer(30);
        Session session = registry.find(sessionId).orElseThrow();
        String master = SessionBuilder.master(session).id();
        registry.update(sessionId, s -> {
            s.reveal(master);
            return null;
        });
        events.clear();

        registry.revealDue(START.plusSeconds(30));

        assertEquals(Phase.REVEALED, session.phase());
        assertEquals(1, session.history().size());
        assertEquals(List.of(), events);
    }

    @Test
    void revealDue_uses_the_deadline_of_a_restarted_round() {
        String sessionId = votingSessionWithTimer(30);
        Session session = registry.find(sessionId).orElseThrow();
        String master = SessionBuilder.master(session).id();
        clock.advance(Duration.ofSeconds(10));
        registry.update(sessionId, s -> {
            s.reveal(master);
            s.restart(master);
            s.startVoting(master, clock.instant());
            return null;
        });
        events.clear();

        registry.revealDue(START.plusSeconds(30));
        assertEquals(Phase.VOTING, session.phase());
        assertEquals(2, session.round().orElseThrow().number());
        assertEquals(List.of(), events);

        registry.revealDue(START.plusSeconds(40));
        assertEquals(Phase.REVEALED, session.phase());
        assertEquals(2, session.history().size());
        assertEquals(List.of(new SessionChanged(sessionId)), events);
    }

    @Test
    void revealDue_leaves_a_round_without_timer_alone() {
        SessionRegistry.Created created = registry.create("4711", 42L, "Master", null, false);
        String sessionId = created.session().id();
        registry.update(sessionId, session -> {
            session.selectIssue(created.scrumMaster().id(), SessionBuilder.ISSUE);
            session.startVoting(created.scrumMaster().id(), clock.instant());
            return null;
        });
        events.clear();

        registry.revealDue(START.plus(Duration.ofHours(1)));

        assertEquals(Phase.VOTING, registry.find(sessionId).orElseThrow().phase());
        assertEquals(List.of(), events);
    }

    @Test
    void revealDue_leaves_a_round_in_discussion_alone() {
        SessionRegistry.Created created = registry.create("4711", 42L, "Master", null, false);
        String sessionId = created.session().id();
        String master = created.scrumMaster().id();
        registry.update(sessionId, session -> {
            session.setTimer(master, 30);
            session.selectIssue(master, SessionBuilder.ISSUE);
            return null;
        });
        events.clear();

        registry.revealDue(START.plus(Duration.ofHours(1)));

        Session session = registry.find(sessionId).orElseThrow();
        assertEquals(Phase.DISCUSSION, session.phase());
        assertTrue(session.history().isEmpty());
        assertEquals(List.of(), events);
    }

    @Test
    void the_event_of_revealDue_fires_after_the_lock_is_released() {
        String sessionId = votingSessionWithTimer(30);
        probeNestedUpdate.set(true);

        registry.revealDue(START.plusSeconds(30));

        assertEquals(List.of(Phase.REVEALED), seenByNestedUpdate);
        assertEquals(sessionId, events.get(0).sessionId());
    }
}
