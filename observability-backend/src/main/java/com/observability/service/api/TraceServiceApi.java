package com.observability.service.api;

import com.observability.dto.response.SpanResponse;
import com.observability.dto.response.TraceResponse;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Service interface for trace operations.
 * Follows Interface Segregation Principle.
 */
public interface TraceServiceApi {

    /**
     * Get traces with filters
     */
    List<TraceResponse> getTraces(String serviceName, String status, 
                                   Instant start, Instant end, int limit);

    /**
     * Get trace by ID with spans
     */
    TraceResponse getTraceById(String traceId);

    /**
     * Get spans for a trace
     */
    List<SpanResponse> getSpansForTrace(String traceId);

    /**
     * Get trace count by status
     */
    Map<String, Long> getTraceCountByStatus(String serviceName, Instant start, Instant end);

    /**
     * Get average trace duration
     */
    Double getAverageDuration(String serviceName, Instant start, Instant end);

    /**
     * Get distinct service names
     */
    List<String> getDistinctServices();

    /**
     * Delete traces older than specified time
     */
    void deleteOldTraces(Instant before);
}

