package planningpoker.platform;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import java.util.Map;
import org.junit.jupiter.api.Test;

@QuarkusTest
@TestProfile(ConfigResourceRememberOffTest.RememberOff.class)
class ConfigResourceRememberOffTest {

    public static class RememberOff implements QuarkusTestProfile {

        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of("planningpoker.session.remember", "false");
        }
    }

    @Test
    void reportsTheSettingWhenSwitchedOff() {
        given().when().get("/api/config").then().statusCode(200).body("rememberSessions", equalTo(false));
    }
}
