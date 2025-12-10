package com.observability.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for metric data.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetricResponse {

    private Long id;
    private String serviceName;
    private String metricName;
    private String endpoint;
    private Double value;
    private Long timestamp;
    private String method;
    private Integer statusCode;
    private String pod;
    private String container;
    private String node;
    private String operationType;
}

