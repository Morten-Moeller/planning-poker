package planningpoker.gitlab;

import java.time.Instant;

public record IssueQuery(String search, String weight, Instant updatedAfter, int page) {}
