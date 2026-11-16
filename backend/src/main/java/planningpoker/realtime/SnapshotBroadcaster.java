package planningpoker.realtime;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import jakarta.inject.Inject;
import java.time.Clock;
import java.time.Instant;
import java.util.Set;
import org.jboss.logging.Logger;
import planningpoker.session.Role;
import planningpoker.session.RoundCompleted;
import planningpoker.session.SessionChanged;
import planningpoker.session.SessionException;
import planningpoker.session.SessionRegistry;
import planningpoker.session.SessionViewMapper;

@ApplicationScoped
public class SnapshotBroadcaster {

    private static final Logger LOG = Logger.getLogger(SnapshotBroadcaster.class);

    private final SessionViewMapper mapper = new SessionViewMapper();

    @Inject
    ConnectionRegistry connections;

    @Inject
    SessionRegistry registry;

    @Inject
    MessageSender sender;

    @Inject
    Clock clock;

    void onSessionChanged(@Observes SessionChanged event) {
        Set<ConnectionRegistry.Entry> entries = connections.of(event.sessionId());
        if (entries.isEmpty()) {
            return;
        }
        try {
            registry.read(event.sessionId(), session -> {
                Instant serverTime = clock.instant();
                for (ConnectionRegistry.Entry entry : entries) {
                    try {
                        sender.send(
                                entry.connection(),
                                WsMessage.sessionState(mapper.toView(session, entry.participantId(), serverTime)));
                    } catch (RuntimeException e) {
                        LOG.debugf(
                                "Snapshot for connection %s failed: %s",
                                entry.connection().id(), e.getClass().getSimpleName());
                        sender.close(entry.connection(), MessageSender.SEND_FAILED);
                    }
                }
                return null;
            });
        } catch (SessionException e) {
            LOG.debugf("Snapshot for session %s skipped: %s", event.sessionId(), e.errorCode());
        }
    }

    void onRoundCompleted(@Observes RoundCompleted event) {
        for (ConnectionRegistry.Entry entry : connections.of(event.sessionId())) {
            if (entry.role() == Role.SCRUM_MASTER) {
                try {
                    sender.send(entry.connection(), WsMessage.allVoted(event.roundNumber()));
                } catch (RuntimeException e) {
                    LOG.debugf(
                            "round.allVoted for connection %s failed: %s",
                            entry.connection().id(), e.getClass().getSimpleName());
                    sender.close(entry.connection(), MessageSender.SEND_FAILED);
                }
            }
        }
    }
}
