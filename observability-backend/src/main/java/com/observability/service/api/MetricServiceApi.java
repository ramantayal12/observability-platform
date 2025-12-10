package com.observability.service.api;

import com.observability.dto.request.MetricRequest;
import com.observability.dto.response.MetricResponse;

import java.time.Instant;
import java.util.List;

/**
 * Service interface for metric operations.
 * Follows Interface Segregation Principle.
 */
public interface MetricServiceApi {

    /**
     * Save a single metric
     */
    void save(MetricRequest request);

    /**
     * Save multiple metrics
     */
    void saveAll(List<MetricRequest> requests);

    /**
     * Get metrics with filters
     */
    List<MetricResponse> getMetrics(String serviceName, String metricName, 
                                     Instant start, Instant end, int limit);

    /**
     * Get distinct service names
     */
    List<String> getDistinctServices();

    /**
     * Get distinct metric names
     */
    List<String> getDistinctMetricNames();

    /**
     * Get average value for a metric
     */
    Double getAverageValue(String metricName, String serviceName, Instant start, Instant end);

    /**
     * Delete metrics older than specified time
     */
    void deleteOldMetrics(Instant before);
}

