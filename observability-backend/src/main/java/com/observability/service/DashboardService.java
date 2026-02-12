package com.observability.service;

import com.observability.common.exception.ResourceNotFoundException;
import com.observability.dto.response.*;
import com.observability.service.api.DashboardServiceApi;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

/**
 * Service implementation for dashboard operations.
 * Uses ClickHouse for time-series data (metrics, logs, traces).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService implements DashboardServiceApi {

    private final ClickHouseDataService clickHouseDataService;

    @Value("${clickhouse.enabled:false}")
    private boolean clickHouseEnabled;

    @Override
    public DashboardOverviewResponse getOverview(UUID teamId, Instant start, Instant end) {
        if (!clickHouseEnabled) {
            log.warn("ClickHouse is disabled - returning empty data");
            return DashboardOverviewResponse.builder()
                    .metrics(DashboardOverviewResponse.MetricsSummary.builder()
                            .count(0)
                            .recent(Collections.emptyList())
                            .statistics(Collections.emptyMap())
                            .build())
                    .logs(DashboardOverviewResponse.LogsSummary.builder()
                            .count(0)
                            .recent(Collections.emptyList())
                            .levelCounts(Collections.emptyMap())
                            .build())
                    .traces(DashboardOverviewResponse.TracesSummary.builder()
                            .count(0)
                            .recent(Collections.emptyList())
                            .statusCounts(Collections.emptyMap())
                            .build())
                    .timeRange(DashboardOverviewResponse.TimeRange.builder()
                            .start(start.toEpochMilli())
                            .end(end.toEpochMilli())
                            .build())
                    .build();
        }

        long startMs = start.toEpochMilli();
        long endMs = end.toEpochMilli();

        // Get service metrics from ClickHouse (derived from spans)
        List<Map<String, Object>> serviceMetrics = clickHouseDataService.getServiceMetrics(teamId, startMs, endMs);

        // Get logs summary
        Map<String, Object> logsData = clickHouseDataService.getLogs(teamId, startMs, endMs, null, null, null, 10, 0);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> recentLogs = (List<Map<String, Object>>) logsData.getOrDefault("logs", Collections.emptyList());

        // Get traces summary
        Map<String, Object> tracesData = clickHouseDataService.getTraces(teamId, startMs, endMs, null, null, null, null, 10, 0);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> recentTraces = (List<Map<String, Object>>) tracesData.getOrDefault("traces", Collections.emptyList());
        @SuppressWarnings("unchecked")
        Map<String, Object> traceSummary = (Map<String, Object>) tracesData.getOrDefault("summary", Collections.emptyMap());

        // Build metrics summary
        Map<String, Double> metricStats = new HashMap<>();
        if (!serviceMetrics.isEmpty()) {
            double totalLatency = serviceMetrics.stream()
                    .mapToDouble(m -> ((Number) m.getOrDefault("avg_latency", 0)).doubleValue())
                    .average().orElse(0.0);
            long totalRequests = serviceMetrics.stream()
                    .mapToLong(m -> ((Number) m.getOrDefault("request_count", 0)).longValue())
                    .sum();
            metricStats.put("avgLatency", totalLatency);
            metricStats.put("totalRequests", (double) totalRequests);
        }

        DashboardOverviewResponse.MetricsSummary metricsSummary = DashboardOverviewResponse.MetricsSummary.builder()
                .count(serviceMetrics.size())
                .recent(Collections.emptyList()) // ClickHouse returns raw maps, not MetricResponse objects
                .statistics(metricStats)
                .build();

        // Build logs summary
        Map<String, Long> levelCounts = new HashMap<>();
        if (logsData.containsKey("facets")) {
            @SuppressWarnings("unchecked")
            Map<String, Object> facets = (Map<String, Object>) logsData.get("facets");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> levels = (List<Map<String, Object>>) facets.getOrDefault("levels", Collections.emptyList());
            for (Map<String, Object> level : levels) {
                String levelName = (String) level.get("level");
                Long count = ((Number) level.get("count")).longValue();
                levelCounts.put(levelName, count);
            }
        }

        DashboardOverviewResponse.LogsSummary logsSummary = DashboardOverviewResponse.LogsSummary.builder()
                .count(recentLogs.size())
                .recent(Collections.emptyList()) // ClickHouse returns raw maps
                .levelCounts(levelCounts)
                .build();

        // Build traces summary
        Map<String, Long> statusCounts = new HashMap<>();
        if (traceSummary.containsKey("error_traces")) {
            long totalTraces = ((Number) traceSummary.getOrDefault("total_traces", 0)).longValue();
            long errorTraces = ((Number) traceSummary.getOrDefault("error_traces", 0)).longValue();
            statusCounts.put("OK", totalTraces - errorTraces);
            statusCounts.put("ERROR", errorTraces);
        }

        DashboardOverviewResponse.TracesSummary tracesSummary = DashboardOverviewResponse.TracesSummary.builder()
                .count(recentTraces.size())
                .recent(Collections.emptyList()) // ClickHouse returns raw maps
                .statusCounts(statusCounts)
                .build();

        return DashboardOverviewResponse.builder()
                .metrics(metricsSummary)
                .logs(logsSummary)
                .traces(tracesSummary)
                .timeRange(DashboardOverviewResponse.TimeRange.builder()
                        .start(startMs)
                        .end(endMs)
                        .build())
                .build();
    }

    @Override
    public List<ServiceResponse> getServices(UUID teamId) {
        if (!clickHouseEnabled) {
            log.warn("ClickHouse is disabled - returning empty list");
            return Collections.emptyList();
        }

        long now = System.currentTimeMillis();
        long oneHourAgo = now - 3600000;

        // Get service metrics from ClickHouse
        List<Map<String, Object>> serviceMetrics = clickHouseDataService.getServiceMetrics(teamId, oneHourAgo, now);

        return serviceMetrics.stream()
                .map(this::buildServiceResponseFromClickHouse)
                .toList();
    }

    @Override
    public ServiceResponse getServiceDetails(UUID teamId, String serviceName) {
        if (!clickHouseEnabled) {
            log.warn("ClickHouse is disabled");
            throw new ResourceNotFoundException("Service", serviceName);
        }

        long now = System.currentTimeMillis();
        long oneHourAgo = now - 3600000;

        // Get metrics for this specific service
        List<Map<String, Object>> serviceMetrics = clickHouseDataService.getServiceMetrics(teamId, oneHourAgo, now);

        Optional<Map<String, Object>> serviceData = serviceMetrics.stream()
                .filter(m -> serviceName.equals(m.get("service_name")))
                .findFirst();

        if (serviceData.isEmpty()) {
            throw new ResourceNotFoundException("Service", serviceName);
        }

        return buildServiceResponseFromClickHouse(serviceData.get());
    }

    private ServiceResponse buildServiceResponseFromClickHouse(Map<String, Object> serviceData) {
        String serviceName = (String) serviceData.get("service_name");
        long requestCount = ((Number) serviceData.getOrDefault("request_count", 0)).longValue();
        long errorCount = ((Number) serviceData.getOrDefault("error_count", 0)).longValue();
        double avgLatency = ((Number) serviceData.getOrDefault("avg_latency", 0)).doubleValue();

        double errorRate = requestCount > 0 ? (double) errorCount / requestCount * 100 : 0.0;
        String status = errorRate > 10 ? "DEGRADED" : errorRate > 0 ? "WARNING" : "HEALTHY";

        return ServiceResponse.builder()
                .name(serviceName)
                .status(status)
                .metricCount(requestCount) // Request count as metric count
                .logCount(0L) // Logs are tracked separately in ClickHouse
                .traceCount(requestCount) // Request count = trace count (each request is a trace)
                .errorCount(errorCount)
                .errorRate(errorRate)
                .lastSeen(System.currentTimeMillis())
                .build();
    }
}

