package planningpoker.gitlab;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

final class DemoGitLab {

    static final String RESOURCE = "/demo-gitlab.json";

    private static final String WEB_URL = "https://gitlab.example.com/";
    private static final int NOT_FOUND = 404;
    private static final String WEIGHT_NONE = "None";
    private static final String WEIGHT_ANY = "Any";

    private final Clock clock;
    private final List<DemoProject> projects;

    DemoGitLab(Clock clock) {
        this.clock = clock;
        this.projects = read(clock.instant());
    }

    synchronized ProjectPage searchProjects(String search, int page) {
        String needle = search == null ? "" : search.strip().toLowerCase(Locale.ROOT);
        List<GitLabProject> matches = projects.stream()
                .map(DemoProject::project)
                .filter(project -> project.name().toLowerCase(Locale.ROOT).contains(needle))
                .toList();
        return new ProjectPage(pageOf(matches, page), nextPage(matches.size(), page));
    }

    synchronized GitLabProject loadProject(String projectId) {
        return project("loadProject", projectId).project();
    }

    synchronized IssuePage searchIssues(String projectId, IssueQuery query) {
        String needle = query.search() == null ? "" : query.search().strip().toLowerCase(Locale.ROOT);
        List<GitLabIssue> matches = project("searchIssues", projectId).issues().stream()
                .filter(issue -> issue.title.toLowerCase(Locale.ROOT).contains(needle))
                .filter(issue -> matchesWeight(issue.weight, query.weight()))
                .filter(issue -> query.updatedAfter() == null || !issue.updatedAt.isBefore(query.updatedAfter()))
                .sorted(Comparator.comparing((DemoIssue issue) -> issue.updatedAt)
                        .thenComparing(issue -> issue.iid)
                        .reversed())
                .map(DemoIssue::toGitLabIssue)
                .toList();
        return new IssuePage(
                pageOf(matches, query.page()), nextPage(matches.size(), query.page()), Optional.of(matches.size()));
    }

    synchronized GitLabIssue loadIssue(String projectId, long iid) {
        return issue("loadIssue", projectId, iid).toGitLabIssue();
    }

    synchronized void addNote(String projectId, long iid, String body) {
        DemoIssue issue = issue("addNote", projectId, iid);
        issue.notes.add(body);
        issue.updatedAt = clock.instant();
    }

    synchronized void setWeight(String projectId, long iid, int weight) {
        DemoIssue issue = issue("setWeight", projectId, iid);
        issue.weight = weight;
        issue.updatedAt = clock.instant();
    }

    synchronized List<String> notes(String projectId, long iid) {
        return List.copyOf(issue("notes", projectId, iid).notes);
    }

    private DemoProject project(String operation, String projectId) {
        return projects.stream()
                .filter(project -> String.valueOf(project.project().id()).equals(projectId)
                        || project.project().pathWithNamespace().equals(projectId))
                .findFirst()
                .orElseThrow(() -> new GitLabException(operation, NOT_FOUND, GitLabException.Reason.NOT_FOUND));
    }

    private DemoIssue issue(String operation, String projectId, long iid) {
        return project(operation, projectId).issues().stream()
                .filter(issue -> issue.iid == iid)
                .findFirst()
                .orElseThrow(() -> new GitLabException(operation, NOT_FOUND, GitLabException.Reason.NOT_FOUND));
    }

    private static boolean matchesWeight(Integer weight, String filter) {
        if (filter == null) {
            return true;
        }
        if (WEIGHT_NONE.equals(filter)) {
            return weight == null;
        }
        if (WEIGHT_ANY.equals(filter)) {
            return weight != null;
        }
        return weight != null && filter.equals(String.valueOf(weight));
    }

    private static <T> List<T> pageOf(List<T> items, int page) {
        long from = (long) (Math.max(page, 1) - 1) * GitLabClient.PAGE_SIZE;
        if (from >= items.size()) {
            return List.of();
        }
        return items.subList((int) from, (int) Math.min(from + GitLabClient.PAGE_SIZE, items.size()));
    }

    private static Optional<Integer> nextPage(int count, int page) {
        int current = Math.max(page, 1);
        return (long) current * GitLabClient.PAGE_SIZE < count ? Optional.of(current + 1) : Optional.empty();
    }

    private static List<DemoProject> read(Instant now) {
        try (InputStream resource = DemoGitLab.class.getResourceAsStream(RESOURCE)) {
            if (resource == null) {
                throw new IllegalStateException("missing resource " + RESOURCE);
            }
            List<DemoProject> projects = new ArrayList<>();
            for (JsonNode node : new ObjectMapper().readTree(resource).path("projects")) {
                String path = node.path("pathWithNamespace").asText();
                List<DemoIssue> issues = new ArrayList<>();
                for (JsonNode issue : node.path("issues")) {
                    issues.add(new DemoIssue(
                            issue.path("iid").asLong(),
                            issue.path("title").asText(),
                            issue.path("description").asText(),
                            WEB_URL + path + "/-/issues/" + issue.path("iid").asLong(),
                            issue.path("weight").isInt() ? issue.path("weight").asInt() : null,
                            now.minus(Duration.ofHours(
                                    issue.path("updatedHoursAgo").asLong()))));
                }
                projects.add(new DemoProject(
                        new GitLabProject(
                                node.path("id").asLong(), node.path("name").asText(), path, WEB_URL + path),
                        issues));
            }
            return List.copyOf(projects);
        } catch (IOException e) {
            throw new UncheckedIOException("unreadable resource " + RESOURCE, e);
        }
    }

    private record DemoProject(GitLabProject project, List<DemoIssue> issues) {}

    private static final class DemoIssue {

        private final long iid;
        private final String title;
        private final String description;
        private final String webUrl;
        private final List<String> notes = new ArrayList<>();
        private Integer weight;
        private Instant updatedAt;

        private DemoIssue(
                long iid, String title, String description, String webUrl, Integer weight, Instant updatedAt) {
            this.iid = iid;
            this.title = title;
            this.description = description;
            this.webUrl = webUrl;
            this.weight = weight;
            this.updatedAt = updatedAt;
        }

        private GitLabIssue toGitLabIssue() {
            return new GitLabIssue(iid, title, description, webUrl, weight);
        }
    }
}
