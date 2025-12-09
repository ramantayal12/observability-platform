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
}
