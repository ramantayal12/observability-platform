package com.observability.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrganizationResponse {
    private Long id;
    private String name;
    private String slug;
    private String description;
    private Boolean active;
    private String plan;
    private Integer maxTeams;
    private Integer maxUsersPerTeam;
    private LocalDateTime createdAt;
}

