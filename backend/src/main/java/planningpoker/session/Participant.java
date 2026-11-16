package planningpoker.session;

public final class Participant {

    private final String id;
    private final String name;
    private final Role role;
    private final String token;
    private boolean connected;

    Participant(String id, String name, Role role, String token) {
        this.id = id;
        this.name = name;
        this.role = role;
        this.token = token;
    }

    public String id() {
        return id;
    }

    public String name() {
        return name;
    }

    public Role role() {
        return role;
    }

    public String token() {
        return token;
    }

    public boolean connected() {
        return connected;
    }

    void connected(boolean connected) {
        this.connected = connected;
    }
}
