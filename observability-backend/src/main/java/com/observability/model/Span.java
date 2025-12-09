package com.observability.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Span {
    private String spanId;
    private String traceId;
    private String parentSpanId; // null for root span
    private String operationName;
    private long startTime; // epoch milliseconds
    private long endTime; // epoch milliseconds
    private long duration; // milliseconds
    private String serviceName;
    private Map<String, String> tags; // additional metadata
}
