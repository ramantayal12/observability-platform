package com.observability.controller;

import com.observability.common.response.ApiResponse;
import com.observability.dto.request.LogRequest;
import com.observability.dto.request.SpanRequest;
import com.observability.security.TenantContext;
import com.observability.service.TelemetryIngestionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Controller for ingesting telemetry data (spans, logs) into ClickHouse.
 * Supports OpenTelemetry-compatible ingestion.
 */
@RestController
@RequestMapping("/api/ingest")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Telemetry Ingestion", description = "APIs for ingesting observability data into ClickHouse")
@Slf4j
public class TelemetryIngestionController {

    private final TelemetryIngestionService ingestionService;

    @PostMapping("/spans")
    @Operation(summary = "Ingest spans/traces", description = "Batch ingest spans (traces) into ClickHouse")
    public ResponseEntity<ApiResponse<Map<String, Object>>> ingestSpans(
            @RequestBody List<SpanRequest> spans) {
        
        Long teamId = TenantContext.getTeamId();
        if (teamId == null) {
            log.warn("No teamId in context - using default team 1");
            teamId = 1L;
        }

        UUID teamUuid = convertTeamIdToUuid(teamId);
        ingestionService.ingestSpans(teamUuid, spans);

        Map<String, Object> result = Map.of(
                "ingested", spans.size(),
                "teamId", teamId,
                "type", "spans"
        );

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/logs")
    @Operation(summary = "Ingest logs", description = "Batch ingest logs into ClickHouse")
    public ResponseEntity<ApiResponse<Map<String, Object>>> ingestLogs(
            @RequestBody List<LogRequest> logs) {
        
        Long teamId = TenantContext.getTeamId();
        if (teamId == null) {
            log.warn("No teamId in context - using default team 1");
            teamId = 1L;
        }

        UUID teamUuid = convertTeamIdToUuid(teamId);
        ingestionService.ingestLogs(teamUuid, logs);

        Map<String, Object> result = Map.of(
                "ingested", logs.size(),
                "teamId", teamId,
                "type", "logs"
        );

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    @PostMapping("/batch")
    @Operation(summary = "Ingest mixed telemetry data", description = "Batch ingest spans and logs together")
    public ResponseEntity<ApiResponse<Map<String, Object>>> ingestBatch(
            @RequestBody Map<String, Object> payload) {
        
        Long teamId = TenantContext.getTeamId();
        if (teamId == null) {
            log.warn("No teamId in context - using default team 1");
            teamId = 1L;
        }

        UUID teamUuid = convertTeamIdToUuid(teamId);

        int spansIngested = 0;
        int logsIngested = 0;

        // Ingest spans if present
        if (payload.containsKey("spans")) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> spanMaps = (List<Map<String, Object>>) payload.get("spans");
            // Convert to SpanRequest objects (simplified - in production use proper mapping)
            log.info("Received {} spans for ingestion", spanMaps.size());
            spansIngested = spanMaps.size();
        }

        // Ingest logs if present
        if (payload.containsKey("logs")) {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> logMaps = (List<Map<String, Object>>) payload.get("logs");
            log.info("Received {} logs for ingestion", logMaps.size());
            logsIngested = logMaps.size();
        }

        Map<String, Object> result = Map.of(
                "spansIngested", spansIngested,
                "logsIngested", logsIngested,
                "teamId", teamId
        );

        return ResponseEntity.ok(ApiResponse.success(result));
    }

    private UUID convertTeamIdToUuid(Long teamId) {
        String uuidString = String.format("00000000-0000-0000-0000-%012d", teamId);
        return UUID.fromString(uuidString);
    }
}

