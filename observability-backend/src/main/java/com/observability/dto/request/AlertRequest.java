package com.observability.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertRequest {
    
    @NotBlank(message = "Alert name is required")
    @Size(max = 255, message = "Name must be less than 255 characters")
    private String name;
    
    @Size(max = 1000, message = "Description must be less than 1000 characters")
    private String description;
    
    @NotBlank(message = "Alert type is required")
    @Pattern(regexp = "^(metric|log|trace|apm)$", message = "Type must be metric, log, trace, or apm")
    private String type;
    
    @NotBlank(message = "Severity is required")
    @Pattern(regexp = "^(critical|warning|info)$", message = "Severity must be critical, warning, or info")
    private String severity;
    
    @Size(max = 100, message = "Service name must be less than 100 characters")
    private String serviceName;
    
    private String condition;
    
    @Size(max = 100, message = "Metric name must be less than 100 characters")
    private String metric;
    
    @Pattern(regexp = "^(>|<|>=|<=|==|!=)$", message = "Invalid operator")
    private String operator;
    
    private Double threshold;
    
    @Min(value = 1, message = "Duration must be at least 1 minute")
    private Integer durationMinutes;
}

