package planningpoker.gitlab;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.tomakehurst.wiremock.WireMockServer;
import io.quarkus.test.common.TestResourceScope;
import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;
import io.smallrye.config.PropertiesConfigSource;
import io.smallrye.config.SmallRyeConfigBuilder;
import jakarta.inject.Inject;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.eclipse.microprofile.config.ConfigProvider;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

@QuarkusTest
@WithTestResource(value = WireMockGitLab.class, scope = TestResourceScope.RESTRICTED_TO_CLASS)
@TestProfile(DemoModeTest.WithoutToken.class)
class DemoModeTest {

    public static class WithoutToken implements QuarkusTestProfile {

        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of(
                    "planningpoker.gitlab.token", " ",
                    "planningpoker.gitlab.write-weight", "true",
                    "quarkus.log.file.path", "target/quarkus-demo-test.log");
        }
    }

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String PROBLEM = "application/problem+json";
    private static final String WEBSHOP = "101";
    private static final String MOBILE_APP = "102";
    private static final int ISSUE_WITHOUT_WEIGHT = 2;

    @Inject
    GitLabConfig config;

    WireMockServer gitlab;

    private static String uniqueName(String base) {
        return base + " " + UUID.randomUUID().toString().substring(0, 8);
    }

    private static Response create(String body) {
        return given().contentType(ContentType.JSON).body(body).when().post("/api/sessions");
    }

    private static RequestSpecification as(String token) {
        return given().header("Authorization", "Bearer " + token);
    }

    @Test
    void writesOneWarningAboutTheDemoModeAtTheStart() throws IOException {
        given().when().get("/api/health").then().statusCode(200);
        String logPath = ConfigProvider.getConfig().getValue("quarkus.log.file.path", String.class);
        long ownProcessId = ProcessHandle.current().pid();

        List<JsonNode> warnings = new ArrayList<>();
        for (String line : Files.readAllLines(Path.of(logPath))) {
            if (line.isBlank()) {
                continue;
            }
            JsonNode entry = JSON.readTree(line);
            if (entry.path("processId").asLong() == ownProcessId
                    && entry.path("message").asText().contains("Demo mode")) {
                warnings.add(entry);
            }
        }

        assertEquals(1, warnings.size(), "lines about the demo mode in " + logPath);
        assertEquals("WARN", warnings.get(0).path("level").asText());
        assertTrue(config.demo());
    }

    @ParameterizedTest(name = "token \"{0}\": demo {1}")
    @CsvSource(
            value = {"NULL, true", "'', true", "'   ', true", "glpat-example, false"},
            nullValues = "NULL")
    void runsInDemoModeWithoutATokenAndWithSpacesOnly(String token, boolean demo) {
        Map<String, String> values = new HashMap<>(Map.of("planningpoker.gitlab.timeout", "PT10S"));
        if (token != null) {
            values.put("planningpoker.gitlab.token", token);
        }

        GitLabConfig mapped = new SmallRyeConfigBuilder()
                .withMapping(GitLabConfig.class)
                .withSources(new PropertiesConfigSource(values, "demo-mode-test", 100))
                .build()
                .getConfigMapping(GitLabConfig.class);

        assertEquals(demo, mapped.demo());
    }

    @Test
    void reportsTheDemoModeInTheSettings() {
        given().when()
                .get("/api/config")
                .then()
                .statusCode(200)
                .body("demo", equalTo(true))
                .body("rememberSessions", equalTo(true));
    }

    @Test
    void listsTheTwoDemoProjects() {
        given().when()
                .get("/api/projects")
                .then()
                .statusCode(200)
                .body("items.name", contains("Webshop", "Mobile App"))
                .body("items.id", contains(101, 102))
                .body("nextPage", nullValue());
    }

    @Test
    void searchesTheDemoProjectsByNameWithoutCase() {
        given().queryParam("search", "WEB")
                .when()
                .get("/api/projects")
                .then()
                .statusCode(200)
                .body("items.name", contains("Webshop"));
    }

    @Test
    void answersAnUnknownProjectWithProjectNotFound() {
        create("{\"name\":\"" + uniqueName("Anna") + "\",\"gitlabProjectId\":\"999\"}")
                .then()
                .statusCode(404)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("PROJECT_NOT_FOUND"));
    }

    @Test
    void answersAnUnknownIssueWithIssueNotFound() {
        create("{\"name\":\"" + uniqueName("Anna") + "\",\"gitlabProjectId\":\"" + WEBSHOP + "\",\"issueIid\":999}")
                .then()
                .statusCode(404)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("ISSUE_NOT_FOUND"));
    }

    @Test
    void listsTheIssuesOfADemoProjectInPagesWithTheTotal() {
        given().when()
                .get("/api/projects/" + WEBSHOP + "/issues")
                .then()
                .statusCode(200)
                .body("items.size()", equalTo(20))
                .body("nextPage", equalTo(2))
                .body("total", equalTo(22));
    }

    @Test
    void confirmsARoundAndWritesTheWeightWithoutACallToGitLab() {
        gitlab.resetAll();
        Response created =
                create("{\"name\":\"" + uniqueName("Anna") + "\",\"gitlabProjectId\":\"" + MOBILE_APP + "\"}");
        created.then().statusCode(201);
        String session = "/api/sessions/" + created.jsonPath().getString("sessionId");
        String scrumMaster = created.jsonPath().getString("token");
        Response snapshot = as(scrumMaster).when().get(session);
        snapshot.then().statusCode(200).body("project.name", equalTo("Mobile App"));
        Response joined = given().contentType(ContentType.JSON)
                .body("{\"name\":\"" + uniqueName("Ben") + "\",\"invite\":\""
                        + snapshot.jsonPath().getString("invites.developer") + "\"}")
                .when()
                .post(session + "/participants");
        joined.then().statusCode(201);
        String developer = joined.jsonPath().getString("token");
        as(scrumMaster)
                .queryParam("weight", "NONE")
                .when()
                .get(session + "/issues")
                .then()
                .statusCode(200)
                .body("items.iid", hasItem(ISSUE_WITHOUT_WEIGHT));

        as(scrumMaster)
                .contentType(ContentType.JSON)
                .body("{\"issueIid\":" + ISSUE_WITHOUT_WEIGHT + "}")
                .when()
                .post(session + "/active-issue")
                .then()
                .statusCode(204);
        as(scrumMaster).when().post(session + "/round/start").then().statusCode(204);
        as(developer)
                .contentType(ContentType.JSON)
                .body("{\"card\":\"5\"}")
                .when()
                .put(session + "/vote")
                .then()
                .statusCode(204);
        as(scrumMaster).when().post(session + "/round/reveal").then().statusCode(204);
        as(scrumMaster)
                .contentType(ContentType.JSON)
                .body("{\"card\":\"5\"}")
                .when()
                .post(session + "/round/confirm")
                .then()
                .statusCode(204);

        as(scrumMaster)
                .when()
                .get(session)
                .then()
                .statusCode(200)
                .body("phase", equalTo("LOBBY"))
                .body("history[0].finalCard", equalTo("5"));
        as(scrumMaster)
                .queryParam("weight", "NONE")
                .when()
                .get(session + "/issues")
                .then()
                .statusCode(200)
                .body("items.iid", not(hasItem(ISSUE_WITHOUT_WEIGHT)));
        as(scrumMaster)
                .queryParam("weight", "ANY")
                .when()
                .get(session + "/issues")
                .then()
                .statusCode(200)
                .body("items[0].iid", equalTo(ISSUE_WITHOUT_WEIGHT))
                .body("items[0].weight", equalTo(5));
        assertEquals(List.of(), gitlab.getAllServeEvents());
    }
}
