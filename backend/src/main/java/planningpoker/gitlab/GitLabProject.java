package planningpoker.gitlab;

import com.fasterxml.jackson.annotation.JsonProperty;

public record GitLabProject(
        long id,
        String name,
        @JsonProperty("path_with_namespace") String pathWithNamespace,
        @JsonProperty("web_url") String webUrl) {}
