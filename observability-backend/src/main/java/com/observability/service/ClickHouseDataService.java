package com.observability.service;

import com.observability.repository.clickhouse.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

/**
 * Service for querying observability data from ClickHouse.
 * Simplified: 3 tables (spans, logs, incidents) - metrics derived from spans.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ClickHouseDataService {

    private final ClickHouseSpansRepository spansRepository;
    private final ClickHouseLogsRepository logsRepository;
    private final ClickHouseIncidentsRepository incidentsRepository;
    private final CacheService cacheService;

    @Value("${clickhouse.enabled:false}")
    private boolean clickHouseEnabled;

    /**
     * Get service metrics (derived from spans)
     */
    public List<Map<String, Object>> getServiceMetrics(UUID teamId, long startTime, long endTime) {
        Instant start = Instant.ofEpochMilli(startTime);
        Instant end = Instant.ofEpochMilli(endTime);
        return spansRepository.getServiceMetrics(teamId, start, end);
    }

    /**
     * Get endpoint metrics (derived from spans)
     */
    public List<Map<String, Object>> getEndpointMetrics(UUID teamId, long startTime, long endTime,
            String serviceName) {
        Instant start = Instant.ofEpochMilli(startTime);
        Instant end = Instant.ofEpochMilli(endTime);
        return spansRepository.getEndpointMetrics(teamId, start, end, serviceName);
    }

    /**
     * Get time-series metrics (derived from spans)
     */
    public List<Map<String, Object>> getMetricsTimeSeries(UUID teamId, long startTime, long endTime,
            String serviceName, String interval) {
        Instant start = Instant.ofEpochMilli(startTime);
        Instant end = Instant.ofEpochMilli(endTime);
        return spansRepository.getMetricsTimeSeries(teamId, start, end, serviceName, interval);
    }

    /**
     * Get logs with filters and pagination
     */
    public Map<String, Object> getLogs(UUID teamId, long startTime, long endTime,
            List<String> levels, List<String> services, String searchQuery,
            int limit, int offset) {

        Instant start = Instant.ofEpochMilli(startTime);
        Instant end = Instant.ofEpochMilli(endTime);

        List<Map<String, Object>> logs = logsRepository.getLogs(
            teamId, start, end, levels, services, searchQuery, limit, offset);

        Map<String, Object> result = new HashMap<>();
        result.put("logs", logs);
        result.put("hasMore", logs.size() >= limit);
        result.put("offset", offset);
        result.put("limit", limit);

        if (offset == 0) {
            long timeRange = endTime - startTime;
            Optional<Map<String, Object>> cachedFacets = cacheService.getLogFacets(teamId, timeRange);
            if (cachedFacets.isPresent()) {
                result.put("facets", cachedFacets.get());
            } else {
                Map<String, Object> facets = logsRepository.getLogFacets(teamId, start, end);
                cacheService.cacheLogFacets(teamId, timeRange, facets);
                result.put("facets", facets);
            }
        }
        return result;
    }

    /**
     * Get log histogram
     */
    public List<Map<String, Object>> getLogHistogram(UUID teamId, long startTime,
            long endTime, String interval) {
        Instant start = Instant.ofEpochMilli(startTime);
        Instant end = Instant.ofEpochMilli(endTime);
        return logsRepository.getLogHistogram(teamId, start, end, interval);
    }

    /**
     * Get traces (root spans) with filters
     */
    public Map<String, Object> getTraces(UUID teamId, long startTime, long endTime,
            List<String> services, String status, Long minDuration, Long maxDuration,
            int limit, int offset) {

        Instant start = Instant.ofEpochMilli(startTime);
        Instant end = Instant.ofEpochMilli(endTime);

        List<Map<String, Object>> traces = spansRepository.getTraces(
            teamId, start, end, services, status, minDuration, maxDuration, limit, offset);

        long timeRange = endTime - startTime;
        Map<String, Object> summary;
        Optional<Map<String, Object>> cachedSummary = cacheService.getTraceSummary(teamId, timeRange);
        if (cachedSummary.isPresent()) {
            summary = cachedSummary.get();
        } else {
            summary = spansRepository.getTraceSummary(teamId, start, end);
            cacheService.cacheTraceSummary(teamId, timeRange, summary);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("traces", traces);
        result.put("summary", summary);
        result.put("hasMore", traces.size() >= limit);
        result.put("offset", offset);
        result.put("limit", limit);
        return result;
    }

    /**
     * Get spans for a trace (waterfall view)
     */
    public List<Map<String, Object>> getTraceSpans(UUID teamId, String traceId) {
        return spansRepository.getSpansByTraceId(teamId, traceId);
    }

    /**
     * Get service dependencies
     */
    public List<Map<String, Object>> getServiceDependencies(UUID teamId, long startTime, long endTime) {
        Instant start = Instant.ofEpochMilli(startTime);
        Instant end = Instant.ofEpochMilli(endTime);
        return spansRepository.getServiceDependencies(teamId, start, end);
    }

    /**
     * Get incidents with filters
     */
    public Map<String, Object> getIncidents(UUID teamId, long startTime, long endTime,
            List<String> statuses, List<String> severities, List<String> services,
            int limit, int offset) {

        Instant start = Instant.ofEpochMilli(startTime);
        Instant end = Instant.ofEpochMilli(endTime);

        List<Map<String, Object>> incidents = incidentsRepository.getIncidents(
            teamId, start, end, statuses, severities, services, limit, offset);

        Map<String, Object> counts;
        Optional<Map<String, Object>> cachedCounts = cacheService.getAlertCounts(teamId);
        if (cachedCounts.isPresent()) {
            counts = cachedCounts.get();
        } else {
            Map<String, Long> statusCounts = incidentsRepository.getIncidentCountsByStatus(teamId, start, end);
            Map<String, Long> severityCounts = incidentsRepository.getIncidentCountsBySeverity(teamId, start, end);
            counts = Map.of("byStatus", statusCounts, "bySeverity", severityCounts);
            cacheService.cacheAlertCounts(teamId, counts);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("incidents", incidents);
        result.put("counts", counts);
        result.put("hasMore", incidents.size() >= limit);
        result.put("offset", offset);
        result.put("limit", limit);
        return result;
    }

    public boolean isClickHouseEnabled() {
        return clickHouseEnabled;
    }
}

