package com.observability.sdk.exporter;

import com.observability.sdk.config.ObservabilityProperties;
import com.observability.sdk.model.LogData;
import com.observability.sdk.model.MetricData;
import com.observability.sdk.model.SpanData;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Exports telemetry data to the Observability backend via OTLP HTTP
 */
@Slf4j
public class OtlpExporter {

    private final ObservabilityProperties properties;
    private final HttpClient httpClient;
    private final Queue<MetricData> metricBuffer = new ConcurrentLinkedQueue<>();
    private final Queue<SpanData> spanBuffer = new ConcurrentLinkedQueue<>();
    private final Queue<LogData> logBuffer = new ConcurrentLinkedQueue<>();
    private final ScheduledExecutorService scheduler;

    private static final int MAX_BUFFER_SIZE = 1000;
    private static final int BATCH_SIZE = 100;

    public OtlpExporter(ObservabilityProperties properties) {
        this.properties = properties;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.scheduler = Executors.newScheduledThreadPool(1);
        
        // Schedule periodic flush
        scheduler.scheduleAtFixedRate(this::flushAll, 5, 5, TimeUnit.SECONDS);
        
        // Shutdown hook
        Runtime.getRuntime().addShutdownHook(new Thread(this::shutdown));
    }

    public void exportMetric(MetricData metric) {
        if (metricBuffer.size() < MAX_BUFFER_SIZE) {
            metricBuffer.offer(metric);
        }
        if (metricBuffer.size() >= BATCH_SIZE) {
            flushMetrics();
        }
    }

    public void exportSpan(SpanData span) {
        if (spanBuffer.size() < MAX_BUFFER_SIZE) {
            spanBuffer.offer(span);
        }
        if (spanBuffer.size() >= BATCH_SIZE) {
            flushSpans();
        }
    }

    public void exportLog(LogData logData) {
        if (logBuffer.size() < MAX_BUFFER_SIZE) {
            logBuffer.offer(logData);
        }
        if (logBuffer.size() >= BATCH_SIZE) {
            flushLogs();
        }
    }

    private void flushAll() {
        flushMetrics();
        flushSpans();
        flushLogs();
    }

    @Async
    public void flushMetrics() {
        List<MetricData> batch = drainBuffer(metricBuffer, BATCH_SIZE);
        if (batch.isEmpty()) return;

        try {
            Map<String, Object> payload = buildMetricsPayload(batch);
            sendToBackend("/v1/metrics", payload);
        } catch (Exception e) {
            log.warn("Failed to export metrics: {}", e.getMessage());
            // Re-queue failed items (up to buffer limit)
            batch.forEach(m -> {
                if (metricBuffer.size() < MAX_BUFFER_SIZE) metricBuffer.offer(m);
            });
        }
    }

    @Async
    public void flushSpans() {
        List<SpanData> batch = drainBuffer(spanBuffer, BATCH_SIZE);
        if (batch.isEmpty()) return;

        try {
            Map<String, Object> payload = buildTracesPayload(batch);
            sendToBackend("/v1/traces", payload);
        } catch (Exception e) {
            log.warn("Failed to export spans: {}", e.getMessage());
            batch.forEach(s -> {
                if (spanBuffer.size() < MAX_BUFFER_SIZE) spanBuffer.offer(s);
            });
        }
    }

    @Async
    public void flushLogs() {
        List<LogData> batch = drainBuffer(logBuffer, BATCH_SIZE);
        if (batch.isEmpty()) return;

        try {
            Map<String, Object> payload = buildLogsPayload(batch);
            sendToBackend("/v1/logs", payload);
        } catch (Exception e) {
            log.warn("Failed to export logs: {}", e.getMessage());
            batch.forEach(l -> {
                if (logBuffer.size() < MAX_BUFFER_SIZE) logBuffer.offer(l);
            });
        }
    }

    private <T> List<T> drainBuffer(Queue<T> buffer, int maxSize) {
        List<T> batch = new ArrayList<>();
        T item;
        while (batch.size() < maxSize && (item = buffer.poll()) != null) {
            batch.add(item);
        }
        return batch;
    }

    private void sendToBackend(String path, Map<String, Object> payload) throws Exception {
        String url = properties.getEndpoint() + path;
        String json = toJson(payload);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .timeout(Duration.ofSeconds(10))
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        
        if (response.statusCode() >= 400) {
            throw new RuntimeException("HTTP " + response.statusCode() + ": " + response.body());
        }
    }

    // Continued in next part...
    private Map<String, Object> buildMetricsPayload(List<MetricData> metrics) {
        return Map.of("resourceMetrics", List.of(buildResourceMetrics(metrics)));
    }

    private Map<String, Object> buildTracesPayload(List<SpanData> spans) {
        return Map.of("resourceSpans", List.of(buildResourceSpans(spans)));
    }

    private Map<String, Object> buildLogsPayload(List<LogData> logs) {
        return Map.of("resourceLogs", List.of(buildResourceLogs(logs)));
    }
    
    private Map<String, Object> buildResourceMetrics(List<MetricData> metrics) {
        List<Map<String, Object>> dataPoints = new ArrayList<>();
        for (MetricData m : metrics) {
            dataPoints.add(Map.of(
                    "asDouble", m.getValue(),
                    "timeUnixNano", m.getTimestamp() * 1_000_000
            ));
        }

        return Map.of(
                "resource", buildResource(),
                "scopeMetrics", List.of(Map.of(
                        "metrics", metrics.stream().map(m -> Map.of(
                                "name", m.getName(),
                                "gauge", Map.of("dataPoints", dataPoints)
                        )).toList()
                ))
        );
    }

    private Map<String, Object> buildResourceSpans(List<SpanData> spans) {
        List<Map<String, Object>> spanMaps = new ArrayList<>();
        for (SpanData s : spans) {
            spanMaps.add(Map.of(
                    "traceId", s.getTraceId(),
                    "spanId", s.getSpanId(),
                    "parentSpanId", s.getParentSpanId() != null ? s.getParentSpanId() : "",
                    "name", s.getOperationName(),
                    "kind", getSpanKindValue(s.getKind()),
                    "startTimeUnixNano", s.getStartTime() * 1_000_000,
                    "endTimeUnixNano", s.getEndTime() * 1_000_000,
                    "status", Map.of("code", "ERROR".equals(s.getStatus()) ? 2 : 1)
            ));
        }

        return Map.of(
                "resource", buildResource(),
                "scopeSpans", List.of(Map.of("spans", spanMaps))
        );
    }

    private Map<String, Object> buildResourceLogs(List<LogData> logs) {
        List<Map<String, Object>> logRecords = new ArrayList<>();
        for (LogData l : logs) {
            logRecords.add(Map.of(
                    "timeUnixNano", l.getTimestamp() * 1_000_000,
                    "severityNumber", getSeverityNumber(l.getLevel()),
                    "severityText", l.getLevel(),
                    "body", Map.of("stringValue", l.getMessage()),
                    "traceId", l.getTraceId() != null ? l.getTraceId() : "",
                    "spanId", l.getSpanId() != null ? l.getSpanId() : ""
            ));
        }

        return Map.of(
                "resource", buildResource(),
                "scopeLogs", List.of(Map.of("logRecords", logRecords))
        );
    }

    private Map<String, Object> buildResource() {
        List<Map<String, Object>> attributes = new ArrayList<>();
        attributes.add(attr("service.name", properties.getServiceName()));
        attributes.add(attr("deployment.environment", properties.getEnvironment()));
        if (properties.getPodName() != null) {
            attributes.add(attr("k8s.pod.name", properties.getPodName()));
        }
        if (properties.getContainerName() != null) {
            attributes.add(attr("k8s.container.name", properties.getContainerName()));
        }
        if (properties.getNodeName() != null) {
            attributes.add(attr("k8s.node.name", properties.getNodeName()));
        }
        return Map.of("attributes", attributes);
    }

    private Map<String, Object> attr(String key, String value) {
        return Map.of("key", key, "value", Map.of("stringValue", value));
    }

    private int getSpanKindValue(String kind) {
        if (kind == null) return 0;
        return switch (kind) {
            case "INTERNAL" -> 1;
            case "SERVER" -> 2;
            case "CLIENT" -> 3;
            case "PRODUCER" -> 4;
            case "CONSUMER" -> 5;
            default -> 0;
        };
    }

    private int getSeverityNumber(String level) {
        return switch (level.toUpperCase()) {
            case "DEBUG" -> 5;
            case "INFO" -> 9;
            case "WARN", "WARNING" -> 13;
            case "ERROR" -> 17;
            case "FATAL" -> 21;
            default -> 9;
        };
    }

    private String toJson(Object obj) {
        try {
            return new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }

    public void shutdown() {
        flushAll();
        scheduler.shutdown();
    }
}

