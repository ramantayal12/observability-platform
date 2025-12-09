package com.observability.service;

import com.observability.model.LogEntry;
import com.observability.model.MetricData;
import com.observability.model.Span;
import com.observability.model.Trace;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class DataStore {

    // In-memory storage with thread-safe collections
    private final List<MetricData> metrics = Collections.synchronizedList(new ArrayList<>());
    private final List<LogEntry> logs = Collections.synchronizedList(new ArrayList<>());
    private final Map<String, Trace> traces = new ConcurrentHashMap<>();
    private final List<Span> spans = Collections.synchronizedList(new ArrayList<>());

    private static final int MAX_METRICS = 10000;
    private static final int MAX_LOGS = 5000;
    private static final int MAX_TRACES = 1000;

    // Metrics
    public void addMetric(MetricData metric) {
        synchronized (metrics) {
            metrics.add(metric);
            // Keep only recent metrics
            if (metrics.size() > MAX_METRICS) {
                metrics.remove(0);
            }
        }
    }

    public List<MetricData> getMetrics(String serviceName, long startTime, long endTime) {
        return metrics.stream()
                .filter(m -> (serviceName == null || serviceName.equals(m.getServiceName())) &&
                        m.getTimestamp() >= startTime &&
                        m.getTimestamp() <= endTime)
                .collect(Collectors.toList());
    }

    public List<MetricData> getRecentMetrics(int limit) {
        synchronized (metrics) {
            int size = metrics.size();
            int fromIndex = Math.max(0, size - limit);
            return new ArrayList<>(metrics.subList(fromIndex, size));
        }
    }

    // Logs
    public void addLog(LogEntry log) {
        synchronized (logs) {
            logs.add(log);
            // Keep only recent logs
            if (logs.size() > MAX_LOGS) {
                logs.remove(0);
            }
        }
    }

    public List<LogEntry> getLogs(String serviceName, String level, long startTime, long endTime) {
        return logs.stream()
                .filter(l -> (serviceName == null || serviceName.equals(l.getServiceName())) &&
                        (level == null || level.equals(l.getLevel())) &&
                        l.getTimestamp() >= startTime &&
                        l.getTimestamp() <= endTime)
                .collect(Collectors.toList());
    }

    public List<LogEntry> getRecentLogs(int limit) {
        synchronized (logs) {
            int size = logs.size();
            int fromIndex = Math.max(0, size - limit);
            return new ArrayList<>(logs.subList(fromIndex, size));
        }
    }

    // Traces and Spans
    public void addSpan(Span span) {
        spans.add(span);

        // Update or create trace
        traces.compute(span.getTraceId(), (traceId, trace) -> {
            if (trace == null) {
                trace = Trace.builder()
                        .traceId(traceId)
                        .serviceName(span.getServiceName())
                        .spans(new ArrayList<>())
                        .build();
            }
            trace.getSpans().add(span);

            // Update trace timing
            if (trace.getStartTime() == 0 || span.getStartTime() < trace.getStartTime()) {
                trace.setStartTime(span.getStartTime());
            }
            if (trace.getEndTime() == 0 || span.getEndTime() > trace.getEndTime()) {
                trace.setEndTime(span.getEndTime());
            }
            trace.setDuration(trace.getEndTime() - trace.getStartTime());

            return trace;
        });

        // Keep only recent traces
        if (traces.size() > MAX_TRACES) {
            Optional<String> oldestTraceId = traces.entrySet().stream()
                    .min(Comparator.comparingLong(e -> e.getValue().getStartTime()))
                    .map(Map.Entry::getKey);
            oldestTraceId.ifPresent(traces::remove);
        }
    }

    public List<Trace> getTraces(String serviceName, long startTime, long endTime) {
        return traces.values().stream()
                .filter(t -> (serviceName == null || serviceName.equals(t.getServiceName())) &&
                        t.getStartTime() >= startTime &&
                        t.getStartTime() <= endTime)
                .sorted(Comparator.comparingLong(Trace::getStartTime).reversed())
                .collect(Collectors.toList());
    }

    public Trace getTrace(String traceId) {
        return traces.get(traceId);
    }

    public List<Trace> getRecentTraces(int limit) {
        return traces.values().stream()
                .sorted(Comparator.comparingLong(Trace::getStartTime).reversed())
                .limit(limit)
                .collect(Collectors.toList());
    }
}
