package planningpoker.session;

import planningpoker.platform.ErrorCode;

public class SessionException extends RuntimeException {

    private final ErrorCode errorCode;

    public SessionException(ErrorCode errorCode, String detail) {
        super(detail);
        this.errorCode = errorCode;
    }

    public ErrorCode errorCode() {
        return errorCode;
    }

    public String detail() {
        return getMessage();
    }
}
