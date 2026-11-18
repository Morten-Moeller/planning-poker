package planningpoker.platform;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ConfigResourceTest {

    @Test
    void remembersSessionsByDefaultWithoutToken() {
        given().when().get("/api/config").then().statusCode(200).body("rememberSessions", equalTo(true));
    }
}
