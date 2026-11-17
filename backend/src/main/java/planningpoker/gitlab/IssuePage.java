package planningpoker.gitlab;

import java.util.List;
import java.util.Optional;

public record IssuePage(List<GitLabIssue> items, Optional<Integer> nextPage, Optional<Integer> total) {}
