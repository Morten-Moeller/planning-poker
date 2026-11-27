package planningpoker.platform;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.eclipse.microprofile.config.ConfigProvider;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ConfigResourceTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    @Test
    void remembersSessionsByDefaultWithoutToken() {
        given().when().get("/api/config").then().statusCode(200).body("rememberSessions", equalTo(true));
    }

    @Test
    void reportsNoDemoModeWithAGitLabToken() {
        given().when().get("/api/config").then().statusCode(200).body("demo", equalTo(false));
    }

    @Test
    void writesNoWarningAboutTheDemoModeWithAGitLabToken() throws IOException {
        given().when().get("/api/health").then().statusCode(200);
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
            assertFalse(entry.path("message").asText().contains("Demo mode"), "line about the demo mode: " + line);
        }
        assertTrue(ownLines > 0, "no log lines of this process in " + logPath);
    }
}
