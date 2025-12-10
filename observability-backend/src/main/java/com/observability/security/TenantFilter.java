package com.observability.security;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Filter that extracts tenant context from JWT tokens or request headers.
 * Supports both JWT authentication and header-based authentication for development.
 */
@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class TenantFilter implements Filter {

    public static final String HEADER_ORG_ID = "X-Organization-Id";
    public static final String HEADER_TEAM_ID = "X-Team-Id";
    public static final String HEADER_USER_ID = "X-User-Id";
    public static final String HEADER_USER_EMAIL = "X-User-Email";
    public static final String HEADER_USER_ROLE = "X-User-Role";
    public static final String HEADER_AUTHORIZATION = "Authorization";
    public static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider jwtTokenProvider;

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        try {
            HttpServletRequest httpRequest = (HttpServletRequest) request;

            // Try JWT authentication first
            String authHeader = httpRequest.getHeader(HEADER_AUTHORIZATION);
            if (authHeader != null && authHeader.startsWith(BEARER_PREFIX)) {
                String token = authHeader.substring(BEARER_PREFIX.length());
                if (jwtTokenProvider.validateToken(token)) {
                    setContextFromToken(httpRequest, token);
                    chain.doFilter(request, response);
                    return;
                }
            }

            // Fall back to header-based authentication (for development)
            setContextFromHeaders(httpRequest);
            chain.doFilter(request, response);
        } finally {
            TenantContext.clear();
        }
    }

    private void setContextFromToken(HttpServletRequest request, String token) {
        Long userId = jwtTokenProvider.getUserIdFromToken(token);
        String email = jwtTokenProvider.getEmailFromToken(token);
        Long orgId = jwtTokenProvider.getOrganizationIdFromToken(token);

        // Team ID can still come from header (user can switch teams)
        Long teamId = parseHeader(request, HEADER_TEAM_ID);
        if (teamId == null) teamId = 1L;

        TenantContext context = TenantContext.builder()
                .organizationId(orgId)
                .teamId(teamId)
                .userId(userId)
                .userEmail(email)
                .userRole(getRoleFromToken(token))
                .build();

        TenantContext.set(context);
    }

    private void setContextFromHeaders(HttpServletRequest request) {
        Long orgId = parseHeader(request, HEADER_ORG_ID);
        Long teamId = parseHeader(request, HEADER_TEAM_ID);
        Long userId = parseHeader(request, HEADER_USER_ID);
        String userEmail = request.getHeader(HEADER_USER_EMAIL);
        String userRole = request.getHeader(HEADER_USER_ROLE);

        // Set default values for development if not provided
        if (orgId == null) orgId = 1L;
        if (teamId == null) teamId = 1L;
        if (userId == null) userId = 1L;
        if (userRole == null) userRole = "admin";

        TenantContext context = TenantContext.builder()
                .organizationId(orgId)
                .teamId(teamId)
                .userId(userId)
                .userEmail(userEmail)
                .userRole(userRole)
                .build();

        TenantContext.set(context);
    }

    private String getRoleFromToken(String token) {
        try {
            // Extract role from token claims
            io.jsonwebtoken.Claims claims = io.jsonwebtoken.Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            return claims.get("role", String.class);
        } catch (Exception e) {
            return "member";
        }
    }

    private javax.crypto.SecretKey getSigningKey() {
        // Use the same key as JwtTokenProvider
        String secret = "observex-secret-key-for-jwt-token-generation-must-be-at-least-256-bits";
        return io.jsonwebtoken.security.Keys.hmacShaKeyFor(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    private Long parseHeader(HttpServletRequest request, String header) {
        String value = request.getHeader(header);
        if (value != null && !value.isEmpty()) {
            try {
                return Long.parseLong(value);
            } catch (NumberFormatException e) {
                return null;
            }
        }
        return null;
    }
}

