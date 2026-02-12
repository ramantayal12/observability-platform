package com.observability.service;

import com.observability.dto.request.LogRequest;
import com.observability.dto.request.SpanRequest;
import com.observability.repository.clickhouse.ClickHouseLogsRepository;
import com.observability.repository.clickhouse.ClickHouseSpansRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Service for ingesting telemetry data (spans, logs) into ClickHouse
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class TelemetryIngestionService {

    private final ClickHouseSpansRepository spansRepository;
    private final ClickHouseLogsRepository logsRepository;

    /**
     * Ingest spans (traces) into ClickHouse
     */
    public void ingestSpans(UUID teamId, List<SpanRequest> spans) {
        if (spans == null || spans.isEmpty()) {
            log.warn("No spans to ingest for team {}", teamId);
            return;
        }

        List<Map<String, Object>> spanMaps = spans.stream()
                .map(span -> convertSpanToMap(teamId, span))
                .collect(Collectors.toList());

        spansRepository.batchInsert(spanMaps);
        log.info("Ingested {} spans for team {}", spans.size(), teamId);
    }

    /**
     * Ingest logs into ClickHouse
     */
    public void ingestLogs(UUID teamId, List<LogRequest> logs) {
        if (logs == null || logs.isEmpty()) {
            log.warn("No logs to ingest for team {}", teamId);
            return;
        }

        List<Map<String, Object>> logMaps = logs.stream()
                .map(log -> convertLogToMap(teamId, log))
                .collect(Collectors.toList());

        logsRepository.batchInsert(logMaps);
        log.info("Ingested {} logs for team {}", logs.size(), teamId);
    }

    private Map<String, Object> convertSpanToMap(UUID teamId, SpanRequest span) {
        Map<String, Object> map = new HashMap<>();
        map.put("team_id", teamId.toString());
        map.put("trace_id", span.getTraceId());
        map.put("span_id", span.getSpanId());
        map.put("parent_span_id", span.getParentSpanId());
        map.put("is_root", span.getIsRoot() != null ? span.getIsRoot() : false);
        map.put("operation_name", span.getOperationName());
        map.put("service_name", span.getServiceName());
        map.put("span_kind", span.getSpanKind() != null ? span.getSpanKind() : "INTERNAL");
        map.put("start_time", span.getStartTime());
        map.put("end_time", span.getEndTime());
        map.put("duration_ms", span.getDurationMs());
        map.put("status", span.getStatus() != null ? span.getStatus() : "OK");
        map.put("status_message", span.getStatusMessage());
        map.put("http_method", span.getHttpMethod());
        map.put("http_url", span.getHttpUrl());
        map.put("http_status_code", span.getHttpStatusCode());
        map.put("host", span.getHost());
        map.put("pod", span.getPod());
        map.put("container", span.getContainer());
        map.put("attributes", span.getAttributes() != null ? span.getAttributes() : Map.of());
        return map;
    }

    private Map<String, Object> convertLogToMap(UUID teamId, LogRequest log) {
        Map<String, Object> map = new HashMap<>();
        map.put("team_id", teamId.toString());
        map.put("timestamp", log.getTimestamp());
        map.put("level", log.getLevel() != null ? log.getLevel() : "INFO");
        map.put("service_name", log.getServiceName());
        map.put("logger", log.getLogger());
        map.put("message", log.getMessage());
        map.put("trace_id", log.getTraceId());
        map.put("span_id", log.getSpanId());
        map.put("host", log.getHost());
        map.put("pod", log.getPod());
        map.put("container", log.getContainer());
        map.put("thread", log.getThread());
        map.put("exception", log.getException());
        map.put("attributes", log.getAttributes() != null ? log.getAttributes() : Map.of());
        return map;
    }
}

