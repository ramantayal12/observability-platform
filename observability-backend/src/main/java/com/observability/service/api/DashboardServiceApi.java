package com.observability.service.api;

import com.observability.dto.response.DashboardOverviewResponse;
import com.observability.dto.response.ServiceResponse;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Service interface for dashboard operations.
 * Aggregates data from ClickHouse for team-specific queries.
 */
public interface DashboardServiceApi {

    /**
     * Get dashboard overview for a specific team
     * @param teamId Team UUID
     * @param start Start time
     * @param end End time
     * @return Dashboard overview with metrics, logs, and traces summary
     */
    DashboardOverviewResponse getOverview(UUID teamId, Instant start, Instant end);

    /**
     * Get all services with statistics for a specific team
     * @param teamId Team UUID
     * @return List of services with health status and metrics
     */
    List<ServiceResponse> getServices(UUID teamId);

    /**
     * Get service details for a specific team
     * @param teamId Team UUID
     * @param serviceName Service name
     * @return Service details with metrics
     */
    ServiceResponse getServiceDetails(UUID teamId, String serviceName);
}

