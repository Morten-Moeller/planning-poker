package planningpoker.gitlab;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
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
import java.util.List;
import java.util.Optional;
import java.util.stream.Stream;
import org.eclipse.microprofile.config.ConfigProvider;
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
    private static final String GITLAB_ERROR_TEXT = "401 Unauthorized - invalid token secret";
    private static final String GITLAB_ERROR_BODY = "{\"message\":\"" + GITLAB_ERROR_TEXT + "\"}";
    private static final int DELAY_ABOVE_TIMEOUT_MILLIS = 2500;

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
                                "[{\"iid\":7,\"title\":\"Login\",\"description\":\"Form\",\"web_url\":\"https://gitlab.example/g/p/-/issues/7\",\"state\":\"opened\"},"
                                        + "{\"iid\":9,\"title\":\"Logout\",\"description\":null,\"web_url\":\"https://gitlab.example/g/p/-/issues/9\"}]")
                        .withHeader("x-next-page", "2")));

        IssuePage page = client.searchIssues(PROJECT, "log", 1);

        assertEquals(2, page.items().size());
        assertEquals(
                new GitLabIssue(7, "Login", "Form", "https://gitlab.example/g/p/-/issues/7"),
                page.items().get(0));
        assertEquals(9, page.items().get(1).iid());
        assertEquals(Optional.of(2), page.nextPage());
        gitlab.verify(getRequestedFor(urlPathEqualTo(ISSUES))
                .withHeader("PRIVATE-TOKEN", equalTo(config.token()))
                .withQueryParam("state", equalTo("opened"))
                .withQueryParam("search", equalTo("log"))
                .withQueryParam("per_page", equalTo("20"))
                .withQueryParam("page", equalTo("1")));
    }

    @Test
    void returnsAnEmptyPageWithoutNextPage() {
        gitlab.stubFor(get(urlPathEqualTo(ISSUES)).willReturn(json(200, "[]").withHeader("x-next-page", "")));

        IssuePage page = client.searchIssues(PROJECT, "nothing", 1);

        assertEquals(List.of(), page.items());
        assertEquals(Optional.empty(), page.nextPage());
    }

    @Test
    void requestsTheSecondPage() {
        gitlab.stubFor(get(urlPathEqualTo(ISSUES)).willReturn(json(200, "[]")));

        IssuePage page = client.searchIssues(PROJECT, "log", 2);

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

        assertEquals(new GitLabIssue(7, "Login", "Form", "https://gitlab.example/g/p/-/issues/7"), issue);
        gitlab.verify(
                getRequestedFor(urlPathEqualTo(ISSUES + "/7")).withHeader("PRIVATE-TOKEN", equalTo(config.token())));
    }

    @Test
    void addsANoteWithTheBody() {
        gitlab.stubFor(post(urlPathEqualTo(ISSUES + "/7/notes")).willReturn(json(201, "{\"id\":1}")));

        client.addNote(PROJECT, 7, "**Planning Poker: Ergebnis 5**");

        gitlab.verify(postRequestedFor(urlPathEqualTo(ISSUES + "/7/notes"))
                .withHeader("PRIVATE-TOKEN", equalTo(config.token()))
                .withHeader("Content-Type", equalTo("application/json"))
                .withRequestBody(equalToJson("{\"body\":\"**Planning Poker: Ergebnis 5**\"}")));
    }

    @Test
    void setsTheWeight() {
        gitlab.stubFor(put(urlPathEqualTo(ISSUES + "/7")).willReturn(json(200, "{\"iid\":7,\"weight\":5}")));

        client.setWeight(PROJECT, 7, 5);

        gitlab.verify(putRequestedFor(urlPathEqualTo(ISSUES + "/7"))
                .withHeader("PRIVATE-TOKEN", equalTo(config.token()))
                .withRequestBody(equalToJson("{\"weight\":5}")));
    }

    static Stream<Arguments> errorCases() {
        return Stream.of(
                Arguments.of("loadIssue", 404, Reason.NOT_FOUND),
                Arguments.of("loadIssue", 401, Reason.UNAUTHORIZED),
                Arguments.of("loadIssue", 403, Reason.UNAUTHORIZED),
                Arguments.of("loadIssue", 502, Reason.UNAVAILABLE),
                Arguments.of("loadIssue", 0, Reason.UNAVAILABLE),
                Arguments.of("searchIssues", 401, Reason.UNAUTHORIZED),
                Arguments.of("searchIssues", 0, Reason.UNAVAILABLE),
                Arguments.of("addNote", 401, Reason.UNAUTHORIZED),
                Arguments.of("addNote", 404, Reason.NOT_FOUND),
                Arguments.of("addNote", 0, Reason.UNAVAILABLE),
                Arguments.of("setWeight", 404, Reason.NOT_FOUND),
                Arguments.of("setWeight", 500, Reason.UNAVAILABLE),
                Arguments.of("setWeight", 0, Reason.UNAVAILABLE));
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
        assertFalse(e.getMessage().contains(config.token()), e.getMessage());
        assertFalse(e.getMessage().contains(GITLAB_ERROR_TEXT), e.getMessage());
        assertFalse(e.getMessage().contains("invalid token"), e.getMessage());
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
            assertFalse(line.contains(config.token()), "token value in log line: " + line);
        }
        assertTrue(ownLines > 0, "no log lines of this process in " + logPath);
    }

    private void call(String operation) {
        switch (operation) {
            case "searchIssues" -> client.searchIssues(PROJECT, "log", 1);
            case "loadIssue" -> client.loadIssue(PROJECT, 7);
            case "addNote" -> client.addNote(PROJECT, 7, "note");
            case "setWeight" -> client.setWeight(PROJECT, 7, 5);
            default -> throw new IllegalArgumentException(operation);
        }
    }

    private static MappingBuilder stubFor(String operation) {
        return switch (operation) {
            case "searchIssues" -> get(urlPathEqualTo(ISSUES));
            case "loadIssue" -> get(urlPathEqualTo(ISSUES + "/7"));
            case "addNote" -> post(urlPathEqualTo(ISSUES + "/7/notes"));
            case "setWeight" -> put(urlPathEqualTo(ISSUES + "/7"));
            default -> throw new IllegalArgumentException(operation);
        };
    }

    private static ResponseDefinitionBuilder json(int status, String body) {
        return aResponse()
                .withStatus(status)
                .withHeader("Content-Type", "application/json")
                .withBody(body);
    }
}
