package com.observability.sdk.model;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class LogData {
    private String serviceName;
    private String level;
    private String message;
    private long timestamp;
    private String logger;
    private String traceId;
    private String spanId;
    private Map<String, String> attributes;
}

