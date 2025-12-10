package com.observability.controller;

import com.observability.common.response.ApiResponse;
import com.observability.dto.request.LoginRequest;
import com.observability.dto.response.AuthResponse;
import com.observability.dto.response.ContextResponse;
import com.observability.security.TenantContext;
import com.observability.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {
    
    private final AuthService authService;
    
    /**
     * Authenticate user and return JWT token
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        log.info("Login attempt for email: {}", request.getEmail());
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    /**
     * Logout user (client should discard token)
     */
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Map<String, String>>> logout() {
        // JWT tokens are stateless, so logout is handled client-side
        // In a production system, you might want to blacklist the token
        return ResponseEntity.ok(ApiResponse.success(Map.of("message", "Logged out successfully")));
    }
    
    /**
     * Get current user info from token
     */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<ContextResponse>> getCurrentUser() {
        Long userId = TenantContext.getUserId();
        if (userId == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "Not authenticated"));
        }
        ContextResponse context = authService.getContext(userId);
        return ResponseEntity.ok(ApiResponse.success(context));
    }
    
    /**
     * Get full context including organization and teams
     */
    @GetMapping("/context")
    public ResponseEntity<ApiResponse<ContextResponse>> getContext() {
        Long userId = TenantContext.getUserId();
        if (userId == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "Not authenticated"));
        }
        ContextResponse context = authService.getContext(userId);
        return ResponseEntity.ok(ApiResponse.success(context));
    }
    
    /**
     * Validate token and return user info
     */
    @GetMapping("/validate")
    public ResponseEntity<ApiResponse<Map<String, Object>>> validateToken() {
        Long userId = TenantContext.getUserId();
        if (userId == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("UNAUTHORIZED", "Invalid or expired token"));
        }
        return ResponseEntity.ok(ApiResponse.success(Map.of(
                "valid", true,
                "userId", userId,
                "organizationId", TenantContext.getOrganizationId(),
                "role", TenantContext.getUserRole()
        )));
    }
}

