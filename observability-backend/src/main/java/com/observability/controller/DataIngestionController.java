package com.observability.controller;

import com.observability.common.response.ApiResponse;
import com.observability.dto.request.LogRequest;
import com.observability.dto.request.MetricRequest;
import com.observability.dto.request.SpanRequest;
import com.observability.model.LogEntry;
import com.observability.model.MetricData;
import com.observability.model.Span;
import com.observability.service.LogService;
import com.observability.service.MetricService;
import com.observability.service.TraceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST API for ingesting telemetry data.
 * Alternative to OTLP for simpler integrations.
 */
@RestController
@RequestMapping("/api/ingest")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
@Tag(name = "Data Ingestion", description = "APIs for ingesting telemetry data")
public class DataIngestionController {

    private final MetricService metricService;
    private final LogService logService;
    private final TraceService traceService;

    // ==================== New DTO-based endpoints ====================

    @PostMapping("/v2/metrics")
    @Operation(summary = "Ingest metrics (v2)", description = "Ingest metrics using validated DTOs")
    public ApiResponse<Map<String, Object>> ingestMetricsV2(
            @Valid @RequestBody List<MetricRequest> metrics) {
        metricService.saveAll(metrics);
        log.info("Ingested {} metrics via REST API v2", metrics.size());
        return ApiResponse.success(Map.of(
                "count", metrics.size(),
                "message", "Ingested " + metrics.size() + " metrics"));
    }

    @PostMapping("/v2/logs")
    @Operation(summary = "Ingest logs (v2)", description = "Ingest logs using validated DTOs")
    public ApiResponse<Map<String, Object>> ingestLogsV2(
            @Valid @RequestBody List<LogRequest> logs) {
        logService.saveAll(logs);
        log.info("Ingested {} logs via REST API v2", logs.size());
        return ApiResponse.success(Map.of(
                "count", logs.size(),
                "message", "Ingested " + logs.size() + " logs"));
    }

    // ==================== Legacy endpoints (backward compatibility) ====================

    @PostMapping("/metrics")
    @Operation(summary = "Ingest metrics", description = "Ingest metrics (legacy endpoint)")
    public ResponseEntity<Map<String, String>> ingestMetrics(@RequestBody List<MetricData> metrics) {
        metricService.saveMetrics(metrics);
        log.info("Ingested {} metrics via REST API", metrics.size());
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Ingested " + metrics.size() + " metrics"));
    }

    @PostMapping("/logs")
    @Operation(summary = "Ingest logs", description = "Ingest logs (legacy endpoint)")
    public ResponseEntity<Map<String, String>> ingestLogs(@RequestBody List<LogEntry> logs) {
        logService.saveLogs(logs);
        log.info("Ingested {} logs via REST API", logs.size());
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Ingested " + logs.size() + " logs"));
    }

    @PostMapping("/spans")
    @Operation(summary = "Ingest spans", description = "Ingest spans/traces (legacy endpoint)")
    public ResponseEntity<Map<String, String>> ingestSpans(@RequestBody List<Span> spans) {
        traceService.saveSpans(spans);
        log.info("Ingested {} spans via REST API", spans.size());
        return ResponseEntity.ok(Map.of(
                "status", "success",
                "message", "Ingested " + spans.size() + " spans"));
    }

    @GetMapping("/health")
    @Operation(summary = "Health check", description = "Check if the ingestion service is healthy")
    public ApiResponse<Map<String, String>> health() {
        return ApiResponse.success(Map.of("status", "healthy"));
    }
}
