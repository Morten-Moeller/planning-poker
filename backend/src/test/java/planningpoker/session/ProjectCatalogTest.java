package planningpoker.session;

import static com.github.tomakehurst.wiremock.client.WireMock.absent;
import static com.github.tomakehurst.wiremock.client.WireMock.anyRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.anyUrl;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.junit.QuarkusTest;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import planningpoker.gitlab.WireMockGitLab;

@QuarkusTest
@WithTestResource(WireMockGitLab.class)
class ProjectCatalogTest {

    private static final String PROBLEM = "application/problem+json";
    private static final String GITLAB_TEXT = "gitlab failure text";
    private static final String ISSUES = GitLabStubs.issuesPath(GitLabStubs.PROJECT);

    WireMockServer gitlab;

    @BeforeEach
    void resetStubs() {
        gitlab.resetAll();
    }

    @Test
    void listsTheProjectsOfTheTokenWithSearchAndNextPage() {
        GitLabStubs.projects(
                gitlab,
                "[" + GitLabStubs.projectJson(1234, "Planning Poker", "team/planning-poker") + ","
                        + GitLabStubs.projectJson(5678, "Poker Tools", "team/poker-tools") + "]",
                "2");

        given().when()
                .get("/api/projects?search=poker")
                .then()
                .statusCode(200)
                .body("items", hasSize(2))
                .body("items[0].id", equalTo(1234))
                .body("items[0].name", equalTo("Planning Poker"))
                .body("items[0].pathWithNamespace", equalTo("team/planning-poker"))
                .body("items[0].webUrl", equalTo("https://gitlab.example/team/planning-poker"))
                .body("items[1].id", equalTo(5678))
                .body("nextPage", equalTo(2));
        gitlab.verify(getRequestedFor(urlPathEqualTo(GitLabStubs.PROJECTS))
                .withQueryParam("membership", WireMock.equalTo("true"))
                .withQueryParam("simple", WireMock.equalTo("true"))
                .withQueryParam("search", WireMock.equalTo("poker"))
                .withQueryParam("order_by", WireMock.equalTo("last_activity_at"))
                .withQueryParam("per_page", WireMock.equalTo("20"))
                .withQueryParam("page", WireMock.equalTo("1")));
    }

    @Test
    void listsWithoutSearchAndAnswersWithoutNextPageOnTheLastPage() {
        GitLabStubs.projects(gitlab, "[]", "");

        given().when()
                .get("/api/projects?page=3")
                .then()
                .statusCode(200)
                .body("items", hasSize(0))
                .body("nextPage", nullValue());
        gitlab.verify(getRequestedFor(urlPathEqualTo(GitLabStubs.PROJECTS))
                .withQueryParam("search", absent())
                .withQueryParam("page", WireMock.equalTo("3")));
    }

    @Test
    void listsTheOpenIssuesOfAProject() {
        GitLabStubs.search(
                gitlab, GitLabStubs.PROJECT, "[" + GitLabStubs.issueJson(42, "Login page", "Form") + "]", null);

        given().when()
                .get("/api/projects/1234/issues?search=login")
                .then()
                .statusCode(200)
                .body("items", hasSize(1))
                .body("items[0].iid", equalTo(42))
                .body("items[0].title", equalTo("Login page"))
                .body("items[0].webUrl", equalTo("https://gitlab.example/g/p/-/issues/42"))
                .body("nextPage", nullValue());
        gitlab.verify(getRequestedFor(urlPathEqualTo(ISSUES))
                .withQueryParam("state", WireMock.equalTo("opened"))
                .withQueryParam("search", WireMock.equalTo("login"))
                .withQueryParam("per_page", WireMock.equalTo("20"))
                .withQueryParam("page", WireMock.equalTo("1")));
    }

    static Stream<Arguments> gitLabFailures() {
        return Stream.of(
                Arguments.of(401, "GITLAB_ACCESS_DENIED"),
                Arguments.of(403, "GITLAB_ACCESS_DENIED"),
                Arguments.of(500, "GITLAB_ERROR"));
    }

    @ParameterizedTest(name = "project list: GitLab {0} answers {1}")
    @MethodSource("gitLabFailures")
    void answersAGitLabCodeWhenTheProjectListFails(int status, String errorCode) {
        GitLabStubs.projectsFailing(gitlab, status);

        given().when()
                .get("/api/projects?search=poker")
                .then()
                .statusCode(502)
                .contentType(PROBLEM)
                .body("errorCode", equalTo(errorCode))
                .body("detail", not(containsString(GITLAB_TEXT)));
    }

    @ParameterizedTest(name = "issue list: GitLab {0} answers {1}")
    @MethodSource("gitLabFailures")
    void answersAGitLabCodeWhenTheIssueListFails(int status, String errorCode) {
        GitLabStubs.searchFailing(gitlab, GitLabStubs.PROJECT, status);

        given().when()
                .get("/api/projects/1234/issues?search=login")
                .then()
                .statusCode(502)
                .contentType(PROBLEM)
                .body("errorCode", equalTo(errorCode))
                .body("detail", not(containsString(GITLAB_TEXT)));
    }

    @ParameterizedTest(name = "{0} with page=0 answers 400")
    @ValueSource(strings = {"/api/projects?page=0", "/api/projects/1234/issues?page=0"})
    void rejectsPageZero(String path) {
        given().when()
                .get(path)
                .then()
                .statusCode(400)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("VALIDATION_ERROR"));
        gitlab.verify(0, anyRequestedFor(anyUrl()));
    }
}
