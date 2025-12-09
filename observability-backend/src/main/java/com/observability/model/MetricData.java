package com.observability.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetricData {
    private String serviceName;
    private String metricName; // e.g., "api.latency", "service.latency"
    private String endpoint; // API endpoint or service operation
    private double value; // metric value in milliseconds
    private long timestamp; // epoch milliseconds
    private String method; // HTTP method (GET, POST, etc.)
    private int statusCode; // HTTP status code
}
