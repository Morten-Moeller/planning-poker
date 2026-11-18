package planningpoker.platform;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
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
import org.junit.jupiter.api.Test;
import planningpoker.gitlab.WireMockGitLab;

@QuarkusTest
@WithTestResource(WireMockGitLab.class)
class LoggingTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    WireMockServer gitlab;

    @Test
    void writesJsonLinesWithoutTheGitlabToken() throws IOException {
        given().when().get("/api/health").then().statusCode(200);
        String logPath = ConfigProvider.getConfig().getValue("quarkus.log.file.path", String.class);
        String token = ConfigProvider.getConfig().getValue("planningpoker.gitlab.token", String.class);

        long ownProcessId = ProcessHandle.current().pid();
        List<String> lines = Files.readAllLines(Path.of(logPath)).stream()
                .filter(line -> !line.isBlank())
                .toList();

        int ownLines = 0;
        for (String line : lines) {
            assertDoesNotThrow(() -> JSON.readTree(line), "not a JSON line: " + line);
            JsonNode entry = JSON.readTree(line);
            if (entry.path("processId").asLong() != ownProcessId) {
                continue;
            }
            ownLines++;
            assertTrue(entry.has("message"), "no message field: " + line);
            assertFalse(line.contains(token), "token value in log line: " + line);
        }
        assertTrue(ownLines > 0, "no log lines of this process in " + logPath);
    }

    @Test
    void writesNoInviteCodeOnJoin() throws IOException {
        gitlab.resetAll();
        gitlab.stubFor(get(urlPathEqualTo("/api/v4/projects/1234/issues/42"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"iid\":42,\"title\":\"Login page\",\"description\":\"Log in.\","
                                + "\"web_url\":\"https://gitlab.example/g/p/-/issues/42\",\"labels\":[]}")));
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        Response created = given().contentType(ContentType.JSON)
                .body("{\"name\":\"Anna " + suffix + "\",\"gitlabProjectId\":\"1234\",\"issueIid\":42}")
                .when()
                .post("/api/sessions");
        created.then().statusCode(201);
        String sessionId = created.jsonPath().getString("sessionId");
        Response snapshot = given().header(
                        "Authorization", "Bearer " + created.jsonPath().getString("token"))
                .when()
                .get("/api/sessions/" + sessionId);
        snapshot.then().statusCode(200);
        String developerInvite = snapshot.jsonPath().getString("invites.developer");
        String viewerInvite = snapshot.jsonPath().getString("invites.viewer");
        String wrongInvite = "wrong-" + suffix + "-invite";

        join(sessionId, "Ben " + suffix, developerInvite).then().statusCode(201);
        join(sessionId, "Paula " + suffix, viewerInvite).then().statusCode(201);
        join(sessionId, "Cem " + suffix, wrongInvite).then().statusCode(403);
        join(sessionId, "x".repeat(31), developerInvite).then().statusCode(400);

        for (String line : ownLines()) {
            assertFalse(line.contains(developerInvite), "code for developers in log line: " + line);
            assertFalse(line.contains(viewerInvite), "code for viewers in log line: " + line);
            assertFalse(line.contains(wrongInvite), "wrong code in log line: " + line);
        }
    }

    private static Response join(String sessionId, String name, String invite) {
        return given().contentType(ContentType.JSON)
                .body("{\"name\":\"" + name + "\",\"invite\":\"" + invite + "\"}")
                .when()
                .post("/api/sessions/" + sessionId + "/participants");
    }

    private static List<String> ownLines() throws IOException {
        String logPath = ConfigProvider.getConfig().getValue("quarkus.log.file.path", String.class);
        long ownProcessId = ProcessHandle.current().pid();
        List<String> own = new java.util.ArrayList<>();
        for (String line : Files.readAllLines(Path.of(logPath))) {
            if (line.isBlank()) {
                continue;
            }
            if (JSON.readTree(line).path("processId").asLong() == ownProcessId) {
                own.add(line);
            }
        }
        return own;
    }
}
