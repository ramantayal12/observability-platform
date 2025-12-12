package com.observability.controller;

import com.observability.service.ClickHouseDataService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * REST Controller for ClickHouse-backed observability data.
 * Simplified: spans (traces+metrics), logs, incidents.
 */
@RestController
@RequestMapping("/api/v2")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ClickHouseDataController {

    private final ClickHouseDataService clickHouseDataService;

    // ==================== METRICS (derived from spans) ====================

    @GetMapping("/teams/{teamId}/services/metrics")
    public ResponseEntity<List<Map<String, Object>>> getServiceMetrics(
            @PathVariable UUID teamId,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime) {
        long end = endTime != null ? endTime : System.currentTimeMillis();
        long start = startTime != null ? startTime : end - 3600000;
        return ResponseEntity.ok(clickHouseDataService.getServiceMetrics(teamId, start, end));
    }

    @GetMapping("/teams/{teamId}/endpoints/metrics")
    public ResponseEntity<List<Map<String, Object>>> getEndpointMetrics(
            @PathVariable UUID teamId,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(required = false) String serviceName) {
        long end = endTime != null ? endTime : System.currentTimeMillis();
        long start = startTime != null ? startTime : end - 3600000;
        return ResponseEntity.ok(clickHouseDataService.getEndpointMetrics(teamId, start, end, serviceName));
    }

    @GetMapping("/teams/{teamId}/metrics/timeseries")
    public ResponseEntity<List<Map<String, Object>>> getMetricsTimeSeries(
            @PathVariable UUID teamId,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(required = false) String serviceName,
            @RequestParam(defaultValue = "1m") String interval) {
        long end = endTime != null ? endTime : System.currentTimeMillis();
        long start = startTime != null ? startTime : end - 3600000;
        return ResponseEntity.ok(clickHouseDataService.getMetricsTimeSeries(teamId, start, end, serviceName, interval));
    }

    // ==================== LOGS ====================

    @GetMapping("/teams/{teamId}/logs")
    public ResponseEntity<Map<String, Object>> getLogs(
            @PathVariable UUID teamId,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(required = false) List<String> levels,
            @RequestParam(required = false) List<String> services,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "100") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        long end = endTime != null ? endTime : System.currentTimeMillis();
        long start = startTime != null ? startTime : end - 3600000;
        return ResponseEntity.ok(clickHouseDataService.getLogs(teamId, start, end, levels, services, search, limit, offset));
    }

    @GetMapping("/teams/{teamId}/logs/histogram")
    public ResponseEntity<List<Map<String, Object>>> getLogHistogram(
            @PathVariable UUID teamId,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(defaultValue = "1m") String interval) {
        long end = endTime != null ? endTime : System.currentTimeMillis();
        long start = startTime != null ? startTime : end - 3600000;
        return ResponseEntity.ok(clickHouseDataService.getLogHistogram(teamId, start, end, interval));
    }

    // ==================== TRACES ====================

    @GetMapping("/teams/{teamId}/traces")
    public ResponseEntity<Map<String, Object>> getTraces(
            @PathVariable UUID teamId,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(required = false) List<String> services,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long minDuration,
            @RequestParam(required = false) Long maxDuration,
            @RequestParam(defaultValue = "100") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        long end = endTime != null ? endTime : System.currentTimeMillis();
        long start = startTime != null ? startTime : end - 3600000;
        return ResponseEntity.ok(clickHouseDataService.getTraces(teamId, start, end, services, status, minDuration, maxDuration, limit, offset));
    }

    @GetMapping("/teams/{teamId}/traces/{traceId}/spans")
    public ResponseEntity<List<Map<String, Object>>> getTraceSpans(
            @PathVariable UUID teamId,
            @PathVariable String traceId) {
        return ResponseEntity.ok(clickHouseDataService.getTraceSpans(teamId, traceId));
    }

    @GetMapping("/teams/{teamId}/services/dependencies")
    public ResponseEntity<List<Map<String, Object>>> getServiceDependencies(
            @PathVariable UUID teamId,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime) {
        long end = endTime != null ? endTime : System.currentTimeMillis();
        long start = startTime != null ? startTime : end - 3600000;
        return ResponseEntity.ok(clickHouseDataService.getServiceDependencies(teamId, start, end));
    }

    // ==================== INCIDENTS ====================

    @GetMapping("/teams/{teamId}/incidents")
    public ResponseEntity<Map<String, Object>> getIncidents(
            @PathVariable UUID teamId,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(required = false) List<String> statuses,
            @RequestParam(required = false) List<String> severities,
            @RequestParam(required = false) List<String> services,
            @RequestParam(defaultValue = "100") int limit,
            @RequestParam(defaultValue = "0") int offset) {
        long end = endTime != null ? endTime : System.currentTimeMillis();
        long start = startTime != null ? startTime : end - 86400000 * 7;
        return ResponseEntity.ok(clickHouseDataService.getIncidents(teamId, start, end, statuses, severities, services, limit, offset));
    }

    // ==================== STATUS ====================

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        return ResponseEntity.ok(Map.of(
            "clickhouse", clickHouseDataService.isClickHouseEnabled(),
            "version", "v2",
            "tables", List.of("spans", "logs", "incidents")
        ));
    }
}

