package planningpoker.session;

import static com.github.tomakehurst.wiremock.client.WireMock.absent;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasKey;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Alternative;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;
import java.time.Clock;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import planningpoker.gitlab.WireMockGitLab;

@QuarkusTest
@WithTestResource(WireMockGitLab.class)
@TestProfile(IssueSelectionTest.FixedClock.class)
class IssueSelectionTest {

    static final TestClock CLOCK = new TestClock(Instant.parse("2026-11-17T12:00:00Z"));

    public static class FixedClock implements QuarkusTestProfile {

        @Override
        public Set<Class<?>> getEnabledAlternatives() {
            return Set.of(FixedClockProducer.class);
        }
    }

    @Alternative
    @ApplicationScoped
    public static class FixedClockProducer {

        @Produces
        @Singleton
        Clock clock() {
            return CLOCK;
        }
    }

    private static final String PROBLEM = "application/problem+json";
    private static final String ISSUES = GitLabStubs.issuesPath(GitLabStubs.PROJECT);
    private static final int DELAY_BELOW_TIMEOUT_MILLIS = (int) WireMockGitLab.TIMEOUT.toMillis() * 7 / 10;
    private static final int DELAY_ABOVE_TIMEOUT_MILLIS = (int) WireMockGitLab.TIMEOUT.toMillis() * 2 + 500;

    WireMockServer gitlab;

    private String session;
    private String scrumMasterToken;
    private String developerToken;

    @BeforeEach
    void createSessionWithStubs() {
        gitlab.resetAll();
        GitLabStubs.defaultIssue(gitlab);
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        SessionApiTest.Created created = SessionApiTest.createSession("Anna " + suffix);
        session = "/api/sessions/" + created.sessionId();
        scrumMasterToken = created.token();
        developerToken =
                SessionApiTest.join(created.sessionId(), "Ben " + suffix).token();
    }

    private RequestSpecification asScrumMaster() {
        return given().header("Authorization", "Bearer " + scrumMasterToken);
    }

    private RequestSpecification asDeveloper() {
        return given().header("Authorization", "Bearer " + developerToken);
    }

    private void selectIssue(long iid, int expectedStatus) {
        asScrumMaster()
                .contentType(ContentType.JSON)
                .body("{\"issueIid\":" + iid + "}")
                .when()
                .post(session + "/active-issue")
                .then()
                .statusCode(expectedStatus);
    }

    @Test
    void listsIssuesWithSearchAndNextPage() {
        GitLabStubs.search(
                gitlab,
                GitLabStubs.PROJECT,
                "[" + GitLabStubs.issueJson(7, "Login", "Form") + "," + GitLabStubs.issueJson(9, "Logout", null) + "]",
                "2");

        asScrumMaster()
                .when()
                .get(session + "/issues?search=login&page=1")
                .then()
                .statusCode(200)
                .body("items", hasSize(2))
                .body("items[0].iid", equalTo(7))
                .body("items[0].title", equalTo("Login"))
                .body("items[0].webUrl", equalTo("https://gitlab.example/g/p/-/issues/7"))
                .body("items[1].iid", equalTo(9))
                .body("nextPage", equalTo(2));
        gitlab.verify(getRequestedFor(urlPathEqualTo(ISSUES))
                .withQueryParam("state", WireMock.equalTo("opened"))
                .withQueryParam("search", WireMock.equalTo("login"))
                .withQueryParam("per_page", WireMock.equalTo("20"))
                .withQueryParam("page", WireMock.equalTo("1")));
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"session", "project"})
    void listsTheTotalFromTheGitLabHeader(String list) {
        GitLabStubs.searchWithTotal(
                gitlab, GitLabStubs.PROJECT, "[" + GitLabStubs.issueJson(7, "Login", "Form") + "]", "23");

        listIssues(list).then().statusCode(200).body("items", hasSize(1)).body("total", equalTo(23));
    }

    @ParameterizedTest(name = "{0}")
    @ValueSource(strings = {"session", "project"})
    void listsNoTotalWhenGitLabOmitsTheHeader(String list) {
        GitLabStubs.search(gitlab, GitLabStubs.PROJECT, "[" + GitLabStubs.issueJson(7, "Login", "Form") + "]", null);

        listIssues(list).then().statusCode(200).body("$", hasKey("total")).body("total", nullValue());
    }

    private io.restassured.response.Response listIssues(String list) {
        return "session".equals(list)
                ? asScrumMaster().when().get(session + "/issues")
                : given().when().get("/api/projects/" + GitLabStubs.PROJECT + "/issues");
    }

    @Test
    void createsTheSessionWithTheProjectOfGitLab() {
        GitLabStubs.project(gitlab, 1234, "Frontend", "webshop/frontend");
        SessionApiTest.Created created = SessionApiTest.createSession(
                "Cleo " + UUID.randomUUID().toString().substring(0, 8));

        given().header("Authorization", "Bearer " + created.token())
                .when()
                .get("/api/sessions/" + created.sessionId())
                .then()
                .statusCode(200)
                .body("project.id", equalTo(1234))
                .body("project.name", equalTo("Frontend"))
                .body("project.pathWithNamespace", equalTo("webshop/frontend"))
                .body("project.webUrl", equalTo("https://gitlab.example/webshop/frontend"))
                .body("writeWeight", equalTo(false));
        gitlab.verify(getRequestedFor(urlPathEqualTo(GitLabStubs.projectPath(GitLabStubs.PROJECT))));
    }

    @Test
    void createsTheSessionWithoutProjectWhenGitLabFailsOnTheProject() {
        GitLabStubs.projectFailing(gitlab, GitLabStubs.PROJECT, 500);
        SessionApiTest.Created created = SessionApiTest.createSession(
                "Cleo " + UUID.randomUUID().toString().substring(0, 8));

        given().header("Authorization", "Bearer " + created.token())
                .when()
                .get("/api/sessions/" + created.sessionId())
                .then()
                .statusCode(200)
                .body("$", hasKey("project"))
                .body("project", nullValue())
                .body("writeWeight", equalTo(false));
        gitlab.verify(getRequestedFor(urlPathEqualTo(GitLabStubs.projectPath(GitLabStubs.PROJECT))));
    }

    @Test
    void requestsTheSecondPageAndAnswersWithoutNextPageAtTheEnd() {
        GitLabStubs.search(gitlab, GitLabStubs.PROJECT, "[]", "");

        asScrumMaster()
                .when()
                .get(session + "/issues?search=login&page=2")
                .then()
                .statusCode(200)
                .body("items", hasSize(0))
                .body("nextPage", nullValue());
        gitlab.verify(getRequestedFor(urlPathEqualTo(ISSUES)).withQueryParam("page", WireMock.equalTo("2")));
    }

    @Test
    void listsWithoutASearchText() {
        GitLabStubs.search(gitlab, GitLabStubs.PROJECT, "[]", null);

        asScrumMaster().when().get(session + "/issues").then().statusCode(200).body("items", hasSize(0));
        gitlab.verify(getRequestedFor(urlPathEqualTo(ISSUES))
                .withQueryParam("search", absent())
                .withQueryParam("page", WireMock.equalTo("1")));
    }

    @ParameterizedTest(name = "weight {0} sends {1}")
    @CsvSource({"?weight=NONE, None", "?weight=ANY, Any", "?weight=ALL, ", "'', "})
    void translatesTheWeightFilterAndSortsByLastChange(String query, String gitLabWeight) {
        GitLabStubs.search(gitlab, GitLabStubs.PROJECT, "[]", null);

        asScrumMaster().when().get(session + "/issues" + query).then().statusCode(200);

        gitlab.verify(getRequestedFor(urlPathEqualTo(ISSUES))
                .withQueryParam("weight", gitLabWeight == null ? absent() : WireMock.equalTo(gitLabWeight))
                .withQueryParam("order_by", WireMock.equalTo("updated_at"))
                .withQueryParam("sort", WireMock.equalTo("desc")));
    }

    @ParameterizedTest(name = "period {0} sends {1}")
    @CsvSource({
        "?period=WEEK, 2026-11-10T12:00:00Z",
        "?period=MONTH, 2026-10-18T12:00:00Z",
        "?period=YEAR, 2025-11-17T12:00:00Z",
        "?period=ALL, ",
        "'', "
    })
    void sendsTheStartOfThePeriodFromTheClock(String query, String updatedAfter) {
        GitLabStubs.search(gitlab, GitLabStubs.PROJECT, "[]", null);

        asScrumMaster().when().get(session + "/issues" + query).then().statusCode(200);

        gitlab.verify(getRequestedFor(urlPathEqualTo(ISSUES))
                .withQueryParam("updated_after", updatedAfter == null ? absent() : WireMock.equalTo(updatedAfter)));
    }

    @ParameterizedTest(name = "{0} answers VALIDATION_ERROR")
    @CsvSource({"weight=SOME", "weight=none", "period=DAY", "period=week"})
    void refusesAnUnknownFilterValue(String query) {
        GitLabStubs.search(gitlab, GitLabStubs.PROJECT, "[]", null);

        asScrumMaster()
                .when()
                .get(session + "/issues?" + query)
                .then()
                .statusCode(400)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("VALIDATION_ERROR"));
        gitlab.verify(0, getRequestedFor(urlPathEqualTo(ISSUES)));
    }

    @Test
    void listsTheWeightOrNullForEveryIssue() {
        GitLabStubs.searchWithWeight(
                gitlab,
                GitLabStubs.PROJECT,
                "Any",
                "[" + GitLabStubs.weightedIssueJson(7, "Login", "5") + ","
                        + GitLabStubs.weightedIssueJson(8, "Logout", "null") + ","
                        + GitLabStubs.issueJson(9, "Search", null) + ","
                        + GitLabStubs.weightedIssueJson(10, "Export", "\"\"") + "]");

        asScrumMaster()
                .when()
                .get(session + "/issues?weight=ANY")
                .then()
                .statusCode(200)
                .body("items", hasSize(4))
                .body("items[0].weight", equalTo(5))
                .body("items[1].weight", nullValue())
                .body("items[2]", hasKey("weight"))
                .body("items[2].weight", nullValue())
                .body("items[3].weight", nullValue());
    }

    @Test
    void listsTheWeightForTheStartPageWithoutFilter() {
        GitLabStubs.search(
                gitlab, GitLabStubs.PROJECT, "[" + GitLabStubs.weightedIssueJson(7, "Login", "3") + "]", null);

        given().when()
                .get("/api/projects/" + GitLabStubs.PROJECT + "/issues")
                .then()
                .statusCode(200)
                .body("items[0].weight", equalTo(3));
        gitlab.verify(getRequestedFor(urlPathEqualTo(ISSUES))
                .withQueryParam("weight", absent())
                .withQueryParam("updated_after", absent()));
    }

    static Stream<Arguments> gitLabFailures() {
        return Stream.of(
                Arguments.of(401, "GITLAB_ACCESS_DENIED"),
                Arguments.of(403, "GITLAB_ACCESS_DENIED"),
                Arguments.of(500, "GITLAB_ERROR"));
    }

    @ParameterizedTest(name = "GitLab {0} answers {1}")
    @MethodSource("gitLabFailures")
    void answersAGitlabCodeWhenTheSearchFails(int status, String errorCode) {
        GitLabStubs.searchFailing(gitlab, GitLabStubs.PROJECT, status);

        asScrumMaster()
                .when()
                .get(session + "/issues?search=login")
                .then()
                .statusCode(502)
                .contentType(PROBLEM)
                .body("errorCode", equalTo(errorCode))
                .body("detail", not(containsGitLabText()));
    }

    @Test
    void answersGitlabErrorWhenTheSearchTimesOut() {
        GitLabStubs.searchDelayed(gitlab, GitLabStubs.PROJECT, DELAY_ABOVE_TIMEOUT_MILLIS);

        asScrumMaster()
                .when()
                .get(session + "/issues?search=login")
                .then()
                .statusCode(502)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("GITLAB_ERROR"))
                .body("detail", equalTo("GitLab did not answer."));
    }

    @Test
    void refusesToCreateASessionForAnUnknownIssue() {
        GitLabStubs.issueMissing(gitlab, GitLabStubs.PROJECT, 404);

        given().contentType(ContentType.JSON)
                .body("{\"name\":\"Anna\",\"gitlabProjectId\":\"1234\",\"issueIid\":404}")
                .when()
                .post("/api/sessions")
                .then()
                .statusCode(404)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("ISSUE_NOT_FOUND"));
        gitlab.verify(getRequestedFor(urlPathEqualTo(GitLabStubs.issuePath(GitLabStubs.PROJECT, 404))));
    }

    @ParameterizedTest(name = "GitLab {0} answers {1}")
    @MethodSource("gitLabFailures")
    void refusesToCreateASessionWhenGitlabFails(int status, String errorCode) {
        GitLabStubs.issueFailing(gitlab, GitLabStubs.PROJECT, 500, status);

        given().contentType(ContentType.JSON)
                .body("{\"name\":\"Anna\",\"gitlabProjectId\":\"1234\",\"issueIid\":500}")
                .when()
                .post("/api/sessions")
                .then()
                .statusCode(502)
                .contentType(PROBLEM)
                .body("errorCode", equalTo(errorCode))
                .body("detail", not(containsGitLabText()));
    }

    @Test
    void refusesToCreateASessionWhenGitlabTimesOut() {
        GitLabStubs.issueDelayed(gitlab, GitLabStubs.PROJECT, 500, DELAY_ABOVE_TIMEOUT_MILLIS);

        given().contentType(ContentType.JSON)
                .body("{\"name\":\"Anna\",\"gitlabProjectId\":\"1234\",\"issueIid\":500}")
                .when()
                .post("/api/sessions")
                .then()
                .statusCode(502)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("GITLAB_ERROR"))
                .body("detail", equalTo("GitLab did not answer."));
    }

    @Test
    void releasesTheIssueForEveryoneAndStartsRoundOne() {
        asDeveloper()
                .when()
                .get(session)
                .then()
                .statusCode(200)
                .body("phase", equalTo("LOBBY"))
                .body("activeIssue", nullValue());

        selectIssue(GitLabStubs.ISSUE, 204);

        for (RequestSpecification caller : new RequestSpecification[] {asScrumMaster(), asDeveloper()}) {
            caller.when()
                    .get(session)
                    .then()
                    .statusCode(200)
                    .body("phase", equalTo("DISCUSSION"))
                    .body("activeIssue.iid", equalTo(42))
                    .body("activeIssue.title", equalTo("Login page"))
                    .body("activeIssue.description", equalTo("As a user I want to log in."))
                    .body("activeIssue.webUrl", equalTo("https://gitlab.example/g/p/-/issues/42"))
                    .body("round.number", equalTo(1));
        }
        asScrumMaster().when().get(session).then().body("preselectedIssueIid", equalTo(42));
    }

    @Test
    void switchesTheIssueWhileVotingAndResetsTheRound() {
        GitLabStubs.issue(gitlab, GitLabStubs.PROJECT, 43, "Logout", null);
        selectIssue(GitLabStubs.ISSUE, 204);

        selectIssue(43, 204);

        asDeveloper()
                .when()
                .get(session)
                .then()
                .statusCode(200)
                .body("phase", equalTo("DISCUSSION"))
                .body("activeIssue.iid", equalTo(43))
                .body("activeIssue.description", equalTo(""))
                .body("round.number", equalTo(1))
                .body("participants.hasVoted", equalTo(java.util.List.of(false, false)));
    }

    @Test
    void keepsTheStateWhenTheNewIssueIsUnknown() {
        GitLabStubs.issueMissing(gitlab, GitLabStubs.PROJECT, 404);
        selectIssue(GitLabStubs.ISSUE, 204);

        asScrumMaster()
                .contentType(ContentType.JSON)
                .body("{\"issueIid\":404}")
                .when()
                .post(session + "/active-issue")
                .then()
                .statusCode(404)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("ISSUE_NOT_FOUND"));
        asScrumMaster()
                .when()
                .get(session)
                .then()
                .body("activeIssue.iid", equalTo(42))
                .body("phase", equalTo("DISCUSSION"));
    }

    @ParameterizedTest(name = "GitLab {0} answers {1}")
    @CsvSource({"503, GITLAB_ERROR", "403, GITLAB_ACCESS_DENIED"})
    void keepsTheStateWhenGitlabFailsOnTheSwitch(int status, String errorCode) {
        GitLabStubs.issueFailing(gitlab, GitLabStubs.PROJECT, 500, status);
        selectIssue(GitLabStubs.ISSUE, 204);

        asScrumMaster()
                .contentType(ContentType.JSON)
                .body("{\"issueIid\":500}")
                .when()
                .post(session + "/active-issue")
                .then()
                .statusCode(502)
                .contentType(PROBLEM)
                .body("errorCode", equalTo(errorCode));
        asScrumMaster().when().get(session).then().body("activeIssue.iid", equalTo(42));
    }

    @Test
    void refusesTheSelectionByADeveloper() {
        asDeveloper()
                .contentType(ContentType.JSON)
                .body("{\"issueIid\":42}")
                .when()
                .post(session + "/active-issue")
                .then()
                .statusCode(403)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("FORBIDDEN_ROLE"));
        asDeveloper().when().get(session).then().body("phase", equalTo("LOBBY"));
    }

    @Test
    void loadsTheIssueOutsideTheLockSoAJoinSucceedsMeanwhile() {
        GitLabStubs.issueDelayed(gitlab, GitLabStubs.PROJECT, 44, DELAY_BELOW_TIMEOUT_MILLIS);
        String sessionId = session.substring("/api/sessions/".length());

        CompletableFuture<Long> selectFinished = CompletableFuture.supplyAsync(() -> {
            selectIssue(44, 204);
            return System.nanoTime();
        });
        awaitGitLabRequest(GitLabStubs.issuePath(GitLabStubs.PROJECT, 44));
        SessionApiTest.join(sessionId, "Cem " + UUID.randomUUID().toString().substring(0, 8));
        long joinFinished = System.nanoTime();

        assertTrue(joinFinished < selectFinished.join(), "the join waited for the GitLab call");
        asDeveloper()
                .when()
                .get(session)
                .then()
                .body("activeIssue.iid", equalTo(44))
                .body("participants", hasSize(3));
    }

    @Test
    void encodesAProjectPathInTheGitLabUrl() {
        GitLabStubs.issue(gitlab, "group%2Fproject", GitLabStubs.ISSUE, "Login page", "");

        given().contentType(ContentType.JSON)
                .body("{\"name\":\"Anna\",\"gitlabProjectId\":\"group/project\",\"issueIid\":42}")
                .when()
                .post("/api/sessions")
                .then()
                .statusCode(201);
        gitlab.verify(getRequestedFor(urlPathEqualTo("/api/v4/projects/group%2Fproject/issues/42")));
    }

    private void awaitGitLabRequest(String path) {
        long deadline = System.nanoTime() + java.util.concurrent.TimeUnit.SECONDS.toNanos(5);
        while (gitlab.findAll(getRequestedFor(urlPathEqualTo(path))).isEmpty()) {
            assertTrue(System.nanoTime() < deadline, "GitLab did not receive the request for " + path);
            Thread.onSpinWait();
        }
    }

    private static org.hamcrest.Matcher<String> containsGitLabText() {
        return org.hamcrest.Matchers.containsString("gitlab failure text");
    }
}
