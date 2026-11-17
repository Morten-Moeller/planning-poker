package planningpoker.session;

import jakarta.enterprise.context.ApplicationScoped;
import planningpoker.gitlab.GitLabClient;
import planningpoker.gitlab.GitLabConfig;
import planningpoker.gitlab.GitLabException;

@ApplicationScoped
public class ResultPublisher {

    private final GitLabClient client;
    private final boolean writeWeight;

    public ResultPublisher(GitLabClient client, GitLabConfig config) {
        this.client = client;
        this.writeWeight = config.writeWeight();
    }

    public void publish(String projectId, Confirmation confirmation) {
        long iid = confirmation.issue().iid();
        try {
            if (writeWeight && isNumber(confirmation.card())) {
                client.setWeight(
                        projectId, iid, Integer.parseInt(confirmation.card().wireValue()));
            }
            client.addNote(projectId, iid, ResultComment.of(confirmation));
        } catch (GitLabException e) {
            throw GitLabIssues.gitLabError(e);
        }
    }

    private static boolean isNumber(Card card) {
        return card != Card.QUESTION && card != Card.COFFEE;
    }
}
