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
 * Request DTO for ingesting log data.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogRequest {

    @NotBlank(message = "Service name is required")
    private String serviceName;

    @NotBlank(message = "Log level is required")
    @Pattern(regexp = "DEBUG|INFO|WARN|ERROR|FATAL", message = "Invalid log level")
    private String level;

    @NotBlank(message = "Message is required")
    private String message;

    private String logger;
    private String traceId;
    private String spanId;

    // Infrastructure attributes
    private String host;
    private String pod;
    private String container;
    private String thread;
    private String exception;

    private Map<String, String> attributes;

    @Positive(message = "Timestamp must be positive")
    private Long timestamp;
}

