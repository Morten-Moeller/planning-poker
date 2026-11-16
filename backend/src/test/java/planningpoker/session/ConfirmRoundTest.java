package planningpoker.session;

import static com.github.tomakehurst.wiremock.client.WireMock.matchingJsonPath;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.putRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.junit.QuarkusTest;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import planningpoker.gitlab.WireMockGitLab;

@QuarkusTest
@WithTestResource(WireMockGitLab.class)
class ConfirmRoundTest {

    private static final String PROBLEM = "application/problem+json";
    private static final String NOTES = GitLabStubs.notesPath(GitLabStubs.PROJECT, GitLabStubs.ISSUE);
    private static final String ISSUE = GitLabStubs.issuePath(GitLabStubs.PROJECT, GitLabStubs.ISSUE);
    private static final int DELAY_BELOW_TIMEOUT_MILLIS = (int) WireMockGitLab.TIMEOUT.toMillis() * 7 / 10;
    private static final int DELAY_ABOVE_TIMEOUT_MILLIS = (int) WireMockGitLab.TIMEOUT.toMillis() * 2 + 500;
    private static final String COMMENT_AFTER_TWO_ROUNDS = "**Planning Poker: Ergebnis 5**\n\n"
            + "Runden: 2. Letzte Runde: 3 (1 Stimme), 5 (3 Stimmen), 8 (1 Stimme). Durchschnitt 5,2.";

    WireMockServer gitlab;

    private ConfirmRoundFlow flow;

    @BeforeEach
    void createSessionWithFiveDevelopers() {
        gitlab.resetAll();
        GitLabStubs.defaultIssue(gitlab);
        GitLabStubs.note(gitlab, GitLabStubs.PROJECT, GitLabStubs.ISSUE);
        flow = ConfirmRoundFlow.create(5);
    }

    @Test
    void confirmsTheCardWritesTheCommentAndReturnsToLobby() {
        flow.revealedRound("5", "8", "13", "3", "5");
        flow.restart().statusCode(204);
        flow.playRound("3", "5", "5", "5", "8");

        flow.confirm("5").statusCode(204);

        gitlab.verify(
                1,
                postRequestedFor(urlPathEqualTo(NOTES))
                        .withRequestBody(matchingJsonPath("$.body", WireMock.equalTo(COMMENT_AFTER_TWO_ROUNDS))));
        gitlab.verify(0, putRequestedFor(urlPathEqualTo(ISSUE)));
        flow.snapshotOf(flow.asScrumMaster())
                .body("phase", equalTo("LOBBY"))
                .body("activeIssue", nullValue())
                .body("round", nullValue())
                .body("preselectedIssueIid", nullValue())
                .body("history", hasSize(2))
                .body("history[0].roundNumber", equalTo(2))
                .body("history[0].finalCard", equalTo("5"))
                .body("history[1].finalCard", nullValue());
    }

    static Stream<Arguments> cardsWithoutNumber() {
        return Stream.of(Arguments.of("?", "?"), Arguments.of("COFFEE", "☕"));
    }

    @ParameterizedTest(name = "card {0}")
    @MethodSource("cardsWithoutNumber")
    void commentsWithoutAWeightForAQuestionMarkOrCoffee(String card, String label) {
        flow.revealedRound("?", "COFFEE", "?");

        flow.confirm(card).statusCode(204);

        gitlab.verify(
                1,
                postRequestedFor(urlPathEqualTo(NOTES))
                        .withRequestBody(
                                matchingJsonPath(
                                        "$.body",
                                        WireMock.equalTo(
                                                "**Planning Poker: Ergebnis " + label + "**\n\n"
                                                        + "Runden: 1. Letzte Runde: ? (2 Stimmen), ☕ (1 Stimme). Kein Durchschnitt."))));
        gitlab.verify(0, putRequestedFor(urlPathEqualTo(ISSUE)));
        flow.snapshotOf(flow.asDeveloper(0))
                .body("phase", equalTo("LOBBY"))
                .body("history[0].finalCard", equalTo(card));
    }

    @Test
    void rejectsTheConfirmationInLobbyAndWhileVoting() {
        flow.confirm("5").statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("INVALID_STATE"));

        flow.selectIssue(GitLabStubs.ISSUE).statusCode(204);
        flow.vote(0, "5");

        flow.confirm("5").statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("INVALID_STATE"));
        gitlab.verify(0, postRequestedFor(urlPathEqualTo(NOTES)));
        flow.snapshotOf(flow.asScrumMaster()).body("phase", equalTo("VOTING"));
    }

    @Test
    void rejectsTheConfirmationByADeveloper() {
        flow.revealedRound("5", "5");

        flow.confirmAs(flow.asDeveloper(0), "5")
                .statusCode(403)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("FORBIDDEN_ROLE"));

        gitlab.verify(0, postRequestedFor(urlPathEqualTo(NOTES)));
        flow.snapshotOf(flow.asScrumMaster()).body("phase", equalTo("REVEALED"));
    }

    static Stream<Arguments> gitLabFailures() {
        return Stream.of(Arguments.of(401), Arguments.of(404), Arguments.of(500));
    }

    @ParameterizedTest(name = "GitLab {0}")
    @MethodSource("gitLabFailures")
    void keepsTheRevealedRoundWhenTheCommentFailsAndAllowsARetry(int status) {
        GitLabStubs.noteFailing(gitlab, GitLabStubs.PROJECT, GitLabStubs.ISSUE, status);
        flow.revealedRound("5", "8");

        flow.confirm("5")
                .statusCode(502)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("GITLAB_ERROR"))
                .body("detail", equalTo("GitLab rejected the request."))
                .body("detail", not(containsString("gitlab failure text")));

        flow.snapshotOf(flow.asScrumMaster())
                .body("phase", equalTo("REVEALED"))
                .body("round.confirming", equalTo(false))
                .body("history[0].finalCard", nullValue());

        GitLabStubs.note(gitlab, GitLabStubs.PROJECT, GitLabStubs.ISSUE);
        flow.confirm("5").statusCode(204);
        flow.snapshotOf(flow.asScrumMaster())
                .body("phase", equalTo("LOBBY"))
                .body("history[0].finalCard", equalTo("5"));
    }

    @Test
    void keepsTheRevealedRoundWhenGitLabDoesNotAnswer() {
        GitLabStubs.noteDelayed(gitlab, GitLabStubs.PROJECT, GitLabStubs.ISSUE, DELAY_ABOVE_TIMEOUT_MILLIS);
        flow.revealedRound("5", "8");

        flow.confirm("5")
                .statusCode(502)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("GITLAB_ERROR"))
                .body("detail", equalTo("GitLab did not answer."));

        flow.snapshotOf(flow.asScrumMaster())
                .body("phase", equalTo("REVEALED"))
                .body("round.confirming", equalTo(false))
                .body("history[0].finalCard", nullValue());

        GitLabStubs.note(gitlab, GitLabStubs.PROJECT, GitLabStubs.ISSUE);
        flow.confirm("5").statusCode(204);
        flow.snapshotOf(flow.asScrumMaster()).body("phase", equalTo("LOBBY"));
    }

    @Test
    void writesOneCommentForTwoFastConfirmationsAndBlocksCommandsMeanwhile() {
        GitLabStubs.noteDelayed(gitlab, GitLabStubs.PROJECT, GitLabStubs.ISSUE, DELAY_BELOW_TIMEOUT_MILLIS);
        flow.revealedRound("5", "8");

        CompletableFuture<Void> firstFinished =
                CompletableFuture.runAsync(() -> flow.confirm("5").statusCode(204));
        awaitNoteRequest();

        flow.snapshotOf(flow.asScrumMaster())
                .body("phase", equalTo("REVEALED"))
                .body("round.confirming", equalTo(true));
        flow.confirm("5").statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("INVALID_STATE"));
        flow.reveal().statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("INVALID_STATE"));
        flow.restart().statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("INVALID_STATE"));
        flow.selectIssue(GitLabStubs.ISSUE)
                .statusCode(409)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("INVALID_STATE"));
        flow.snapshotOf(flow.asScrumMaster()).body("round.confirming", equalTo(true));

        firstFinished.join();
        gitlab.verify(1, postRequestedFor(urlPathEqualTo(NOTES)));
        flow.snapshotOf(flow.asScrumMaster())
                .body("phase", equalTo("LOBBY"))
                .body("history[0].finalCard", equalTo("5"));
    }

    @Test
    void acceptsAJoinWhileTheCommentIsWritten() {
        GitLabStubs.noteDelayed(gitlab, GitLabStubs.PROJECT, GitLabStubs.ISSUE, DELAY_BELOW_TIMEOUT_MILLIS);
        flow.revealedRound("5", "8");

        CompletableFuture<Long> confirmFinished = CompletableFuture.supplyAsync(() -> {
            flow.confirm("5").statusCode(204);
            return System.nanoTime();
        });
        awaitNoteRequest();
        SessionApiTest.join(
                flow.sessionId, "Late " + UUID.randomUUID().toString().substring(0, 8));
        long joinFinished = System.nanoTime();

        assertTrue(joinFinished < confirmFinished.join(), "the join waited for the GitLab call");
        flow.snapshotOf(flow.asScrumMaster()).body("phase", equalTo("LOBBY")).body("participants", hasSize(7));
    }

    private void awaitNoteRequest() {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        while (gitlab.findAll(postRequestedFor(urlPathEqualTo(NOTES))).isEmpty()) {
            assertTrue(System.nanoTime() < deadline, "GitLab did not receive the comment for " + NOTES);
            Thread.onSpinWait();
        }
    }
}
