package planningpoker.session.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
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
                                List.of("400", "403", "404", "409", "502")),
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
                                List.of("401", "403", "404", "502")),
                        new Endpoint("get", "/api/projects", null, "200", "ProjectListResponse", List.of("400", "502")),
                        new Endpoint(
                                "get",
                                "/api/projects/{projectId}/issues",
                                null,
                                "200",
                                "IssueListResponse",
                                List.of("400", "403", "502")),
                        new Endpoint(
                                "post",
                                "/api/sessions/{id}/active-issue",
                                "SelectIssueRequest",
                                "204",
                                null,
                                List.of("400", "401", "403", "404", "409", "502")),
                        new Endpoint(
                                "put",
                                "/api/sessions/{id}/timer",
                                "TimerRequest",
                                "204",
                                null,
                                List.of("400", "401", "403", "404")),
                        new Endpoint(
                                "put",
                                "/api/sessions/{id}/vote",
                                "VoteRequest",
                                "204",
                                null,
                                List.of("400", "401", "403", "404", "409")),
                        new Endpoint(
                                "post",
                                "/api/sessions/{id}/round/reveal",
                                null,
                                "204",
                                null,
                                List.of("401", "403", "404", "409")),
                        new Endpoint(
                                "post",
                                "/api/sessions/{id}/round/restart",
                                null,
                                "204",
                                null,
                                List.of("401", "403", "404", "409")),
                        new Endpoint(
                                "post",
                                "/api/sessions/{id}/round/confirm",
                                "ConfirmRequest",
                                "204",
                                null,
                                List.of("400", "401", "403", "404", "409", "502")))
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
                    boolean open = Set.of(
                                    "/api/health",
                                    "/api/sessions",
                                    "/api/sessions/{id}/participants",
                                    "/api/projects",
                                    "/api/projects/{projectId}/issues")
                            .contains(path.getKey());
                    JsonNode security = operation.getValue().at("/security/0/bearerToken");
                    assertEquals(open, security.isMissingNode(), name + " security requirement");
                }));
    }

    @Test
    void listsEveryErrorCodeOfThePlan() {
        List<String> codes = new java.util.ArrayList<>();
        contract.at("/components/schemas/ErrorCode/enum").forEach(code -> codes.add(code.asText()));
        assertEquals(
                List.of(
                        "VALIDATION_ERROR",
                        "INVALID_CARD",
                        "UNAUTHORIZED",
                        "FORBIDDEN_ROLE",
                        "PROJECT_NOT_ALLOWED",
                        "SESSION_NOT_FOUND",
                        "ISSUE_NOT_FOUND",
                        "NAME_TAKEN",
                        "INVALID_STATE",
                        "LIMIT_REACHED",
                        "GITLAB_ACCESS_DENIED",
                        "GITLAB_ERROR"),
                codes);
        assertEquals(
                List.of("type", "title", "status", "detail", "errorCode"),
                texts(contract.at("/components/schemas/ProblemDetail/required")));
    }

    @Test
    void namesTheErrorCodesOfCreateAndJoinAndTheMajorVersion() {
        assertEquals("2.4.0", contract.at("/info/version").asText());
        assertEquals(
                "PROJECT_NOT_ALLOWED",
                contract.at("/paths/~1api~1sessions/post/responses/403/description")
                        .asText());
        assertEquals(
                "LIMIT_REACHED",
                contract.at("/paths/~1api~1sessions/post/responses/409/description")
                        .asText());
        assertEquals(
                "NAME_TAKEN, LIMIT_REACHED",
                contract.at("/paths/~1api~1sessions~1{id}~1participants/post/responses/409/description")
                        .asText());
    }

    @ParameterizedTest(name = "{0} {1}")
    @MethodSource("gitLabEndpoints")
    void namesBothGitLabCodesOnEveryGitLabCall(String method, String path) {
        assertEquals(
                "GITLAB_ACCESS_DENIED, GITLAB_ERROR",
                contract.at("/paths/" + escape(path) + "/" + method + "/responses/502/description")
                        .asText());
    }

    static Stream<Arguments> gitLabEndpoints() {
        return Stream.of(
                Arguments.of("post", "/api/sessions"),
                Arguments.of("get", "/api/sessions/{id}/issues"),
                Arguments.of("post", "/api/sessions/{id}/active-issue"),
                Arguments.of("post", "/api/sessions/{id}/round/confirm"),
                Arguments.of("get", "/api/projects"),
                Arguments.of("get", "/api/projects/{projectId}/issues"));
    }

    @Test
    void describesTheIssueFiltersAndTheWeight() {
        JsonNode parameters = contract.at("/paths/~1api~1sessions~1{id}~1issues/get/parameters");
        assertFilter(parameters, "weight", "WeightFilter", List.of("NONE", "ANY", "ALL"));
        assertFilter(parameters, "period", "UpdatedPeriod", List.of("WEEK", "MONTH", "YEAR", "ALL"));
        assertEquals(
                "VALIDATION_ERROR",
                contract.at("/paths/~1api~1sessions~1{id}~1issues/get/responses/400/description")
                        .asText());
        JsonNode summary = contract.at("/components/schemas/IssueSummary");
        assertTrue(texts(summary.get("required")).contains("weight"));
        assertEquals(List.of("integer", "null"), texts(summary.at("/properties/weight/type")));
    }

    private void assertFilter(JsonNode parameters, String name, String schema, List<String> values) {
        JsonNode parameter = null;
        for (JsonNode candidate : parameters) {
            if (name.equals(candidate.get("name").asText())) {
                parameter = candidate;
            }
        }
        assertNotNull(parameter, "parameter " + name + " is missing");
        assertEquals("query", parameter.get("in").asText());
        assertEquals(ref(schema), parameter.at("/schema/allOf/0/$ref").asText());
        assertEquals("ALL", parameter.at("/schema/allOf/1/default").asText());
        assertEquals(values, texts(contract.at("/components/schemas/" + schema + "/enum")));
    }

    @Test
    void describesTheProjectList() {
        assertEquals(
                "PROJECT_NOT_ALLOWED",
                contract.at("/paths/~1api~1projects~1{projectId}~1issues/get/responses/403/description")
                        .asText());
        JsonNode list = contract.at("/components/schemas/ProjectListResponse");
        assertEquals(List.of("items", "nextPage"), texts(list.get("required")));
        assertEquals(
                ref("ProjectSummary"), list.at("/properties/items/items/$ref").asText());
        assertEquals(
                List.of("id", "name", "pathWithNamespace", "webUrl"),
                texts(contract.at("/components/schemas/ProjectSummary/required")));
    }

    @Test
    void describesTheTimerTheServerTimeAndTheDeadline() {
        JsonNode view = contract.at("/components/schemas/SessionView");
        assertTrue(texts(view.get("required")).containsAll(List.of("timerSeconds", "serverTime")));
        assertEquals(List.of("integer", "null"), texts(view.at("/properties/timerSeconds/type")));
        assertEquals("string", view.at("/properties/serverTime/type").asText());
        assertEquals(
                ref("OffsetDateTime"), view.at("/properties/serverTime/$ref").asText());
        assertEquals(
                "date-time",
                contract.at("/components/schemas/OffsetDateTime/format").asText());

        JsonNode round = contract.at("/components/schemas/RoundView");
        assertTrue(texts(round.get("required")).contains("deadline"));
        assertEquals(
                ref("OffsetDateTime"),
                round.at("/properties/deadline/anyOf/0/$ref").asText());
        assertEquals("null", round.at("/properties/deadline/anyOf/1/type").asText());

        JsonNode request = contract.at("/components/schemas/TimerRequest");
        assertEquals(List.of("seconds"), texts(request.get("required")));
        assertEquals(5, request.at("/properties/seconds/minimum").asInt());
        assertEquals(3600, request.at("/properties/seconds/maximum").asInt());
        assertEquals(List.of("integer", "null"), texts(request.at("/properties/seconds/type")));
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
