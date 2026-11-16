package planningpoker.session;

import jakarta.annotation.Priority;
import jakarta.enterprise.inject.Instance;
import jakarta.inject.Inject;
import jakarta.ws.rs.Priorities;
import jakarta.ws.rs.container.ContainerRequestContext;
import jakarta.ws.rs.container.ContainerRequestFilter;
import jakarta.ws.rs.container.ResourceInfo;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.ext.Provider;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import planningpoker.platform.Authenticated;
import planningpoker.platform.BearerTokenFilter;
import planningpoker.platform.ErrorCode;

@Authenticated
@Provider
@Priority(Priorities.AUTHORIZATION)
public class ActorFilter implements ContainerRequestFilter {

    public static final String ACTOR_PROPERTY = "planningpoker.actor";

    @Context
    ResourceInfo resourceInfo;

    @Inject
    Instance<SessionRegistry> registry;

    @Override
    public void filter(ContainerRequestContext context) {
        String sessionId = context.getUriInfo().getPathParameters().getFirst("id");
        String token = (String) context.getProperty(BearerTokenFilter.TOKEN_PROPERTY);
        Actor actor = registry.get().read(sessionId, session -> session.participants().stream()
                .filter(participant -> sameToken(participant.token(), token))
                .findFirst()
                .map(participant -> new Actor(sessionId, participant.id(), participant.role()))
                .orElseThrow(() -> new SessionException(ErrorCode.UNAUTHORIZED, "Unknown token.")));
        RequiresRole required = resourceInfo.getResourceMethod().getAnnotation(RequiresRole.class);
        if (required != null && actor.role() != required.value()) {
            throw new SessionException(
                    ErrorCode.FORBIDDEN_ROLE, "This action needs the role " + required.value() + ".");
        }
        context.setProperty(ACTOR_PROPERTY, actor);
    }

    public static Actor actorOf(ContainerRequestContext context) {
        return (Actor) context.getProperty(ACTOR_PROPERTY);
    }

    private static boolean sameToken(String expected, String given) {
        return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8), given.getBytes(StandardCharsets.UTF_8));
    }
}
