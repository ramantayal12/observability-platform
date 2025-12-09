package com.observability.sdk.model;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class SpanData {
    private String traceId;
    private String spanId;
    private String parentSpanId;
    private String operationName;
    private long startTime;
    private long endTime;
    private long duration;
    private String serviceName;
    private String status; // OK, ERROR
    private String kind; // SERVER, CLIENT, INTERNAL, PRODUCER, CONSUMER
    private Map<String, String> attributes;
}

