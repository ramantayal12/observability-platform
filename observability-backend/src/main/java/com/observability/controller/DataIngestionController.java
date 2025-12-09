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

import java.util.List;
import java.util.Map;

/**
 * Simple REST API for ingesting telemetry data
 * Alternative to OTLP for simpler integrations
 */
@RestController
@RequestMapping("/api/ingest")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class DataIngestionController {

    private final MetricService metricService;
    private final LogService logService;
    private final TraceService traceService;

    @PostMapping("/metrics")
    public ResponseEntity<Map<String, String>> ingestMetrics(@RequestBody List<MetricData> metrics) {
        metricService.saveMetrics(metrics);
        log.info("Ingested {} metrics via REST API", metrics.size());
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Ingested " + metrics.size() + " metrics"));
    }

    @PostMapping("/logs")
    public ResponseEntity<Map<String, String>> ingestLogs(@RequestBody List<LogEntry> logs) {
        logService.saveLogs(logs);
        log.info("Ingested {} logs via REST API", logs.size());
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Ingested " + logs.size() + " logs"));
    }

    @PostMapping("/spans")
    public ResponseEntity<Map<String, String>> ingestSpans(@RequestBody List<Span> spans) {
        traceService.saveSpans(spans);
        log.info("Ingested {} spans via REST API", spans.size());
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Ingested " + spans.size() + " spans"));
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "healthy"));
    }
}
