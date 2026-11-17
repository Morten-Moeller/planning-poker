package planningpoker.session;

import jakarta.enterprise.context.ApplicationScoped;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import planningpoker.gitlab.GitLabClient;
import planningpoker.gitlab.GitLabException;
import planningpoker.gitlab.GitLabProject;
import planningpoker.gitlab.ProjectPage;
import planningpoker.session.api.ProjectListResponse;
import planningpoker.session.api.ProjectListResponse.ProjectSummary;

@ApplicationScoped
public class GitLabProjects {

    private static final int FORBIDDEN = 403;
    private static final int NOT_FOUND = 404;

    private final GitLabClient client;
    private final ProjectAllowlist allowlist;

    public GitLabProjects(GitLabClient client, ProjectAllowlist allowlist) {
        this.client = client;
        this.allowlist = allowlist;
    }

    public ProjectListResponse search(String search, int page) {
        String query = search == null || search.isBlank() ? null : search.strip();
        return allowlist
                .projects()
                .map(projects -> fromAllowlist(projects, query, page))
                .orElseGet(() -> fromMembership(query, page));
    }

    public Optional<Project> loadForSession(String projectId) {
        try {
            GitLabProject project = client.loadProject(projectId);
            return Optional.of(
                    new Project(project.id(), project.name(), project.pathWithNamespace(), project.webUrl()));
        } catch (GitLabException e) {
            return Optional.empty();
        }
    }

    private ProjectListResponse fromMembership(String query, int page) {
        try {
            ProjectPage result = client.searchProjects(query, page);
            return new ProjectListResponse(
                    result.items().stream().map(GitLabProjects::summary).toList(),
                    result.nextPage().orElse(null));
        } catch (GitLabException e) {
            throw GitLabIssues.gitLabError(e);
        }
    }

    private ProjectListResponse fromAllowlist(List<String> projects, String query, int page) {
        if (page > 1) {
            return new ProjectListResponse(List.of(), null);
        }
        List<ProjectSummary> items = new ArrayList<>();
        for (String projectId : projects) {
            try {
                GitLabProject project = client.loadProject(projectId);
                if (matches(project, query)) {
                    items.add(summary(project));
                }
            } catch (GitLabException e) {
                if (e.status() != FORBIDDEN && e.status() != NOT_FOUND) {
                    throw GitLabIssues.gitLabError(e);
                }
            }
        }
        return new ProjectListResponse(items, null);
    }

    private static boolean matches(GitLabProject project, String query) {
        if (query == null) {
            return true;
        }
        String needle = query.toLowerCase(Locale.ROOT);
        return contains(project.name(), needle) || contains(project.pathWithNamespace(), needle);
    }

    private static boolean contains(String value, String needle) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(needle);
    }

    private static ProjectSummary summary(GitLabProject project) {
        return new ProjectSummary(project.id(), project.name(), project.pathWithNamespace(), project.webUrl());
    }
}
