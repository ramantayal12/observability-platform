package com.observability.controller;

import com.observability.model.LogEntry;
import com.observability.model.MetricData;
import com.observability.model.Trace;
import com.observability.service.DataStore;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DashboardController {

    private final DataStore dataStore;

    @GetMapping("/metrics")
    public Map<String, Object> getMetrics(
            @RequestParam(required = false) String serviceName,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(defaultValue = "1000") int limit) {

        long start = startTime != null ? startTime : System.currentTimeMillis() - 3600000; // Last hour
        long end = endTime != null ? endTime : System.currentTimeMillis();

        List<MetricData> metrics = dataStore.getMetrics(serviceName, start, end);

        // Group metrics by type for charting
        Map<String, List<MetricData>> groupedMetrics = metrics.stream()
                .collect(Collectors.groupingBy(MetricData::getMetricName));

        // Calculate statistics
        Map<String, Map<String, Object>> stats = new HashMap<>();
        groupedMetrics.forEach((metricName, metricList) -> {
            DoubleSummaryStatistics statistics = metricList.stream()
                    .mapToDouble(MetricData::getValue)
                    .summaryStatistics();

            stats.put(metricName, Map.of(
                    "count", statistics.getCount(),
                    "avg", statistics.getAverage(),
                    "min", statistics.getMin(),
                    "max", statistics.getMax(),
                    "data", metricList));
        });

        return Map.of(
                "metrics", groupedMetrics,
                "statistics", stats,
                "timeRange", Map.of("start", start, "end", end));
    }

    @GetMapping("/logs")
    public Map<String, Object> getLogs(
            @RequestParam(required = false) String serviceName,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(defaultValue = "500") int limit) {

        long start = startTime != null ? startTime : System.currentTimeMillis() - 3600000; // Last hour
        long end = endTime != null ? endTime : System.currentTimeMillis();

        List<LogEntry> logs = dataStore.getLogs(serviceName, level, start, end);

        // Limit results
        if (logs.size() > limit) {
            logs = logs.subList(Math.max(0, logs.size() - limit), logs.size());
        }

        // Count by level
        Map<String, Long> levelCounts = logs.stream()
                .collect(Collectors.groupingBy(LogEntry::getLevel, Collectors.counting()));

        return Map.of(
                "logs", logs,
                "levelCounts", levelCounts,
                "total", logs.size(),
                "timeRange", Map.of("start", start, "end", end));
    }

    @GetMapping("/traces")
    public Map<String, Object> getTraces(
            @RequestParam(required = false) String serviceName,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(defaultValue = "100") int limit) {

        long start = startTime != null ? startTime : System.currentTimeMillis() - 3600000; // Last hour
        long end = endTime != null ? endTime : System.currentTimeMillis();

        List<Trace> traces = dataStore.getTraces(serviceName, start, end);

        // Limit results
        if (traces.size() > limit) {
            traces = traces.subList(0, Math.min(limit, traces.size()));
        }

        return Map.of(
                "traces", traces,
                "total", traces.size(),
                "timeRange", Map.of("start", start, "end", end));
    }

    @GetMapping("/traces/{traceId}")
    public Map<String, Object> getTrace(@PathVariable String traceId) {
        Trace trace = dataStore.getTrace(traceId);
        if (trace == null) {
            return Map.of("error", "Trace not found");
        }
        return Map.of("trace", trace);
    }

    @GetMapping("/overview")
    public Map<String, Object> getOverview() {
        List<MetricData> recentMetrics = dataStore.getRecentMetrics(100);
        List<LogEntry> recentLogs = dataStore.getRecentLogs(50);
        List<Trace> recentTraces = dataStore.getRecentTraces(20);

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
        // Get all unique services from metrics
        List<MetricData> allMetrics = dataStore.getRecentMetrics(1000);

        Map<String, Map<String, Object>> servicesMap = new HashMap<>();

        allMetrics.forEach(metric -> {
            String service = metric.getServiceName();
            if (service != null && !service.isEmpty()) {
                servicesMap.putIfAbsent(service, new HashMap<>());
                Map<String, Object> serviceData = servicesMap.get(service);

                // Count metrics
                serviceData.put("metricCount",
                    ((Integer) serviceData.getOrDefault("metricCount", 0)) + 1);

                // Track last seen
                long lastSeen = (long) serviceData.getOrDefault("lastSeen", 0L);
                if (metric.getTimestamp() > lastSeen) {
                    serviceData.put("lastSeen", metric.getTimestamp());
                }
            }
        });

        // Get logs per service
        List<LogEntry> allLogs = dataStore.getRecentLogs(1000);
        allLogs.forEach(log -> {
            String service = log.getServiceName();
            if (service != null && !service.isEmpty()) {
                servicesMap.putIfAbsent(service, new HashMap<>());
                Map<String, Object> serviceData = servicesMap.get(service);

                serviceData.put("logCount",
                    ((Integer) serviceData.getOrDefault("logCount", 0)) + 1);

                // Count errors
                if ("ERROR".equals(log.getLevel())) {
                    serviceData.put("errorCount",
                        ((Integer) serviceData.getOrDefault("errorCount", 0)) + 1);
                }
            }
        });

        // Get traces per service
        List<Trace> allTraces = dataStore.getRecentTraces(500);
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
            if (timeSinceLastSeen > 300000) { // 5 minutes
                status = "down";
            } else if (timeSinceLastSeen > 60000) { // 1 minute
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

        // Sort by last seen (most recent first)
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
