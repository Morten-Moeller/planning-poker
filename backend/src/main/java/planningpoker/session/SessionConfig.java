package planningpoker.session;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;
import jakarta.validation.constraints.Min;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

@ConfigMapping(prefix = "planningpoker.session")
public interface SessionConfig {

    @WithDefault("12h")
    Duration ttl();

    @WithDefault("1000")
    @Min(1)
    int maxSessions();

    @WithDefault("50")
    @Min(1)
    int maxParticipants();

    @WithDefault("true")
    boolean remember();

    Optional<List<String>> allowedProjects();
}
