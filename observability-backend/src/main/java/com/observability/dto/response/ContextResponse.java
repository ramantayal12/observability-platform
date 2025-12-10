package com.observability.dto.response;

import lombok.*;
import java.util.List;

/**
 * Response containing the current user's context including organization and teams.
 * Used by the frontend to populate team selector and user info.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContextResponse {
    private UserInfo user;
    private OrganizationInfo organization;
    private List<TeamInfo> teams;
    private TeamInfo currentTeam;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserInfo {
        private Long id;
        private String email;
        private String name;
        private String avatarUrl;
        private String role;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OrganizationInfo {
        private Long id;
        private String name;
        private String slug;
        private String plan;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamInfo {
        private Long id;
        private String name;
        private String slug;
        private String color;
        private String role;
    }
}

