package com.observability.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response DTO for service data.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceResponse {

    private String name;
    private String status;
    private Long metricCount;
    private Long logCount;
    private Long traceCount;
    private Long errorCount;
    private Double errorRate;
    private Long lastSeen;
    private String version;
    private String environment;
}

