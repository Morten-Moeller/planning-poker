package planningpoker.session;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import planningpoker.platform.ErrorCode;
import planningpoker.session.api.SessionView;

public final class SessionViewMapper {

    public SessionView toView(Session session, String receiverId, Instant serverTime) {
        Participant receiver = session.participant(receiverId)
                .orElseThrow(() -> new SessionException(ErrorCode.UNAUTHORIZED, "Unknown participant."));
        boolean scrumMaster = receiver.role() == Role.SCRUM_MASTER;
        return new SessionView(
                session.id(),
                session.gitlabProjectId(),
                session.project().map(SessionViewMapper::projectView).orElse(null),
                session.writeWeight(),
                session.phase(),
                new SessionView.Me(receiver.id(), receiver.role()),
                session.participants().stream()
                        .map(participant -> participantView(session, participant))
                        .toList(),
                scrumMaster ? session.preselectedIssueIid().orElse(null) : null,
                session.activeIssue().map(SessionViewMapper::issueView).orElse(null),
                session.round()
                        .map(round -> roundView(session, round, receiverId))
                        .orElse(null),
                session.history().stream().map(SessionViewMapper::historyView).toList(),
                session.timerSeconds().orElse(null),
                serverTime.atOffset(ZoneOffset.UTC),
                scrumMaster ? new SessionView.Invites(session.developerInvite(), session.viewerInvite()) : null);
    }

    private static SessionView.ParticipantView participantView(Session session, Participant participant) {
        boolean hasVoted =
                session.round().map(round -> round.hasVoted(participant.id())).orElse(false);
        return new SessionView.ParticipantView(
                participant.id(), participant.name(), participant.role(), participant.connected(), hasVoted);
    }

    private static SessionView.ProjectView projectView(Project project) {
        return new SessionView.ProjectView(project.id(), project.name(), project.pathWithNamespace(), project.webUrl());
    }

    private static SessionView.IssueView issueView(Issue issue) {
        return new SessionView.IssueView(issue.iid(), issue.title(), issue.description(), issue.webUrl());
    }

    private static SessionView.RoundView roundView(Session session, Round round, String receiverId) {
        boolean revealed = round.revealed();
        return new SessionView.RoundView(
                round.number(),
                round.deadline()
                        .map(deadline -> deadline.atOffset(ZoneOffset.UTC))
                        .orElse(null),
                round.cardOf(receiverId).orElse(null),
                session.allVoted(),
                round.confirming(),
                revealed ? votesView(session, round) : null,
                revealed ? round.stats().map(SessionViewMapper::statsView).orElse(null) : null);
    }

    private static List<SessionView.VoteView> votesView(Session session, Round round) {
        return session.participants().stream()
                .filter(participant -> round.hasVoted(participant.id()))
                .map(participant -> new SessionView.VoteView(
                        participant.id(),
                        participant.name(),
                        round.cardOf(participant.id()).orElseThrow()))
                .toList();
    }

    private static List<SessionView.VoteView> votesView(List<Vote> votes) {
        return votes.stream()
                .map(vote -> new SessionView.VoteView(vote.participantId(), vote.name(), vote.card()))
                .toList();
    }

    private static SessionView.RoundStats statsView(RoundStats stats) {
        return new SessionView.RoundStats(
                stats.distribution().stream()
                        .map(count -> new SessionView.CardCount(count.card(), count.count()))
                        .toList(),
                stats.average().isPresent() ? stats.average().getAsDouble() : null,
                stats.mostFrequent());
    }

    private static SessionView.HistoryEntryView historyView(HistoryEntry entry) {
        return new SessionView.HistoryEntryView(
                entry.issueIid(),
                entry.issueTitle(),
                entry.roundNumber(),
                votesView(entry.votes()),
                statsView(entry.stats()),
                entry.finalCard().orElse(null),
                entry.revealedAt().atOffset(ZoneOffset.UTC));
    }
}
