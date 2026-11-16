package planningpoker.session;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;
import java.time.Duration;

@ConfigMapping(prefix = "planningpoker.session")
public interface SessionConfig {

    @WithDefault("12h")
    Duration ttl();
}
