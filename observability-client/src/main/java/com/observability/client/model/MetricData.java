package com.observability.client.model;

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
    private String metricName;
    private String endpoint;
    private double value;
    private long timestamp;
    private String method;
    private int statusCode;
}
