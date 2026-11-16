package planningpoker.platform;

import java.security.SecureRandom;
import java.util.Base64;

public final class Ids {

    public static final String SESSION_ID_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
    public static final int SESSION_ID_LENGTH = 8;
    static final int TOKEN_BYTES = 24;

    private static final SecureRandom RANDOM = new SecureRandom();

    private Ids() {}

    public static String sessionId() {
        StringBuilder id = new StringBuilder(SESSION_ID_LENGTH);
        for (int i = 0; i < SESSION_ID_LENGTH; i++) {
            id.append(SESSION_ID_ALPHABET.charAt(RANDOM.nextInt(SESSION_ID_ALPHABET.length())));
        }
        return id.toString();
    }

    public static String token() {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
