package planningpoker.session;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import planningpoker.session.api.SessionView;

class SessionViewMapperTest {

    private static final ObjectMapper JSON = new ObjectMapper().findAndRegisterModules();
    private final SessionViewMapper mapper = new SessionViewMapper();

    @Test
    void showsNoIssueAndNoRoundInLobby() {
        Session session = SessionBuilder.session().build();
        Participant master = SessionBuilder.master(session);

        SessionView view = mapper.toView(session, master.id());

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
                mapper.toView(session, SessionBuilder.developer(session, 0).id());

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

        SessionView view = mapper.toView(session, first.id());

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

        SessionView view = mapper.toView(session, SessionBuilder.master(session).id());

        assertNull(view.round().myVote());
        assertNull(view.round().votes());
        assertFalse(view.round().allVoted());
    }

    @Test
    void showsEveryCardAndTheStatsToEveryoneAfterTheReveal() {
        Session session = SessionBuilder.session().revealed().build();
        Participant master = SessionBuilder.master(session);
        Participant developer = SessionBuilder.developer(session, 0);

        SessionView masterView = mapper.toView(session, master.id());
        SessionView developerView = mapper.toView(session, developer.id());

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
        session.selectIssue(master.id(), SessionBuilder.OTHER_ISSUE);
        session.vote(SessionBuilder.developer(session, 0).id(), Card.ONE);
        session.reveal(master.id());

        SessionView view = mapper.toView(session, master.id());

        assertEquals(2, view.history().size());
        assertEquals(SessionBuilder.OTHER_ISSUE.iid(), view.history().get(0).issueIid());
        assertNull(view.history().get(0).finalCard());
        assertEquals(Card.FIVE, view.history().get(1).finalCard());
        assertNotNull(view.history().get(0).stats());
    }

    @Test
    void keepsTokensOutOfEverySnapshot() throws JsonProcessingException {
        for (Session session : List.of(
                SessionBuilder.session().build(),
                SessionBuilder.session().voting().build(),
                SessionBuilder.session().revealed().build())) {
            for (Participant receiver : session.participants()) {
                String json = JSON.writeValueAsString(mapper.toView(session, receiver.id()));
                for (Participant participant : session.participants()) {
                    assertFalse(json.contains(participant.token()), "token in snapshot: " + json);
                }
            }
        }
    }
}
