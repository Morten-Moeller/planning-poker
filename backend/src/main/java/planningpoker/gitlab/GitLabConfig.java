package planningpoker.gitlab;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;
import java.time.Duration;
import java.util.Optional;

@ConfigMapping(prefix = "planningpoker.gitlab")
public interface GitLabConfig {

    @WithDefault("https://gitlab.com")
    String baseUrl();

    Optional<String> token();

    default boolean demo() {
        return token().map(String::isBlank).orElse(true);
    }

    @WithDefault("false")
    boolean writeWeight();

    @WithDefault("10s")
    Duration timeout();
}
