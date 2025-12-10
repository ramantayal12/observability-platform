package com.observability.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

/**
 * Response DTO for dashboard overview data.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardOverviewResponse {

    private MetricsSummary metrics;
    private LogsSummary logs;
    private TracesSummary traces;
    private TimeRange timeRange;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricsSummary {
        private long count;
        private List<MetricResponse> recent;
        private Map<String, Double> statistics;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LogsSummary {
        private long count;
        private List<LogResponse> recent;
        private Map<String, Long> levelCounts;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TracesSummary {
        private long count;
        private List<TraceResponse> recent;
        private Map<String, Long> statusCounts;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TimeRange {
        private long start;
        private long end;
    }
}

