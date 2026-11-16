package planningpoker.session;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.equalTo;

import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import io.restassured.specification.RequestSpecification;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

@QuarkusTest
class SessionResourceTest {

    private static final String PROBLEM = "application/problem+json";
    private static final String SESSION = "/api/sessions/K7P2QX9M";
    private static final String VALID_CREATE = "{\"name\":\"Anna\",\"gitlabProjectId\":\"1234\",\"issueIid\":42}";

    static Stream<Arguments> endpoints() {
        return Stream.of(
                Arguments.of("POST", "/api/sessions", VALID_CREATE),
                Arguments.of("POST", SESSION + "/participants", "{\"name\":\"Ben\"}"),
                Arguments.of("GET", SESSION, null),
                Arguments.of("GET", SESSION + "/issues?search=login&page=1", null),
                Arguments.of("POST", SESSION + "/active-issue", "{\"issueIid\":42}"),
                Arguments.of("PUT", SESSION + "/vote", "{\"card\":\"5\"}"),
                Arguments.of("POST", SESSION + "/round/reveal", null),
                Arguments.of("POST", SESSION + "/round/restart", null),
                Arguments.of("POST", SESSION + "/round/confirm", "{\"card\":\"COFFEE\"}"));
    }

    @ParameterizedTest(name = "{0} {1}")
    @MethodSource("endpoints")
    void answersNotImplementedAsProblemDetail(String method, String path, String body) {
        RequestSpecification request = given().header("Authorization", "Bearer test-token");
        if (body != null) {
            request = request.contentType(ContentType.JSON).body(body);
        }
        request.when()
                .request(method, path)
                .then()
                .statusCode(501)
                .contentType(PROBLEM)
                .body("type", equalTo("about:blank"))
                .body("title", equalTo("Not Implemented"))
                .body("status", equalTo(501))
                .body("errorCode", equalTo("NOT_IMPLEMENTED"));
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

    @ParameterizedTest(name = "{0}")
    @MethodSource("unreadableBodies")
    void rejectsAMissingOrUnreadableBodyWithValidationError(String name, String body) {
        RequestSpecification request = given().contentType(ContentType.JSON);
        if (body != null) {
            request = request.body(body);
        }
        request.when()
                .post("/api/sessions")
                .then()
                .statusCode(400)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("VALIDATION_ERROR"));
    }

    static Stream<Arguments> unreadableBodies() {
        return Stream.of(Arguments.of("no body", null), Arguments.of("malformed JSON", "{\"name\":"));
    }

    @Test
    void rejectsAPageBelowOneWithValidationError() {
        given().header("Authorization", "Bearer test-token")
                .when()
                .get(SESSION + "/issues?page=0")
                .then()
                .statusCode(400)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("VALIDATION_ERROR"))
                .body("detail", containsString("page"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidCards")
    void rejectsAnUnknownCardWithInvalidCard(String path, String body) {
        given().header("Authorization", "Bearer test-token")
                .contentType(ContentType.JSON)
                .body(body)
                .when()
                .request(path.startsWith("/vote") ? "PUT" : "POST", SESSION + path)
                .then()
                .statusCode(400)
                .contentType(PROBLEM)
                .body("status", equalTo(400))
                .body("errorCode", equalTo("INVALID_CARD"));
    }

    static Stream<Arguments> invalidCards() {
        return Stream.of(
                Arguments.of("/vote", "{\"card\":\"4\"}"),
                Arguments.of("/vote", "{\"card\":\"☕\"}"),
                Arguments.of("/round/confirm", "{\"card\":\"coffee\"}"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("missingCards")
    void rejectsAMissingCardWithValidationError(String path, String body) {
        given().header("Authorization", "Bearer test-token")
                .contentType(ContentType.JSON)
                .body(body)
                .when()
                .request(path.startsWith("/vote") ? "PUT" : "POST", SESSION + path)
                .then()
                .statusCode(400)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("VALIDATION_ERROR"))
                .body("detail", containsString("card"));
    }

    static Stream<Arguments> missingCards() {
        return Stream.of(Arguments.of("/vote", "{}"), Arguments.of("/round/confirm", "{\"card\":null}"));
    }
}
