package com.observability.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Response DTO for span data.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpanResponse {

    private Long id;
    private String spanId;
    private String traceId;
    private String parentSpanId;
    private String operationName;
    private Long startTime;
    private Long endTime;
    private Long duration;
    private String serviceName;
    private String status;
    private String kind;
    private String pod;
    private String container;
    private String node;
    private Map<String, String> attributes;
}

