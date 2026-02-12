package com.observability.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/**
 * Request DTO for ingesting span/trace data.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpanRequest {

    @NotBlank(message = "Span ID is required")
    private String spanId;

    @NotBlank(message = "Trace ID is required")
    private String traceId;

    private String parentSpanId;

    @NotBlank(message = "Operation name is required")
    private String operationName;

    @NotBlank(message = "Service name is required")
    private String serviceName;

    private Boolean isRoot;

    @Pattern(regexp = "SERVER|CLIENT|INTERNAL|PRODUCER|CONSUMER", message = "Invalid span kind")
    private String spanKind;

    private String startTime;  // ISO 8601 format or timestamp
    private String endTime;    // ISO 8601 format or timestamp

    private Long durationMs;

    @Pattern(regexp = "OK|ERROR", message = "Status must be OK or ERROR")
    private String status;

    private String statusMessage;

    // HTTP attributes
    private String httpMethod;
    private String httpUrl;
    private Integer httpStatusCode;

    // Infrastructure attributes
    private String host;
    private String pod;
    private String container;

    private Map<String, String> attributes;
}

