package com.observability.controller;

import com.observability.common.response.ApiResponse;
import com.observability.dto.response.OrganizationResponse;
import com.observability.service.OrganizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/organizations")
@RequiredArgsConstructor
@Tag(name = "Organizations", description = "Organization management APIs")
public class OrganizationController {
    
    private final OrganizationService organizationService;
    
    @GetMapping
    @Operation(summary = "Get all organizations")
    public ResponseEntity<ApiResponse<List<OrganizationResponse>>> getAll() {
        return ResponseEntity.ok(ApiResponse.success(organizationService.findAll()));
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Get organization by ID")
    public ResponseEntity<ApiResponse<OrganizationResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(organizationService.findById(id)));
    }
    
    @GetMapping("/slug/{slug}")
    @Operation(summary = "Get organization by slug")
    public ResponseEntity<ApiResponse<OrganizationResponse>> getBySlug(@PathVariable String slug) {
        return ResponseEntity.ok(ApiResponse.success(organizationService.findBySlug(slug)));
    }
    
    @PostMapping
    @Operation(summary = "Create a new organization")
    public ResponseEntity<ApiResponse<OrganizationResponse>> create(
            @RequestParam String name,
            @RequestParam(required = false) String slug,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String plan) {
        return ResponseEntity.ok(ApiResponse.success(
                organizationService.create(name, slug, description, plan)));
    }
}

