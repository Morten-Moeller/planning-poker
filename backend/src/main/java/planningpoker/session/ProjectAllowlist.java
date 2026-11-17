package planningpoker.session;

import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Optional;
import planningpoker.platform.ApiException;
import planningpoker.platform.ErrorCode;

@ApplicationScoped
public class ProjectAllowlist {

    private final SessionConfig config;

    public ProjectAllowlist(SessionConfig config) {
        this.config = config;
    }

    public Optional<List<String>> projects() {
        return config.allowedProjects().map(projects -> projects.stream()
                .map(String::strip)
                .filter(project -> !project.isEmpty())
                .distinct()
                .toList());
    }

    public void requireAllowed(String projectId) {
        boolean allowed =
                projects().map(projects -> projects.contains(projectId)).orElse(true);
        if (!allowed) {
            throw new ApiException(ErrorCode.PROJECT_NOT_ALLOWED, "Sessions for this GitLab project are not allowed.");
        }
    }
}
