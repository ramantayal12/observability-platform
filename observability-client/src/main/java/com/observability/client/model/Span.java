package com.observability.client.model;

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
    private String parentSpanId;
    private String operationName;
    private long startTime;
    private long endTime;
    private long duration;
    private String serviceName;
    private Map<String, String> tags;
}
