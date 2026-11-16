package planningpoker.session;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import planningpoker.session.api.SessionView;

class SessionViewMapperTest {

    private static final ObjectMapper JSON = new ObjectMapper().findAndRegisterModules();
    private static final Instant SERVER_TIME = Instant.parse("2026-11-16T09:00:12Z");
    private final SessionViewMapper mapper = new SessionViewMapper();

    @Test
    void showsNoIssueAndNoRoundInLobby() {
        Session session = SessionBuilder.session().build();
        Participant master = SessionBuilder.master(session);

        SessionView view = mapper.toView(session, master.id(), SERVER_TIME);

        assertEquals(Phase.LOBBY, view.phase());
        assertNull(view.activeIssue());
        assertNull(view.round());
        assertEquals(List.of(), view.history());
        assertEquals(SessionBuilder.ISSUE.iid(), view.preselectedIssueIid());
        assertEquals(master.id(), view.me().participantId());
        assertEquals(Role.SCRUM_MASTER, view.me().role());
    }

    @Test
    void hidesThePreselectedIssueFromDevelopers() {
        Session session = SessionBuilder.session().build();

        SessionView view =
                mapper.toView(session, SessionBuilder.developer(session, 0).id(), SERVER_TIME);

        assertNull(view.preselectedIssueIid());
        assertEquals(Role.DEVELOPER, view.me().role());
    }

    @Test
    void showsOnlyTheOwnCardWhileVoting() throws JsonProcessingException {
        Session session = SessionBuilder.session().voting().build();
        Participant first = SessionBuilder.developer(session, 0);
        Participant second = SessionBuilder.developer(session, 1);
        session.vote(first.id(), Card.FIVE);
        session.vote(second.id(), Card.THIRTEEN);

        SessionView view = mapper.toView(session, first.id(), SERVER_TIME);

        assertEquals(Phase.VOTING, view.phase());
        assertEquals(Card.FIVE, view.round().myVote());
        assertNull(view.round().votes());
        assertNull(view.round().stats());
        assertTrue(view.round().allVoted());
        assertTrue(view.participants().stream()
                .filter(participant -> participant.id().equals(second.id()))
                .findFirst()
                .orElseThrow()
                .hasVoted());
        String json = JSON.writeValueAsString(view);
        assertFalse(json.contains("\"13\""), "foreign card in snapshot: " + json);
        assertFalse(json.contains("myVote\":null"), "own card missing: " + json);
    }

    @Test
    void showsNoCardToTheScrumMasterWhileVoting() {
        Session session = SessionBuilder.session().voting().build();
        session.vote(SessionBuilder.developer(session, 0).id(), Card.EIGHT);

        SessionView view = mapper.toView(session, SessionBuilder.master(session).id(), SERVER_TIME);

        assertNull(view.round().myVote());
        assertNull(view.round().votes());
        assertFalse(view.round().allVoted());
    }

    @Test
    void showsEveryCardAndTheStatsToEveryoneAfterTheReveal() {
        Session session = SessionBuilder.session().revealed().build();
        Participant master = SessionBuilder.master(session);
        Participant developer = SessionBuilder.developer(session, 0);

        SessionView masterView = mapper.toView(session, master.id(), SERVER_TIME);
        SessionView developerView = mapper.toView(session, developer.id(), SERVER_TIME);

        assertEquals(Phase.REVEALED, masterView.phase());
        assertEquals(masterView.round().votes(), developerView.round().votes());
        assertEquals(masterView.round().stats(), developerView.round().stats());
        assertEquals(2, masterView.round().votes().size());
        assertEquals(6.5, masterView.round().stats().average());
        assertEquals(List.of(Card.FIVE, Card.EIGHT), masterView.round().stats().mostFrequent());
        assertEquals(Card.FIVE, developerView.round().myVote());
        assertEquals(1, masterView.history().size());
        assertNull(masterView.history().get(0).finalCard());
        assertEquals(
                OffsetDateTime.parse("2026-11-16T09:00:00Z"),
                masterView.history().get(0).revealedAt());
    }

    @Test
    void listsTheHistoryNewestFirstWithTheFinalCard() {
        Session session = SessionBuilder.session().revealed().build();
        Participant master = SessionBuilder.master(session);
        session.beginConfirm(master.id(), Card.FIVE);
        session.finishConfirm(Card.FIVE);
        session.selectIssue(master.id(), SessionBuilder.OTHER_ISSUE, SessionBuilder.CREATED_AT);
        session.vote(SessionBuilder.developer(session, 0).id(), Card.ONE);
        session.reveal(master.id());

        SessionView view = mapper.toView(session, master.id(), SERVER_TIME);

        assertEquals(2, view.history().size());
        assertEquals(SessionBuilder.OTHER_ISSUE.iid(), view.history().get(0).issueIid());
        assertNull(view.history().get(0).finalCard());
        assertEquals(Card.FIVE, view.history().get(1).finalCard());
        assertNotNull(view.history().get(0).stats());
    }

    @Test
    void showsTheTimerTheServerTimeAndTheDeadlineToBothRoles() {
        Session session = SessionBuilder.session().timer(30).voting().build();

        SessionView masterView =
                mapper.toView(session, SessionBuilder.master(session).id(), SERVER_TIME);
        SessionView developerView =
                mapper.toView(session, SessionBuilder.developer(session, 0).id(), SERVER_TIME);

        for (SessionView view : List.of(masterView, developerView)) {
            assertEquals(30, view.timerSeconds());
            assertEquals(OffsetDateTime.parse("2026-11-16T09:00:12Z"), view.serverTime());
            assertEquals(
                    OffsetDateTime.parse("2026-11-16T09:00:30Z"), view.round().deadline());
        }
    }

    @Test
    void showsNoTimerAndNoDeadlineWithoutTheSetting() {
        Session session = SessionBuilder.session().voting().build();

        SessionView view =
                mapper.toView(session, SessionBuilder.developer(session, 0).id(), SERVER_TIME);

        assertNull(view.timerSeconds());
        assertNull(view.round().deadline());
        assertEquals(OffsetDateTime.parse("2026-11-16T09:00:12Z"), view.serverTime());
    }

    @Test
    void keepsTokensOutOfEverySnapshot() throws JsonProcessingException {
        for (Session session : List.of(
                SessionBuilder.session().build(),
                SessionBuilder.session().voting().build(),
                SessionBuilder.session().revealed().build())) {
            for (Participant receiver : session.participants()) {
                String json = JSON.writeValueAsString(mapper.toView(session, receiver.id(), SERVER_TIME));
                for (Participant participant : session.participants()) {
                    assertFalse(json.contains(participant.token()), "token in snapshot: " + json);
                }
            }
        }
    }
}
