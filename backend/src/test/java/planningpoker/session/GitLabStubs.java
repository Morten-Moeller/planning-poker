package planningpoker.session;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.post;
import static com.github.tomakehurst.wiremock.client.WireMock.put;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.ResponseDefinitionBuilder;

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

    static void weight(WireMockServer server, String projectId, long iid) {
        server.stubFor(
                put(urlPathEqualTo(issuePath(projectId, iid))).willReturn(json(200, issueJson(iid, "Login page", ""))));
    }

    static void weightFailing(WireMockServer server, String projectId, long iid, int status) {
        server.stubFor(put(urlPathEqualTo(issuePath(projectId, iid)))
                .willReturn(json(status, "{\"message\":\"gitlab failure text\"}")));
    }

    static ResponseDefinitionBuilder json(int status, String body) {
        return aResponse()
                .withStatus(status)
                .withHeader("Content-Type", "application/json")
                .withBody(body);
    }
}
