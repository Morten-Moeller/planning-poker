package planningpoker.platform;

import java.security.SecureRandom;
import java.util.UUID;

public final class UuidV7 {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final long MILLIS_MASK = 0xFFFF_FFFF_FFFFL;
    private static final int COUNTER_LIMIT = 0x1000;
    private static final Object STATE = new Object();
    private static long lastMillis = -1;
    private static int counter;

    private UuidV7() {}

    public static String next() {
        long millis;
        int sequence;
        synchronized (STATE) {
            long now = System.currentTimeMillis();
            if (now > lastMillis) {
                lastMillis = now;
                counter = 0;
            } else {
                counter++;
                if (counter == COUNTER_LIMIT) {
                    lastMillis++;
                    counter = 0;
                }
            }
            millis = lastMillis;
            sequence = counter;
        }
        long high = ((millis & MILLIS_MASK) << 16) | 0x7000L | (sequence & 0x0FFF);
        long low = (RANDOM.nextLong() & 0x3FFF_FFFF_FFFF_FFFFL) | 0x8000_0000_0000_0000L;
        return new UUID(high, low).toString();
    }
}
