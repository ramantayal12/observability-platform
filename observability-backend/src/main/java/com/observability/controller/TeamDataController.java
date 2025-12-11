package com.observability.controller;

import com.observability.common.response.ApiResponse;
import com.observability.security.TenantContext;
import com.observability.service.TeamDataService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Controller for team-specific data endpoints.
 * All endpoints validate user access to the requested team.
 */
@RestController
@RequestMapping("/api/teams/{teamId}/data")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Tag(name = "Team Data", description = "Team-specific data APIs with access control")
@Slf4j
public class TeamDataController {

    private final TeamDataService teamDataService;

    @GetMapping("/overview")
    @Operation(summary = "Get overview data for a team")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTeamOverview(
            @PathVariable Long teamId,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime) {
        
        Long userId = TenantContext.getUserId();
        log.debug("User {} requesting overview for team {}", userId, teamId);
        
        Map<String, Object> overview = teamDataService.getTeamOverview(userId, teamId, startTime, endTime);
        return ResponseEntity.ok(ApiResponse.success(overview));
    }

    @GetMapping("/metrics")
    @Operation(summary = "Get metrics data for a team")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTeamMetrics(
            @PathVariable Long teamId,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(required = false) String serviceName) {
        
        Long userId = TenantContext.getUserId();
        log.debug("User {} requesting metrics for team {}", userId, teamId);
        
        Map<String, Object> metrics = teamDataService.getTeamMetrics(userId, teamId, startTime, endTime, serviceName);
        return ResponseEntity.ok(ApiResponse.success(metrics));
    }

    @GetMapping("/logs")
    @Operation(summary = "Get logs for a team")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTeamLogs(
            @PathVariable Long teamId,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(required = false) String level,
            @RequestParam(required = false) String serviceName,
            @RequestParam(required = false, defaultValue = "100") Integer limit,
            @RequestParam(required = false, defaultValue = "0") Integer offset) {

        Long userId = TenantContext.getUserId();
        log.debug("User {} requesting logs for team {} (limit={}, offset={})", userId, teamId, limit, offset);

        Map<String, Object> logs = teamDataService.getTeamLogs(userId, teamId, startTime, endTime, level, serviceName, limit, offset);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    @GetMapping("/traces")
    @Operation(summary = "Get traces for a team")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTeamTraces(
            @PathVariable Long teamId,
            @RequestParam(required = false) Long startTime,
            @RequestParam(required = false) Long endTime,
            @RequestParam(required = false) String serviceName,
            @RequestParam(required = false, defaultValue = "50") Integer limit) {

        Long userId = TenantContext.getUserId();
        log.debug("User {} requesting traces for team {}", userId, teamId);

        Map<String, Object> traces = teamDataService.getTeamTraces(userId, teamId, startTime, endTime, serviceName, limit);
        return ResponseEntity.ok(ApiResponse.success(traces));
    }

    @GetMapping("/services")
    @Operation(summary = "Get services for a team")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTeamServices(
            @PathVariable Long teamId) {

        Long userId = TenantContext.getUserId();
        log.debug("User {} requesting services for team {}", userId, teamId);

        Map<String, Object> services = teamDataService.getTeamServices(userId, teamId);
        return ResponseEntity.ok(ApiResponse.success(services));
    }

    @GetMapping("/alerts")
    @Operation(summary = "Get alerts for a team")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTeamAlerts(
            @PathVariable Long teamId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String severity) {

        Long userId = TenantContext.getUserId();
        log.debug("User {} requesting alerts for team {}", userId, teamId);

        Map<String, Object> alerts = teamDataService.getTeamAlerts(userId, teamId, status, severity);
        return ResponseEntity.ok(ApiResponse.success(alerts));
    }

    @GetMapping("/traces/{traceId}")
    @Operation(summary = "Get a single trace by ID")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTrace(
            @PathVariable Long teamId,
            @PathVariable String traceId) {

        Long userId = TenantContext.getUserId();
        log.debug("User {} requesting trace {} for team {}", userId, traceId, teamId);

        Map<String, Object> trace = teamDataService.getTrace(userId, teamId, traceId);
        return ResponseEntity.ok(ApiResponse.success(trace));
    }
}

