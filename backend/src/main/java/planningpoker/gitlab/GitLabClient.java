package planningpoker.gitlab;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.rest.client.reactive.QuarkusRestClientBuilder;
import io.quarkus.runtime.Startup;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.ProcessingException;
import jakarta.ws.rs.WebApplicationException;
import jakarta.ws.rs.client.ClientRequestContext;
import jakarta.ws.rs.client.ClientRequestFilter;
import jakarta.ws.rs.core.GenericType;
import jakarta.ws.rs.core.Response;
import jakarta.ws.rs.ext.ContextResolver;
import java.net.URI;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.function.Supplier;
import org.jboss.logging.Logger;

@Startup
@ApplicationScoped
public class GitLabClient {

    private static final Logger LOG = Logger.getLogger(GitLabClient.class);

    static final int PAGE_SIZE = 20;
    static final String TOKEN_HEADER = "PRIVATE-TOKEN";
    static final String NEXT_PAGE_HEADER = "x-next-page";

    private final GitLabApi api;

    public GitLabClient(GitLabConfig config) {
        long timeoutMillis = config.timeout().toMillis();
        ObjectMapper mapper = new ObjectMapper().disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        this.api = QuarkusRestClientBuilder.newBuilder()
                .baseUri(URI.create(config.baseUrl()))
                .connectTimeout(timeoutMillis, TimeUnit.MILLISECONDS)
                .readTimeout(timeoutMillis, TimeUnit.MILLISECONDS)
                .register(new PrivateTokenFilter(config.token()))
                .register(new JacksonContext(mapper))
                .build(GitLabApi.class);
    }

    public IssuePage searchIssues(String projectId, String search, int page) {
        return call("searchIssues", projectId, () -> {
            try (Response response = api.searchIssues(projectId, "opened", search, PAGE_SIZE, page)) {
                failOnError("searchIssues", projectId, response);
                List<GitLabIssue> items = response.readEntity(new GenericType<List<GitLabIssue>>() {});
                return new IssuePage(items, nextPage(response));
            }
        });
    }

    public GitLabIssue loadIssue(String projectId, long iid) {
        return call("loadIssue", projectId, () -> api.loadIssue(projectId, iid));
    }

    public void addNote(String projectId, long iid, String body) {
        call("addNote", projectId, () -> {
            try (Response response = api.addNote(projectId, iid, new NoteRequest(body))) {
                failOnError("addNote", projectId, response);
                return null;
            }
        });
    }

    public void setWeight(String projectId, long iid, int weight) {
        call("setWeight", projectId, () -> {
            try (Response response = api.setWeight(projectId, iid, new WeightRequest(weight))) {
                failOnError("setWeight", projectId, response);
                return null;
            }
        });
    }

    private static <T> T call(String operation, String projectId, Supplier<T> request) {
        try {
            return request.get();
        } catch (WebApplicationException e) {
            throw fromStatus(operation, projectId, e.getResponse().getStatus());
        } catch (ProcessingException e) {
            logFailure(operation, projectId, 0, GitLabException.Reason.UNAVAILABLE);
            throw new GitLabException(operation, "no response or unreadable response", e);
        }
    }

    private static void failOnError(String operation, String projectId, Response response) {
        if (response.getStatus() >= 400) {
            throw fromStatus(operation, projectId, response.getStatus());
        }
    }

    private static GitLabException fromStatus(String operation, String projectId, int status) {
        GitLabException.Reason reason =
                switch (status) {
                    case 401, 403 -> GitLabException.Reason.UNAUTHORIZED;
                    case 404 -> GitLabException.Reason.NOT_FOUND;
                    default -> GitLabException.Reason.UNAVAILABLE;
                };
        logFailure(operation, projectId, status, reason);
        return new GitLabException(operation, status, reason);
    }

    private static void logFailure(String operation, String projectId, int status, GitLabException.Reason reason) {
        LOG.warnf(
                "GitLab call failed: operation=%s projectId=%s status=%d reason=%s",
                operation, projectId == null ? "" : projectId.replaceAll("\\p{Cntrl}", "_"), status, reason);
    }

    private static Optional<Integer> nextPage(Response response) {
        String value = response.getHeaderString(NEXT_PAGE_HEADER);
        if (value == null || value.isBlank()) {
            return Optional.empty();
        }
        try {
            return Optional.of(Integer.valueOf(value.trim()));
        } catch (NumberFormatException e) {
            throw new GitLabException("searchIssues", "invalid header " + NEXT_PAGE_HEADER, e);
        }
    }

    private record JacksonContext(ObjectMapper mapper) implements ContextResolver<ObjectMapper> {

        @Override
        public ObjectMapper getContext(Class<?> type) {
            return mapper;
        }
    }

    private static final class PrivateTokenFilter implements ClientRequestFilter {

        private final String token;

        private PrivateTokenFilter(String token) {
            this.token = token;
        }

        @Override
        public void filter(ClientRequestContext context) {
            context.getHeaders().putSingle(TOKEN_HEADER, token);
        }

        @Override
        public String toString() {
            return "PrivateTokenFilter";
        }
    }
}
