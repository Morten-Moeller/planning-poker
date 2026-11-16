package planningpoker.realtime;

import io.smallrye.config.ConfigMapping;
import io.smallrye.config.WithDefault;
import java.time.Duration;

@ConfigMapping(prefix = "planningpoker.realtime")
public interface RealtimeConfig {

    @WithDefault("5s")
    Duration authTimeout();
}
