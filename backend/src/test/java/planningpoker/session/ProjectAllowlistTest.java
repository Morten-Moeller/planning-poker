package planningpoker.session;

import static com.github.tomakehurst.wiremock.client.WireMock.anyRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.anyUrl;
import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

import com.github.tomakehurst.wiremock.WireMockServer;
import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import io.restassured.http.ContentType;
import io.restassured.response.ValidatableResponse;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import planningpoker.gitlab.WireMockGitLab;

@QuarkusTest
@WithTestResource(WireMockGitLab.class)
@TestProfile(ProjectAllowlistTest.Allowlist.class)
class ProjectAllowlistTest {

    private static final String PROBLEM = "application/problem+json";

    public static class Allowlist implements QuarkusTestProfile {

        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("planningpoker.session.allowed-projects", "1234, group/app ");
        }
    }

    WireMockServer gitlab;

    @BeforeEach
    void stubTheIssues() {
        gitlab.resetAll();
        GitLabStubs.defaultIssue(gitlab);
        GitLabStubs.issue(gitlab, "5678", GitLabStubs.ISSUE, "Other project", "");
    }

    private ValidatableResponse create(String projectId) {
        return given().contentType(ContentType.JSON)
                .body("{\"name\":\"Anna\",\"gitlabProjectId\":\"" + projectId + "\",\"issueIid\":42}")
                .when()
                .post("/api/sessions")
                .then();
    }

    @Test
    void rejectsAProjectOutsideTheAllowlistWithoutAskingGitLab() {
        create("5678").statusCode(403).contentType(PROBLEM).body("errorCode", equalTo("PROJECT_NOT_ALLOWED"));

        gitlab.verify(0, anyRequestedFor(anyUrl()));
    }

    @Test
    void comparesTheProjectIdExactlyAfterTrimming() {
        create("12345").statusCode(403).body("errorCode", equalTo("PROJECT_NOT_ALLOWED"));
        create("group/App").statusCode(403).body("errorCode", equalTo("PROJECT_NOT_ALLOWED"));

        gitlab.verify(0, anyRequestedFor(anyUrl()));
    }

    @Test
    void createsASessionForAnAllowedProjectGivenWithSpaces() {
        create(" 1234 ").statusCode(201);
    }
}
