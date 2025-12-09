package com.observability.controller;

import com.observability.model.LogEntry;
import com.observability.model.MetricData;
import com.observability.model.Span;
import com.observability.service.LogService;
import com.observability.service.MetricService;
import com.observability.service.TraceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * OpenTelemetry Protocol (OTLP) HTTP Receiver
 * Accepts telemetry data in OTLP JSON format
 */
@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class OtelReceiverController {

    private final MetricService metricService;
    private final LogService logService;
    private final TraceService traceService;

    /**
     * Receive OTLP metrics
     * POST /v1/metrics
     */
    @PostMapping("/metrics")
    public ResponseEntity<Map<String, Object>> receiveMetrics(@RequestBody Map<String, Object> payload) {
        try {
            List<MetricData> metrics = parseOtlpMetrics(payload);
            metricService.saveMetrics(metrics);
            log.info("Received {} OTLP metrics", metrics.size());
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "received", metrics.size()
            ));
        } catch (Exception e) {
            log.error("Failed to process OTLP metrics", e);
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Receive OTLP traces
     * POST /v1/traces
     */
    @PostMapping("/traces")
    public ResponseEntity<Map<String, Object>> receiveTraces(@RequestBody Map<String, Object> payload) {
        try {
            List<Span> spans = parseOtlpTraces(payload);
            traceService.saveSpans(spans);
            log.info("Received {} OTLP spans", spans.size());
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "received", spans.size()
            ));
        } catch (Exception e) {
            log.error("Failed to process OTLP traces", e);
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", e.getMessage()
            ));
        }
    }

    /**
     * Receive OTLP logs
     * POST /v1/logs
     */
    @PostMapping("/logs")
    public ResponseEntity<Map<String, Object>> receiveLogs(@RequestBody Map<String, Object> payload) {
        try {
            List<LogEntry> logs = parseOtlpLogs(payload);
            logService.saveLogs(logs);
            log.info("Received {} OTLP logs", logs.size());
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "received", logs.size()
            ));
        } catch (Exception e) {
            log.error("Failed to process OTLP logs", e);
            return ResponseEntity.badRequest().body(Map.of(
                    "status", "error",
                    "message", e.getMessage()
            ));
        }
    }

    @SuppressWarnings("unchecked")
    private List<MetricData> parseOtlpMetrics(Map<String, Object> payload) {
        List<MetricData> metrics = new ArrayList<>();
        
        List<Map<String, Object>> resourceMetrics = 
                (List<Map<String, Object>>) payload.get("resourceMetrics");
        if (resourceMetrics == null) return metrics;

        for (Map<String, Object> rm : resourceMetrics) {
            Map<String, Object> resource = (Map<String, Object>) rm.get("resource");
            String serviceName = extractServiceName(resource);
            Map<String, String> resourceAttrs = extractAttributes(resource);

            List<Map<String, Object>> scopeMetrics = 
                    (List<Map<String, Object>>) rm.get("scopeMetrics");
            if (scopeMetrics == null) continue;

            for (Map<String, Object> sm : scopeMetrics) {
                List<Map<String, Object>> metricsList = 
                        (List<Map<String, Object>>) sm.get("metrics");
                if (metricsList == null) continue;

                for (Map<String, Object> metric : metricsList) {
                    String metricName = (String) metric.get("name");
                    
                    // Handle different metric types (gauge, sum, histogram)
                    List<Map<String, Object>> dataPoints = extractDataPoints(metric);
                    for (Map<String, Object> dp : dataPoints) {
                        MetricData md = MetricData.builder()
                                .serviceName(serviceName)
                                .metricName(metricName)
                                .value(extractDoubleValue(dp))
                                .timestamp(extractTimestamp(dp))
                                .pod(resourceAttrs.get("k8s.pod.name"))
                                .container(resourceAttrs.get("k8s.container.name"))
                                .node(resourceAttrs.get("k8s.node.name"))
                                .build();
                        metrics.add(md);
                    }
                }
            }
        }
        return metrics;
    }

    @SuppressWarnings("unchecked")
    private List<Span> parseOtlpTraces(Map<String, Object> payload) {
        List<Span> spans = new ArrayList<>();
        
        List<Map<String, Object>> resourceSpans = 
                (List<Map<String, Object>>) payload.get("resourceSpans");
        if (resourceSpans == null) return spans;

        for (Map<String, Object> rs : resourceSpans) {
            Map<String, Object> resource = (Map<String, Object>) rs.get("resource");
            String serviceName = extractServiceName(resource);
            Map<String, String> resourceAttrs = extractAttributes(resource);

            List<Map<String, Object>> scopeSpans =
                    (List<Map<String, Object>>) rs.get("scopeSpans");
            if (scopeSpans == null) continue;

            for (Map<String, Object> ss : scopeSpans) {
                List<Map<String, Object>> spansList =
                        (List<Map<String, Object>>) ss.get("spans");
                if (spansList == null) continue;

                for (Map<String, Object> spanData : spansList) {
                    long startTime = extractTimestamp(spanData, "startTimeUnixNano");
                    long endTime = extractTimestamp(spanData, "endTimeUnixNano");

                    Span span = Span.builder()
                            .spanId((String) spanData.get("spanId"))
                            .traceId((String) spanData.get("traceId"))
                            .parentSpanId((String) spanData.get("parentSpanId"))
                            .operationName((String) spanData.get("name"))
                            .startTime(startTime)
                            .endTime(endTime)
                            .duration(endTime - startTime)
                            .serviceName(serviceName)
                            .status(extractSpanStatus(spanData))
                            .kind(extractSpanKind(spanData))
                            .pod(resourceAttrs.get("k8s.pod.name"))
                            .container(resourceAttrs.get("k8s.container.name"))
                            .node(resourceAttrs.get("k8s.node.name"))
                            .attributes(extractSpanAttributes(spanData))
                            .build();
                    spans.add(span);
                }
            }
        }
        return spans;
    }

    @SuppressWarnings("unchecked")
    private List<LogEntry> parseOtlpLogs(Map<String, Object> payload) {
        List<LogEntry> logs = new ArrayList<>();

        List<Map<String, Object>> resourceLogs =
                (List<Map<String, Object>>) payload.get("resourceLogs");
        if (resourceLogs == null) return logs;

        for (Map<String, Object> rl : resourceLogs) {
            Map<String, Object> resource = (Map<String, Object>) rl.get("resource");
            String serviceName = extractServiceName(resource);
            Map<String, String> resourceAttrs = extractAttributes(resource);

            List<Map<String, Object>> scopeLogs =
                    (List<Map<String, Object>>) rl.get("scopeLogs");
            if (scopeLogs == null) continue;

            for (Map<String, Object> sl : scopeLogs) {
                List<Map<String, Object>> logRecords =
                        (List<Map<String, Object>>) sl.get("logRecords");
                if (logRecords == null) continue;

                for (Map<String, Object> logRecord : logRecords) {
                    LogEntry entry = LogEntry.builder()
                            .serviceName(serviceName)
                            .level(extractLogLevel(logRecord))
                            .message(extractLogBody(logRecord))
                            .timestamp(extractTimestamp(logRecord, "timeUnixNano"))
                            .traceId((String) logRecord.get("traceId"))
                            .spanId((String) logRecord.get("spanId"))
                            .pod(resourceAttrs.get("k8s.pod.name"))
                            .container(resourceAttrs.get("k8s.container.name"))
                            .node(resourceAttrs.get("k8s.node.name"))
                            .build();
                    logs.add(entry);
                }
            }
        }
        return logs;
    }

    // Helper methods
    @SuppressWarnings("unchecked")
    private String extractServiceName(Map<String, Object> resource) {
        if (resource == null) return "unknown";
        List<Map<String, Object>> attributes =
                (List<Map<String, Object>>) resource.get("attributes");
        if (attributes == null) return "unknown";

        for (Map<String, Object> attr : attributes) {
            if ("service.name".equals(attr.get("key"))) {
                Map<String, Object> value = (Map<String, Object>) attr.get("value");
                return (String) value.get("stringValue");
            }
        }
        return "unknown";
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> extractAttributes(Map<String, Object> resource) {
        Map<String, String> result = new java.util.HashMap<>();
        if (resource == null) return result;

        List<Map<String, Object>> attributes =
                (List<Map<String, Object>>) resource.get("attributes");
        if (attributes == null) return result;

        for (Map<String, Object> attr : attributes) {
            String key = (String) attr.get("key");
            Map<String, Object> value = (Map<String, Object>) attr.get("value");
            if (value != null && value.get("stringValue") != null) {
                result.put(key, (String) value.get("stringValue"));
            }
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractDataPoints(Map<String, Object> metric) {
        // Try different metric types
        if (metric.get("gauge") != null) {
            Map<String, Object> gauge = (Map<String, Object>) metric.get("gauge");
            return (List<Map<String, Object>>) gauge.get("dataPoints");
        }
        if (metric.get("sum") != null) {
            Map<String, Object> sum = (Map<String, Object>) metric.get("sum");
            return (List<Map<String, Object>>) sum.get("dataPoints");
        }
        if (metric.get("histogram") != null) {
            Map<String, Object> histogram = (Map<String, Object>) metric.get("histogram");
            return (List<Map<String, Object>>) histogram.get("dataPoints");
        }
        return new ArrayList<>();
    }

    private double extractDoubleValue(Map<String, Object> dataPoint) {
        if (dataPoint.get("asDouble") != null) {
            return ((Number) dataPoint.get("asDouble")).doubleValue();
        }
        if (dataPoint.get("asInt") != null) {
            return ((Number) dataPoint.get("asInt")).doubleValue();
        }
        return 0.0;
    }

    private long extractTimestamp(Map<String, Object> dataPoint) {
        Object timeNano = dataPoint.get("timeUnixNano");
        if (timeNano != null) {
            return ((Number) timeNano).longValue() / 1_000_000; // Convert nano to milli
        }
        return System.currentTimeMillis();
    }

    private long extractTimestamp(Map<String, Object> data, String field) {
        Object timeNano = data.get(field);
        if (timeNano != null) {
            return ((Number) timeNano).longValue() / 1_000_000; // Convert nano to milli
        }
        return System.currentTimeMillis();
    }

    @SuppressWarnings("unchecked")
    private String extractSpanStatus(Map<String, Object> spanData) {
        Map<String, Object> status = (Map<String, Object>) spanData.get("status");
        if (status != null) {
            Object code = status.get("code");
            if (code != null && ((Number) code).intValue() == 2) {
                return "ERROR";
            }
        }
        return "OK";
    }

    private String extractSpanKind(Map<String, Object> spanData) {
        Object kind = spanData.get("kind");
        if (kind != null) {
            int kindValue = ((Number) kind).intValue();
            switch (kindValue) {
                case 1: return "INTERNAL";
                case 2: return "SERVER";
                case 3: return "CLIENT";
                case 4: return "PRODUCER";
                case 5: return "CONSUMER";
                default: return "UNSPECIFIED";
            }
        }
        return "UNSPECIFIED";
    }

    @SuppressWarnings("unchecked")
    private Map<String, String> extractSpanAttributes(Map<String, Object> spanData) {
        Map<String, String> result = new java.util.HashMap<>();
        List<Map<String, Object>> attributes =
                (List<Map<String, Object>>) spanData.get("attributes");
        if (attributes == null) return result;

        for (Map<String, Object> attr : attributes) {
            String key = (String) attr.get("key");
            Map<String, Object> value = (Map<String, Object>) attr.get("value");
            if (value != null && value.get("stringValue") != null) {
                result.put(key, (String) value.get("stringValue"));
            }
        }
        return result;
    }

    private String extractLogLevel(Map<String, Object> logRecord) {
        Object severityNumber = logRecord.get("severityNumber");
        if (severityNumber != null) {
            int level = ((Number) severityNumber).intValue();
            if (level <= 4) return "DEBUG";
            if (level <= 8) return "INFO";
            if (level <= 12) return "WARN";
            return "ERROR";
        }
        String severityText = (String) logRecord.get("severityText");
        return severityText != null ? severityText : "INFO";
    }

    @SuppressWarnings("unchecked")
    private String extractLogBody(Map<String, Object> logRecord) {
        Map<String, Object> body = (Map<String, Object>) logRecord.get("body");
        if (body != null && body.get("stringValue") != null) {
            return (String) body.get("stringValue");
        }
        return "";
    }
}

