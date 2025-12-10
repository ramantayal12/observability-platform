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

    @Positive(message = "Start time must be positive")
    private Long startTime;

    @Positive(message = "End time must be positive")
    private Long endTime;

    private Long duration;

    @Pattern(regexp = "OK|ERROR", message = "Status must be OK or ERROR")
    private String status;

    @Pattern(regexp = "SERVER|CLIENT|INTERNAL|PRODUCER|CONSUMER", message = "Invalid span kind")
    private String kind;

    private String pod;
    private String container;
    private String node;
    private Map<String, String> attributes;
}

