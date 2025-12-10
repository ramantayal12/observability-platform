package com.observability.service;

import com.observability.common.exception.ResourceNotFoundException;
import com.observability.dto.response.*;
import com.observability.service.api.DashboardServiceApi;
import com.observability.service.api.LogServiceApi;
import com.observability.service.api.MetricServiceApi;
import com.observability.service.api.TraceServiceApi;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

/**
 * Service implementation for dashboard operations.
 * Aggregates data from multiple services following the Facade pattern.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DashboardService implements DashboardServiceApi {

    private final MetricServiceApi metricService;
    private final LogServiceApi logService;
    private final TraceServiceApi traceService;

    @Override
    public DashboardOverviewResponse getOverview(Instant start, Instant end) {
        // Get metrics summary
        List<MetricResponse> recentMetrics = metricService.getMetrics(null, null, start, end, 10);
        Map<String, Double> metricStats = new HashMap<>();
        metricStats.put("avgLatency", metricService.getAverageValue("http.latency", null, start, end));
        metricStats.put("avgThroughput", metricService.getAverageValue("http.throughput", null, start, end));

        DashboardOverviewResponse.MetricsSummary metricsSummary = DashboardOverviewResponse.MetricsSummary.builder()
                .count(recentMetrics.size())
                .recent(recentMetrics)
                .statistics(metricStats)
                .build();

        // Get logs summary
        List<LogResponse> recentLogs = logService.getLogs(null, null, null, start, end, 10);
        Map<String, Long> levelCounts = logService.getLogCountByLevel(null, start, end);

        DashboardOverviewResponse.LogsSummary logsSummary = DashboardOverviewResponse.LogsSummary.builder()
                .count(recentLogs.size())
                .recent(recentLogs)
                .levelCounts(levelCounts)
                .build();

        // Get traces summary
        List<TraceResponse> recentTraces = traceService.getTraces(null, null, start, end, 10);
        Map<String, Long> statusCounts = traceService.getTraceCountByStatus(null, start, end);

        DashboardOverviewResponse.TracesSummary tracesSummary = DashboardOverviewResponse.TracesSummary.builder()
                .count(recentTraces.size())
                .recent(recentTraces)
                .statusCounts(statusCounts)
                .build();

        return DashboardOverviewResponse.builder()
                .metrics(metricsSummary)
                .logs(logsSummary)
                .traces(tracesSummary)
                .timeRange(DashboardOverviewResponse.TimeRange.builder()
                        .start(start.toEpochMilli())
                        .end(end.toEpochMilli())
                        .build())
                .build();
    }

    @Override
    public List<ServiceResponse> getServices() {
        Set<String> allServices = new HashSet<>();
        allServices.addAll(metricService.getDistinctServices());
        allServices.addAll(logService.getDistinctServices());
        allServices.addAll(traceService.getDistinctServices());

        return allServices.stream()
                .map(this::buildServiceResponse)
                .toList();
    }

    @Override
    public ServiceResponse getServiceDetails(String serviceName) {
        Set<String> allServices = new HashSet<>();
        allServices.addAll(metricService.getDistinctServices());
        allServices.addAll(logService.getDistinctServices());
        allServices.addAll(traceService.getDistinctServices());

        if (!allServices.contains(serviceName)) {
            throw new ResourceNotFoundException("Service", serviceName);
        }

        return buildServiceResponse(serviceName);
    }

    private ServiceResponse buildServiceResponse(String serviceName) {
        Instant now = Instant.now();
        Instant oneHourAgo = now.minusSeconds(3600);

        // Get counts for this service
        List<MetricResponse> metrics = metricService.getMetrics(serviceName, null, oneHourAgo, now, 1000);
        List<LogResponse> logs = logService.getLogs(serviceName, null, null, oneHourAgo, now, 1000);
        List<TraceResponse> traces = traceService.getTraces(serviceName, null, oneHourAgo, now, 1000);

        // Calculate error rate
        long errorLogs = logs.stream().filter(l -> "ERROR".equals(l.getLevel())).count();
        long errorTraces = traces.stream().filter(t -> "ERROR".equals(t.getStatus())).count();
        double errorRate = traces.isEmpty() ? 0.0 : (double) errorTraces / traces.size() * 100;

        // Determine status based on error rate
        String status = errorRate > 10 ? "DEGRADED" : errorRate > 0 ? "WARNING" : "HEALTHY";

        return ServiceResponse.builder()
                .name(serviceName)
                .status(status)
                .metricCount((long) metrics.size())
                .logCount((long) logs.size())
                .traceCount((long) traces.size())
                .errorCount(errorLogs + errorTraces)
                .errorRate(errorRate)
                .lastSeen(now.toEpochMilli())
                .build();
    }
}

