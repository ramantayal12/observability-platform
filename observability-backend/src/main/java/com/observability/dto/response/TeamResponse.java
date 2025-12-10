package com.observability.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamResponse {
    private Long id;
    private Long organizationId;
    private String name;
    private String slug;
    private String description;
    private Boolean active;
    private String color;
    private String icon;
    private LocalDateTime createdAt;
}

