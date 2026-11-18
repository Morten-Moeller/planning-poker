package planningpoker.session.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.exc.UnrecognizedPropertyException;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import planningpoker.session.Phase;
import planningpoker.session.Role;

@QuarkusTest
class ContractExamplesTest {

    private static final Path EXAMPLES = Path.of("..", "contracts", "api", "examples");

    @Inject
    ObjectMapper quarkusMapper;

    private ObjectMapper strictMapper() {
        return quarkusMapper.copy().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
    }

    static Stream<Arguments> examples() {
        return Stream.of(
                Arguments.of("lobby-scrum-master.json", Phase.LOBBY, Role.SCRUM_MASTER),
                Arguments.of("lobby-developer.json", Phase.LOBBY, Role.DEVELOPER),
                Arguments.of("discussion-scrum-master.json", Phase.DISCUSSION, Role.SCRUM_MASTER),
                Arguments.of("discussion-developer.json", Phase.DISCUSSION, Role.DEVELOPER),
                Arguments.of("voting-scrum-master.json", Phase.VOTING, Role.SCRUM_MASTER),
                Arguments.of("voting-developer.json", Phase.VOTING, Role.DEVELOPER),
                Arguments.of("revealed-scrum-master.json", Phase.REVEALED, Role.SCRUM_MASTER),
                Arguments.of("revealed-developer.json", Phase.REVEALED, Role.DEVELOPER));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("examples")
    void readsTheExampleIntoTheSessionViewAndWritesItBackUnchanged(String file, Phase phase, Role role)
            throws IOException {
        ObjectMapper mapper = strictMapper();
        JsonNode original = mapper.readTree(EXAMPLES.resolve(file).toFile());

        SessionView view = mapper.treeToValue(original, SessionView.class);

        assertEquals(phase, view.phase());
        assertEquals(role, view.me().role());
        JsonNode written = mapper.readTree(mapper.writeValueAsString(view));
        assertEquals(original, written, file + " does not survive the round trip");
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("examples")
    void namesTheProjectAndTheWeightSettingForBothRoles(String file, Phase phase, Role role) throws IOException {
        SessionView view = strictMapper().readValue(EXAMPLES.resolve(file).toFile(), SessionView.class);

        assertNotNull(view.project(), "the example names the project");
        assertEquals(view.gitlabProjectId(), String.valueOf(view.project().id()));
        assertEquals(false, view.writeWeight(), "the examples show the default write-weight=false");
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("examples")
    void followsTheFilterRulesOfTheSnapshot(String file, Phase phase, Role role) throws IOException {
        SessionView view = strictMapper().readValue(EXAMPLES.resolve(file).toFile(), SessionView.class);

        if (role == Role.SCRUM_MASTER) {
            assertNotNull(view.preselectedIssueIid(), "scrum master sees the preselected issue");
            assertNotNull(view.invites(), "scrum master sees the invites");
        } else {
            assertNull(view.preselectedIssueIid(), "developer does not see the preselected issue");
            assertNull(view.invites(), "developer does not see the invites");
        }
        if (phase == Phase.LOBBY) {
            assertNull(view.activeIssue(), "no active issue in LOBBY");
            assertNull(view.round(), "no round in LOBBY");
            return;
        }
        assertNotNull(view.activeIssue());
        assertNotNull(view.round());
        if (phase == Phase.DISCUSSION) {
            assertNull(view.round().myVote(), "no vote in DISCUSSION");
            assertNull(view.round().votes(), "no votes in DISCUSSION");
            assertNull(view.round().stats(), "no stats in DISCUSSION");
            assertNull(view.round().deadline(), "no deadline in DISCUSSION");
            assertTrue(
                    view.participants().stream().noneMatch(SessionView.ParticipantView::hasVoted),
                    "nobody has voted in DISCUSSION");
            return;
        }
        if (phase == Phase.VOTING) {
            assertNull(view.round().votes(), "votes are hidden until the reveal");
            assertNull(view.round().stats(), "stats are hidden until the reveal");
        } else {
            assertNotNull(view.round().votes());
            assertNotNull(view.round().stats());
            assertEquals(1, view.history().size(), "the revealed round is in the history");
            assertNull(view.history().getFirst().finalCard(), "not confirmed yet");
        }
        if (role == Role.SCRUM_MASTER) {
            assertNull(view.round().myVote(), "the scrum master has no vote");
        } else {
            assertNotNull(view.round().myVote(), "the developer sees the own vote");
        }
    }

    @Test
    void failsOnAnUnknownField() throws IOException {
        ObjectMapper mapper = strictMapper();
        ObjectNode copy = (ObjectNode) mapper.readTree(Files.readString(EXAMPLES.resolve("voting-developer.json")));
        copy.put("unknownField", "x");

        UnrecognizedPropertyException error =
                assertThrows(UnrecognizedPropertyException.class, () -> mapper.treeToValue(copy, SessionView.class));

        assertTrue(error.getMessage().contains("unknownField"), error.getMessage());
    }

    @Test
    void failsOnAnUnknownNestedField() throws IOException {
        ObjectMapper mapper = strictMapper();
        ObjectNode copy = (ObjectNode) mapper.readTree(Files.readString(EXAMPLES.resolve("voting-developer.json")));
        ((ObjectNode) copy.get("round")).put("unknownField", 1);

        assertThrows(UnrecognizedPropertyException.class, () -> mapper.treeToValue(copy, SessionView.class));
    }
}
