package com.observability.security;

import lombok.Builder;
import lombok.Data;

/**
 * Holds the current tenant context (organization, team, user) for the request.
 * This is populated by the TenantFilter and used throughout the request lifecycle.
 */
@Data
@Builder
public class TenantContext {
    private Long organizationId;
    private Long teamId;
    private Long userId;
    private String userEmail;
    private String userRole;
    
    private static final ThreadLocal<TenantContext> CONTEXT = new ThreadLocal<>();
    
    public static void set(TenantContext context) {
        CONTEXT.set(context);
    }
    
    public static TenantContext get() {
        return CONTEXT.get();
    }
    
    public static void clear() {
        CONTEXT.remove();
    }
    
    public static Long getOrganizationId() {
        TenantContext ctx = get();
        return ctx != null ? ctx.organizationId : null;
    }
    
    public static Long getTeamId() {
        TenantContext ctx = get();
        return ctx != null ? ctx.teamId : null;
    }
    
    public static Long getUserId() {
        TenantContext ctx = get();
        return ctx != null ? ctx.userId : null;
    }
    
    public static boolean isAdmin() {
        TenantContext ctx = get();
        return ctx != null && "admin".equals(ctx.userRole);
    }

    public static String getUserRole() {
        TenantContext ctx = get();
        return ctx != null ? ctx.userRole : null;
    }

    public static String getUserEmail() {
        TenantContext ctx = get();
        return ctx != null ? ctx.userEmail : null;
    }
}

