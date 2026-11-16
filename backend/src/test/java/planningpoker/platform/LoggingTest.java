package planningpoker.platform;

import static io.restassured.RestAssured.given;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import org.eclipse.microprofile.config.ConfigProvider;
import org.junit.jupiter.api.Test;

@QuarkusTest
class LoggingTest {

    private static final ObjectMapper JSON = new ObjectMapper();

    @Test
    void writesJsonLinesWithoutTheGitlabToken() throws IOException {
        given().when().get("/api/health").then().statusCode(200);
        String logPath = ConfigProvider.getConfig().getValue("quarkus.log.file.path", String.class);
        String token = ConfigProvider.getConfig().getValue("planningpoker.gitlab.token", String.class);

        List<String> lines = Files.readAllLines(Path.of(logPath)).stream()
                .filter(line -> !line.isBlank())
                .toList();

        assertFalse(lines.isEmpty(), "no log lines in " + logPath);
        for (String line : lines) {
            assertDoesNotThrow(() -> JSON.readTree(line), "not a JSON line: " + line);
            assertTrue(JSON.readTree(line).has("message"), "no message field: " + line);
            assertFalse(line.contains(token), "token value in log line: " + line);
        }
    }
}
