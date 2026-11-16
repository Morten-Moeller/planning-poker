package planningpoker.gitlab;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import io.quarkus.test.common.QuarkusTestResourceLifecycleManager;
import java.util.Map;

public class WireMockGitLab implements QuarkusTestResourceLifecycleManager {

    static final String TIMEOUT = "1s";

    private WireMockServer server;

    @Override
    public Map<String, String> start() {
        server = new WireMockServer(WireMockConfiguration.options().dynamicPort());
        server.start();
        return Map.of("planningpoker.gitlab.base-url", server.baseUrl(), "planningpoker.gitlab.timeout", TIMEOUT);
    }

    @Override
    public void stop() {
        if (server != null) {
            server.stop();
        }
    }

    @Override
    public void inject(TestInjector testInjector) {
        testInjector.injectIntoFields(server, new TestInjector.MatchesType(WireMockServer.class));
    }
}
