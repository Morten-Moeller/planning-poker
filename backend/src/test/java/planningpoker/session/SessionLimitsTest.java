package planningpoker.session;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.hamcrest.Matchers.hasSize;
import static org.junit.jupiter.api.Assertions.assertEquals;

import com.github.tomakehurst.wiremock.WireMockServer;
import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import io.restassured.http.ContentType;
import io.restassured.response.ValidatableResponse;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.enterprise.inject.Alternative;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import planningpoker.gitlab.WireMockGitLab;

@QuarkusTest
@WithTestResource(WireMockGitLab.class)
@TestProfile(SessionLimitsTest.Limits.class)
class SessionLimitsTest {

    private static final String PROBLEM = "application/problem+json";
    private static final Duration TTL = Duration.ofHours(12);
    static final TestClock CLOCK = new TestClock(Instant.parse("2026-11-16T09:00:00Z"));

    public static class Limits implements QuarkusTestProfile {

        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of(
                    "planningpoker.session.max-sessions", "2",
                    "planningpoker.session.max-participants", "3",
                    "planningpoker.session.ttl", TTL.toString());
        }

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

    @ApplicationScoped
    public static class ChangedEvents {

        private final List<SessionChanged> events = new CopyOnWriteArrayList<>();

        void onChanged(@Observes SessionChanged event) {
            events.add(event);
        }

        List<SessionChanged> of(String sessionId) {
            return events.stream()
                    .filter(event -> event.sessionId().equals(sessionId))
                    .toList();
        }
    }

    WireMockServer gitlab;

    @Inject
    ChangedEvents changedEvents;

    private String suffix;

    @BeforeEach
    void expireEarlierSessions() {
        gitlab.resetAll();
        GitLabStubs.defaultIssue(gitlab);
        CLOCK.advance(TTL.plusMinutes(1));
        suffix = UUID.randomUUID().toString().substring(0, 8);
    }

    private ValidatableResponse create(String name) {
        return given().contentType(ContentType.JSON)
                .body("{\"name\":\"" + name + " " + suffix + "\",\"gitlabProjectId\":\"1234\",\"issueIid\":42}")
                .when()
                .post("/api/sessions")
                .then();
    }

    private ValidatableResponse join(String sessionId, String name) {
        return given().contentType(ContentType.JSON)
                .body("{\"name\":\"" + name + " " + suffix + "\"}")
                .when()
                .post("/api/sessions/" + sessionId + "/participants")
                .then();
    }

    @Test
    void theThirdSessionIsRejectedUntilASessionExpires() {
        create("Anna").statusCode(201);
        CLOCK.advance(Duration.ofHours(1));
        create("Ben").statusCode(201);

        create("Cleo").statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("LIMIT_REACHED"));

        CLOCK.advance(TTL.minusMinutes(30));
        create("Cleo").statusCode(201);
        create("Dora").statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("LIMIT_REACHED"));
    }

    @Test
    void theFourthParticipantIsRejectedAndTheSessionStaysUnchanged() {
        ValidatableResponse created = create("Anna").statusCode(201);
        String sessionId = created.extract().path("sessionId");
        String token = created.extract().path("token");
        join(sessionId, "Ben").statusCode(201);
        join(sessionId, "Cleo").statusCode(201);
        int eventsBefore = changedEvents.of(sessionId).size();

        join(sessionId, "Dora").statusCode(409).contentType(PROBLEM).body("errorCode", equalTo("LIMIT_REACHED"));

        assertEquals(eventsBefore, changedEvents.of(sessionId).size());
        given().header("Authorization", "Bearer " + token)
                .when()
                .get("/api/sessions/" + sessionId)
                .then()
                .statusCode(200)
                .body("participants", hasSize(3))
                .body("participants.name", equalTo(List.of("Anna " + suffix, "Ben " + suffix, "Cleo " + suffix)));
    }
}
