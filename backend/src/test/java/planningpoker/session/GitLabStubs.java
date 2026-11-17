package planningpoker.session;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.put;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.ResponseDefinitionBuilder;
import com.github.tomakehurst.wiremock.client.WireMock;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import com.github.tomakehurst.wiremock.extension.ResponseDefinitionTransformerV2;
import com.github.tomakehurst.wiremock.http.ResponseDefinition;
import com.github.tomakehurst.wiremock.stubbing.ServeEvent;
import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

final class GitLabStubs {

    static final String PROJECT = "1234";
    static final long ISSUE = 42;

    private GitLabStubs() {}

    static String issuesPath(String projectId) {
        return "/api/v4/projects/" + projectId + "/issues";
    }

    static String issuePath(String projectId, long iid) {
        return issuesPath(projectId) + "/" + iid;
    }

    static String notesPath(String projectId, long iid) {
        return issuePath(projectId, iid) + "/notes";
    }

    static String issueJson(long iid, String title, String description) {
        return "{\"iid\":" + iid + ",\"title\":\"" + title + "\",\"description\":"
                + (description == null ? "null" : "\"" + description + "\"")
                + ",\"web_url\":\"https://gitlab.example/g/p/-/issues/" + iid + "\",\"labels\":[]}";
    }

    static String weightedIssueJson(long iid, String title, String weightJson) {
        return "{\"iid\":" + iid + ",\"title\":\"" + title + "\",\"description\":\"\""
                + ",\"web_url\":\"https://gitlab.example/g/p/-/issues/" + iid + "\",\"weight\":" + weightJson + "}";
    }

    static void defaultIssue(WireMockServer server) {
        issue(server, PROJECT, ISSUE, "Login page", "As a user I want to log in.");
    }

    static void issue(WireMockServer server, String projectId, long iid, String title, String description) {
        server.stubFor(get(urlPathEqualTo(issuePath(projectId, iid)))
                .willReturn(json(200, issueJson(iid, title, description))));
    }

    static void issueMissing(WireMockServer server, String projectId, long iid) {
        server.stubFor(get(urlPathEqualTo(issuePath(projectId, iid)))
                .willReturn(json(404, "{\"message\":\"404 Issue Not Found\"}")));
    }

    static void issueFailing(WireMockServer server, String projectId, long iid, int status) {
        server.stubFor(get(urlPathEqualTo(issuePath(projectId, iid)))
                .willReturn(json(status, "{\"message\":\"gitlab failure text\"}")));
    }

    static void issueDelayed(WireMockServer server, String projectId, long iid, int millis) {
        server.stubFor(get(urlPathEqualTo(issuePath(projectId, iid)))
                .willReturn(json(200, issueJson(iid, "Slow issue", "")).withFixedDelay(millis)));
    }

    static void search(WireMockServer server, String projectId, String body, String nextPage) {
        ResponseDefinitionBuilder response = json(200, body);
        if (nextPage != null) {
            response = response.withHeader("x-next-page", nextPage);
        }
        server.stubFor(get(urlPathEqualTo(issuesPath(projectId))).willReturn(response));
    }

    static void searchWithTotal(WireMockServer server, String projectId, String body, String total) {
        server.stubFor(get(urlPathEqualTo(issuesPath(projectId)))
                .willReturn(json(200, body).withHeader("x-total", total)));
    }

    static void searchWithWeight(WireMockServer server, String projectId, String gitLabWeight, String body) {
        server.stubFor(get(urlPathEqualTo(issuesPath(projectId)))
                .withQueryParam("weight", WireMock.equalTo(gitLabWeight))
                .willReturn(json(200, body)));
    }

    static void searchFailing(WireMockServer server, String projectId, int status) {
        server.stubFor(get(urlPathEqualTo(issuesPath(projectId)))
                .willReturn(json(status, "{\"message\":\"gitlab failure text\"}")));
    }

    static void searchDelayed(WireMockServer server, String projectId, int millis) {
        server.stubFor(get(urlPathEqualTo(issuesPath(projectId)))
                .willReturn(json(200, "[]").withFixedDelay(millis)));
    }

    static void note(WireMockServer server, String projectId, long iid) {
        server.stubFor(post(urlPathEqualTo(notesPath(projectId, iid))).willReturn(json(201, "{\"id\":1}")));
    }

    static void noteFailing(WireMockServer server, String projectId, long iid, int status) {
        server.stubFor(post(urlPathEqualTo(notesPath(projectId, iid)))
                .willReturn(json(status, "{\"message\":\"gitlab failure text\"}")));
    }

    static void noteDelayed(WireMockServer server, String projectId, long iid, int millis) {
        server.stubFor(post(urlPathEqualTo(notesPath(projectId, iid)))
                .willReturn(json(201, "{\"id\":1}").withFixedDelay(millis)));
    }

    static void noteHeld(WireMockServer server, String projectId, long iid) {
        HeldResponses.hold();
        server.stubFor(post(urlPathEqualTo(notesPath(projectId, iid)))
                .willReturn(json(201, "{\"id\":1}").withTransformers(HeldResponses.NAME)));
    }

    static void weight(WireMockServer server, String projectId, long iid) {
        server.stubFor(
                put(urlPathEqualTo(issuePath(projectId, iid))).willReturn(json(200, issueJson(iid, "Login page", ""))));
    }

    static void weightFailing(WireMockServer server, String projectId, long iid, int status) {
        server.stubFor(put(urlPathEqualTo(issuePath(projectId, iid)))
                .willReturn(json(status, "{\"message\":\"gitlab failure text\"}")));
    }

    static final String PROJECTS = "/api/v4/projects";

    static String projectPath(String projectId) {
        return PROJECTS + "/" + projectId;
    }

    static String projectJson(long id, String name, String path) {
        return "{\"id\":" + id + ",\"name\":\"" + name + "\",\"path_with_namespace\":\"" + path
                + "\",\"web_url\":\"https://gitlab.example/" + path + "\",\"description\":\"\"}";
    }

    static void projects(WireMockServer server, String body, String nextPage) {
        ResponseDefinitionBuilder response = json(200, body);
        if (nextPage != null) {
            response = response.withHeader("x-next-page", nextPage);
        }
        server.stubFor(get(urlPathEqualTo(PROJECTS)).willReturn(response));
    }

    static void projectsFailing(WireMockServer server, int status) {
        server.stubFor(get(urlPathEqualTo(PROJECTS)).willReturn(json(status, "{\"message\":\"gitlab failure text\"}")));
    }

    static void project(WireMockServer server, long id, String name, String path) {
        server.stubFor(get(urlPathEqualTo(projectPath(String.valueOf(id))))
                .willReturn(json(200, projectJson(id, name, path))));
    }

    static void projectFailing(WireMockServer server, String projectId, int status) {
        server.stubFor(get(urlPathEqualTo(projectPath(projectId)))
                .willReturn(json(status, "{\"message\":\"gitlab failure text\"}")));
    }

    static ResponseDefinitionBuilder json(int status, String body) {
        return aResponse()
                .withStatus(status)
                .withHeader("Content-Type", "application/json")
                .withBody(body);
    }

    public static final class HeldGitLab implements QuarkusTestResourceLifecycleManager {

        static final Duration TIMEOUT = Duration.ofSeconds(5);

        private WireMockServer server;

        @Override
        public Map<String, String> start() {
            server = new WireMockServer(
                    WireMockConfiguration.options().dynamicPort().extensions(new HeldResponses()));
            server.start();
            return Map.of(
                    "planningpoker.gitlab.base-url",
                    server.baseUrl(),
                    "planningpoker.gitlab.timeout",
                    TIMEOUT.toSeconds() + "s");
        }

        @Override
        public void stop() {
            HeldResponses.release();
            if (server != null) {
                server.stop();
            }
        }

        @Override
        public void inject(TestInjector testInjector) {
            testInjector.injectIntoFields(server, new TestInjector.MatchesType(WireMockServer.class));
        }
    }

    static final class HeldResponses implements ResponseDefinitionTransformerV2 {

        static final String NAME = "held-response";

        private static final Duration LONGEST_HOLD = HeldGitLab.TIMEOUT.multipliedBy(4);

        private static volatile CountDownLatch received = new CountDownLatch(1);
        private static volatile CountDownLatch released = new CountDownLatch(0);

        static void hold() {
            received = new CountDownLatch(1);
            released = new CountDownLatch(1);
        }

        static void release() {
            released.countDown();
        }

        static boolean awaitRequest(Duration limit) {
            try {
                return received.await(limit.toMillis(), TimeUnit.MILLISECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return false;
            }
        }

        @Override
        public ResponseDefinition transform(ServeEvent serveEvent) {
            received.countDown();
            try {
                released.await(LONGEST_HOLD.toMillis(), TimeUnit.MILLISECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return serveEvent.getResponseDefinition();
        }

        @Override
        public boolean applyGlobally() {
            return false;
        }

        @Override
        public String getName() {
            return NAME;
        }
    }
}
