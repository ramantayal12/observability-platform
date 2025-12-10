package com.observability.dto.request;

import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Common request parameters for time-based queries.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TimeRangeRequest {

    private String serviceName;

    @Positive(message = "Start time must be positive")
    private Long startTime;

    @Positive(message = "End time must be positive")
    private Long endTime;

    @Positive(message = "Limit must be positive")
    @Builder.Default
    private Integer limit = 100;

    /**
     * Get start time with default (1 hour ago)
     */
    public long getStartTimeOrDefault() {
        return startTime != null ? startTime : System.currentTimeMillis() - 3600000;
    }

    /**
     * Get end time with default (now)
     */
    public long getEndTimeOrDefault() {
        return endTime != null ? endTime : System.currentTimeMillis();
    }
}

