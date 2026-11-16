package planningpoker.session;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.matchesPattern;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.tomakehurst.wiremock.WireMockServer;
import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.eclipse.microprofile.config.ConfigProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import planningpoker.gitlab.WireMockGitLab;

@QuarkusTest
@WithTestResource(WireMockGitLab.class)
class SessionApiTest {

    private static final String PROBLEM = "application/problem+json";
    private static final ObjectMapper JSON = new ObjectMapper();

    WireMockServer gitlab;

    @BeforeEach
    void stubTheIssue() {
        gitlab.resetAll();
        GitLabStubs.defaultIssue(gitlab);
    }

    record Created(String sessionId, String participantId, String token) {}

    record Joined(String participantId, String token) {}

    private static String uniqueName(String base) {
        return base + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    static Created createSession(String name) {
        Response response = given().contentType(ContentType.JSON)
                .body("{\"name\":\"" + name + "\",\"gitlabProjectId\":\"1234\",\"issueIid\":42}")
                .when()
                .post("/api/sessions");
        response.then().statusCode(201);
        return new Created(
                response.jsonPath().getString("sessionId"),
                response.jsonPath().getString("participantId"),
                response.jsonPath().getString("token"));
    }

    static Joined join(String sessionId, String name) {
        Response response = given().contentType(ContentType.JSON)
                .body("{\"name\":\"" + name + "\"}")
                .when()
                .post("/api/sessions/" + sessionId + "/participants");
        response.then().statusCode(201);
        return new Joined(
                response.jsonPath().getString("participantId"),
                response.jsonPath().getString("token"));
    }

    @Test
    void createsASessionWhoseCreatorIsTheScrumMaster() {
        Created created = createSession(uniqueName("Anna"));

        given().header("Authorization", "Bearer " + created.token())
                .when()
                .get("/api/sessions/" + created.sessionId())
                .then()
                .statusCode(200)
                .body("sessionId", matchesPattern("[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}"))
                .body("me.participantId", equalTo(created.participantId()))
                .body("me.role", equalTo("SCRUM_MASTER"))
                .body("phase", equalTo("LOBBY"))
                .body("preselectedIssueIid", equalTo(42))
                .body("activeIssue", nullValue())
                .body("round", nullValue())
                .body("history", equalTo(List.of()))
                .body("participants[0].role", equalTo("SCRUM_MASTER"));
        assertTrue(created.participantId().matches("[0-9a-f-]{36}"));
    }

    @Test
    void joinsAsDeveloperWithoutThePreselectedIssue() {
        Created created = createSession(uniqueName("Anna"));
        Joined joined = join(created.sessionId(), uniqueName("Ben"));

        given().header("Authorization", "Bearer " + joined.token())
                .when()
                .get("/api/sessions/" + created.sessionId())
                .then()
                .statusCode(200)
                .body("me.participantId", equalTo(joined.participantId()))
                .body("me.role", equalTo("DEVELOPER"))
                .body("preselectedIssueIid", nullValue())
                .body("participants[1].role", equalTo("DEVELOPER"));
    }

    @Test
    void rejectsATakenNameIgnoringCase() {
        String name = uniqueName("Ben");
        Created created = createSession(uniqueName("Anna"));
        join(created.sessionId(), name);

        given().contentType(ContentType.JSON)
                .body("{\"name\":\"" + name.toUpperCase() + "\"}")
                .when()
                .post("/api/sessions/" + created.sessionId() + "/participants")
                .then()
                .statusCode(409)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("NAME_TAKEN"));
    }

    @Test
    void rejectsJoiningAnUnknownSession() {
        given().contentType(ContentType.JSON)
                .body("{\"name\":\"Ben\"}")
                .when()
                .post("/api/sessions/ZZZZZZZZ/participants")
                .then()
                .statusCode(404)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("SESSION_NOT_FOUND"));
    }

    @Test
    void rejectsANameOverThirtyCharactersOnJoin() {
        Created created = createSession(uniqueName("Anna"));

        given().contentType(ContentType.JSON)
                .body("{\"name\":\"" + "x".repeat(31) + "\"}")
                .when()
                .post("/api/sessions/" + created.sessionId() + "/participants")
                .then()
                .statusCode(400)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("VALIDATION_ERROR"));
    }

    @Test
    void rejectsReadingWithoutAToken() {
        Created created = createSession(uniqueName("Anna"));

        given().when()
                .get("/api/sessions/" + created.sessionId())
                .then()
                .statusCode(401)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("UNAUTHORIZED"));
    }

    @Test
    void rejectsAnUnknownToken() {
        Created created = createSession(uniqueName("Anna"));

        given().header("Authorization", "Bearer not-a-token")
                .when()
                .get("/api/sessions/" + created.sessionId())
                .then()
                .statusCode(401)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("UNAUTHORIZED"));
    }

    @Test
    void rejectsTheTokenOfAnotherSession() {
        Created first = createSession(uniqueName("Anna"));
        Created second = createSession(uniqueName("Cem"));

        given().header("Authorization", "Bearer " + second.token())
                .when()
                .get("/api/sessions/" + first.sessionId())
                .then()
                .statusCode(401)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("UNAUTHORIZED"));
    }

    @Test
    void answersNotFoundForAnUnknownSessionWithAnyToken() {
        Created created = createSession(uniqueName("Anna"));

        given().header("Authorization", "Bearer " + created.token())
                .when()
                .get("/api/sessions/ZZZZZZZZ")
                .then()
                .statusCode(404)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("SESSION_NOT_FOUND"));
    }

    @Test
    void keepsTokensOutOfSnapshotsAndLogs() throws IOException {
        Created created = createSession(uniqueName("Anna"));
        Joined joined = join(created.sessionId(), uniqueName("Ben"));

        String snapshot = given().header("Authorization", "Bearer " + joined.token())
                .when()
                .get("/api/sessions/" + created.sessionId())
                .then()
                .statusCode(200)
                .extract()
                .asString();

        assertFalse(snapshot.contains(created.token()), "scrum master token in snapshot");
        assertFalse(snapshot.contains(joined.token()), "developer token in snapshot");

        String logPath = ConfigProvider.getConfig().getValue("quarkus.log.file.path", String.class);
        long ownProcessId = ProcessHandle.current().pid();
        for (String line : Files.readAllLines(Path.of(logPath))) {
            if (line.isBlank()) {
                continue;
            }
            JsonNode entry = JSON.readTree(line);
            if (entry.path("processId").asLong() != ownProcessId) {
                continue;
            }
            assertFalse(line.contains(created.token()), "scrum master token in log line: " + line);
            assertFalse(line.contains(joined.token()), "developer token in log line: " + line);
        }
    }
}
