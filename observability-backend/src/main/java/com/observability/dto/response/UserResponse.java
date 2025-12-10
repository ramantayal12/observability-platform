package com.observability.dto.response;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private Long organizationId;
    private String email;
    private String name;
    private String avatarUrl;
    private String role;
    private Boolean active;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
    private List<TeamMembershipResponse> teams;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamMembershipResponse {
        private Long teamId;
        private String teamName;
        private String teamSlug;
        private String role;
    }
}

