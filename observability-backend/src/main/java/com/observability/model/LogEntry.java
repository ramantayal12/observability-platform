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
public class LogEntry {
    private String serviceName;
    private String level; // DEBUG, INFO, WARN, ERROR
    private String message;
    private long timestamp; // epoch milliseconds
    private String logger; // logger name
    private String traceId; // optional trace ID for correlation
    private String spanId; // optional span ID for correlation
    private String pod; // Kubernetes pod name
    private String container; // Container name
    private String node; // Kubernetes node name
    private Map<String, String> attributes; // Additional attributes
}
