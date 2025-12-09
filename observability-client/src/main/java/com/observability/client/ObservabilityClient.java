package com.observability.client;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.observability.client.config.ObservabilityConfig;
import com.observability.client.model.LogEntry;
import com.observability.client.model.MetricData;
import com.observability.client.model.Span;
import com.observability.client.tracing.TracingContext;
import lombok.extern.slf4j.Slf4j;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.*;

@Slf4j
public class ObservabilityClient {

    private final ObservabilityConfig config;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final ScheduledExecutorService scheduler;

    private final List<MetricData> metricBuffer = new CopyOnWriteArrayList<>();
    private final List<LogEntry> logBuffer = new CopyOnWriteArrayList<>();
    private final List<Span> spanBuffer = new CopyOnWriteArrayList<>();

    private static ObservabilityClient instance;

    private ObservabilityClient(ObservabilityConfig config) {
        this.config = config;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = new ObjectMapper();
        this.scheduler = Executors.newScheduledThreadPool(1);

        // Schedule periodic flush
        scheduler.scheduleAtFixedRate(
                this::flush,
                config.getFlushIntervalMs(),
                config.getFlushIntervalMs(),
                TimeUnit.MILLISECONDS);
    }

    public static synchronized void initialize(ObservabilityConfig config) {
        if (instance == null) {
            instance = new ObservabilityClient(config);
            log.info("ObservabilityClient initialized for service: {}", config.getServiceName());
        }
    }

    public static ObservabilityClient getInstance() {
        if (instance == null) {
            throw new IllegalStateException("ObservabilityClient not initialized. Call initialize() first.");
        }
        return instance;
    }

    public void recordMetric(String metricName, String endpoint, double value, String method, int statusCode) {
        if (!config.isMetricsEnabled())
            return;

        MetricData metric = MetricData.builder()
                .serviceName(config.getServiceName())
                .metricName(metricName)
                .endpoint(endpoint)
                .value(value)
                .timestamp(System.currentTimeMillis())
                .method(method)
                .statusCode(statusCode)
                .build();

        metricBuffer.add(metric);

        if (metricBuffer.size() >= config.getBatchSize()) {
            flushMetrics();
        }
    }

    public void recordLog(String level, String message, String logger) {
        if (!config.isLogsEnabled())
            return;

        LogEntry logEntry = LogEntry.builder()
                .serviceName(config.getServiceName())
                .level(level)
                .message(message)
                .timestamp(System.currentTimeMillis())
                .logger(logger)
                .traceId(TracingContext.getTraceId())
                .spanId(TracingContext.getSpanId())
                .build();

        logBuffer.add(logEntry);

        if (logBuffer.size() >= config.getBatchSize()) {
            flushLogs();
        }
    }

    public void recordSpan(String operationName, long startTime, long endTime, Map<String, String> tags) {
        if (!config.isTracingEnabled())
            return;

        Span span = Span.builder()
                .spanId(TracingContext.getSpanId())
                .traceId(TracingContext.getTraceId())
                .parentSpanId(TracingContext.getParentSpanId())
                .operationName(operationName)
                .startTime(startTime)
                .endTime(endTime)
                .duration(endTime - startTime)
                .serviceName(config.getServiceName())
                .tags(tags != null ? tags : new HashMap<>())
                .build();

        spanBuffer.add(span);

        if (spanBuffer.size() >= config.getBatchSize()) {
            flushSpans();
        }
    }

    public void flush() {
        flushMetrics();
        flushLogs();
        flushSpans();
    }

    private void flushMetrics() {
        if (metricBuffer.isEmpty())
            return;

        List<MetricData> toSend = new ArrayList<>(metricBuffer);
        metricBuffer.clear();

        sendData("/api/ingest/metrics", toSend);
    }

    private void flushLogs() {
        if (logBuffer.isEmpty())
            return;

        List<LogEntry> toSend = new ArrayList<>(logBuffer);
        logBuffer.clear();

        sendData("/api/ingest/logs", toSend);
    }

    private void flushSpans() {
        if (spanBuffer.isEmpty())
            return;

        List<Span> toSend = new ArrayList<>(spanBuffer);
        spanBuffer.clear();

        sendData("/api/ingest/spans", toSend);
    }

    private <T> void sendData(String endpoint, List<T> data) {
        try {
            String json = objectMapper.writeValueAsString(data);

            HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                    .uri(URI.create(config.getBackendUrl() + endpoint))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .timeout(Duration.ofSeconds(5));

            if (config.getApiKey() != null) {
                requestBuilder.header("X-API-Key", config.getApiKey());
            }

            httpClient.sendAsync(requestBuilder.build(), HttpResponse.BodyHandlers.ofString())
                    .exceptionally(ex -> {
                        log.warn("Failed to send data to {}: {}", endpoint, ex.getMessage());
                        return null;
                    });

        } catch (Exception e) {
            log.error("Error serializing data for {}", endpoint, e);
        }
    }

    public void shutdown() {
        flush();
        scheduler.shutdown();
        try {
            if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                scheduler.shutdownNow();
            }
        } catch (InterruptedException e) {
            scheduler.shutdownNow();
            Thread.currentThread().interrupt();
        }
    }
}
