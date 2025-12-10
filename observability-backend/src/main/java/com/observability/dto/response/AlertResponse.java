package com.observability.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertResponse {
    private Long id;
    private Long organizationId;
    private Long teamId;
    private String name;
    private String description;
    private String type;
    private String severity;
    private String status;
    private String serviceName;
    private String condition;
    private String metric;
    private String operator;
    private Double threshold;
    private Integer durationMinutes;
    private Double currentValue;
    private String triggeredBy;
    private LocalDateTime triggeredAt;
    private LocalDateTime acknowledgedAt;
    private String acknowledgedBy;
    private LocalDateTime resolvedAt;
    private String resolvedBy;
    private LocalDateTime mutedUntil;
    private LocalDateTime createdAt;
}

