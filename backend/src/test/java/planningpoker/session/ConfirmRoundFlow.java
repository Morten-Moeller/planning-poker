package planningpoker.session;

import static io.restassured.RestAssured.given;

import io.restassured.http.ContentType;
import io.restassured.response.ValidatableResponse;
import io.restassured.specification.RequestSpecification;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

final class ConfirmRoundFlow {

    final String sessionId;
    final String session;
    final String scrumMasterToken;
    final List<SessionApiTest.Joined> developers;

    private ConfirmRoundFlow(String sessionId, String scrumMasterToken, List<SessionApiTest.Joined> developers) {
        this.sessionId = sessionId;
        this.session = "/api/sessions/" + sessionId;
        this.scrumMasterToken = scrumMasterToken;
        this.developers = developers;
    }

    static ConfirmRoundFlow create(int developerCount) {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        SessionApiTest.Created created = SessionApiTest.createSession("Anna " + suffix);
        List<SessionApiTest.Joined> developers = new ArrayList<>();
        for (int i = 0; i < developerCount; i++) {
            developers.add(SessionApiTest.join(created.sessionId(), "Dev" + i + " " + suffix));
        }
        return new ConfirmRoundFlow(created.sessionId(), created.token(), List.copyOf(developers));
    }

    RequestSpecification asScrumMaster() {
        return given().header("Authorization", "Bearer " + scrumMasterToken);
    }

    RequestSpecification asDeveloper(int index) {
        return given().header("Authorization", "Bearer " + developers.get(index).token());
    }

    ValidatableResponse selectIssue(long iid) {
        return asScrumMaster()
                .contentType(ContentType.JSON)
                .body("{\"issueIid\":" + iid + "}")
                .when()
                .post(session + "/active-issue")
                .then();
    }

    void vote(int developer, String card) {
        asDeveloper(developer)
                .contentType(ContentType.JSON)
                .body("{\"card\":\"" + card + "\"}")
                .when()
                .put(session + "/vote")
                .then()
                .statusCode(204);
    }

    ValidatableResponse reveal() {
        return asScrumMaster().when().post(session + "/round/reveal").then();
    }

    ValidatableResponse restart() {
        return asScrumMaster().when().post(session + "/round/restart").then();
    }

    ValidatableResponse confirm(String card) {
        return confirmAs(asScrumMaster(), card);
    }

    ValidatableResponse confirmAs(RequestSpecification caller, String card) {
        return caller.contentType(ContentType.JSON)
                .body("{\"card\":\"" + card + "\"}")
                .when()
                .post(session + "/round/confirm")
                .then();
    }

    ValidatableResponse snapshotOf(RequestSpecification caller) {
        return caller.when().get(session).then().statusCode(200);
    }

    void playRound(String... cards) {
        for (int i = 0; i < cards.length; i++) {
            vote(i, cards[i]);
        }
        reveal().statusCode(204);
    }

    void revealedRound(String... cards) {
        selectIssue(GitLabStubs.ISSUE).statusCode(204);
        playRound(cards);
    }
}
