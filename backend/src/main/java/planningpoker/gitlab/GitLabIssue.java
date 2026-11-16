package planningpoker.gitlab;

import com.fasterxml.jackson.annotation.JsonProperty;

public record GitLabIssue(long iid, String title, String description, @JsonProperty("web_url") String webUrl) {}
