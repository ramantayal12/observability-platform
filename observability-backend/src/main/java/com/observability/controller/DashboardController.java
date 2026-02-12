package com.observability.controller;

import com.observability.common.response.ApiResponse;
import com.observability.dto.response.*;
import com.observability.security.TenantContext;
import com.observability.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.*;

/**
 * REST controller for dashboard data retrieval.
 * Provides endpoints for metrics, logs, traces, and service overview.
 */
@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Dashboard", description = "Dashboard data retrieval APIs")
@Slf4j
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/overview")
    @Operation(summary = "Get dashboard overview", description = "Get summary of metrics, logs, and traces from ClickHouse")
    public ApiResponse<DashboardOverviewResponse> getOverview() {
        Long teamId = TenantContext.getTeamId();
        if (teamId == null) {
            log.warn("No teamId in context - using default team 1");
            teamId = 1L;
        }

        long now = System.currentTimeMillis();
        Instant start = Instant.ofEpochMilli(now - 3600000);
        Instant end = Instant.ofEpochMilli(now);

        UUID teamUuid = convertTeamIdToUuid(teamId);
        DashboardOverviewResponse overview = dashboardService.getOverview(teamUuid, start, end);
        return ApiResponse.success(overview);
    }

    @GetMapping("/services")
    @Operation(summary = "Get services", description = "Get all services with their health status from ClickHouse")
    public ApiResponse<List<ServiceResponse>> getServices() {
        Long teamId = TenantContext.getTeamId();
        if (teamId == null) {
            log.warn("No teamId in context - using default team 1");
            teamId = 1L;
        }

        UUID teamUuid = convertTeamIdToUuid(teamId);
        List<ServiceResponse> services = dashboardService.getServices(teamUuid);
        return ApiResponse.success(services);
    }

    @GetMapping("/services/{serviceName}")
    @Operation(summary = "Get service details", description = "Get detailed information about a specific service from ClickHouse")
    public ApiResponse<ServiceResponse> getServiceDetails(
            @Parameter(description = "Service name") @PathVariable String serviceName) {
        Long teamId = TenantContext.getTeamId();
        if (teamId == null) {
            log.warn("No teamId in context - using default team 1");
            teamId = 1L;
        }

        UUID teamUuid = convertTeamIdToUuid(teamId);
        ServiceResponse service = dashboardService.getServiceDetails(teamUuid, serviceName);
        return ApiResponse.success(service);
    }

    /**
     * Convert Long teamId to UUID for ClickHouse queries
     * ClickHouse stores team_id as UUID, but MySQL uses BIGINT
     */
    private UUID convertTeamIdToUuid(Long teamId) {
        // Create a deterministic UUID from the team ID
        // This ensures the same team ID always maps to the same UUID
        String uuidString = String.format("00000000-0000-0000-0000-%012d", teamId);
        return UUID.fromString(uuidString);
    }
}
