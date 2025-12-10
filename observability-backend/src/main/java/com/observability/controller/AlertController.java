package com.observability.controller;

import com.observability.common.response.ApiResponse;
import com.observability.dto.request.AlertRequest;
import com.observability.dto.response.AlertResponse;
import com.observability.security.TenantContext;
import com.observability.service.AlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
@Tag(name = "Alerts", description = "Alert management APIs")
public class AlertController {
    
    private final AlertService alertService;
    
    @GetMapping
    @Operation(summary = "Get alerts for current team")
    public ResponseEntity<ApiResponse<List<AlertResponse>>> getByTeam(
            @RequestParam(required = false) String status) {
        Long teamId = TenantContext.getTeamId();
        if (status != null) {
            return ResponseEntity.ok(ApiResponse.success(alertService.findByTeamAndStatus(teamId, status)));
        }
        return ResponseEntity.ok(ApiResponse.success(alertService.findByTeam(teamId)));
    }
    
    @GetMapping("/paged")
    @Operation(summary = "Get alerts for current team (paginated)")
    public ResponseEntity<ApiResponse<Page<AlertResponse>>> getByTeamPaged(Pageable pageable) {
        Long teamId = TenantContext.getTeamId();
        return ResponseEntity.ok(ApiResponse.success(alertService.findByTeamPaged(teamId, pageable)));
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Get alert by ID")
    public ResponseEntity<ApiResponse<AlertResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(alertService.findById(id)));
    }
    
    @PostMapping
    @Operation(summary = "Create a new alert")
    public ResponseEntity<ApiResponse<AlertResponse>> create(@Valid @RequestBody AlertRequest request) {
        Long orgId = TenantContext.getOrganizationId();
        Long teamId = TenantContext.getTeamId();
        return ResponseEntity.ok(ApiResponse.success(alertService.create(orgId, teamId, request)));
    }
    
    @PostMapping("/{id}/acknowledge")
    @Operation(summary = "Acknowledge an alert")
    public ResponseEntity<ApiResponse<AlertResponse>> acknowledge(@PathVariable Long id) {
        String userEmail = TenantContext.get().getUserEmail();
        return ResponseEntity.ok(ApiResponse.success(alertService.acknowledge(id, userEmail)));
    }
    
    @PostMapping("/{id}/resolve")
    @Operation(summary = "Resolve an alert")
    public ResponseEntity<ApiResponse<AlertResponse>> resolve(@PathVariable Long id) {
        String userEmail = TenantContext.get().getUserEmail();
        return ResponseEntity.ok(ApiResponse.success(alertService.resolve(id, userEmail)));
    }
    
    @PostMapping("/{id}/mute")
    @Operation(summary = "Mute an alert")
    public ResponseEntity<ApiResponse<AlertResponse>> mute(
            @PathVariable Long id,
            @RequestParam(defaultValue = "60") int minutes) {
        return ResponseEntity.ok(ApiResponse.success(alertService.mute(id, minutes)));
    }
    
    @GetMapping("/count/active")
    @Operation(summary = "Get count of active alerts")
    public ResponseEntity<ApiResponse<Long>> countActive() {
        Long teamId = TenantContext.getTeamId();
        return ResponseEntity.ok(ApiResponse.success(alertService.countActiveByTeam(teamId)));
    }
}

