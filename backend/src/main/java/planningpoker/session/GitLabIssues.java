package planningpoker.session;

import jakarta.enterprise.context.ApplicationScoped;
import java.time.Clock;
import java.time.temporal.ChronoUnit;
import planningpoker.gitlab.GitLabClient;
import planningpoker.gitlab.GitLabException;
import planningpoker.gitlab.GitLabIssue;
import planningpoker.gitlab.IssuePage;
import planningpoker.gitlab.IssueQuery;
import planningpoker.platform.ApiException;
import planningpoker.platform.ErrorCode;
import planningpoker.session.api.IssueListResponse;
import planningpoker.session.api.UpdatedPeriod;
import planningpoker.session.api.WeightFilter;

@ApplicationScoped
public class GitLabIssues {

    private final GitLabClient client;
    private final Clock clock;

    public GitLabIssues(GitLabClient client, Clock clock) {
        this.client = client;
        this.clock = clock;
    }

    public Issue loadIssue(String projectId, long iid) {
        try {
            GitLabIssue issue = client.loadIssue(projectId, iid);
            return new Issue(
                    issue.iid(), issue.title(), issue.description() == null ? "" : issue.description(), issue.webUrl());
        } catch (GitLabException e) {
            if (e.reason() == GitLabException.Reason.NOT_FOUND) {
                throw new ApiException(ErrorCode.ISSUE_NOT_FOUND, "The issue does not exist in the project.");
            }
            throw gitLabError(e);
        }
    }

    public IssueListResponse search(String projectId, String search, int page) {
        return search(projectId, search, page, WeightFilter.ALL, UpdatedPeriod.ALL);
    }

    public IssueListResponse search(
            String projectId, String search, int page, WeightFilter weight, UpdatedPeriod period) {
        IssueQuery query = new IssueQuery(
                search == null || search.isBlank() ? null : search,
                gitLabWeight(weight),
                period.length()
                        .map(length ->
                                clock.instant().truncatedTo(ChronoUnit.SECONDS).minus(length))
                        .orElse(null),
                page);
        try {
            IssuePage result = client.searchIssues(projectId, query);
            return new IssueListResponse(
                    result.items().stream()
                            .map(issue -> new IssueListResponse.IssueSummary(
                                    issue.iid(), issue.title(), issue.webUrl(), issue.weight()))
                            .toList(),
                    result.nextPage().orElse(null));
        } catch (GitLabException e) {
            throw gitLabError(e);
        }
    }

    private static String gitLabWeight(WeightFilter weight) {
        return switch (weight) {
            case NONE -> "None";
            case ANY -> "Any";
            case ALL -> null;
        };
    }

    static ApiException gitLabError(GitLabException e) {
        if (e.reason() == GitLabException.Reason.UNAUTHORIZED) {
            return new ApiException(
                    ErrorCode.GITLAB_ACCESS_DENIED, "GitLab denied access with the token of the backend.");
        }
        String detail = e.status() == 0 ? "GitLab did not answer." : "GitLab rejected the request.";
        return new ApiException(ErrorCode.GITLAB_ERROR, detail);
    }
}
