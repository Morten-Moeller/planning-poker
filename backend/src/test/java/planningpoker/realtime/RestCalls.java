package planningpoker.realtime;

import static com.github.tomakehurst.wiremock.client.WireMock.aResponse;
import static com.github.tomakehurst.wiremock.client.WireMock.get;
import static com.github.tomakehurst.wiremock.client.WireMock.urlPathEqualTo;
import static io.restassured.RestAssured.given;

import com.github.tomakehurst.wiremock.WireMockServer;
import io.restassured.http.ContentType;
import io.restassured.response.Response;

final class RestCalls {

    static final String PROJECT = "1234";
    static final long ISSUE = 42;

    record Participant(String participantId, String token) {}

    private RestCalls() {}

    static void stubIssue(WireMockServer gitlab) {
        gitlab.stubFor(get(urlPathEqualTo("/api/v4/projects/" + PROJECT + "/issues/" + ISSUE))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{\"iid\":" + ISSUE + ",\"title\":\"Login page\",\"description\":\"Log in.\","
                                + "\"web_url\":\"https://gitlab.example/g/p/-/issues/" + ISSUE
                                + "\",\"labels\":[]}")));
    }

    record Created(String sessionId, Participant scrumMaster) {}

    static Created createSession(String name) {
        Response response = given().contentType(ContentType.JSON)
                .body("{\"name\":\"" + name + "\",\"gitlabProjectId\":\"" + PROJECT + "\",\"issueIid\":" + ISSUE + "}")
                .when()
                .post("/api/sessions");
        response.then().statusCode(201);
        return new Created(
                response.jsonPath().getString("sessionId"),
                new Participant(
                        response.jsonPath().getString("participantId"),
                        response.jsonPath().getString("token")));
    }

    static Participant join(String sessionId, String name) {
        Response response = given().contentType(ContentType.JSON)
                .body("{\"name\":\"" + name + "\"}")
                .when()
                .post("/api/sessions/" + sessionId + "/participants");
        response.then().statusCode(201);
        return new Participant(
                response.jsonPath().getString("participantId"),
                response.jsonPath().getString("token"));
    }

    static void releaseIssue(String sessionId, Participant scrumMaster) {
        given().header("Authorization", "Bearer " + scrumMaster.token())
                .contentType(ContentType.JSON)
                .body("{\"issueIid\":" + ISSUE + "}")
                .when()
                .post("/api/sessions/" + sessionId + "/active-issue")
                .then()
                .statusCode(204);
    }

    static void vote(String sessionId, Participant developer, String card) {
        given().header("Authorization", "Bearer " + developer.token())
                .contentType(ContentType.JSON)
                .body("{\"card\":\"" + card + "\"}")
                .when()
                .put("/api/sessions/" + sessionId + "/vote")
                .then()
                .statusCode(204);
    }

    static void reveal(String sessionId, Participant scrumMaster) {
        given().header("Authorization", "Bearer " + scrumMaster.token())
                .when()
                .post("/api/sessions/" + sessionId + "/round/reveal")
                .then()
                .statusCode(204);
    }
}
