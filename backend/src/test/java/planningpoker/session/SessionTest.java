package planningpoker.session;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static planningpoker.session.SessionBuilder.ISSUE;
import static planningpoker.session.SessionBuilder.OTHER_ISSUE;
import static planningpoker.session.SessionBuilder.developer;
import static planningpoker.session.SessionBuilder.master;
import static planningpoker.session.SessionBuilder.session;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.function.Consumer;
import java.util.stream.Stream;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import planningpoker.platform.ErrorCode;

class SessionTest {

    @Nested
    class Transitions {

        @Test
        void releasing_an_issue_in_lobby_starts_round_one() {
            Session session = session().build();

            session.selectIssue(master(session).id(), ISSUE);

            assertEquals(Phase.VOTING, session.phase());
            assertEquals(Optional.of(ISSUE), session.activeIssue());
            assertEquals(1, session.round().orElseThrow().number());
            assertTrue(session.round().orElseThrow().votes().isEmpty());
        }

        @Test
        void a_developer_chooses_and_changes_a_card_while_voting() {
            Session session = session().voting().build();
            String developer = developer(session, 0).id();

            session.vote(developer, Card.THREE);
            session.vote(developer, Card.FIVE);

            Round round = session.round().orElseThrow();
            assertEquals(Phase.VOTING, session.phase());
            assertTrue(round.hasVoted(developer));
            assertEquals(Optional.of(Card.FIVE), round.cardOf(developer));
            assertFalse(round.hasVoted(developer(session, 1).id()));
        }

        @Test
        void revealing_computes_the_stats_and_writes_a_history_entry() {
            Session session = session().voting().build();
            session.vote(developer(session, 0).id(), Card.FIVE);
            session.vote(developer(session, 1).id(), Card.EIGHT);

            session.reveal(master(session).id());

            assertEquals(Phase.REVEALED, session.phase());
            Round round = session.round().orElseThrow();
            assertTrue(round.revealed());
            assertEquals(
                    Optional.of(6.5), round.stats().map(stats -> stats.average().getAsDouble()));
            HistoryEntry entry = session.history().get(0);
            assertEquals(ISSUE.iid(), entry.issueIid());
            assertEquals(ISSUE.title(), entry.issueTitle());
            assertEquals(1, entry.roundNumber());
            assertEquals(
                    List.of(Card.FIVE, Card.EIGHT),
                    entry.votes().stream().map(Vote::card).toList());
            assertEquals(round.stats().orElseThrow(), entry.stats());
            assertEquals(Optional.empty(), entry.finalCard());
            assertEquals(session.lastActivityAt(), entry.revealedAt());
        }

        @Test
        void switching_the_issue_while_voting_discards_the_round() {
            Session session = session().voting().build();
            session.vote(developer(session, 0).id(), Card.FIVE);

            session.selectIssue(master(session).id(), OTHER_ISSUE);

            assertEquals(Phase.VOTING, session.phase());
            assertEquals(Optional.of(OTHER_ISSUE), session.activeIssue());
            assertEquals(1, session.round().orElseThrow().number());
            assertTrue(session.round().orElseThrow().votes().isEmpty());
            assertTrue(session.history().isEmpty());
        }

        @Test
        void switching_the_issue_after_the_reveal_keeps_the_entry_without_final_card() {
            Session session = session().revealed().build();

            session.selectIssue(master(session).id(), OTHER_ISSUE);

            assertEquals(Phase.VOTING, session.phase());
            assertEquals(Optional.of(OTHER_ISSUE), session.activeIssue());
            assertEquals(1, session.round().orElseThrow().number());
            assertEquals(1, session.history().size());
            assertEquals(ISSUE.iid(), session.history().get(0).issueIid());
            assertEquals(Optional.empty(), session.history().get(0).finalCard());
        }

        @Test
        void a_new_round_raises_the_number_and_clears_the_cards() {
            Session session = session().revealed().build();

            session.restart(master(session).id());

            Round round = session.round().orElseThrow();
            assertEquals(Phase.VOTING, session.phase());
            assertEquals(2, round.number());
            assertTrue(round.votes().isEmpty());
            assertFalse(round.revealed());
            assertEquals(Optional.empty(), round.stats());
        }

        @Test
        void confirming_sets_the_flag_and_returns_the_data_for_gitlab() {
            Session session = session().revealed().build();

            Confirmation confirmation = session.beginConfirm(master(session).id(), Card.EIGHT);

            assertEquals(Phase.REVEALED, session.phase());
            assertTrue(session.round().orElseThrow().confirming());
            assertEquals(ISSUE, confirmation.issue());
            assertEquals(1, confirmation.roundNumber());
            assertEquals(session.round().orElseThrow().stats().orElseThrow(), confirmation.stats());
            assertEquals(Card.EIGHT, confirmation.card());
        }

        @Test
        void a_finished_confirmation_writes_the_final_card_and_returns_to_lobby() {
            Session session = session().confirming().build();

            session.finishConfirm(Card.EIGHT);

            assertEquals(Phase.LOBBY, session.phase());
            assertEquals(Optional.empty(), session.activeIssue());
            assertEquals(Optional.empty(), session.round());
            assertEquals(Optional.empty(), session.preselectedIssueIid());
            assertEquals(Optional.of(Card.EIGHT), session.history().get(0).finalCard());
        }

        @Test
        void a_failed_confirmation_stays_revealed_and_clears_the_flag() {
            Session session = session().confirming().build();

            session.failConfirm();

            assertEquals(Phase.REVEALED, session.phase());
            assertFalse(session.round().orElseThrow().confirming());
            assertEquals(Optional.empty(), session.history().get(0).finalCard());
        }

        @ParameterizedTest
        @EnumSource(Phase.class)
        void joining_is_possible_in_every_phase(Phase phase) {
            Session session = session().inPhase(phase).build();
            int before = session.participants().size();

            Participant joined = session.join("Late");

            assertEquals(phase, session.phase());
            assertEquals(before + 1, session.participants().size());
            assertEquals(Optional.of(joined), session.participant(joined.id()));
            assertFalse(joined.connected());
        }

        @ParameterizedTest
        @EnumSource(Phase.class)
        void connecting_and_disconnecting_changes_only_the_connection_status(Phase phase) {
            Session session = session().inPhase(phase).build();
            Participant developer = developer(session, 0);

            session.disconnect(developer.id());
            assertFalse(developer.connected());
            session.connect(developer.id());
            assertTrue(developer.connected());

            assertEquals(phase, session.phase());
        }
    }

    @Nested
    class InvalidTransitions {

        @ParameterizedTest(name = "{0}")
        @MethodSource("planningpoker.session.SessionTest#invalidStates")
        void an_action_outside_its_phase_is_invalid_state(String name, Session session, Consumer<Session> action) {
            Phase phase = session.phase();
            int votes = session.round().map(round -> round.votes().size()).orElse(0);

            SessionException exception = assertThrows(SessionException.class, () -> action.accept(session));

            assertEquals(ErrorCode.INVALID_STATE, exception.errorCode());
            assertEquals(phase, session.phase());
            assertEquals(
                    votes, session.round().map(round -> round.votes().size()).orElse(0));
        }

        @ParameterizedTest(name = "{0}")
        @MethodSource("planningpoker.session.SessionTest#forbiddenRoles")
        void an_action_of_the_wrong_role_is_forbidden_role(String name, Session session, Consumer<Session> action) {
            Phase phase = session.phase();

            SessionException exception = assertThrows(SessionException.class, () -> action.accept(session));

            assertEquals(ErrorCode.FORBIDDEN_ROLE, exception.errorCode());
            assertEquals(phase, session.phase());
        }

        @Test
        void an_unknown_actor_is_unauthorized() {
            Session session = session().voting().build();

            SessionException exception = assertThrows(SessionException.class, () -> session.vote("missing", Card.FIVE));

            assertEquals(ErrorCode.UNAUTHORIZED, exception.errorCode());
        }
    }

    static Stream<Arguments> invalidStates() {
        return Stream.of(
                invalid(
                        "card in LOBBY",
                        session().build(),
                        s -> s.vote(developer(s, 0).id(), Card.FIVE)),
                invalid(
                        "reveal in LOBBY",
                        session().build(),
                        s -> s.reveal(master(s).id())),
                invalid(
                        "new round in LOBBY",
                        session().build(),
                        s -> s.restart(master(s).id())),
                invalid(
                        "confirm in LOBBY",
                        session().build(),
                        s -> s.beginConfirm(master(s).id(), Card.FIVE)),
                invalid(
                        "new round in VOTING",
                        session().voting().build(),
                        s -> s.restart(master(s).id())),
                invalid(
                        "confirm in VOTING",
                        session().voting().build(),
                        s -> s.beginConfirm(master(s).id(), Card.FIVE)),
                invalid(
                        "card in REVEALED",
                        session().revealed().build(),
                        s -> s.vote(developer(s, 0).id(), Card.FIVE)),
                invalid(
                        "reveal in REVEALED",
                        session().revealed().build(),
                        s -> s.reveal(master(s).id())),
                invalid(
                        "finish confirm without confirming",
                        session().revealed().build(),
                        s -> s.finishConfirm(Card.FIVE)),
                invalid("fail confirm without confirming", session().revealed().build(), Session::failConfirm),
                invalid(
                        "select issue while confirming",
                        session().confirming().build(),
                        s -> s.selectIssue(master(s).id(), OTHER_ISSUE)),
                invalid(
                        "card while confirming",
                        session().confirming().build(),
                        s -> s.vote(developer(s, 0).id(), Card.FIVE)),
                invalid(
                        "reveal while confirming",
                        session().confirming().build(),
                        s -> s.reveal(master(s).id())),
                invalid(
                        "new round while confirming",
                        session().confirming().build(),
                        s -> s.restart(master(s).id())),
                invalid(
                        "confirm while confirming",
                        session().confirming().build(),
                        s -> s.beginConfirm(master(s).id(), Card.FIVE)));
    }

    static Stream<Arguments> forbiddenRoles() {
        return Stream.of(
                invalid(
                        "developer releases an issue",
                        session().build(),
                        s -> s.selectIssue(developer(s, 0).id(), ISSUE)),
                invalid(
                        "scrum master chooses a card",
                        session().voting().build(),
                        s -> s.vote(master(s).id(), Card.FIVE)),
                invalid(
                        "developer reveals",
                        session().voting().build(),
                        s -> s.reveal(developer(s, 0).id())),
                invalid(
                        "developer starts a new round",
                        session().revealed().build(),
                        s -> s.restart(developer(s, 0).id())),
                invalid(
                        "developer confirms",
                        session().revealed().build(),
                        s -> s.beginConfirm(developer(s, 0).id(), Card.FIVE)));
    }

    private static Arguments invalid(String name, Session session, Consumer<Session> action) {
        return Arguments.of(name, session, action);
    }

    @Nested
    class Joining {

        @Test
        void the_creator_is_scrum_master_and_every_further_participant_developer() {
            Session session = new Session("K7P2QX9M", "4711", 42, Instant.EPOCH, SessionBuilder.MAX_PARTICIPANTS);

            Participant creator = session.join("Anna");
            Participant second = session.join("Ben");
            Participant third = session.join("Cleo");

            assertEquals(Role.SCRUM_MASTER, creator.role());
            assertEquals(Role.DEVELOPER, second.role());
            assertEquals(Role.DEVELOPER, third.role());
            assertEquals(List.of(creator, second, third), session.participants());
        }

        @Test
        void a_join_beyond_the_participant_limit_is_rejected_before_the_name_check() {
            Session session = new Session("K7P2QX9M", "4711", 42, Instant.EPOCH, 3);
            session.join("Anna");
            session.join("Ben");
            session.join("Cleo");
            List<Participant> before = session.participants();

            SessionException limit = assertThrows(SessionException.class, () -> session.join("Dora"));
            SessionException limitBeforeName = assertThrows(SessionException.class, () -> session.join("anna"));
            SessionException limitBeforeLength = assertThrows(SessionException.class, () -> session.join(" "));

            assertEquals(ErrorCode.LIMIT_REACHED, limit.errorCode());
            assertEquals(ErrorCode.LIMIT_REACHED, limitBeforeName.errorCode());
            assertEquals(ErrorCode.LIMIT_REACHED, limitBeforeLength.errorCode());
            assertEquals(before, session.participants());
        }

        @Test
        void a_join_up_to_the_participant_limit_counts_the_scrum_master() {
            Session session = new Session("K7P2QX9M", "4711", 42, Instant.EPOCH, 2);

            session.join("Anna");
            Participant developer = session.join("Ben");

            assertEquals(Role.DEVELOPER, developer.role());
            assertEquals(
                    ErrorCode.LIMIT_REACHED,
                    assertThrows(SessionException.class, () -> session.join("Cleo"))
                            .errorCode());
        }

        @Test
        void a_taken_name_is_rejected_without_regard_to_case() {
            Session session = session().build();
            session.join("Anna");

            SessionException exception = assertThrows(SessionException.class, () -> session.join("anna"));

            assertEquals(ErrorCode.NAME_TAKEN, exception.errorCode());
        }

        @Test
        void names_are_trimmed_before_the_check_and_the_store() {
            Session session = session().build();

            Participant joined = session.join("  Anna ");

            assertEquals("Anna", joined.name());
            assertEquals(
                    ErrorCode.NAME_TAKEN,
                    assertThrows(SessionException.class, () -> session.join("ANNA "))
                            .errorCode());
        }

        @ParameterizedTest
        @ValueSource(strings = {"", "   ", "ThisNameIsLongerThanThirtyCharacters"})
        void a_blank_or_too_long_name_is_a_validation_error(String name) {
            Session session = session().build();

            SessionException exception = assertThrows(SessionException.class, () -> session.join(name));

            assertEquals(ErrorCode.VALIDATION_ERROR, exception.errorCode());
        }

        @Test
        void joined_participants_get_an_id_and_a_token() {
            Session session = session().build();

            Participant joined = session.join("Anna");

            assertEquals(36, joined.id().length());
            assertFalse(joined.token().isBlank());
        }

        @Test
        void a_late_developer_may_vote_in_the_running_round() {
            Session session = session().voting().build();
            Participant late = session.join("Late");

            session.vote(late.id(), Card.THIRTEEN);

            assertEquals(
                    Optional.of(Card.THIRTEEN), session.round().orElseThrow().cardOf(late.id()));
        }
    }

    @Nested
    class AllVoted {

        @Test
        void becomes_true_when_the_last_connected_developer_votes() {
            Session session = session().voting().build();

            assertFalse(session.vote(developer(session, 0).id(), Card.FIVE));
            assertFalse(session.allVoted());
            assertTrue(session.vote(developer(session, 1).id(), Card.EIGHT));
            assertTrue(session.allVoted());
        }

        @Test
        void a_changed_card_after_completion_does_not_report_the_transition_again() {
            Session session = session().voting().build();
            session.vote(developer(session, 0).id(), Card.FIVE);
            session.vote(developer(session, 1).id(), Card.EIGHT);

            assertFalse(session.vote(developer(session, 1).id(), Card.THREE));
            assertTrue(session.allVoted());
        }

        @Test
        void a_disconnected_developer_without_a_vote_does_not_block() {
            Session session = session().voting().build();
            session.disconnect(developer(session, 1).id());

            assertTrue(session.vote(developer(session, 0).id(), Card.FIVE));
            assertTrue(session.allVoted());
        }

        @Test
        void the_vote_of_a_disconnected_developer_stays() {
            Session session = session().voting().build();
            Participant developer = developer(session, 0);
            session.vote(developer.id(), Card.FIVE);

            session.disconnect(developer.id());

            assertEquals(Optional.of(Card.FIVE), session.round().orElseThrow().cardOf(developer.id()));
        }

        @Test
        void without_connected_developers_it_stays_false() {
            Session session = session().developers(1).voting().build();
            Participant developer = developer(session, 0);
            session.vote(developer.id(), Card.FIVE);

            session.disconnect(developer.id());

            assertFalse(session.allVoted());
        }

        @Test
        void is_false_without_a_round() {
            assertFalse(session().build().allVoted());
        }
    }
}
