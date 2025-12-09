package com.observability.client.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogEntry {
    private String serviceName;
    private String level;
    private String message;
    private long timestamp;
    private String logger;
    private String traceId;
    private String spanId;
}
