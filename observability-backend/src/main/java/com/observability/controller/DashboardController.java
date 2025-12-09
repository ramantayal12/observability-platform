package com.observability.controller;

import com.observability.model.LogEntry;
import com.observability.model.MetricData;
import com.observability.model.Trace;
import com.observability.service.LogService;
import com.observability.service.MetricService;
import com.observability.service.TraceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DashboardController {

    private final MetricService metricService;
    private final LogService logService;
    private final TraceService traceService;

    @GetMapping("/metrics")
    public Map<String, Object> getMetrics(
            @RequestParam(required = false) String serviceName,
            @RequestParam(required = false) String metricName,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(defaultValue = "1000") int limit) {

        long start = startTime != null ? startTime : System.currentTimeMillis() - 3600000;
        long end = endTime != null ? endTime : System.currentTimeMillis();

        List<MetricData> metrics = metricService.getMetrics(
                serviceName, metricName,
                Instant.ofEpochMilli(start), Instant.ofEpochMilli(end), limit);

        // Group metrics by type for charting
        Map<String, List<MetricData>> groupedMetrics = new HashMap<>();
        for (MetricData m : metrics) {
            groupedMetrics.computeIfAbsent(m.getMetricName(), k -> new ArrayList<>()).add(m);
        }

        // Calculate statistics
        Map<String, Map<String, Object>> stats = new HashMap<>();
        groupedMetrics.forEach((name, metricList) -> {
            DoubleSummaryStatistics statistics = metricList.stream()
                    .mapToDouble(MetricData::getValue)
                    .summaryStatistics();

            stats.put(name, Map.of(
                    "count", statistics.getCount(),
                    "avg", statistics.getAverage(),
                    "min", statistics.getMin(),
                    "max", statistics.getMax(),
                    "data", metricList));
        });

        return Map.of(
                "metrics", groupedMetrics,
                "statistics", stats,
                "services", metricService.getDistinctServices(),
                "metricNames", metricService.getDistinctMetricNames(),
                "timeRange", Map.of("start", start, "end", end));
    }

    @GetMapping("/logs")
    public Map<String, Object> getLogs(
            @RequestParam(required = false) String serviceName,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String pod,
            @RequestParam(required = false) String container,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(defaultValue = "500") int limit) {

        long start = startTime != null ? startTime : System.currentTimeMillis() - 3600000;
        long end = endTime != null ? endTime : System.currentTimeMillis();

        List<LogEntry> logs;
        if (query != null && !query.isEmpty()) {
            logs = logService.searchLogs(query, Instant.ofEpochMilli(start), Instant.ofEpochMilli(end), limit);
        } else {
            logs = logService.getLogs(serviceName, level, pod, container,
                    Instant.ofEpochMilli(start), Instant.ofEpochMilli(end), limit);
        }

        Map<String, Long> levelCounts = logService.getLevelCounts(
                Instant.ofEpochMilli(start), Instant.ofEpochMilli(end));

        return Map.of(
                "logs", logs,
                "levelCounts", levelCounts,
                "total", logs.size(),
                "services", logService.getDistinctServices(),
                "levels", logService.getDistinctLevels(),
                "pods", logService.getDistinctPods(),
                "containers", logService.getDistinctContainers(),
                "timeRange", Map.of("start", start, "end", end));
    }

    @GetMapping("/traces")
    public Map<String, Object> getTraces(
            @RequestParam(required = false) String serviceName,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long minDuration,
            @RequestParam(required = false) Long maxDuration,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(defaultValue = "100") int limit) {

        long start = startTime != null ? startTime : System.currentTimeMillis() - 3600000;
        long end = endTime != null ? endTime : System.currentTimeMillis();

        List<Trace> traces = traceService.getTraces(serviceName, status, minDuration, maxDuration,
                Instant.ofEpochMilli(start), Instant.ofEpochMilli(end), limit);

        Map<String, Long> statusCounts = traceService.getStatusCounts(
                Instant.ofEpochMilli(start), Instant.ofEpochMilli(end));

        return Map.of(
                "traces", traces,
                "total", traces.size(),
                "statusCounts", statusCounts,
                "services", traceService.getDistinctServices(),
                "timeRange", Map.of("start", start, "end", end));
    }

    @GetMapping("/traces/{traceId}")
    public Map<String, Object> getTrace(@PathVariable String traceId) {
        return traceService.getTrace(traceId)
                .map(trace -> Map.<String, Object>of("trace", trace))
                .orElse(Map.of("error", "Trace not found"));
    }

    @GetMapping("/overview")
    public Map<String, Object> getOverview() {
        long now = System.currentTimeMillis();
        Instant start = Instant.ofEpochMilli(now - 3600000);
        Instant end = Instant.ofEpochMilli(now);

        List<MetricData> recentMetrics = metricService.getMetrics(null, null, start, end, 100);
        List<LogEntry> recentLogs = logService.getLogs(null, null, null, null, start, end, 50);
        List<Trace> recentTraces = traceService.getTraces(null, null, null, null, start, end, 20);

        return Map.of(
                "metrics", Map.of(
                        "count", recentMetrics.size(),
                        "recent", recentMetrics),
                "logs", Map.of(
                        "count", recentLogs.size(),
                        "recent", recentLogs),
                "traces", Map.of(
                        "count", recentTraces.size(),
                        "recent", recentTraces));
    }

    @GetMapping("/services")
    public Map<String, Object> getServices() {
        long now = System.currentTimeMillis();
        Instant start = Instant.ofEpochMilli(now - 3600000);
        Instant end = Instant.ofEpochMilli(now);

        // Get all unique services from metrics
        List<MetricData> allMetrics = metricService.getMetrics(null, null, start, end, 1000);

        Map<String, Map<String, Object>> servicesMap = new HashMap<>();

        allMetrics.forEach(metric -> {
            String service = metric.getServiceName();
            if (service != null && !service.isEmpty()) {
                servicesMap.putIfAbsent(service, new HashMap<>());
                Map<String, Object> serviceData = servicesMap.get(service);

                serviceData.put("metricCount",
                    ((Integer) serviceData.getOrDefault("metricCount", 0)) + 1);

                long lastSeen = (long) serviceData.getOrDefault("lastSeen", 0L);
                if (metric.getTimestamp() > lastSeen) {
                    serviceData.put("lastSeen", metric.getTimestamp());
                }
            }
        });

        // Get logs per service
        List<LogEntry> allLogs = logService.getLogs(null, null, null, null, start, end, 1000);
        allLogs.forEach(log -> {
            String service = log.getServiceName();
            if (service != null && !service.isEmpty()) {
                servicesMap.putIfAbsent(service, new HashMap<>());
                Map<String, Object> serviceData = servicesMap.get(service);

                serviceData.put("logCount",
                    ((Integer) serviceData.getOrDefault("logCount", 0)) + 1);

                if ("ERROR".equals(log.getLevel())) {
                    serviceData.put("errorCount",
                        ((Integer) serviceData.getOrDefault("errorCount", 0)) + 1);
                }
            }
        });

        // Get traces per service
        List<Trace> allTraces = traceService.getTraces(null, null, null, null, start, end, 500);
        allTraces.forEach(trace -> {
            String service = trace.getServiceName();
            if (service != null && !service.isEmpty()) {
                servicesMap.putIfAbsent(service, new HashMap<>());
                Map<String, Object> serviceData = servicesMap.get(service);

                serviceData.put("traceCount",
                    ((Integer) serviceData.getOrDefault("traceCount", 0)) + 1);
            }
        });

        // Build service list with health status
        List<Map<String, Object>> services = new ArrayList<>();
        servicesMap.forEach((serviceName, data) -> {
            long lastSeen = (long) data.getOrDefault("lastSeen", 0L);
            long timeSinceLastSeen = System.currentTimeMillis() - lastSeen;

            String status = "healthy";
            if (timeSinceLastSeen > 300000) {
                status = "down";
            } else if (timeSinceLastSeen > 60000) {
                status = "degraded";
            }

            int errorCount = (int) data.getOrDefault("errorCount", 0);
            int logCount = (int) data.getOrDefault("logCount", 0);
            double errorRate = logCount > 0 ? (errorCount * 100.0 / logCount) : 0;

            if (errorRate > 10) {
                status = "degraded";
            }

            services.add(Map.of(
                "name", serviceName,
                "status", status,
                "metricCount", data.getOrDefault("metricCount", 0),
                "logCount", data.getOrDefault("logCount", 0),
                "traceCount", data.getOrDefault("traceCount", 0),
                "errorCount", errorCount,
                "errorRate", errorRate,
                "lastSeen", lastSeen
            ));
        });

        services.sort((a, b) -> Long.compare(
            (long) b.get("lastSeen"),
            (long) a.get("lastSeen")
        ));

        return Map.of(
            "services", services,
            "total", services.size(),
            "healthy", services.stream().filter(s -> "healthy".equals(s.get("status"))).count(),
            "degraded", services.stream().filter(s -> "degraded".equals(s.get("status"))).count(),
            "down", services.stream().filter(s -> "down".equals(s.get("status"))).count()
        );
    }
}
