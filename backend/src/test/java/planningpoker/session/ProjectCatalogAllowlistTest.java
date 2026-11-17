package planningpoker.session;

import static com.github.tomakehurst.wiremock.client.WireMock.anyRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.anyUrl;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.github.tomakehurst.wiremock.WireMockServer;
import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.logging.Handler;
import java.util.logging.LogRecord;
import org.jboss.logmanager.ExtLogRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import planningpoker.gitlab.GitLabClient;
import planningpoker.gitlab.WireMockGitLab;

@QuarkusTest
@WithTestResource(WireMockGitLab.class)
@TestProfile(ProjectCatalogAllowlistTest.Allowlist.class)
class ProjectCatalogAllowlistTest {

    private static final String PROBLEM = "application/problem+json";

    public static class Allowlist implements QuarkusTestProfile {

        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("planningpoker.session.allowed-projects", "1234,5678");
        }
    }

    WireMockServer gitlab;

    @BeforeEach
    void stubTheProjects() {
        gitlab.resetAll();
        GitLabStubs.project(gitlab, 1234, "Planning Poker", "team/planning-poker");
        GitLabStubs.project(gitlab, 5678, "Release Notes", "Team/Release-Notes");
    }

    @Test
    void listsExactlyTheProjectsOfTheAllowlistWithTheirNames() {
        given().when()
                .get("/api/projects")
                .then()
                .statusCode(200)
                .body("items", hasSize(2))
                .body("items[0].id", equalTo(1234))
                .body("items[0].name", equalTo("Planning Poker"))
                .body("items[0].pathWithNamespace", equalTo("team/planning-poker"))
                .body("items[0].webUrl", equalTo("https://gitlab.example/team/planning-poker"))
                .body("items[1].id", equalTo(5678))
                .body("items[1].name", equalTo("Release Notes"))
                .body("nextPage", nullValue());
        gitlab.verify(getRequestedFor(urlPathEqualTo(GitLabStubs.projectPath("1234"))));
        gitlab.verify(getRequestedFor(urlPathEqualTo(GitLabStubs.projectPath("5678"))));
        gitlab.verify(0, getRequestedFor(urlPathEqualTo(GitLabStubs.PROJECTS)));
    }

    @Test
    void filtersByNameIgnoringCase() {
        given().when()
                .get("/api/projects?search=POKER")
                .then()
                .statusCode(200)
                .body("items", hasSize(1))
                .body("items[0].id", equalTo(1234));
    }

    @Test
    void filtersByPathIgnoringCase() {
        given().when()
                .get("/api/projects?search=team/release")
                .then()
                .statusCode(200)
                .body("items", hasSize(1))
                .body("items[0].id", equalTo(5678));
    }

    @ParameterizedTest(name = "GitLab {0} for one entry drops it and writes a log line")
    @ValueSource(ints = {404, 403})
    void dropsAProjectThatGitLabRejects(int status) {
        GitLabStubs.projectFailing(gitlab, "5678", status);
        List<String> lines = new CopyOnWriteArrayList<>();
        Handler handler = new Handler() {
            @Override
            public void publish(LogRecord record) {
                lines.add(((ExtLogRecord) record).getFormattedMessage());
            }

            @Override
            public void flush() {}

            @Override
            public void close() {}
        };
        java.util.logging.Logger logger = java.util.logging.Logger.getLogger(GitLabClient.class.getName());
        logger.addHandler(handler);
        try {
            given().when()
                    .get("/api/projects")
                    .then()
                    .statusCode(200)
                    .body("items", hasSize(1))
                    .body("items[0].id", equalTo(1234));
        } finally {
            logger.removeHandler(handler);
        }

        assertEquals(1, lines.size(), lines.toString());
        String line = lines.get(0);
        assertTrue(line.contains("operation=loadProject"), line);
        assertTrue(line.contains("projectId=5678"), line);
        assertTrue(line.contains("status=" + status), line);
    }

    @Test
    void answersAccessDeniedWhenGitLabRejectsTheToken() {
        GitLabStubs.projectFailing(gitlab, "5678", 401);

        given().when()
                .get("/api/projects")
                .then()
                .statusCode(502)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("GITLAB_ACCESS_DENIED"));
    }

    @Test
    void answersAnEmptySecondPageWithoutAskingGitLab() {
        given().when()
                .get("/api/projects?page=2")
                .then()
                .statusCode(200)
                .body("items", hasSize(0))
                .body("nextPage", nullValue());
        gitlab.verify(0, anyRequestedFor(anyUrl()));
    }

    @Test
    void rejectsTheIssuesOfAProjectOutsideTheAllowlistWithoutAskingGitLab() {
        given().when()
                .get("/api/projects/9999/issues?search=login")
                .then()
                .statusCode(403)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("PROJECT_NOT_ALLOWED"));
        gitlab.verify(0, anyRequestedFor(anyUrl()));
    }

    @Test
    void listsTheIssuesOfAnAllowedProject() {
        GitLabStubs.search(
                gitlab, GitLabStubs.PROJECT, "[" + GitLabStubs.issueJson(42, "Login page", "Form") + "]", null);

        given().when()
                .get("/api/projects/1234/issues?search=login")
                .then()
                .statusCode(200)
                .body("items[0].iid", equalTo(42));
    }
}
