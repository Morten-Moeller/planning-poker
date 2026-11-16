package planningpoker.session;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.github.tomakehurst.wiremock.WireMockServer;
import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import jakarta.ws.rs.HttpMethod;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import planningpoker.gitlab.WireMockGitLab;
import planningpoker.platform.Authenticated;

@QuarkusTest
@WithTestResource(WireMockGitLab.class)
class SessionResourceTest {

    private static final String PROBLEM = "application/problem+json";
    private static final String VALID_CREATE = "{\"name\":\"Anna\",\"gitlabProjectId\":\"1234\",\"issueIid\":42}";

    private String session;
    private String scrumMasterToken;
    private String developerToken;

    WireMockServer gitlab;

    @BeforeEach
    void createSessionWithOneDeveloper() {
        gitlab.resetAll();
        GitLabStubs.defaultIssue(gitlab);
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        SessionApiTest.Created created = SessionApiTest.createSession("Anna " + suffix);
        session = "/api/sessions/" + created.sessionId();
        scrumMasterToken = created.token();
        developerToken =
                SessionApiTest.join(created.sessionId(), "Ben " + suffix).token();
    }

    private RequestSpecification as(Role role) {
        String token = role == Role.SCRUM_MASTER ? scrumMasterToken : developerToken;
        return given().header("Authorization", "Bearer " + token);
    }

    static Stream<Arguments> securedEndpoints() {
        return Stream.of(
                Arguments.of("GET", "/issues?search=login&page=1", null, Role.SCRUM_MASTER),
                Arguments.of("POST", "/active-issue", "{\"issueIid\":42}", Role.SCRUM_MASTER),
                Arguments.of("PUT", "/vote", "{\"card\":\"5\"}", Role.DEVELOPER),
                Arguments.of("POST", "/round/reveal", null, Role.SCRUM_MASTER),
                Arguments.of("POST", "/round/restart", null, Role.SCRUM_MASTER),
                Arguments.of("POST", "/round/confirm", "{\"card\":\"COFFEE\"}", Role.SCRUM_MASTER));
    }

    @ParameterizedTest(name = "{0} {1}")
    @MethodSource("securedEndpoints")
    void rejectsTheOtherRoleWithForbiddenRole(String method, String path, String body, Role role) {
        Role other = role == Role.SCRUM_MASTER ? Role.DEVELOPER : Role.SCRUM_MASTER;
        RequestSpecification request = as(other);
        if (body != null) {
            request = request.contentType(ContentType.JSON).body(body);
        }
        request.when()
                .request(method, session + path)
                .then()
                .statusCode(403)
                .contentType(PROBLEM)
                .body("status", equalTo(403))
                .body("errorCode", equalTo("FORBIDDEN_ROLE"));
    }

    @ParameterizedTest(name = "{0} {1}")
    @MethodSource("securedEndpoints")
    void rejectsEveryCommandWithoutAToken(String method, String path, String body, Role role) {
        RequestSpecification request = given();
        if (body != null) {
            request = request.contentType(ContentType.JSON).body(body);
        }
        request.when()
                .request(method, session + path)
                .then()
                .statusCode(401)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("UNAUTHORIZED"));
    }

    static Stream<Arguments> invalidCreateBodies() {
        return Stream.of(
                Arguments.of("empty name", "{\"name\":\"\",\"gitlabProjectId\":\"1234\",\"issueIid\":42}", "name"),
                Arguments.of("blank name", "{\"name\":\"   \",\"gitlabProjectId\":\"1234\",\"issueIid\":42}", "name"),
                Arguments.of(
                        "name over 30 characters",
                        "{\"name\":\"" + "x".repeat(31) + "\",\"gitlabProjectId\":\"1234\",\"issueIid\":42}",
                        "name"),
                Arguments.of("missing project id", "{\"name\":\"Anna\",\"issueIid\":42}", "gitlabProjectId"),
                Arguments.of("missing issue", "{\"name\":\"Anna\",\"gitlabProjectId\":\"1234\"}", "issueIid"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidCreateBodies")
    void rejectsAnInvalidCreateBodyWithValidationError(String name, String body, String field) {
        given().contentType(ContentType.JSON)
                .body(body)
                .when()
                .post("/api/sessions")
                .then()
                .statusCode(400)
                .contentType(PROBLEM)
                .body("status", equalTo(400))
                .body("errorCode", equalTo("VALIDATION_ERROR"))
                .body("detail", containsString(field));
    }

    @Test
    void acceptsAValidCreateBody() {
        given().contentType(ContentType.JSON)
                .body(VALID_CREATE)
                .when()
                .post("/api/sessions")
                .then()
                .statusCode(201);
    }

    static Stream<Arguments> unreadableBodies() {
        return Stream.of(
                        Arguments.of("POST", "", null),
                        Arguments.of("POST", "/participants", null),
                        Arguments.of("POST", "/active-issue", Role.SCRUM_MASTER),
                        Arguments.of("PUT", "/vote", Role.DEVELOPER),
                        Arguments.of("POST", "/round/confirm", Role.SCRUM_MASTER))
                .flatMap(endpoint -> Stream.of(
                        Arguments.of(endpoint.get()[0], endpoint.get()[1], endpoint.get()[2], "no body", null),
                        Arguments.of(
                                endpoint.get()[0],
                                endpoint.get()[1],
                                endpoint.get()[2],
                                "malformed JSON",
                                "{\"name\":")));
    }

    @ParameterizedTest(name = "{0} {1} {3}")
    @MethodSource("unreadableBodies")
    void rejectsAMissingOrUnreadableBodyWithValidationError(
            String method, String path, Role role, String name, String body) {
        RequestSpecification request = (role == null ? given() : as(role)).contentType(ContentType.JSON);
        if (body != null) {
            request = request.body(body);
        }
        String target = path.isEmpty() ? "/api/sessions" : session + path;
        request.when()
                .request(method, target)
                .then()
                .statusCode(400)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("VALIDATION_ERROR"));
    }

    @Test
    void authenticatesEveryEndpointExceptCreateAndJoin() {
        Set<String> open = Set.of("createSession", "joinSession");
        for (Method method : SessionResource.class.getDeclaredMethods()) {
            boolean endpoint = Arrays.stream(method.getAnnotations())
                    .anyMatch(annotation -> annotation.annotationType().isAnnotationPresent(HttpMethod.class));
            if (!endpoint) {
                continue;
            }
            assertEquals(
                    !open.contains(method.getName()),
                    method.isAnnotationPresent(Authenticated.class),
                    method.getName() + " authentication");
            assertTrue(
                    open.contains(method.getName())
                            || method.getName().equals("getSession")
                            || method.isAnnotationPresent(RequiresRole.class),
                    method.getName() + " needs a role");
        }
    }

    @Test
    void rejectsAPageBelowOneWithValidationError() {
        as(Role.SCRUM_MASTER)
                .when()
                .get(session + "/issues?page=0")
                .then()
                .statusCode(400)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("VALIDATION_ERROR"))
                .body("detail", containsString("page"));
    }

    @ParameterizedTest(name = "{0} {1}")
    @MethodSource("invalidCards")
    void rejectsAnUnknownCardWithInvalidCard(String path, String body, Role role) {
        as(role).contentType(ContentType.JSON)
                .body(body)
                .when()
                .request(path.startsWith("/vote") ? "PUT" : "POST", session + path)
                .then()
                .statusCode(400)
                .contentType(PROBLEM)
                .body("status", equalTo(400))
                .body("errorCode", equalTo("INVALID_CARD"))
                .body("detail", equalTo("Unknown card."));
    }

    static Stream<Arguments> invalidCards() {
        return Stream.of(
                Arguments.of("/vote", "{\"card\":\"4\"}", Role.DEVELOPER),
                Arguments.of("/vote", "{\"card\":\"☕\"}", Role.DEVELOPER),
                Arguments.of("/round/confirm", "{\"card\":\"coffee\"}", Role.SCRUM_MASTER));
    }

    @ParameterizedTest(name = "{0} {1}")
    @MethodSource("missingCards")
    void rejectsAMissingCardWithValidationError(String path, String body, Role role) {
        as(role).contentType(ContentType.JSON)
                .body(body)
                .when()
                .request(path.startsWith("/vote") ? "PUT" : "POST", session + path)
                .then()
                .statusCode(400)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("VALIDATION_ERROR"))
                .body("detail", containsString("card"));
    }

    static Stream<Arguments> missingCards() {
        return Stream.of(
                Arguments.of("/vote", "{}", Role.DEVELOPER),
                Arguments.of("/round/confirm", "{\"card\":null}", Role.SCRUM_MASTER));
    }
}
