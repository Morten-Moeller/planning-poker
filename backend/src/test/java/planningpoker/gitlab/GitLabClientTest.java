package planningpoker.gitlab;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.absent;
import static com.github.tomakehurst.wiremock.client.WireMock.equalTo;
import static com.github.tomakehurst.wiremock.client.WireMock.equalToJson;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.getRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.postRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.put;
import static com.github.tomakehurst.wiremock.client.WireMock.putRequestedFor;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.MappingBuilder;
import com.github.tomakehurst.wiremock.client.ResponseDefinitionBuilder;
import io.quarkus.test.common.TestResourceScope;
import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.logging.Handler;
import java.util.logging.Level;
import java.util.logging.LogRecord;
import java.util.stream.Stream;
import org.eclipse.microprofile.config.ConfigProvider;
import org.jboss.logmanager.ExtLogRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import planningpoker.gitlab.GitLabException.Reason;

@QuarkusTest
@WithTestResource(value = WireMockGitLab.class, scope = TestResourceScope.RESTRICTED_TO_CLASS)
class GitLabClientTest {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String PROJECT = "4711";
    private static final String ISSUES = "/api/v4/projects/" + PROJECT + "/issues";
    private static final String PROJECTS = "/api/v4/projects";
    private static final String GITLAB_ERROR_TEXT = "401 Unauthorized - invalid token secret";
    private static final String GITLAB_ERROR_BODY = "{\"message\":\"" + GITLAB_ERROR_TEXT + "\"}";
    private static final int DELAY_ABOVE_TIMEOUT_MILLIS = (int) WireMockGitLab.TIMEOUT.toMillis() * 2 + 500;

    @Inject
    GitLabClient client;

    @Inject
    GitLabConfig config;

    WireMockServer gitlab;

    @BeforeEach
    void resetStubs() {
        gitlab.resetAll();
    }

    @Test
    void searchesOpenIssuesWithTokenAndReturnsNextPage() {
        gitlab.stubFor(get(urlPathEqualTo(ISSUES))
                .willReturn(json(
                                200,
                                "[{\"iid\":7,\"title\":\"Login\",\"description\":\"Form\",\"web_url\":\"https://gitlab.example/g/p/-/issues/7\",\"state\":\"opened\",\"weight\":5},"
                                        + "{\"iid\":9,\"title\":\"Logout\",\"description\":null,\"web_url\":\"https://gitlab.example/g/p/-/issues/9\",\"weight\":null},"
                                        + "{\"iid\":11,\"title\":\"Free\",\"description\":null,\"web_url\":\"https://gitlab.example/g/p/-/issues/11\"},"
                                        + "{\"iid\":12,\"title\":\"Empty\",\"description\":null,\"web_url\":\"https://gitlab.example/g/p/-/issues/12\",\"weight\":\"\"}]")
                        .withHeader("x-next-page", "2")
                        .withHeader("x-total", "23")));

        IssuePage page = client.searchIssues(PROJECT, query("log", 1));

        assertEquals(4, page.items().size());
        assertEquals(
                new GitLabIssue(7, "Login", "Form", "https://gitlab.example/g/p/-/issues/7", 5),
                page.items().get(0));
        assertEquals(9, page.items().get(1).iid());
        assertNull(page.items().get(1).weight());
        assertNull(page.items().get(2).weight());
        assertNull(page.items().get(3).weight());
        assertEquals(Optional.of(2), page.nextPage());
        assertEquals(Optional.of(23), page.total());
        gitlab.verify(getRequestedFor(urlPathEqualTo(ISSUES))
                .withHeader("PRIVATE-TOKEN", equalTo(config.token().orElseThrow()))
                .withQueryParam("state", equalTo("opened"))
                .withQueryParam("search", equalTo("log"))
                .withQueryParam("order_by", equalTo("updated_at"))
                .withQueryParam("sort", equalTo("desc"))
                .withQueryParam("weight", absent())
                .withQueryParam("updated_after", absent())
                .withQueryParam("per_page", equalTo("20"))
                .withQueryParam("page", equalTo("1")));
    }

    @Test
    void sendsTheWeightFilterAndTheStartOfThePeriod() {
        gitlab.stubFor(get(urlPathEqualTo(ISSUES)).willReturn(json(200, "[]")));

        client.searchIssues(PROJECT, new IssueQuery(null, "None", Instant.parse("2026-11-10T12:00:00Z"), 1));

        gitlab.verify(getRequestedFor(urlPathEqualTo(ISSUES))
                .withQueryParam("search", absent())
                .withQueryParam("weight", equalTo("None"))
                .withQueryParam("updated_after", equalTo("2026-11-10T12:00:00Z")));
    }

    @Test
    void returnsAnEmptyPageWithoutNextPage() {
        gitlab.stubFor(get(urlPathEqualTo(ISSUES)).willReturn(json(200, "[]").withHeader("x-next-page", "")));

        IssuePage page = client.searchIssues(PROJECT, query("nothing", 1));

        assertEquals(List.of(), page.items());
        assertEquals(Optional.empty(), page.nextPage());
    }

    @Test
    void returnsNoTotalWhenGitLabOmitsTheHeader() {
        gitlab.stubFor(get(urlPathEqualTo(ISSUES)).willReturn(json(200, "[]")));

        IssuePage page = client.searchIssues(PROJECT, query("log", 1));

        assertEquals(Optional.empty(), page.total());
    }

    @Test
    void requestsTheSecondPage() {
        gitlab.stubFor(get(urlPathEqualTo(ISSUES)).willReturn(json(200, "[]")));

        IssuePage page = client.searchIssues(PROJECT, query("log", 2));

        assertEquals(Optional.empty(), page.nextPage());
        gitlab.verify(getRequestedFor(urlPathEqualTo(ISSUES)).withQueryParam("page", equalTo("2")));
    }

    @Test
    void loadsAnIssue() {
        gitlab.stubFor(
                get(urlPathEqualTo(ISSUES + "/7"))
                        .willReturn(
                                json(
                                        200,
                                        "{\"iid\":7,\"title\":\"Login\",\"description\":\"Form\",\"web_url\":\"https://gitlab.example/g/p/-/issues/7\",\"labels\":[]}")));

        GitLabIssue issue = client.loadIssue(PROJECT, 7);

        assertEquals(new GitLabIssue(7, "Login", "Form", "https://gitlab.example/g/p/-/issues/7", null), issue);
        gitlab.verify(getRequestedFor(urlPathEqualTo(ISSUES + "/7"))
                .withHeader("PRIVATE-TOKEN", equalTo(config.token().orElseThrow())));
    }

    @Test
    void addsANoteWithTheBody() {
        gitlab.stubFor(post(urlPathEqualTo(ISSUES + "/7/notes")).willReturn(json(201, "{\"id\":1}")));

        client.addNote(PROJECT, 7, "**Planning Poker: Ergebnis 5**");

        gitlab.verify(postRequestedFor(urlPathEqualTo(ISSUES + "/7/notes"))
                .withHeader("PRIVATE-TOKEN", equalTo(config.token().orElseThrow()))
                .withHeader("Content-Type", equalTo("application/json"))
                .withRequestBody(equalToJson("{\"body\":\"**Planning Poker: Ergebnis 5**\"}")));
    }

    @Test
    void setsTheWeight() {
        gitlab.stubFor(put(urlPathEqualTo(ISSUES + "/7")).willReturn(json(200, "{\"iid\":7,\"weight\":5}")));

        client.setWeight(PROJECT, 7, 5);

        gitlab.verify(putRequestedFor(urlPathEqualTo(ISSUES + "/7"))
                .withHeader("PRIVATE-TOKEN", equalTo(config.token().orElseThrow()))
                .withRequestBody(equalToJson("{\"weight\":5}")));
    }

    @Test
    void searchesTheProjectsOfTheTokenAndReturnsNextPage() {
        gitlab.stubFor(get(urlPathEqualTo(PROJECTS))
                .willReturn(json(
                                200,
                                "[{\"id\":4711,\"name\":\"Poker\",\"path_with_namespace\":\"team/poker\",\"web_url\":\"https://gitlab.example/team/poker\",\"description\":null}]")
                        .withHeader("x-next-page", "2")));

        ProjectPage page = client.searchProjects("pok", 1);

        assertEquals(
                List.of(new GitLabProject(4711, "Poker", "team/poker", "https://gitlab.example/team/poker")),
                page.items());
        assertEquals(Optional.of(2), page.nextPage());
        gitlab.verify(getRequestedFor(urlPathEqualTo(PROJECTS))
                .withHeader("PRIVATE-TOKEN", equalTo(config.token().orElseThrow()))
                .withQueryParam("membership", equalTo("true"))
                .withQueryParam("simple", equalTo("true"))
                .withQueryParam("search", equalTo("pok"))
                .withQueryParam("order_by", equalTo("last_activity_at"))
                .withQueryParam("per_page", equalTo("20"))
                .withQueryParam("page", equalTo("1")));
    }

    @Test
    void loadsAProjectByIdOrEncodedPath() {
        gitlab.stubFor(
                get(urlPathEqualTo(PROJECTS + "/group%2Fapp"))
                        .willReturn(
                                json(
                                        200,
                                        "{\"id\":4711,\"name\":\"App\",\"path_with_namespace\":\"group/app\",\"web_url\":\"https://gitlab.example/group/app\"}")));

        GitLabProject project = client.loadProject("group/app");

        assertEquals(new GitLabProject(4711, "App", "group/app", "https://gitlab.example/group/app"), project);
        gitlab.verify(getRequestedFor(urlPathEqualTo(PROJECTS + "/group%2Fapp"))
                .withHeader("PRIVATE-TOKEN", equalTo(config.token().orElseThrow())));
    }

    @Test
    void mapsAFailingProjectSearchWithoutGitLabText() {
        gitlab.stubFor(get(urlPathEqualTo(PROJECTS)).willReturn(json(401, GITLAB_ERROR_BODY)));

        GitLabException e = assertThrows(GitLabException.class, () -> client.searchProjects("pok", 1));

        assertEquals(Reason.UNAUTHORIZED, e.reason());
        assertEquals(401, e.status());
        assertFalse(e.getMessage().contains(GITLAB_ERROR_TEXT), e.getMessage());
    }

    static Stream<Arguments> errorCases() {
        return Stream.of(
                Arguments.of("loadIssue", 404, Reason.NOT_FOUND),
                Arguments.of("loadIssue", 401, Reason.UNAUTHORIZED),
                Arguments.of("loadIssue", 403, Reason.UNAUTHORIZED),
                Arguments.of("loadIssue", 502, Reason.UNAVAILABLE),
                Arguments.of("loadIssue", 0, Reason.UNAVAILABLE),
                Arguments.of("searchIssues", 401, Reason.UNAUTHORIZED),
                Arguments.of("searchIssues", 404, Reason.NOT_FOUND),
                Arguments.of("searchIssues", 503, Reason.UNAVAILABLE),
                Arguments.of("searchIssues", 0, Reason.UNAVAILABLE),
                Arguments.of("addNote", 401, Reason.UNAUTHORIZED),
                Arguments.of("addNote", 404, Reason.NOT_FOUND),
                Arguments.of("addNote", 500, Reason.UNAVAILABLE),
                Arguments.of("addNote", 0, Reason.UNAVAILABLE),
                Arguments.of("setWeight", 401, Reason.UNAUTHORIZED),
                Arguments.of("setWeight", 403, Reason.UNAUTHORIZED),
                Arguments.of("setWeight", 404, Reason.NOT_FOUND),
                Arguments.of("setWeight", 500, Reason.UNAVAILABLE),
                Arguments.of("setWeight", 0, Reason.UNAVAILABLE),
                Arguments.of("loadProject", 401, Reason.UNAUTHORIZED),
                Arguments.of("loadProject", 403, Reason.UNAUTHORIZED),
                Arguments.of("loadProject", 404, Reason.NOT_FOUND),
                Arguments.of("loadProject", 500, Reason.UNAVAILABLE),
                Arguments.of("loadProject", 0, Reason.UNAVAILABLE));
    }

    static Stream<Arguments> invalidResponses() {
        return Stream.of(
                Arguments.of("searchIssues", json(200, "[]").withHeader("x-next-page", "abc")),
                Arguments.of("searchIssues", json(200, "[]").withHeader("x-total", "abc")),
                Arguments.of("searchIssues", html(200, "<html>maintenance</html>")),
                Arguments.of("searchIssues", json(200, "{not json")),
                Arguments.of("loadIssue", html(200, "<html>maintenance</html>")),
                Arguments.of("loadIssue", json(200, "{not json")),
                Arguments.of("loadProject", json(200, "{not json")));
    }

    @ParameterizedTest(name = "{0} with an invalid response fails with UNAVAILABLE")
    @MethodSource("invalidResponses")
    void mapsInvalidResponsesToUnavailable(String operation, ResponseDefinitionBuilder response) {
        gitlab.stubFor(stubFor(operation).willReturn(response));

        GitLabException e = assertThrows(GitLabException.class, () -> call(operation));

        assertEquals(Reason.UNAVAILABLE, e.reason());
        assertTrue(e.getMessage().contains(operation), e.getMessage());
        assertFalse(e.getMessage().contains("maintenance"), e.getMessage());
    }

    @ParameterizedTest(name = "{0} with status {1} (0 = timeout) fails with {2}")
    @MethodSource("errorCases")
    void mapsGitLabErrorsWithoutTokenOrGitLabText(String operation, int status, Reason reason) {
        ResponseDefinitionBuilder response = status == 0
                ? json(200, "{}").withFixedDelay(DELAY_ABOVE_TIMEOUT_MILLIS)
                : json(status, GITLAB_ERROR_BODY);
        gitlab.stubFor(stubFor(operation).willReturn(response));

        GitLabException e = assertThrows(GitLabException.class, () -> call(operation));

        assertEquals(reason, e.reason());
        assertEquals(status, e.status());
        assertTrue(e.getMessage().contains(operation), e.getMessage());
        assertFalse(e.getMessage().contains(config.token().orElseThrow()), e.getMessage());
        assertFalse(e.getMessage().contains(GITLAB_ERROR_TEXT), e.getMessage());
        assertFalse(e.getMessage().contains("invalid token"), e.getMessage());
    }

    @ParameterizedTest(name = "{0} with status {1} (0 = timeout) writes one WARN line")
    @MethodSource("errorCases")
    void writesOneWarnLineWithoutTokenOrGitLabText(String operation, int status, Reason reason) {
        ResponseDefinitionBuilder response = status == 0
                ? json(200, "{}").withFixedDelay(DELAY_ABOVE_TIMEOUT_MILLIS)
                : json(status, GITLAB_ERROR_BODY);
        gitlab.stubFor(stubFor(operation).willReturn(response));
        List<ExtLogRecord> records = new CopyOnWriteArrayList<>();
        Handler handler = new Handler() {
            @Override
            public void publish(LogRecord record) {
                records.add((ExtLogRecord) record);
            }

            @Override
            public void flush() {}

            @Override
            public void close() {}
        };
        java.util.logging.Logger logger = java.util.logging.Logger.getLogger(GitLabClient.class.getName());
        logger.addHandler(handler);
        try {
            assertThrows(GitLabException.class, () -> call(operation));
        } finally {
            logger.removeHandler(handler);
        }

        assertEquals(1, records.size(), records.toString());
        ExtLogRecord record = records.get(0);
        String line = record.getFormattedMessage();
        assertEquals(Level.WARNING.intValue(), record.getLevel().intValue(), line);
        assertTrue(line.contains("operation=" + operation), line);
        assertTrue(line.contains("projectId=" + PROJECT), line);
        assertTrue(line.contains("status=" + status), line);
        assertTrue(line.contains("reason=" + reason), line);
        assertFalse(line.contains(config.token().orElseThrow()), line);
        assertFalse(line.contains(GITLAB_ERROR_TEXT), line);
        assertFalse(line.contains("invalid token"), line);
        assertNull(record.getThrown(), line);
    }

    @Test
    void writesNoTokenIntoTheLog() throws IOException {
        gitlab.stubFor(get(urlPathEqualTo(ISSUES + "/7")).willReturn(json(401, GITLAB_ERROR_BODY)));
        assertThrows(GitLabException.class, () -> client.loadIssue(PROJECT, 7));

        String logPath = ConfigProvider.getConfig().getValue("quarkus.log.file.path", String.class);
        long ownProcessId = ProcessHandle.current().pid();
        int ownLines = 0;
        for (String line : Files.readAllLines(Path.of(logPath))) {
            if (line.isBlank()) {
                continue;
            }
            JsonNode entry = JSON.readTree(line);
            if (entry.path("processId").asLong() != ownProcessId) {
                continue;
            }
            ownLines++;
            assertFalse(line.contains(config.token().orElseThrow()), "token value in log line: " + line);
        }
        assertTrue(ownLines > 0, "no log lines of this process in " + logPath);
    }

    private void call(String operation) {
        switch (operation) {
            case "searchIssues" -> client.searchIssues(PROJECT, query("log", 1));
            case "loadIssue" -> client.loadIssue(PROJECT, 7);
            case "addNote" -> client.addNote(PROJECT, 7, "note");
            case "setWeight" -> client.setWeight(PROJECT, 7, 5);
            case "loadProject" -> client.loadProject(PROJECT);
            default -> throw new IllegalArgumentException(operation);
        }
    }

    private static MappingBuilder stubFor(String operation) {
        return switch (operation) {
            case "searchIssues" -> get(urlPathEqualTo(ISSUES));
            case "loadIssue" -> get(urlPathEqualTo(ISSUES + "/7"));
            case "addNote" -> post(urlPathEqualTo(ISSUES + "/7/notes"));
            case "setWeight" -> put(urlPathEqualTo(ISSUES + "/7"));
            case "loadProject" -> get(urlPathEqualTo(PROJECTS + "/" + PROJECT));
            default -> throw new IllegalArgumentException(operation);
        };
    }

    private static ResponseDefinitionBuilder json(int status, String body) {
        return aResponse()
                .withStatus(status)
                .withHeader("Content-Type", "application/json")
                .withBody(body);
    }

    private static ResponseDefinitionBuilder html(int status, String body) {
        return aResponse()
                .withStatus(status)
                .withHeader("Content-Type", "text/html")
                .withBody(body);
    }

    private static IssueQuery query(String search, int page) {
        return new IssueQuery(search, null, null, page);
    }
}
