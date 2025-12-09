package com.observability.controller;

import com.observability.model.LogEntry;
import com.observability.model.MetricData;
import com.observability.model.Span;
import com.observability.service.DataStore;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ingest")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DataIngestionController {

    private final DataStore dataStore;

    @PostMapping("/metrics")
    public ResponseEntity<Map<String, String>> ingestMetrics(@RequestBody List<MetricData> metrics) {
        metrics.forEach(dataStore::addMetric);
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Ingested " + metrics.size() + " metrics"));
    }

    @PostMapping("/logs")
    public ResponseEntity<Map<String, String>> ingestLogs(@RequestBody List<LogEntry> logs) {
        logs.forEach(dataStore::addLog);
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Ingested " + logs.size() + " logs"));
    }

    @PostMapping("/spans")
    public ResponseEntity<Map<String, String>> ingestSpans(@RequestBody List<Span> spans) {
        spans.forEach(dataStore::addSpan);
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Ingested " + spans.size() + " spans"));
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "healthy"));
    }
}
