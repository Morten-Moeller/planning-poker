package planningpoker.session.api;

import java.util.Arrays;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import planningpoker.platform.ApiException;
import planningpoker.platform.ErrorCode;

@Schema(description = "Filter on the weight of the issues: NONE without weight, ANY with weight, ALL without filter.")
public enum WeightFilter {
    NONE,
    ANY,
    ALL;

    public static WeightFilter fromString(String value) {
        return Arrays.stream(values())
                .filter(filter -> filter.name().equals(value))
                .findFirst()
                .orElseThrow(() -> new ApiException(ErrorCode.VALIDATION_ERROR, "weight: unknown value"));
    }
}
