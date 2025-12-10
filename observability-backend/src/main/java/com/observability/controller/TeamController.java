package com.observability.controller;

import com.observability.common.response.ApiResponse;
import com.observability.dto.response.TeamResponse;
import com.observability.security.TenantContext;
import com.observability.service.TeamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
@Tag(name = "Teams", description = "Team management APIs")
public class TeamController {
    
    private final TeamService teamService;
    
    @GetMapping
    @Operation(summary = "Get teams for current organization")
    public ResponseEntity<ApiResponse<List<TeamResponse>>> getByOrganization() {
        Long orgId = TenantContext.getOrganizationId();
        return ResponseEntity.ok(ApiResponse.success(teamService.findByOrganization(orgId)));
    }
    
    @GetMapping("/my-teams")
    @Operation(summary = "Get teams for current user")
    public ResponseEntity<ApiResponse<List<TeamResponse>>> getMyTeams() {
        Long userId = TenantContext.getUserId();
        return ResponseEntity.ok(ApiResponse.success(teamService.findByUser(userId)));
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Get team by ID")
    public ResponseEntity<ApiResponse<TeamResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(teamService.findById(id)));
    }
    
    @GetMapping("/slug/{slug}")
    @Operation(summary = "Get team by slug")
    public ResponseEntity<ApiResponse<TeamResponse>> getBySlug(@PathVariable String slug) {
        Long orgId = TenantContext.getOrganizationId();
        return ResponseEntity.ok(ApiResponse.success(teamService.findBySlug(orgId, slug)));
    }
    
    @PostMapping
    @Operation(summary = "Create a new team")
    public ResponseEntity<ApiResponse<TeamResponse>> create(
            @RequestParam String name,
            @RequestParam(required = false) String slug,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String color) {
        Long orgId = TenantContext.getOrganizationId();
        return ResponseEntity.ok(ApiResponse.success(
                teamService.create(orgId, name, slug, description, color)));
    }
}

