package com.observability.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Response DTO for log data.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogResponse {

    private Long id;
    private String serviceName;
    private String level;
    private String message;
    private Long timestamp;
    private String logger;
    private String traceId;
    private String spanId;
    private String pod;
    private String container;
    private String node;
    private Map<String, String> attributes;
}

