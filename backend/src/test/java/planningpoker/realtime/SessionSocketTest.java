package planningpoker.realtime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import com.github.tomakehurst.wiremock.WireMockServer;
import io.quarkus.test.common.WithTestResource;
import io.quarkus.test.common.http.TestHTTPResource;
import io.quarkus.test.junit.QuarkusTest;
import java.io.IOException;
import java.net.URI;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import planningpoker.gitlab.WireMockGitLab;

@QuarkusTest
@WithTestResource(WireMockGitLab.class)
class SessionSocketTest {

    private static final Path CONTRACT = Path.of("..", "contracts", "api", "openapi.yaml");
    private static final List<String> MESSAGE_SCHEMAS = List.of(
            "WebSocketAuth",
            "WebSocketSessionState",
            "WebSocketRoundAllVoted",
            "WebSocketError",
            "WebSocketPing",
            "WebSocketPong");

    @TestHTTPResource("/")
    URI baseUri;

    WireMockServer gitlab;

    private final List<SocketClient> clients = new ArrayList<>();
    private String suffix;
    private String sessionId;
    private RestCalls.Participant scrumMaster;

    @BeforeEach
    void createSession() {
        gitlab.resetAll();
        RestCalls.stubIssue(gitlab);
        suffix = UUID.randomUUID().toString().substring(0, 8);
        RestCalls.Created created = RestCalls.createSession("Anna " + suffix);
        sessionId = created.sessionId();
        scrumMaster = created.scrumMaster();
    }

    @AfterEach
    void closeClients() {
        clients.forEach(SocketClient::close);
    }

    private SocketClient open() {
        SocketClient client = SocketClient.connect(baseUri, sessionId);
        clients.add(client);
        return client;
    }

    private SocketClient connectAs(RestCalls.Participant participant) {
        SocketClient client = open();
        client.auth(participant.token());
        client.awaitState(
                view -> view.path("me").path("participantId").asText().equals(participant.participantId()),
                "me.participantId " + participant.participantId());
        return client;
    }

    private RestCalls.Participant join(String name) {
        return RestCalls.join(sessionId, name + " " + suffix);
    }

    private static JsonNode participant(JsonNode view, RestCalls.Participant participant) {
        for (JsonNode node : view.path("participants")) {
            if (node.path("id").asText().equals(participant.participantId())) {
                return node;
            }
        }
        return null;
    }

    private static boolean shows(JsonNode view, RestCalls.Participant participant, String field, boolean value) {
        JsonNode node = participant(view, participant);
        return node != null && node.path(field).asBoolean() == value;
    }

    private static List<String> types(List<JsonNode> messages) {
        return messages.stream().map(message -> message.path("type").asText()).toList();
    }

    @Test
    void sendsTheFilteredSnapshotFirstAndAJoinWithinOneSecond() {
        SocketClient client = open();
        client.auth(scrumMaster.token());

        JsonNode first = client.await(WsMessage.SESSION_STATE);
        assertEquals(first, client.received().get(0));
        JsonNode view = first.path("payload");
        assertEquals(
                scrumMaster.participantId(),
                view.path("me").path("participantId").asText());
        assertEquals("SCRUM_MASTER", view.path("me").path("role").asText());
        assertEquals(RestCalls.ISSUE, view.path("preselectedIssueIid").asLong());

        RestCalls.Participant developer = join("Ben");

        JsonNode afterJoin = client.awaitState(
                state -> participant(state, developer) != null,
                Duration.ofSeconds(1),
                "participant " + developer.participantId());
        assertEquals("DEVELOPER", participant(afterJoin, developer).path("role").asText());
    }

    @Test
    void hidesForeignCardsAfterAVote() {
        RestCalls.Participant ben = join("Ben");
        RestCalls.Participant cem = join("Cem");
        SocketClient master = connectAs(scrumMaster);
        SocketClient benClient = connectAs(ben);
        SocketClient cemClient = connectAs(cem);
        RestCalls.releaseIssue(sessionId, scrumMaster);
        RestCalls.vote(sessionId, cem, "8");
        cemClient.awaitState(view -> view.path("round").path("myVote").asText().equals("8"), "myVote 8 of Cem");

        RestCalls.vote(sessionId, ben, "5");

        JsonNode benView = benClient.awaitState(view -> shows(view, ben, "hasVoted", true), "hasVoted of Ben");
        assertEquals("5", benView.path("round").path("myVote").asText());
        JsonNode cemView = cemClient.awaitState(view -> shows(view, ben, "hasVoted", true), "hasVoted of Ben");
        assertEquals("8", cemView.path("round").path("myVote").asText());
        assertTrue(cemView.path("round").path("votes").isNull());
        JsonNode masterView = master.awaitState(view -> shows(view, ben, "hasVoted", true), "hasVoted of Ben");
        assertTrue(masterView.path("round").path("myVote").isNull());
        assertTrue(masterView.path("round").path("votes").isNull());
        assertTrue(masterView.path("round").path("stats").isNull());
        assertFalse(masterView.toString().contains(ben.token()));
    }

    @Test
    void sendsTheSameVotesAndStatsToEveryClientAfterTheReveal() {
        RestCalls.Participant ben = join("Ben");
        RestCalls.Participant cem = join("Cem");
        List<SocketClient> all = List.of(connectAs(scrumMaster), connectAs(ben), connectAs(cem));
        RestCalls.releaseIssue(sessionId, scrumMaster);
        RestCalls.vote(sessionId, ben, "5");
        RestCalls.vote(sessionId, cem, "8");

        RestCalls.reveal(sessionId, scrumMaster);

        List<JsonNode> views = all.stream()
                .map(client ->
                        client.awaitState(view -> view.path("phase").asText().equals("REVEALED"), "phase REVEALED"))
                .toList();
        JsonNode votes = views.get(0).path("round").path("votes");
        JsonNode stats = views.get(0).path("round").path("stats");
        assertEquals(2, votes.size());
        assertFalse(stats.isNull());
        for (JsonNode view : views) {
            assertEquals(votes, view.path("round").path("votes"));
            assertEquals(stats, view.path("round").path("stats"));
        }
    }

    @Test
    void sendsAllVotedOnceAndOnlyToTheScrumMaster() {
        RestCalls.Participant ben = join("Ben");
        RestCalls.Participant cem = join("Cem");
        SocketClient master = connectAs(scrumMaster);
        SocketClient benClient = connectAs(ben);
        SocketClient cemClient = connectAs(cem);
        RestCalls.releaseIssue(sessionId, scrumMaster);
        RestCalls.vote(sessionId, ben, "5");
        assertFalse(types(master.untilPong()).contains(WsMessage.ROUND_ALL_VOTED));

        RestCalls.vote(sessionId, cem, "8");

        JsonNode allVoted = master.await(WsMessage.ROUND_ALL_VOTED);
        assertEquals(1, allVoted.path("payload").path("roundNumber").asInt());
        RestCalls.vote(sessionId, ben, "13");
        master.untilPong();
        benClient.untilPong();
        cemClient.untilPong();
        assertEquals(1, master.count(WsMessage.ROUND_ALL_VOTED));
        assertEquals(0, benClient.count(WsMessage.ROUND_ALL_VOTED));
        assertEquals(0, cemClient.count(WsMessage.ROUND_ALL_VOTED));
    }

    @Test
    void rejectsAnUnknownTokenAndClosesTheConnection() {
        SocketClient client = open();

        client.auth("unknown-token-" + suffix);

        JsonNode error = client.await(WsMessage.ERROR);
        assertEquals("UNAUTHORIZED", error.path("payload").path("errorCode").asText());
        client.awaitClose();
        assertEquals(0, client.count(WsMessage.SESSION_STATE));
    }

    @Test
    void rejectsAnUnknownSessionAndClosesTheConnection() {
        SocketClient client = SocketClient.connect(baseUri, "ZZZZZZZZ");
        clients.add(client);

        client.auth(scrumMaster.token());

        JsonNode error = client.await(WsMessage.ERROR);
        assertEquals(
                "SESSION_NOT_FOUND", error.path("payload").path("errorCode").asText());
        client.awaitClose();
    }

    @Test
    void closesAConnectionWithoutAuthAfterTheDeadline() {
        SocketClient client = open();

        client.awaitClose();

        assertEquals(List.of(), client.received());
    }

    @Test
    void answersAMessageBeforeAuthWithAnError() {
        SocketClient client = open();

        client.send("{\"type\":\"ping\"}");

        JsonNode error = client.await(WsMessage.ERROR);
        assertEquals("UNAUTHORIZED", error.path("payload").path("errorCode").asText());
        client.auth(scrumMaster.token());
        client.awaitState(
                view -> view.path("me").path("participantId").asText().equals(scrumMaster.participantId()),
                "snapshot after auth");
    }

    @Test
    void answersPingWithPong() {
        SocketClient client = connectAs(scrumMaster);

        client.send("{\"type\":\"ping\"}");

        JsonNode pong = client.await(WsMessage.PONG);
        assertFalse(pong.has("payload"));
    }

    @Test
    void showsTheConnectionStatusOnCloseAndOnReconnect() {
        RestCalls.Participant ben = join("Ben");
        SocketClient master = connectAs(scrumMaster);
        SocketClient benClient = connectAs(ben);
        master.awaitState(view -> shows(view, ben, "connected", true), "Ben connected");

        benClient.close();

        master.awaitState(view -> shows(view, ben, "connected", false), "Ben disconnected");
        SocketClient again = connectAs(ben);
        JsonNode own = again.received().get(0).path("payload");
        assertTrue(shows(own, ben, "connected", true));
        master.awaitState(view -> shows(view, ben, "connected", true), "Ben connected again");
    }

    @Test
    void takesTheTokenOnlyFromTheAuthMessage() {
        SocketClient client =
                SocketClient.connect(baseUri, "/ws/sessions/" + sessionId + "?token=" + scrumMaster.token(), "query");
        clients.add(client);

        client.awaitClose();

        assertEquals(List.of(), client.received());
    }

    @Test
    void usesTheEnvelopeAndTheTypesOfTheContract() throws IOException {
        Set<String> contractTypes = contractTypes();
        RestCalls.Participant ben = join("Ben");
        SocketClient master = connectAs(scrumMaster);
        SocketClient benClient = connectAs(ben);
        RestCalls.releaseIssue(sessionId, scrumMaster);
        RestCalls.vote(sessionId, ben, "5");
        master.await(WsMessage.ROUND_ALL_VOTED);
        master.untilPong();
        benClient.untilPong();
        SocketClient rejected = open();
        rejected.auth("unknown-" + suffix);
        rejected.awaitClose();

        List<JsonNode> messages = new ArrayList<>();
        messages.addAll(master.received());
        messages.addAll(benClient.received());
        messages.addAll(rejected.received());

        Set<String> seen = new HashSet<>();
        for (JsonNode message : messages) {
            Set<String> fields = new HashSet<>();
            message.fieldNames().forEachRemaining(fields::add);
            assertTrue(Set.of("type", "payload").containsAll(fields), "envelope of " + message);
            assertTrue(contractTypes.contains(message.path("type").asText()), "type of " + message);
            seen.add(message.path("type").asText());
        }
        assertEquals(Set.of("session.state", "round.allVoted", "pong", "error"), seen);
    }

    private static Set<String> contractTypes() throws IOException {
        JsonNode schemas = new ObjectMapper(new YAMLFactory())
                .readTree(CONTRACT.toFile())
                .path("components")
                .path("schemas");
        Set<String> types = new HashSet<>();
        for (String schema : MESSAGE_SCHEMAS) {
            schemas.path(schema)
                    .path("properties")
                    .path("type")
                    .path("enum")
                    .forEach(value -> types.add(value.asText()));
        }
        assertEquals(
                Set.of(
                        WsMessage.AUTH,
                        WsMessage.SESSION_STATE,
                        WsMessage.ROUND_ALL_VOTED,
                        WsMessage.ERROR,
                        WsMessage.PING,
                        WsMessage.PONG),
                types);
        return types;
    }
}
