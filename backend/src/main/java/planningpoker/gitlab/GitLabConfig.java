package planningpoker.gitlab;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;
import java.time.Duration;

@ConfigMapping(prefix = "planningpoker.gitlab")
public interface GitLabConfig {

    @WithDefault("https://gitlab.com")
    String baseUrl();

    String token();

    @WithDefault("false")
    boolean writeWeight();

    @WithDefault("10s")
    Duration timeout();
}
