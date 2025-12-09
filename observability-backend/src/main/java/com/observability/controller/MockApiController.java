package com.observability.controller;

import com.observability.service.MockDataGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Mock API endpoints for frontend development
 * Returns realistic mock data when no real telemetry data is available
 */
@RestController
@RequestMapping("/api/mock")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class MockApiController {

    private final MockDataGenerator mockData;

    @GetMapping("/overview")
    public Map<String, Object> getOverview(
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime) {

        long end = endTime != null ? endTime : System.currentTimeMillis();
        long start = startTime != null ? startTime : end - 3600000;
        long timeRange = end - start;
        int dataPoints = mockData.calculateDataPoints(timeRange);

        List<Map<String, Object>> latencyData = new ArrayList<>();
        List<Map<String, Object>> throughputData = new ArrayList<>();
        List<Map<String, Object>> errorRateData = new ArrayList<>();

        for (Map<String, Object> api : mockData.getApiEndpoints()) {
            String endpoint = (String) api.get("endpoint");
            int baseLatency = (int) api.get("baseLatency");
            int baseThroughput = (int) api.get("baseThroughput");
            double baseError = (double) api.get("baseError");

            latencyData.addAll(generateTimeSeries(dataPoints, baseLatency * 0.7, baseLatency * 1.5, start, end, endpoint, "latency"));
            throughputData.addAll(generateTimeSeries(dataPoints, baseThroughput * 0.6, baseThroughput * 1.4, start, end, endpoint, "throughput"));
            errorRateData.addAll(generateTimeSeries(dataPoints, 0, baseError * 3, start, end, endpoint, "error"));
        }

        return Map.of(
                "stats", Map.of(
                        "avgLatency", mockData.randomValue(150, 250),
                        "throughput", mockData.randomValue(800, 1200),
                        "errorRate", mockData.randomValue(1, 5),
                        "activeServices", mockData.getApiEndpoints().size()
                ),
                "latencyData", latencyData,
                "throughputData", throughputData,
                "errorRateData", errorRateData,
                "serviceLatency", generateServiceLatency(end),
                "recentActivity", generateRecentActivity(10),
                "timeRange", Map.of("startTime", start, "endTime", end, "duration", timeRange, "dataPoints", dataPoints)
        );
    }

    @GetMapping("/metrics")
    public Map<String, Object> getMetrics(
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(required = false) String serviceName) {

        long end = endTime != null ? endTime : System.currentTimeMillis();
        long start = startTime != null ? startTime : end - 3600000;
        long timeRange = end - start;
        int dataPoints = mockData.calculateDataPoints(timeRange);

        List<Map<String, Object>> latencyTimeSeries = new ArrayList<>();
        List<Map<String, Object>> throughputTimeSeries = new ArrayList<>();
        List<Map<String, Object>> errorRateTimeSeries = new ArrayList<>();
        List<Map<String, Object>> allMetrics = new ArrayList<>();

        for (Map<String, Object> api : mockData.getApiEndpoints()) {
            String endpoint = (String) api.get("endpoint");
            int baseLatency = (int) api.get("baseLatency");
            int baseThroughput = (int) api.get("baseThroughput");
            double baseError = (double) api.get("baseError");
            String svcName = endpoint.split("/").length > 3 ? endpoint.split("/")[3] : "api";

            latencyTimeSeries.addAll(generateTimeSeries(dataPoints, baseLatency * 0.7, baseLatency * 1.5, start, end, endpoint, "latency"));
            throughputTimeSeries.addAll(generateTimeSeries(dataPoints, baseThroughput * 0.6, baseThroughput * 1.4, start, end, endpoint, "throughput"));
            errorRateTimeSeries.addAll(generateTimeSeries(dataPoints, 0, baseError * 3, start, end, endpoint, "error"));

            allMetrics.add(Map.of("serviceName", svcName, "metricName", "api.latency", "value", mockData.randomValue(baseLatency * 0.8, baseLatency * 1.2), "timestamp", end, "unit", "ms", "endpoint", endpoint));
            allMetrics.add(Map.of("serviceName", svcName, "metricName", "throughput", "value", mockData.randomValue(baseThroughput * 0.8, baseThroughput * 1.2), "timestamp", end, "unit", "req/min", "endpoint", endpoint));
            allMetrics.add(Map.of("serviceName", svcName, "metricName", "error.rate", "value", mockData.randomValue(0, baseError * 2), "timestamp", end, "unit", "errors/min", "endpoint", endpoint));
        }

        return Map.of(
                "metrics", Map.of("api.latency", latencyTimeSeries, "throughput", throughputTimeSeries, "error.rate", errorRateTimeSeries),
                "statistics", Map.of(
                        "api.latency", calculateStats(latencyTimeSeries),
                        "throughput", calculateStats(throughputTimeSeries),
                        "error.rate", calculateStats(errorRateTimeSeries)
                ),
                "allMetrics", allMetrics,
                "timeRange", Map.of("startTime", start, "endTime", end, "duration", timeRange, "dataPoints", dataPoints)
        );
    }

    @GetMapping("/logs")
    public Map<String, Object> getLogs(
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(defaultValue = "50") int limit) {

        long end = endTime != null ? endTime : System.currentTimeMillis();
        long start = startTime != null ? startTime : end - 3600000;
        long timeRange = end - start;

        List<Map<String, Object>> logs = new ArrayList<>();
        for (int i = 0; i < limit; i++) {
            long timestamp = start + (long) (Math.random() * timeRange);
            String service = mockData.randomService();
            Map<String, String> pod = mockData.randomPodForService(service);
            Map<String, String> container = mockData.randomContainerForPod(pod.get("name"));

            logs.add(Map.of(
                    "timestamp", timestamp,
                    "level", mockData.randomLogLevel(),
                    "serviceName", service,
                    "message", mockData.randomLogMessage(),
                    "logger", "com.observability.service.Handler",
                    "threadName", "http-nio-8080-exec-" + mockData.randomInt(0, 9),
                    "pod", pod.get("name"),
                    "container", container.get("name"),
                    "node", pod.get("node")
            ));
        }
        logs.sort((a, b) -> Long.compare((long) b.get("timestamp"), (long) a.get("timestamp")));

        return Map.of("logs", logs);
    }

    // Continued in next part - generateTimeSeries, getTraces, getServices methods
    private List<Map<String, Object>> generateTimeSeries(int points, double min, double max, long start, long end, String endpoint, String pattern) {
        List<Map<String, Object>> data = new ArrayList<>();
        long interval = (end - start) / points;
        for (int i = 0; i < points; i++) {
            long timestamp = start + (i * interval);
            double value = mockData.randomValue(min, max);
            if ("latency".equals(pattern) && Math.random() < 0.1) value = mockData.randomValue(max * 0.8, max * 1.2);
            if ("error".equals(pattern)) value = Math.random() < 0.85 ? mockData.randomValue(min, max * 0.3) : mockData.randomValue(max * 0.5, max);
            data.add(Map.of("timestamp", timestamp, "value", value, "endpoint", endpoint));
        }
        return data;
    }

    private List<Map<String, Object>> generateServiceLatency(long timestamp) {
        return mockData.getApiEndpoints().stream().map(api -> Map.<String, Object>of(
                "serviceName", api.get("endpoint"),
                "avgLatency", mockData.randomValue((int) api.get("baseLatency") * 0.8, (int) api.get("baseLatency") * 1.2),
                "p95Latency", mockData.randomValue((int) api.get("baseLatency") * 1.5, (int) api.get("baseLatency") * 2.0),
                "timestamp", timestamp
        )).toList();
    }

    private List<Map<String, Object>> generateRecentActivity(int count) {
        List<String> types = List.of("deployment", "alert", "incident", "config_change");
        List<String> descriptions = List.of("Deployed version 2.1.0", "High latency alert", "Database connection issue", "Config updated");
        List<Map<String, Object>> activities = new ArrayList<>();
        long now = System.currentTimeMillis();
        for (int i = 0; i < count; i++) {
            activities.add(Map.of("type", types.get(mockData.randomInt(0, types.size() - 1)), "description", descriptions.get(mockData.randomInt(0, descriptions.size() - 1)), "timestamp", now - (i * 300000), "service", mockData.randomService()));
        }
        return activities;
    }

    private Map<String, Object> calculateStats(List<Map<String, Object>> data) {
        double sum = 0, min = Double.MAX_VALUE, max = Double.MIN_VALUE;
        for (Map<String, Object> d : data) { double v = (double) d.get("value"); sum += v; min = Math.min(min, v); max = Math.max(max, v); }
        return Map.of("avg", data.isEmpty() ? 0 : sum / data.size(), "min", data.isEmpty() ? 0 : min, "max", data.isEmpty() ? 0 : max, "data", data);
    }

    @GetMapping("/traces")
    public Map<String, Object> getTraces(
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(defaultValue = "20") int limit) {

        long end = endTime != null ? endTime : System.currentTimeMillis();
        long start = startTime != null ? startTime : end - 3600000;

        List<Map<String, Object>> traces = new ArrayList<>();
        for (int i = 0; i < limit; i++) {
            String service = mockData.randomService();
            Map<String, String> pod = mockData.randomPodForService(service);
            Map<String, String> container = mockData.randomContainerForPod(pod.get("name"));
            int spanCount = mockData.randomInt(2, 8);
            double duration = mockData.randomValue(50, 500);
            String traceId = mockData.generateId(32);

            traces.add(Map.of(
                    "traceId", traceId,
                    "serviceName", service,
                    "operationName", mockData.randomOperation(),
                    "duration", duration,
                    "spans", generateSpans(spanCount, duration),
                    "timestamp", end - (i * 10000),
                    "error", Math.random() < 0.1,
                    "pod", pod.get("name"),
                    "container", container.get("name"),
                    "node", pod.get("node")
            ));
        }

        return Map.of("traces", traces);
    }

    @GetMapping("/traces/{traceId}")
    public Map<String, Object> getTrace(@PathVariable String traceId) {
        int spanCount = mockData.randomInt(3, 10);
        double duration = mockData.randomValue(100, 600);

        return Map.of("trace", Map.of(
                "traceId", traceId,
                "serviceName", mockData.randomService(),
                "operationName", mockData.randomOperation(),
                "duration", duration,
                "spans", generateSpans(spanCount, duration),
                "timestamp", System.currentTimeMillis(),
                "error", false
        ));
    }

    @GetMapping("/services")
    public Map<String, Object> getServices() {
        long now = System.currentTimeMillis();
        List<Map<String, Object>> services = new ArrayList<>();

        for (String serviceName : mockData.getServices()) {
            double errorRate = mockData.randomValue(0, 15);
            long lastSeen = now - mockData.randomInt(0, 60000);
            long timeSinceLastSeen = now - lastSeen;

            String status = "healthy";
            if (timeSinceLastSeen > 300000) status = "down";
            else if (timeSinceLastSeen > 60000 || errorRate > 10) status = "degraded";

            List<Map<String, Object>> pods = generatePodsForService(serviceName, status, now);

            services.add(Map.of(
                    "name", serviceName,
                    "status", status,
                    "metricCount", mockData.randomInt(50, 200),
                    "logCount", mockData.randomInt(100, 1000),
                    "traceCount", mockData.randomInt(20, 100),
                    "errorRate", errorRate,
                    "lastSeen", lastSeen,
                    "pods", pods,
                    "podSummary", Map.of(
                            "total", pods.size(),
                            "running", pods.stream().filter(p -> "running".equals(p.get("status"))).count(),
                            "starting", pods.stream().filter(p -> "starting".equals(p.get("status"))).count(),
                            "degraded", pods.stream().filter(p -> "degraded".equals(p.get("status"))).count(),
                            "terminated", pods.stream().filter(p -> "terminated".equals(p.get("status"))).count()
                    )
            ));
        }

        return Map.of(
                "services", services,
                "total", services.size(),
                "healthy", services.stream().filter(s -> "healthy".equals(s.get("status"))).count(),
                "degraded", services.stream().filter(s -> "degraded".equals(s.get("status"))).count(),
                "down", services.stream().filter(s -> "down".equals(s.get("status"))).count()
        );
    }

    private List<Map<String, Object>> generateSpans(int count, double totalDuration) {
        List<String> operations = List.of("HTTP GET", "Database Query", "Cache Lookup", "External API Call", "Message Queue");
        List<Map<String, Object>> spans = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            spans.add(Map.of(
                    "spanId", mockData.generateId(16),
                    "operationName", operations.get(mockData.randomInt(0, operations.size() - 1)),
                    "duration", mockData.randomValue(10, totalDuration / count),
                    "tags", Map.of("http.method", "GET", "http.status_code", Math.random() < 0.9 ? "200" : "500", "component", "http-client")
            ));
        }
        return spans;
    }

    private List<Map<String, Object>> generatePodsForService(String serviceName, String serviceStatus, long now) {
        List<Map<String, Object>> pods = new ArrayList<>();
        List<Map<String, String>> servicePods = mockData.getPods().stream()
                .filter(p -> p.get("service").equals(serviceName))
                .toList();

        for (Map<String, String> pod : servicePods) {
            String podStatus = "running";
            if ("down".equals(serviceStatus)) podStatus = Math.random() > 0.3 ? "terminated" : "degraded";
            else if ("degraded".equals(serviceStatus)) podStatus = Math.random() > 0.5 ? "degraded" : "running";
            else podStatus = Math.random() > 0.9 ? "starting" : "running";

            List<Map<String, Object>> containers = generateContainersForPod(pod.get("name"), podStatus);
            int restarts = containers.stream().mapToInt(c -> (int) c.get("restarts")).sum();

            pods.add(Map.of(
                    "name", pod.get("name"),
                    "node", pod.get("node"),
                    "status", podStatus,
                    "ready", "running".equals(podStatus) ? containers.size() + "/" + containers.size() : "0/" + containers.size(),
                    "restarts", restarts,
                    "age", formatAge(now - mockData.randomInt(3600000, 86400000 * 7)),
                    "cpu", mockData.randomInt(20, 200) + "m",
                    "memory", mockData.randomInt(128, 1024) + "Mi",
                    "containers", containers
            ));
        }
        return pods;
    }

    private List<Map<String, Object>> generateContainersForPod(String podName, String podStatus) {
        List<Map<String, Object>> containers = new ArrayList<>();
        List<Map<String, String>> podContainers = mockData.getContainers().stream()
                .filter(c -> c.get("pod").equals(podName))
                .toList();

        for (Map<String, String> container : podContainers) {
            String containerStatus = "running".equals(podStatus) ? "running" :
                    "starting".equals(podStatus) ? (Math.random() > 0.5 ? "waiting" : "running") :
                    "degraded".equals(podStatus) ? "crashLoopBackOff" : "terminated";

            containers.add(Map.of(
                    "name", container.get("name"),
                    "image", container.get("image"),
                    "status", containerStatus,
                    "restarts", "degraded".equals(podStatus) ? mockData.randomInt(3, 15) : mockData.randomInt(0, 2),
                    "cpu", mockData.randomInt(10, 80) + "m",
                    "memory", mockData.randomInt(64, 512) + "Mi",
                    "ready", "running".equals(podStatus)
            ));
        }
        return containers.isEmpty() ? List.of(Map.of("name", "main", "image", "unknown", "status", podStatus, "restarts", 0, "cpu", "0m", "memory", "0Mi", "ready", false)) : containers;
    }

    private String formatAge(long ms) {
        long seconds = ms / 1000;
        if (seconds < 60) return seconds + "s";
        long minutes = seconds / 60;
        if (minutes < 60) return minutes + "m";
        long hours = minutes / 60;
        if (hours < 24) return hours + "h";
        return (hours / 24) + "d";
    }
}

