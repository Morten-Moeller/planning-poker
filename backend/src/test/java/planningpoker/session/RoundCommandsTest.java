package planningpoker.session;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

import com.github.tomakehurst.wiremock.WireMockServer;
import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.ValidatableResponse;
import io.restassured.specification.RequestSpecification;
import jakarta.inject.Inject;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import planningpoker.gitlab.WireMockGitLab;

@QuarkusTest
@WithTestResource(WireMockGitLab.class)
class RoundCommandsTest {

    private static final String PROBLEM = "application/problem+json";

    @Inject
    SessionRegistry registry;

    @Inject
    RoundCompletedObserver completedRounds;

    WireMockServer gitlab;

    private String sessionId;
    private String session;
    private String scrumMasterToken;
    private List<SessionApiTest.Joined> developers;

    @BeforeEach
    void createSessionWithThreeDevelopers() {
        gitlab.resetAll();
        GitLabStubs.defaultIssue(gitlab);
        GitLabStubs.issue(gitlab, GitLabStubs.PROJECT, 43, "Logout", "");
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        SessionApiTest.Created created = SessionApiTest.createSession("Anna " + suffix);
        sessionId = created.sessionId();
        session = "/api/sessions/" + sessionId;
        scrumMasterToken = created.token();
        developers = List.of(
                SessionApiTest.join(sessionId, "Ben " + suffix),
                SessionApiTest.join(sessionId, "Cem " + suffix),
                SessionApiTest.join(sessionId, "Dana " + suffix));
    }

    private RequestSpecification asScrumMaster() {
        return given().header("Authorization", "Bearer " + scrumMasterToken);
    }

    private RequestSpecification asDeveloper(int index) {
        return given().header("Authorization", "Bearer " + developers.get(index).token());
    }

    private void releaseIssue(long iid) {
        asScrumMaster()
                .contentType(ContentType.JSON)
                .body("{\"issueIid\":" + iid + "}")
                .when()
                .post(session + "/active-issue")
                .then()
                .statusCode(204);
    }

    private ValidatableResponse startVoting() {
        return asScrumMaster().when().post(session + "/round/start").then();
    }

    private void openVoting(long iid) {
        releaseIssue(iid);
        startVoting().statusCode(204);
    }

    private ValidatableResponse vote(int developer, String card) {
        return asDeveloper(developer)
                .contentType(ContentType.JSON)
                .body("{\"card\":\"" + card + "\"}")
                .when()
                .put(session + "/vote")
                .then();
    }

    private ValidatableResponse reveal() {
        return asScrumMaster().when().post(session + "/round/reveal").then();
    }

    private ValidatableResponse restart() {
        return asScrumMaster().when().post(session + "/round/restart").then();
    }

    private ValidatableResponse snapshotOf(RequestSpecification caller) {
        return caller.when().get(session).then().statusCode(200);
    }

    private String hasVotedOf(int developer) {
        return "participants.find { it.id == '" + developers.get(developer).participantId() + "' }.hasVoted";
    }

    private void connectDevelopers() {
        for (SessionApiTest.Joined developer : developers) {
            registry.update(sessionId, s -> {
                s.connect(developer.participantId());
                return null;
            });
        }
    }

    @Test
    void releasesTheIssueIntoDiscussionAndStartsTheVotingOnRequest() {
        releaseIssue(GitLabStubs.ISSUE);

        for (RequestSpecification caller : new RequestSpecification[] {asScrumMaster(), asDeveloper(0)}) {
            snapshotOf(caller)
                    .body("phase", equalTo("DISCUSSION"))
                    .body("activeIssue.iid", equalTo(42))
                    .body("round.number", equalTo(1))
                    .body("round.myVote", nullValue())
                    .body("round.allVoted", equalTo(false))
                    .body("round.votes", nullValue())
                    .body("round.stats", nullValue())
                    .body("round.deadline", nullValue());
        }

        startVoting().statusCode(204);

        snapshotOf(asDeveloper(0)).body("phase", equalTo("VOTING")).body("round.number", equalTo(1));
    }

    @Test
    void rejectsCardsRevealAndConfirmInDiscussion() {
        releaseIssue(GitLabStubs.ISSUE);

        vote(0, "5").statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("INVALID_STATE"));
        reveal().statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("INVALID_STATE"));
        asScrumMaster()
                .contentType(ContentType.JSON)
                .body("{\"card\":\"5\"}")
                .when()
                .post(session + "/round/confirm")
                .then()
                .statusCode(409)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("INVALID_STATE"));

        snapshotOf(asScrumMaster()).body("phase", equalTo("DISCUSSION")).body("history", hasSize(0));
    }

    @Test
    void switchesTheIssueInDiscussion() {
        releaseIssue(GitLabStubs.ISSUE);

        releaseIssue(43);

        snapshotOf(asDeveloper(0))
                .body("phase", equalTo("DISCUSSION"))
                .body("activeIssue.iid", equalTo(43))
                .body("round.number", equalTo(1));
    }

    @Test
    void switchesTheIssueWhileVotingIntoDiscussion() {
        openVoting(GitLabStubs.ISSUE);
        vote(0, "5").statusCode(204);

        releaseIssue(43);

        snapshotOf(asDeveloper(0))
                .body("phase", equalTo("DISCUSSION"))
                .body("activeIssue.iid", equalTo(43))
                .body("round.myVote", nullValue())
                .body(hasVotedOf(0), equalTo(false));
    }

    @Test
    void rejectsTheStartOutsideDiscussionAndByDevelopers() {
        startVoting().statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("INVALID_STATE"));

        releaseIssue(GitLabStubs.ISSUE);
        asDeveloper(0)
                .when()
                .post(session + "/round/start")
                .then()
                .statusCode(403)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("FORBIDDEN_ROLE"));
        startVoting().statusCode(204);

        startVoting().statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("INVALID_STATE"));
        reveal().statusCode(204);
        startVoting().statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("INVALID_STATE"));
    }

    @Test
    void storesTheHiddenCardAndShowsOnlyTheOwnValue() {
        openVoting(GitLabStubs.ISSUE);

        vote(0, "5").statusCode(204);

        snapshotOf(asDeveloper(0)).body("round.myVote", equalTo("5")).body(hasVotedOf(0), equalTo(true));
        snapshotOf(asScrumMaster())
                .body("round.myVote", nullValue())
                .body("round.votes", nullValue())
                .body("round.stats", nullValue())
                .body(hasVotedOf(0), equalTo(true))
                .body(hasVotedOf(1), equalTo(false));
        snapshotOf(asDeveloper(1)).body("round.myVote", nullValue()).body(hasVotedOf(0), equalTo(true));

        vote(0, "8").statusCode(204);
        snapshotOf(asDeveloper(0)).body("round.myVote", equalTo("8"));
    }

    @Test
    void rejectsACardInLobbyAndAfterTheReveal() {
        vote(0, "5").statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("INVALID_STATE"));

        openVoting(GitLabStubs.ISSUE);
        vote(0, "5").statusCode(204);
        reveal().statusCode(204);

        vote(1, "5").statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("INVALID_STATE"));
    }

    @Test
    void rejectsACardOfTheScrumMaster() {
        openVoting(GitLabStubs.ISSUE);

        asScrumMaster()
                .contentType(ContentType.JSON)
                .body("{\"card\":\"5\"}")
                .when()
                .put(session + "/vote")
                .then()
                .statusCode(403)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("FORBIDDEN_ROLE"));
    }

    @Test
    void revealsEveryCardWithTheStatsForEveryone() {
        openVoting(GitLabStubs.ISSUE);
        vote(0, "5").statusCode(204);
        vote(1, "8").statusCode(204);
        vote(2, "5").statusCode(204);

        reveal().statusCode(204);

        for (RequestSpecification caller : new RequestSpecification[] {asScrumMaster(), asDeveloper(1)}) {
            snapshotOf(caller)
                    .body("phase", equalTo("REVEALED"))
                    .body("round.votes", hasSize(3))
                    .body(
                            "round.votes[0].participantId",
                            equalTo(developers.get(0).participantId()))
                    .body("round.votes[0].card", equalTo("5"))
                    .body("round.votes[1].card", equalTo("8"))
                    .body("round.stats.distribution.card", equalTo(List.of("5", "8")))
                    .body("round.stats.distribution.count", equalTo(List.of(2, 1)))
                    .body("round.stats.average", equalTo(6.0f))
                    .body("round.stats.mostFrequent", equalTo(List.of("5")));
        }
        snapshotOf(asDeveloper(1)).body("round.myVote", equalTo("8"));
    }

    @Test
    void revealsWithOneOfThreeVotes() {
        openVoting(GitLabStubs.ISSUE);
        vote(2, "13").statusCode(204);

        reveal().statusCode(204);

        snapshotOf(asScrumMaster())
                .body("round.votes", hasSize(1))
                .body("round.votes[0].card", equalTo("13"))
                .body(hasVotedOf(0), equalTo(false))
                .body(hasVotedOf(1), equalTo(false))
                .body(hasVotedOf(2), equalTo(true))
                .body("round.stats.average", equalTo(13.0f));
    }

    @Test
    void rejectsTheRevealOutsideVotingAndByDevelopers() {
        reveal().statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("INVALID_STATE"));

        openVoting(GitLabStubs.ISSUE);
        asDeveloper(0)
                .when()
                .post(session + "/round/reveal")
                .then()
                .statusCode(403)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("FORBIDDEN_ROLE"));
        reveal().statusCode(204);

        reveal().statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("INVALID_STATE"));
    }

    @Test
    void restartOpensTheVotingOfANewRoundWithoutCards() {
        openVoting(GitLabStubs.ISSUE);
        vote(0, "5").statusCode(204);
        reveal().statusCode(204);

        restart().statusCode(204);

        snapshotOf(asDeveloper(0))
                .body("phase", equalTo("VOTING"))
                .body("round.deadline", nullValue())
                .body("round.number", equalTo(2))
                .body("round.myVote", nullValue())
                .body("round.votes", nullValue())
                .body("round.stats", nullValue())
                .body(hasVotedOf(0), equalTo(false));
    }

    @Test
    void rejectsANewRoundOutsideRevealedAndByDevelopers() {
        restart().statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("INVALID_STATE"));

        releaseIssue(GitLabStubs.ISSUE);
        restart().statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("INVALID_STATE"));

        startVoting().statusCode(204);
        restart().statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("INVALID_STATE"));
        reveal().statusCode(204);

        asDeveloper(0)
                .when()
                .post(session + "/round/restart")
                .then()
                .statusCode(403)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("FORBIDDEN_ROLE"));
    }

    @Test
    void recordsEveryRevealInTheHistoryNewestFirst() {
        openVoting(GitLabStubs.ISSUE);
        vote(0, "3").statusCode(204);
        reveal().statusCode(204);

        snapshotOf(asDeveloper(0))
                .body("history", hasSize(1))
                .body("history[0].issueIid", equalTo(42))
                .body("history[0].issueTitle", equalTo("Login page"))
                .body("history[0].roundNumber", equalTo(1))
                .body("history[0].votes[0].card", equalTo("3"))
                .body("history[0].stats.average", equalTo(3.0f))
                .body("history[0].finalCard", nullValue())
                .body("history[0].revealedAt", matchesPattern("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z"));

        restart().statusCode(204);
        vote(1, "8").statusCode(204);
        reveal().statusCode(204);

        snapshotOf(asScrumMaster())
                .body("history", hasSize(2))
                .body("history[0].roundNumber", equalTo(2))
                .body("history[1].roundNumber", equalTo(1));
    }

    @Test
    void keepsTheRevealedEntryWhenTheIssueChanges() {
        openVoting(GitLabStubs.ISSUE);
        vote(0, "5").statusCode(204);
        reveal().statusCode(204);

        releaseIssue(43);

        snapshotOf(asDeveloper(0))
                .body("phase", equalTo("DISCUSSION"))
                .body("activeIssue.iid", equalTo(43))
                .body("round.number", equalTo(1))
                .body("round.myVote", nullValue())
                .body(hasVotedOf(0), equalTo(false))
                .body("history", hasSize(1))
                .body("history[0].issueIid", equalTo(42))
                .body("history[0].finalCard", nullValue());
    }

    @Test
    void completesTheRoundOnceWhenTheLastConnectedDeveloperVotes() {
        openVoting(GitLabStubs.ISSUE);
        connectDevelopers();

        vote(0, "5").statusCode(204);
        vote(1, "5").statusCode(204);
        snapshotOf(asScrumMaster()).body("round.allVoted", equalTo(false));
        assertEquals(List.of(), completedRounds.roundsOf(sessionId));

        vote(2, "8").statusCode(204);
        snapshotOf(asScrumMaster()).body("round.allVoted", equalTo(true));
        assertEquals(List.of(1), completedRounds.roundsOf(sessionId));

        vote(0, "13").statusCode(204);
        assertEquals(List.of(1), completedRounds.roundsOf(sessionId));
    }

    @Test
    void neverCompletesTheRoundWithoutConnectedDevelopers() {
        openVoting(GitLabStubs.ISSUE);

        vote(0, "5").statusCode(204);
        vote(1, "5").statusCode(204);
        vote(2, "5").statusCode(204);

        snapshotOf(asScrumMaster()).body("round.allVoted", equalTo(false));
        assertEquals(List.of(), completedRounds.roundsOf(sessionId));
    }

    @Test
    void runsTwoRoundsFromReleaseToReveal() {
        openVoting(GitLabStubs.ISSUE);
        vote(0, "5").statusCode(204);
        vote(1, "8").statusCode(204);
        vote(2, "13").statusCode(204);
        reveal().statusCode(204);
        restart().statusCode(204);
        vote(0, "8").statusCode(204);
        vote(1, "8").statusCode(204);
        vote(2, "8").statusCode(204);
        reveal().statusCode(204);

        snapshotOf(asScrumMaster())
                .body("phase", equalTo("REVEALED"))
                .body("round.number", equalTo(2))
                .body("round.stats.mostFrequent", equalTo(List.of("8")))
                .body("round.stats.average", equalTo(8.0f))
                .body("history", hasSize(2))
                .body("history[0].roundNumber", equalTo(2))
                .body("history[0].stats.distribution.count", equalTo(List.of(3)))
                .body("history[1].roundNumber", equalTo(1))
                .body("history[1].stats.average", equalTo(8.7f))
                .body("history[1].stats.mostFrequent", equalTo(List.of("5", "8", "13")));
    }
}
