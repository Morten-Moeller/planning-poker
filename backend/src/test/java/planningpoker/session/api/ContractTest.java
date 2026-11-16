package planningpoker.session.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import java.io.IOException;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class ContractTest {

    private static final Path CONTRACT = Path.of("..", "contracts", "api", "openapi.yaml");
    private static final String PROBLEM = "application/problem+json";
    private static final String PROBLEM_REF = "#/components/schemas/ProblemDetail";

    private static JsonNode contract;

    @BeforeAll
    static void readContract() throws IOException {
        contract = new ObjectMapper(new YAMLFactory()).readTree(CONTRACT.toFile());
    }

    record Endpoint(
            String method,
            String path,
            String requestSchema,
            String successCode,
            String successSchema,
            List<String> errorCodes) {}

    static Stream<Arguments> endpoints() {
        return Stream.of(
                        new Endpoint("get", "/api/health", null, "200", "HealthStatus", List.of()),
                        new Endpoint(
                                "post",
                                "/api/sessions",
                                "CreateSessionRequest",
                                "201",
                                "CreateSessionResponse",
                                List.of("400", "404", "502")),
                        new Endpoint(
                                "post",
                                "/api/sessions/{id}/participants",
                                "JoinSessionRequest",
                                "201",
                                "JoinSessionResponse",
                                List.of("400", "404", "409")),
                        new Endpoint("get", "/api/sessions/{id}", null, "200", "SessionView", List.of("401", "404")),
                        new Endpoint(
                                "get",
                                "/api/sessions/{id}/issues",
                                null,
                                "200",
                                "IssueListResponse",
                                List.of("403", "502")),
                        new Endpoint(
                                "post",
                                "/api/sessions/{id}/active-issue",
                                "SelectIssueRequest",
                                "204",
                                null,
                                List.of("403", "404", "409", "502")),
                        new Endpoint(
                                "put",
                                "/api/sessions/{id}/vote",
                                "VoteRequest",
                                "204",
                                null,
                                List.of("400", "403", "409")),
                        new Endpoint(
                                "post", "/api/sessions/{id}/round/reveal", null, "204", null, List.of("403", "409")),
                        new Endpoint(
                                "post", "/api/sessions/{id}/round/restart", null, "204", null, List.of("403", "409")),
                        new Endpoint(
                                "post",
                                "/api/sessions/{id}/round/confirm",
                                "ConfirmRequest",
                                "204",
                                null,
                                List.of("400", "403", "409", "502")))
                .map(endpoint -> Arguments.of(endpoint.method() + " " + endpoint.path(), endpoint));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("endpoints")
    void describesEveryEndpointOfThePlan(String name, Endpoint endpoint) {
        JsonNode operation = contract.at("/paths/" + escape(endpoint.path()) + "/" + endpoint.method());
        assertFalse(operation.isMissingNode(), name + " is missing");
        assertTrue(operation.hasNonNull("operationId"), name + " has no operationId");

        if (endpoint.requestSchema() != null) {
            assertEquals(
                    ref(endpoint.requestSchema()),
                    operation
                            .at("/requestBody/content/application~1json/schema/$ref")
                            .asText(),
                    name + " request schema");
            assertTrue(operation.at("/requestBody/required").asBoolean(), name + " request body required");
        }

        JsonNode success = operation.at("/responses/" + endpoint.successCode());
        assertFalse(success.isMissingNode(), name + " has no " + endpoint.successCode());
        if (endpoint.successSchema() != null) {
            assertEquals(
                    ref(endpoint.successSchema()),
                    success.at("/content/application~1json/schema/$ref").asText(),
                    name + " success schema");
        }

        for (String code : endpoint.errorCodes()) {
            JsonNode error = operation.at("/responses/" + code);
            assertFalse(error.isMissingNode(), name + " has no " + code);
            assertEquals(
                    PROBLEM_REF,
                    error.at("/content/" + escape(PROBLEM) + "/schema/$ref").asText(),
                    name + " " + code + " is not a ProblemDetail");
        }
    }

    @Test
    void namesTheBearerTokenOnEveryCallExceptCreateAndJoin() {
        assertEquals(
                "http",
                contract.at("/components/securitySchemes/bearerToken/type").asText());
        assertEquals(
                "bearer",
                contract.at("/components/securitySchemes/bearerToken/scheme").asText());
        contract.get("paths")
                .properties()
                .forEach(path -> path.getValue().properties().forEach(operation -> {
                    String name = operation.getKey() + " " + path.getKey();
                    boolean open = Set.of("/api/health", "/api/sessions", "/api/sessions/{id}/participants")
                            .contains(path.getKey());
                    JsonNode security = operation.getValue().at("/security/0/bearerToken");
                    assertEquals(open, security.isMissingNode(), name + " security requirement");
                }));
    }

    @Test
    void listsEveryErrorCodeOfThePlan() {
        List<String> codes = new java.util.ArrayList<>();
        contract.at("/components/schemas/ErrorCode/enum").forEach(code -> codes.add(code.asText()));
        assertTrue(
                codes.containsAll(List.of(
                        "VALIDATION_ERROR",
                        "INVALID_CARD",
                        "UNAUTHORIZED",
                        "FORBIDDEN_ROLE",
                        "SESSION_NOT_FOUND",
                        "ISSUE_NOT_FOUND",
                        "NAME_TAKEN",
                        "INVALID_STATE",
                        "GITLAB_ERROR")),
                "error codes: " + codes);
        assertEquals(
                List.of("type", "title", "status", "detail", "errorCode"),
                texts(contract.at("/components/schemas/ProblemDetail/required")));
    }

    static Stream<Arguments> messages() {
        return Stream.of(
                Arguments.of("auth", "WebSocketAuth"),
                Arguments.of("session.state", "WebSocketSessionState"),
                Arguments.of("round.allVoted", "WebSocketRoundAllVoted"),
                Arguments.of("error", "WebSocketError"),
                Arguments.of("ping", "WebSocketPing"),
                Arguments.of("pong", "WebSocketPong"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("messages")
    void describesEveryWebSocketMessage(String type, String schemaName) {
        JsonNode schema = contract.at("/components/schemas/" + schemaName);
        assertFalse(schema.isMissingNode(), schemaName + " is missing");
        assertEquals(List.of(type), texts(schema.at("/properties/type/enum")), schemaName + " type");
        assertTrue(texts(schema.get("required")).contains("type"), schemaName + " requires type");
    }

    @Test
    void sessionStateCarriesTheSessionView() {
        assertEquals(
                ref("SessionView"),
                contract.at("/components/schemas/WebSocketSessionState/properties/payload/$ref")
                        .asText());
        assertEquals(
                ref("ErrorCode"),
                contract.at("/components/schemas/WebSocketError/properties/payload/properties/errorCode/$ref")
                        .asText());
    }

    private static String ref(String schema) {
        return "#/components/schemas/" + schema;
    }

    private static String escape(String pointerSegment) {
        return pointerSegment.replace("~", "~0").replace("/", "~1");
    }

    private static List<String> texts(JsonNode array) {
        List<String> values = new java.util.ArrayList<>();
        array.forEach(node -> values.add(node.asText()));
        return values;
    }
}
