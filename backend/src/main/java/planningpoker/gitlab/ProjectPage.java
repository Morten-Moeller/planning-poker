package planningpoker.gitlab;

import java.util.List;
import java.util.Optional;

public record ProjectPage(List<GitLabProject> items, Optional<Integer> nextPage) {}
