package com.observability.controller;

import com.observability.common.response.ApiResponse;
import com.observability.dto.response.*;
import com.observability.model.LogEntry;
import com.observability.model.MetricData;
import com.observability.model.Trace;
import com.observability.service.DashboardService;
import com.observability.service.LogService;
import com.observability.service.MetricService;
import com.observability.service.TraceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

/**
 * REST controller for dashboard data retrieval.
 * Provides endpoints for metrics, logs, traces, and service overview.
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Dashboard", description = "Dashboard data retrieval APIs")
public class DashboardController {

    private final MetricService metricService;
    private final LogService logService;
    private final TraceService traceService;
    private final DashboardService dashboardService;

    @GetMapping("/metrics")
    @Operation(summary = "Get metrics", description = "Retrieve metrics with optional filters")
    public ApiResponse<Map<String, Object>> getMetrics(
            @Parameter(description = "Filter by service name") @RequestParam(required = false) String serviceName,
            @Parameter(description = "Filter by metric name") @RequestParam(required = false) String metricName,
            @Parameter(description = "Start time in epoch millis") @RequestParam(required = false) Long startTime,
            @Parameter(description = "End time in epoch millis") @RequestParam(required = false) Long endTime,
            @Parameter(description = "Maximum number of results") @RequestParam(defaultValue = "1000") int limit) {

        long start = startTime != null ? startTime : System.currentTimeMillis() - 3600000;
        long end = endTime != null ? endTime : System.currentTimeMillis();

        List<MetricResponse> metrics = metricService.getMetrics(
                serviceName, metricName,
                Instant.ofEpochMilli(start), Instant.ofEpochMilli(end), limit);

        // Group metrics by type for charting
        Map<String, List<MetricResponse>> groupedMetrics = new HashMap<>();
        for (MetricResponse m : metrics) {
            groupedMetrics.computeIfAbsent(m.getMetricName(), k -> new ArrayList<>()).add(m);
        }

        // Calculate statistics
        Map<String, Map<String, Object>> stats = new HashMap<>();
        groupedMetrics.forEach((name, metricList) -> {
            DoubleSummaryStatistics statistics = metricList.stream()
                    .mapToDouble(MetricResponse::getValue)
                    .summaryStatistics();

            stats.put(name, Map.of(
                    "count", statistics.getCount(),
                    "avg", statistics.getAverage(),
                    "min", statistics.getMin(),
                    "max", statistics.getMax(),
                    "data", metricList));
        });

        Map<String, Object> result = Map.of(
                "metrics", groupedMetrics,
                "statistics", stats,
                "services", metricService.getDistinctServices(),
                "metricNames", metricService.getDistinctMetricNames(),
                "timeRange", Map.of("start", start, "end", end));

        return ApiResponse.success(result);
    }

    @GetMapping("/logs")
    @Operation(summary = "Get logs", description = "Retrieve logs with optional filters")
    public ApiResponse<Map<String, Object>> getLogs(
            @Parameter(description = "Filter by service name") @RequestParam(required = false) String serviceName,
            @Parameter(description = "Filter by log level") @RequestParam(required = false) String level,
            @Parameter(description = "Filter by pod") @RequestParam(required = false) String pod,
            @Parameter(description = "Filter by container") @RequestParam(required = false) String container,
            @Parameter(description = "Search query") @RequestParam(required = false) String query,
            @Parameter(description = "Start time in epoch millis") @RequestParam(required = false) Long startTime,
            @Parameter(description = "End time in epoch millis") @RequestParam(required = false) Long endTime,
            @Parameter(description = "Maximum number of results") @RequestParam(defaultValue = "500") int limit) {

        long start = startTime != null ? startTime : System.currentTimeMillis() - 3600000;
        long end = endTime != null ? endTime : System.currentTimeMillis();

        List<LogResponse> logs;
        if (query != null && !query.isEmpty()) {
            logs = logService.searchLogs(query, Instant.ofEpochMilli(start), Instant.ofEpochMilli(end), limit);
        } else {
            logs = logService.getLogs(serviceName, level, null,
                    Instant.ofEpochMilli(start), Instant.ofEpochMilli(end), limit);
        }

        Map<String, Long> levelCounts = logService.getLevelCounts(
                Instant.ofEpochMilli(start), Instant.ofEpochMilli(end));

        Map<String, Object> result = Map.of(
                "logs", logs,
                "levelCounts", levelCounts,
                "total", logs.size(),
                "services", logService.getDistinctServices(),
                "levels", logService.getDistinctLevels(),
                "pods", logService.getDistinctPods(),
                "containers", logService.getDistinctContainers(),
                "timeRange", Map.of("start", start, "end", end));

        return ApiResponse.success(result);
    }

    @GetMapping("/traces")
    @Operation(summary = "Get traces", description = "Retrieve traces with optional filters")
    public ApiResponse<Map<String, Object>> getTraces(
            @Parameter(description = "Filter by service name") @RequestParam(required = false) String serviceName,
            @Parameter(description = "Filter by status") @RequestParam(required = false) String status,
            @Parameter(description = "Minimum duration in ms") @RequestParam(required = false) Long minDuration,
            @Parameter(description = "Maximum duration in ms") @RequestParam(required = false) Long maxDuration,
            @Parameter(description = "Start time in epoch millis") @RequestParam(required = false) Long startTime,
            @Parameter(description = "End time in epoch millis") @RequestParam(required = false) Long endTime,
            @Parameter(description = "Maximum number of results") @RequestParam(defaultValue = "100") int limit) {

        long start = startTime != null ? startTime : System.currentTimeMillis() - 3600000;
        long end = endTime != null ? endTime : System.currentTimeMillis();

        List<Trace> traces = traceService.getTraces(serviceName, status, minDuration, maxDuration,
                Instant.ofEpochMilli(start), Instant.ofEpochMilli(end), limit);

        Map<String, Long> statusCounts = traceService.getStatusCounts(
                Instant.ofEpochMilli(start), Instant.ofEpochMilli(end));

        Map<String, Object> result = Map.of(
                "traces", traces,
                "total", traces.size(),
                "statusCounts", statusCounts,
                "services", traceService.getDistinctServices(),
                "timeRange", Map.of("start", start, "end", end));

        return ApiResponse.success(result);
    }

    @GetMapping("/traces/{traceId}")
    @Operation(summary = "Get trace by ID", description = "Retrieve a specific trace with all its spans")
    public ApiResponse<TraceResponse> getTrace(
            @Parameter(description = "Trace ID") @PathVariable String traceId) {
        TraceResponse trace = traceService.getTraceById(traceId);
        return ApiResponse.success(trace);
    }

    @GetMapping("/overview")
    @Operation(summary = "Get dashboard overview", description = "Get summary of metrics, logs, and traces")
    public ApiResponse<DashboardOverviewResponse> getOverview() {
        long now = System.currentTimeMillis();
        Instant start = Instant.ofEpochMilli(now - 3600000);
        Instant end = Instant.ofEpochMilli(now);

        DashboardOverviewResponse overview = dashboardService.getOverview(start, end);
        return ApiResponse.success(overview);
    }

    @GetMapping("/services")
    @Operation(summary = "Get services", description = "Get all services with their health status")
    public ApiResponse<List<ServiceResponse>> getServices() {
        List<ServiceResponse> services = dashboardService.getServices();
        return ApiResponse.success(services);
    }

    @GetMapping("/services/{serviceName}")
    @Operation(summary = "Get service details", description = "Get detailed information about a specific service")
    public ApiResponse<ServiceResponse> getServiceDetails(
            @Parameter(description = "Service name") @PathVariable String serviceName) {
        ServiceResponse service = dashboardService.getServiceDetails(serviceName);
        return ApiResponse.success(service);
    }
}
