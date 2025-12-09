package com.observability.sdk.model;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class MetricData {
    private String name;
    private double value;
    private long timestamp;
    private String type; // gauge, counter, histogram
    private Map<String, String> labels;
    private String endpoint;
    private String method;
    private int statusCode;
}

