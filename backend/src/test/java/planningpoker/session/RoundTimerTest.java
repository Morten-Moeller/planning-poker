package planningpoker.session;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.fail;

import com.github.tomakehurst.wiremock.WireMockServer;
import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import io.restassured.http.ContentType;
import io.restassured.response.ValidatableResponse;
import io.restassured.specification.RequestSpecification;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Alternative;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import planningpoker.gitlab.WireMockGitLab;

@QuarkusTest
@WithTestResource(WireMockGitLab.class)
@TestProfile(RoundTimerTest.TimerClock.class)
class RoundTimerTest {

    private static final String PROBLEM = "application/problem+json";
    private static final Duration WAIT = Duration.ofSeconds(5);
    static final TestClock CLOCK = new TestClock(Instant.parse("2026-11-16T09:00:00Z"));

    public static class TimerClock implements QuarkusTestProfile {

        @Override
        public Set<Class<?>> getEnabledAlternatives() {
            return Set.of(TestClockProducer.class);
        }
    }

    @Alternative
    @ApplicationScoped
    public static class TestClockProducer {

        @Produces
        @Singleton
        Clock clock() {
            return CLOCK;
        }
    }

    WireMockServer gitlab;

    @Inject
    SessionRegistry registry;

    private String session;
    private String scrumMasterToken;
    private String developerToken;

    @BeforeEach
    void createSessionWithOneDeveloper() {
        gitlab.resetAll();
        GitLabStubs.defaultIssue(gitlab);
        GitLabStubs.issue(gitlab, GitLabStubs.PROJECT, 43, "Logout", "");
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        SessionApiTest.Created created = SessionApiTest.createSession("Anna " + suffix);
        session = "/api/sessions/" + created.sessionId();
        scrumMasterToken = created.token();
        developerToken =
                SessionApiTest.join(created.sessionId(), "Ben " + suffix).token();
    }

    private RequestSpecification asScrumMaster() {
        return given().header("Authorization", "Bearer " + scrumMasterToken);
    }

    private RequestSpecification asDeveloper() {
        return given().header("Authorization", "Bearer " + developerToken);
    }

    private ValidatableResponse setTimer(RequestSpecification caller, String seconds) {
        return caller.contentType(ContentType.JSON)
                .body("{\"seconds\":" + seconds + "}")
                .when()
                .put(session + "/timer")
                .then();
    }

    private void releaseIssue(long iid) {
        asScrumMaster()
                .contentType(ContentType.JSON)
                .body("{\"issueIid\":" + iid + "}")
                .when()
                .post(session + "/active-issue")
                .then()
                .statusCode(204);
    }

    private ValidatableResponse snapshot() {
        return asDeveloper().when().get(session).then().statusCode(200);
    }

    private OffsetDateTime deadline() {
        String deadline = snapshot().extract().path("round.deadline");
        return deadline == null ? null : OffsetDateTime.parse(deadline);
    }

    private static OffsetDateTime at(Instant instant) {
        return OffsetDateTime.parse(instant.toString());
    }

    private void awaitPhase(String phase) throws InterruptedException {
        long end = System.nanoTime() + WAIT.toNanos();
        while (System.nanoTime() < end) {
            if (phase.equals(snapshot().extract().path("phase"))) {
                return;
            }
            Thread.sleep(50);
        }
        fail("Session " + session + " did not reach " + phase + " within " + WAIT);
    }

    @Test
    void theScrumMasterSetsAndClearsTheTimer() {
        snapshot().body("timerSeconds", nullValue());

        setTimer(asScrumMaster(), "30").statusCode(204);
        snapshot().body("timerSeconds", equalTo(30));

        setTimer(asScrumMaster(), "null").statusCode(204);
        snapshot().body("timerSeconds", nullValue());
    }

    @Test
    void everySnapshotCarriesTheServerTime() {
        String serverTime = snapshot().extract().path("serverTime");

        assertEquals(at(CLOCK.instant()), OffsetDateTime.parse(serverTime));
    }

    @ParameterizedTest
    @ValueSource(strings = {"4", "3601", "0", "-1"})
    void aDurationOutsideTheLimitsIsAValidationError(String seconds) {
        setTimer(asScrumMaster(), seconds)
                .statusCode(400)
                .contentType(PROBLEM)
                .body("errorCode", equalTo("VALIDATION_ERROR"));
        snapshot().body("timerSeconds", nullValue());
    }

    @Test
    void onlyTheScrumMasterSetsTheTimer() {
        setTimer(asDeveloper(), "30").statusCode(403).contentType(PROBLEM).body("errorCode", equalTo("FORBIDDEN_ROLE"));
        setTimer(given(), "30").statusCode(401).contentType(PROBLEM).body("errorCode", equalTo("UNAUTHORIZED"));
        given().header("Authorization", "Bearer " + scrumMasterToken)
                .contentType(ContentType.JSON)
                .body("{\"seconds\":30}")
                .when()
                .put("/api/sessions/MISSING1/timer")
                .then()
                .statusCode(404)
                .body("errorCode", equalTo("SESSION_NOT_FOUND"));
        snapshot().body("timerSeconds", nullValue());
    }

    @Test
    void withoutTimerTheRoundHasNoDeadline() {
        releaseIssue(GitLabStubs.ISSUE);

        snapshot().body("phase", equalTo("VOTING")).body("round.deadline", nullValue());
    }

    @Test
    void releaseSwitchAndNewRoundEachGetTheDeadlineFromTheirStart() {
        setTimer(asScrumMaster(), "30").statusCode(204);

        Instant released = CLOCK.instant();
        releaseIssue(GitLabStubs.ISSUE);
        assertEquals(at(released.plusSeconds(30)), deadline());

        CLOCK.advance(Duration.ofSeconds(10));
        Instant switched = CLOCK.instant();
        releaseIssue(43);
        assertEquals(at(switched.plusSeconds(30)), deadline());

        asScrumMaster().when().post(session + "/round/reveal").then().statusCode(204);
        CLOCK.advance(Duration.ofSeconds(10));
        Instant restarted = CLOCK.instant();
        asScrumMaster().when().post(session + "/round/restart").then().statusCode(204);
        snapshot().body("round.number", equalTo(2));
        assertEquals(at(restarted.plusSeconds(30)), deadline());
    }

    @Test
    void aChangeWhileVotingKeepsTheRunningDeadline() {
        setTimer(asScrumMaster(), "30").statusCode(204);
        Instant released = CLOCK.instant();
        releaseIssue(GitLabStubs.ISSUE);

        setTimer(asScrumMaster(), "300").statusCode(204);

        snapshot().body("timerSeconds", equalTo(300));
        assertEquals(at(released.plusSeconds(30)), deadline());
    }

    @Test
    void theServerRevealsTheRoundAtTheDeadlineWithoutVotes() throws InterruptedException {
        setTimer(asScrumMaster(), "30").statusCode(204);
        releaseIssue(GitLabStubs.ISSUE);

        CLOCK.advance(Duration.ofSeconds(30));

        awaitPhase("REVEALED");
        snapshot()
                .body("history", hasSize(1))
                .body("history[0].votes", hasSize(0))
                .body("round.votes", hasSize(0));
    }

    @Test
    void aRoundRevealedByHandIsNotRevealedASecondTime() {
        setTimer(asScrumMaster(), "30").statusCode(204);
        releaseIssue(GitLabStubs.ISSUE);
        asScrumMaster().when().post(session + "/round/reveal").then().statusCode(204);

        CLOCK.advance(Duration.ofSeconds(31));
        registry.revealDue(CLOCK.instant());

        snapshot().body("phase", equalTo("REVEALED")).body("history", hasSize(1));
    }

    @Test
    void aRestartedRoundIsRevealedAtItsOwnDeadline() throws InterruptedException {
        setTimer(asScrumMaster(), "30").statusCode(204);
        releaseIssue(GitLabStubs.ISSUE);
        asScrumMaster().when().post(session + "/round/reveal").then().statusCode(204);
        CLOCK.advance(Duration.ofSeconds(20));
        asScrumMaster().when().post(session + "/round/restart").then().statusCode(204);

        CLOCK.advance(Duration.ofSeconds(15));
        registry.revealDue(CLOCK.instant());
        snapshot().body("phase", equalTo("VOTING")).body("round.number", equalTo(2));

        CLOCK.advance(Duration.ofSeconds(15));
        awaitPhase("REVEALED");
        snapshot().body("history", hasSize(2));
    }
}
