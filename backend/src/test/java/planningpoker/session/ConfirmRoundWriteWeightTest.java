package planningpoker.session;

import static com.github.tomakehurst.wiremock.client.WireMock.equalToJson;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.putRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.stubbing.ServeEvent;
import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import planningpoker.gitlab.WireMockGitLab;

@QuarkusTest
@WithTestResource(WireMockGitLab.class)
@TestProfile(ConfirmRoundWriteWeightTest.WriteWeight.class)
class ConfirmRoundWriteWeightTest {

    public static class WriteWeight implements QuarkusTestProfile {

        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("planningpoker.gitlab.write-weight", "true");
        }
    }

    private static final String PROBLEM = "application/problem+json";
    private static final String NOTES = GitLabStubs.notesPath(GitLabStubs.PROJECT, GitLabStubs.ISSUE);
    private static final String ISSUE = GitLabStubs.issuePath(GitLabStubs.PROJECT, GitLabStubs.ISSUE);

    WireMockServer gitlab;

    private ConfirmRoundFlow flow;

    @BeforeEach
    void createSessionWithRevealedRound() {
        gitlab.resetAll();
        GitLabStubs.defaultIssue(gitlab);
        GitLabStubs.note(gitlab, GitLabStubs.PROJECT, GitLabStubs.ISSUE);
        GitLabStubs.weight(gitlab, GitLabStubs.PROJECT, GitLabStubs.ISSUE);
        flow = ConfirmRoundFlow.create(2);
        flow.revealedRound("5", "8");
    }

    @Test
    void setsTheWeightBeforeTheComment() {
        flow.confirm("5").statusCode(204);

        gitlab.verify(1, putRequestedFor(urlPathEqualTo(ISSUE)).withRequestBody(equalToJson("{\"weight\":5}")));
        gitlab.verify(1, postRequestedFor(urlPathEqualTo(NOTES)));
        List<ServeEvent> newestFirst = gitlab.getAllServeEvents();
        assertEquals("PUT", newestFirst.get(1).getRequest().getMethod().getName());
        assertEquals("POST", newestFirst.get(0).getRequest().getMethod().getName());
        flow.snapshotOf(flow.asScrumMaster())
                .body("phase", equalTo("LOBBY"))
                .body("history[0].finalCard", equalTo("5"));
    }

    @ParameterizedTest(name = "card {0}")
    @ValueSource(strings = {"?", "COFFEE"})
    void writesNoWeightForAQuestionMarkOrCoffee(String card) {
        flow.confirm(card).statusCode(204);

        gitlab.verify(0, putRequestedFor(urlPathEqualTo(ISSUE)));
        gitlab.verify(1, postRequestedFor(urlPathEqualTo(NOTES)));
    }

    @ParameterizedTest(name = "GitLab {0} answers {1}")
    @CsvSource({"500, GITLAB_ERROR", "403, GITLAB_ACCESS_DENIED"})
    void sendsNoCommentWhenTheWeightFailsAndAllowsARetry(int status, String errorCode) {
        GitLabStubs.weightFailing(gitlab, GitLabStubs.PROJECT, GitLabStubs.ISSUE, status);

        flow.confirm("5").statusCode(502).contentType(PROBLEM).body("errorCode", equalTo(errorCode));

        gitlab.verify(0, postRequestedFor(urlPathEqualTo(NOTES)));
        flow.snapshotOf(flow.asScrumMaster())
                .body("phase", equalTo("REVEALED"))
                .body("round.confirming", equalTo(false))
                .body("history[0].finalCard", nullValue());

        GitLabStubs.weight(gitlab, GitLabStubs.PROJECT, GitLabStubs.ISSUE);
        flow.confirm("5").statusCode(204);
        gitlab.verify(1, postRequestedFor(urlPathEqualTo(NOTES)));
        flow.snapshotOf(flow.asScrumMaster()).body("phase", equalTo("LOBBY"));
    }
}
