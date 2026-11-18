package planningpoker.realtime;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.github.tomakehurst.wiremock.WireMockServer;
import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.common.http.TestHTTPResource;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import io.restassured.http.ContentType;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Alternative;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;
import java.net.URI;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import planningpoker.gitlab.WireMockGitLab;
import planningpoker.session.TestClock;

@QuarkusTest
@WithTestResource(WireMockGitLab.class)
@TestProfile(RoundTimerSocketTest.TimerClock.class)
class RoundTimerSocketTest {

    private static final Duration REALTIME = Duration.ofSeconds(1);
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

    @TestHTTPResource("/")
    URI baseUri;

    WireMockServer gitlab;

    private final List<SocketClient> clients = new ArrayList<>();
    private String sessionId;
    private RestCalls.Participant scrumMaster;
    private List<RestCalls.Participant> developers;

    @BeforeEach
    void createSessionWithTwoDevelopers() {
        gitlab.resetAll();
        RestCalls.stubIssue(gitlab);
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        RestCalls.Created created = RestCalls.createSession("Anna " + suffix);
        sessionId = created.sessionId();
        scrumMaster = created.scrumMaster();
        developers = List.of(RestCalls.join(created, "Ben " + suffix), RestCalls.join(created, "Cleo " + suffix));
    }

    @AfterEach
    void closeClients() {
        clients.forEach(SocketClient::close);
    }

    private SocketClient connectAs(RestCalls.Participant participant) {
        SocketClient client = SocketClient.connect(baseUri, sessionId);
        clients.add(client);
        client.auth(participant.token());
        client.awaitState(
                view -> view.path("me").path("participantId").asText().equals(participant.participantId()),
                "me.participantId " + participant.participantId());
        return client;
    }

    private void setTimer(int seconds) {
        given().header("Authorization", "Bearer " + scrumMaster.token())
                .contentType(ContentType.JSON)
                .body("{\"seconds\":" + seconds + "}")
                .when()
                .put("/api/sessions/" + sessionId + "/timer")
                .then()
                .statusCode(204);
    }

    @Test
    void bothDevelopersGetTheSameDeadlineAndTheRevealWithoutTheScrumMaster() {
        List<SocketClient> sockets = developers.stream().map(this::connectAs).toList();
        setTimer(30);
        RestCalls.releaseIssue(sessionId, scrumMaster);
        for (SocketClient socket : sockets) {
            JsonNode discussion = socket.awaitState(
                    view -> "DISCUSSION".equals(view.path("phase").asText()), "phase DISCUSSION");
            assertTrue(discussion.path("round").path("deadline").isNull());
        }
        CLOCK.advance(Duration.ofSeconds(60));
        Instant released = CLOCK.instant();

        RestCalls.startVoting(sessionId, scrumMaster);

        List<String> deadlines = new ArrayList<>();
        for (SocketClient socket : sockets) {
            JsonNode voting =
                    socket.awaitState(view -> "VOTING".equals(view.path("phase").asText()), "phase VOTING");
            deadlines.add(voting.path("round").path("deadline").asText());
            assertEquals(30, voting.path("timerSeconds").asInt());
            assertFalse(voting.path("serverTime").asText().isEmpty());
        }
        assertEquals(deadlines.get(0), deadlines.get(1));
        assertEquals(released.plusSeconds(30), Instant.parse(deadlines.get(0)));

        CLOCK.advance(Duration.ofSeconds(30));

        for (SocketClient socket : sockets) {
            JsonNode revealed = socket.awaitState(
                    view -> "REVEALED".equals(view.path("phase").asText()), REALTIME, "phase REVEALED");
            assertEquals(1, revealed.path("history").size());
        }
    }
}
