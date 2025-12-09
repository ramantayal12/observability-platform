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
    private String status; // OK, ERROR
    private String kind; // SERVER, CLIENT, INTERNAL, PRODUCER, CONSUMER
    private String pod; // Kubernetes pod name
    private String container; // Container name
    private String node; // Kubernetes node name
    private Map<String, String> attributes; // additional metadata
}
