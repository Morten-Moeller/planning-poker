package planningpoker.session;

import jakarta.enterprise.context.ApplicationScoped;
import planningpoker.gitlab.GitLabClient;
import planningpoker.gitlab.GitLabException;
import planningpoker.gitlab.GitLabIssue;
import planningpoker.gitlab.IssuePage;
import planningpoker.platform.ApiException;
import planningpoker.platform.ErrorCode;
import planningpoker.session.api.IssueListResponse;

@ApplicationScoped
public class GitLabIssues {

    private final GitLabClient client;

    public GitLabIssues(GitLabClient client) {
        this.client = client;
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
        try {
            IssuePage result = client.searchIssues(projectId, search == null || search.isBlank() ? null : search, page);
            return new IssueListResponse(
                    result.items().stream()
                            .map(issue ->
                                    new IssueListResponse.IssueSummary(issue.iid(), issue.title(), issue.webUrl()))
                            .toList(),
                    result.nextPage().orElse(null));
        } catch (GitLabException e) {
            throw gitLabError(e);
        }
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
