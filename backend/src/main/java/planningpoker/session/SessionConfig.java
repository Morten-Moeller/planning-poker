package planningpoker.session;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

@ConfigMapping(prefix = "planningpoker.session")
public interface SessionConfig {

    @WithDefault("12h")
    Duration ttl();

    @WithDefault("1000")
    int maxSessions();

    @WithDefault("50")
    int maxParticipants();

    Optional<List<String>> allowedProjects();
}
