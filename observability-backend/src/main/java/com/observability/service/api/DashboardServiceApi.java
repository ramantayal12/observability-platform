package com.observability.service.api;

import com.observability.dto.response.DashboardOverviewResponse;
import com.observability.dto.response.ServiceResponse;

import java.time.Instant;
import java.util.List;

/**
 * Service interface for dashboard operations.
 * Aggregates data from multiple services.
 */
public interface DashboardServiceApi {

    /**
     * Get dashboard overview
     */
    DashboardOverviewResponse getOverview(Instant start, Instant end);

    /**
     * Get all services with statistics
     */
    List<ServiceResponse> getServices();

    /**
     * Get service details
     */
    ServiceResponse getServiceDetails(String serviceName);
}

