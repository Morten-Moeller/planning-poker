package planningpoker.session.api;

import java.time.Duration;
import java.util.Arrays;
import java.util.Optional;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import planningpoker.platform.ApiException;
import planningpoker.platform.ErrorCode;

@Schema(
        description =
                "Period of the last change of the issues: WEEK 7 days, MONTH 30 days, YEAR 365 days, ALL without filter.")
public enum UpdatedPeriod {
    WEEK(Duration.ofDays(7)),
    MONTH(Duration.ofDays(30)),
    YEAR(Duration.ofDays(365)),
    ALL(null);

    private final Duration length;

    UpdatedPeriod(Duration length) {
        this.length = length;
    }

    public Optional<Duration> length() {
        return Optional.ofNullable(length);
    }

    public static UpdatedPeriod fromString(String value) {
        return Arrays.stream(values())
                .filter(period -> period.name().equals(value))
                .findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_ERROR, "period: unknown value"));
    }
}
