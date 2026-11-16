package planningpoker.platform;

import jakarta.annotation.Priority;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.core.HttpHeaders;
import jakarta.ws.rs.ext.Provider;

@Authenticated
@Provider
@Priority(Priorities.AUTHENTICATION)
public class BearerTokenFilter implements ContainerRequestFilter {

    public static final String TOKEN_PROPERTY = "planningpoker.bearerToken";
    private static final String SCHEME = "Bearer ";

    @Override
    public void filter(ContainerRequestContext context) {
        String header = context.getHeaderString(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.regionMatches(true, 0, SCHEME, 0, SCHEME.length())) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, "A bearer token is required.");
        }
        String token = header.substring(SCHEME.length()).strip();
        if (token.isEmpty()) {
            throw new ApiException(ErrorCode.UNAUTHORIZED, "A bearer token is required.");
        }
        context.setProperty(TOKEN_PROPERTY, token);
    }
}
