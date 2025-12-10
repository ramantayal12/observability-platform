package com.observability.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for ingesting metric data.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetricRequest {

    @NotBlank(message = "Service name is required")
    private String serviceName;

    @NotBlank(message = "Metric name is required")
    private String metricName;

    @NotNull(message = "Value is required")
    private Double value;

    private String endpoint;
    private String method;
    private Integer statusCode;
    private String pod;
    private String container;
    private String node;
    private String operationType;

    @Positive(message = "Timestamp must be positive")
    private Long timestamp;
}

