package planningpoker.platform;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;

class IdsTest {

    private static final int SAMPLES = 1000;
    private static final Pattern SESSION_ID = Pattern.compile("[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}");
    private static final Pattern BASE64_URL = Pattern.compile("[A-Za-z0-9_-]{32}");

    @Test
    void session_ids_have_eight_characters_from_the_unambiguous_alphabet() {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < SAMPLES; i++) {
            String id = Ids.sessionId();
            assertTrue(SESSION_ID.matcher(id).matches(), id);
            seen.add(id);
        }
        assertTrue(seen.size() > SAMPLES * 9 / 10);
    }

    @Test
    void tokens_carry_at_least_128_bits_of_randomness_and_never_repeat() {
        assertTrue(Ids.TOKEN_BYTES * 8 >= 128);
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < SAMPLES; i++) {
            String token = Ids.token();
            assertTrue(BASE64_URL.matcher(token).matches(), token);
            seen.add(token);
        }
        assertEquals(SAMPLES, seen.size());
    }

    @Test
    void uuid_v7_carries_version_7_and_variant_2() {
        UUID uuid = UUID.fromString(UuidV7.next());

        assertEquals(7, uuid.version());
        assertEquals(2, uuid.variant());
        long millis = uuid.getMostSignificantBits() >>> 16;
        assertTrue(Math.abs(millis - System.currentTimeMillis()) < 10_000);
    }

    @Test
    void uuid_v7_values_created_one_after_another_are_ordered_in_time() {
        String previous = UuidV7.next();
        for (int i = 0; i < SAMPLES; i++) {
            String next = UuidV7.next();
            assertTrue(previous.compareTo(next) < 0, previous + " before " + next);
            previous = next;
        }
    }
}
