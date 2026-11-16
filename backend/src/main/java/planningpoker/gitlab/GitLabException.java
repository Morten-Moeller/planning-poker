package planningpoker.gitlab;

public class GitLabException extends RuntimeException {

    public enum Reason {
        NOT_FOUND,
        UNAUTHORIZED,
        UNAVAILABLE
    }

    private final Reason reason;
    private final int status;

    public GitLabException(String operation, int status, Reason reason) {
        super("GitLab " + operation + " failed: " + reason + " (status " + status + ")");
        this.reason = reason;
        this.status = status;
    }

    public GitLabException(String operation, Throwable cause) {
        super("GitLab " + operation + " failed: " + Reason.UNAVAILABLE + " (no response)", cause);
        this.reason = Reason.UNAVAILABLE;
        this.status = 0;
    }

    public Reason reason() {
        return reason;
    }

    public int status() {
        return status;
    }
}
