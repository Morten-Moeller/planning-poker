package planningpoker.session.api;

import java.time.OffsetDateTime;
import java.util.List;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import planningpoker.session.Card;
import planningpoker.session.Phase;
import planningpoker.session.Role;

@Schema(
        description =
                "Snapshot of the session, filtered for the receiver: hidden cards of other participants are missing until the reveal, preselectedIssueIid appears only for the scrum master. In phase LOBBY activeIssue and round are null. timerSeconds, serverTime and round.deadline are the same for both roles.",
        requiredProperties = {
            "sessionId",
            "gitlabProjectId",
            "project",
            "writeWeight",
            "phase",
            "me",
            "participants",
            "preselectedIssueIid",
            "activeIssue",
            "round",
            "history",
            "timerSeconds",
            "serverTime"
        })
public record SessionView(
        @Schema(description = "Session id, 8 characters.", examples = "K7P2QX9M") String sessionId,
        @Schema(description = "Id or path of the GitLab project.", examples = "1234") String gitlabProjectId,
        @Schema(nullable = true) ProjectView project,
        @Schema(
                        description =
                                "Whether the confirmation also sets a number card as weight of the GitLab issue (setting planningpoker.gitlab.write-weight).")
                boolean writeWeight,
        Phase phase,
        Me me,
        @Schema(description = "Every participant of the session, including disconnected ones.")
                List<ParticipantView> participants,
        @Schema(
                        description = "Iid of the issue given at creation; null for developers.",
                        nullable = true,
                        examples = "42")
                Long preselectedIssueIid,
        @Schema(nullable = true) IssueView activeIssue,
        @Schema(nullable = true) RoundView round,
        @Schema(description = "Revealed rounds of the session, newest first.") List<HistoryEntryView> history,
        @Schema(
                        description =
                                "Timer of the session in seconds for every round that starts from now on; null when the timer is off.",
                        nullable = true,
                        examples = "30")
                Integer timerSeconds,
        @Schema(
                        description =
                                "Time of the server when the snapshot was built, RFC 3339 with offset. Clients compute the remaining time of the round from it.",
                        examples = "2026-11-16T09:15:00Z")
                OffsetDateTime serverTime) {

    @Schema(
            description =
                    "The GitLab project of the session, loaded once at creation; null when GitLab did not answer with the project.",
            requiredProperties = {"id", "name", "pathWithNamespace", "webUrl"})
    public record ProjectView(
            @Schema(description = "Numeric id of the project.", examples = "1234") long id,
            @Schema(description = "Name of the project.", examples = "Frontend") String name,
            @Schema(description = "Path of the project with its namespace.", examples = "webshop/frontend")
                    String pathWithNamespace,
            @Schema(description = "Link to the project in GitLab.", examples = "https://gitlab.com/webshop/frontend")
                    String webUrl) {}

    @Schema(
            description = "Identity of the receiver of the snapshot.",
            requiredProperties = {"participantId", "role"})
    public record Me(
            @Schema(description = "Participant id (UUIDv7).", examples = "01973f5e-2a4c-7d2e-9f30-4b5c6d7e8f90")
                    String participantId,
            Role role) {}

    @Schema(
            description = "A participant as every receiver sees it.",
            requiredProperties = {"id", "name", "role", "connected", "hasVoted"})
    public record ParticipantView(
            @Schema(description = "Participant id (UUIDv7).", examples = "01973f5e-2a4b-7c1d-8e2f-3a4b5c6d7e8f")
                    String id,
            @Schema(description = "Display name.", examples = "Anna") String name,
            Role role,
            @Schema(description = "Whether the participant is connected over the WebSocket.") boolean connected,
            @Schema(description = "Whether the participant has chosen a card in the running round; without the value.")
                    boolean hasVoted) {}

    @Schema(
            description = "The active GitLab issue.",
            requiredProperties = {"iid", "title", "description", "webUrl"})
    public record IssueView(
            @Schema(description = "Iid of the issue inside the project.", examples = "42") long iid,
            @Schema(description = "Title of the issue.", examples = "Login page") String title,
            @Schema(description = "Description of the issue as Markdown.", examples = "As a user I want to log in.")
                    String description,
            @Schema(
                            description = "Link to the issue in GitLab.",
                            examples = "https://gitlab.com/group/project/-/issues/42")
                    String webUrl) {}

    @Schema(
            description =
                    "The round of the active issue. myVote is the card of the receiver and null without a vote or for the scrum master; votes and stats are null until the reveal. deadline is the time at which the server reveals the round by itself, RFC 3339 with offset, and null when the round started without a timer.",
            requiredProperties = {"number", "deadline", "myVote", "allVoted", "confirming", "votes", "stats"})
    public record RoundView(
            @Schema(description = "Round number, starting at 1 per issue.", examples = "1") int number,
            @Schema(nullable = true) OffsetDateTime deadline,
            @Schema(nullable = true) Card myVote,
            @Schema(description = "Whether every connected developer has voted.") boolean allVoted,
            @Schema(description = "Whether the result is being written to GitLab.") boolean confirming,
            @Schema(description = "Every vote with its card; null until the reveal.", nullable = true)
                    List<VoteView> votes,
            @Schema(nullable = true) RoundStats stats) {}

    @Schema(
            description = "A revealed vote.",
            requiredProperties = {"participantId", "name", "card"})
    public record VoteView(
            @Schema(description = "Participant id (UUIDv7).", examples = "01973f5e-2a4c-7d2e-9f30-4b5c6d7e8f90")
                    String participantId,
            @Schema(description = "Display name of the participant.", examples = "Ben") String name,
            Card card) {}

    @Schema(
            description = "Evaluation of a revealed round.",
            requiredProperties = {"distribution", "average", "mostFrequent"})
    public record RoundStats(
            @Schema(description = "Chosen cards with their count, in deck order.") List<CardCount> distribution,
            @Schema(
                            description =
                                    "Average over the number cards, rounded to one decimal; null without a number card.",
                            nullable = true,
                            examples = "4.3")
                    Double average,
            @Schema(description = "Most frequent cards; several on a tie.") List<Card> mostFrequent) {}

    @Schema(
            description = "Count of one card in a round.",
            requiredProperties = {"card", "count"})
    public record CardCount(
            Card card, @Schema(description = "How often the card was chosen.", examples = "2") int count) {}

    @Schema(
            description =
                    "A revealed round in the history of the session. finalCard is the confirmed card and null while not confirmed.",
            requiredProperties = {"issueIid", "issueTitle", "roundNumber", "votes", "stats", "finalCard", "revealedAt"})
    public record HistoryEntryView(
            @Schema(description = "Iid of the issue inside the project.", examples = "42") long issueIid,
            @Schema(description = "Title of the issue at the reveal.", examples = "Login page") String issueTitle,
            @Schema(description = "Round number.", examples = "1") int roundNumber,
            @Schema(description = "Every vote of the round.") List<VoteView> votes,
            RoundStats stats,
            @Schema(nullable = true) Card finalCard,
            @Schema(description = "Time of the reveal, RFC 3339 with offset.", examples = "2026-11-16T09:15:30Z")
                    OffsetDateTime revealedAt) {}
}
