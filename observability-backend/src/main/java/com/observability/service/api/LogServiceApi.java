package com.observability.service.api;

import com.observability.dto.request.LogRequest;
import com.observability.dto.response.LogResponse;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * Service interface for log operations.
 * Follows Interface Segregation Principle.
 */
public interface LogServiceApi {

    /**
     * Save a single log
     */
    void save(LogRequest request);

    /**
     * Save multiple logs
     */
    void saveAll(List<LogRequest> requests);

    /**
     * Get logs with filters
     */
    List<LogResponse> getLogs(String serviceName, String level, String traceId,
                               Instant start, Instant end, int limit);

    /**
     * Search logs by message content
     */
    List<LogResponse> searchLogs(String query, Instant start, Instant end, int limit);

    /**
     * Get log count by level
     */
    Map<String, Long> getLogCountByLevel(String serviceName, Instant start, Instant end);

    /**
     * Get distinct service names
     */
    List<String> getDistinctServices();

    /**
     * Delete logs older than specified time
     */
    void deleteOldLogs(Instant before);
}

