package com.observability.controller;

import com.observability.common.response.ApiResponse;
import com.observability.dto.response.UserResponse;
import com.observability.security.TenantContext;
import com.observability.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User management APIs")
public class UserController {
    
    private final UserService userService;
    
    @GetMapping("/me")
    @Operation(summary = "Get current user")
    public ResponseEntity<ApiResponse<UserResponse>> getCurrentUser() {
        Long userId = TenantContext.getUserId();
        return ResponseEntity.ok(ApiResponse.success(userService.findById(userId)));
    }
    
    @GetMapping
    @Operation(summary = "Get users in current organization")
    public ResponseEntity<ApiResponse<List<UserResponse>>> getByOrganization() {
        Long orgId = TenantContext.getOrganizationId();
        return ResponseEntity.ok(ApiResponse.success(userService.findByOrganization(orgId)));
    }
    
    @GetMapping("/{id}")
    @Operation(summary = "Get user by ID")
    public ResponseEntity<ApiResponse<UserResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(userService.findById(id)));
    }
    
    @PostMapping
    @Operation(summary = "Create a new user")
    public ResponseEntity<ApiResponse<UserResponse>> create(
            @RequestParam String email,
            @RequestParam String name,
            @RequestParam(required = false) String role) {
        Long orgId = TenantContext.getOrganizationId();
        return ResponseEntity.ok(ApiResponse.success(
                userService.create(orgId, email, name, role)));
    }
    
    @PostMapping("/{userId}/teams/{teamId}")
    @Operation(summary = "Add user to team")
    public ResponseEntity<ApiResponse<Void>> addToTeam(
            @PathVariable Long userId,
            @PathVariable Long teamId,
            @RequestParam(required = false) String role) {
        userService.addToTeam(userId, teamId, role);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
    
    @DeleteMapping("/{userId}/teams/{teamId}")
    @Operation(summary = "Remove user from team")
    public ResponseEntity<ApiResponse<Void>> removeFromTeam(
            @PathVariable Long userId,
            @PathVariable Long teamId) {
        userService.removeFromTeam(userId, teamId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}

