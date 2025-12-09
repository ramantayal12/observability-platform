package com.observability.sdk.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Configuration properties for Observability SDK
 * 
 * Usage in application.yml:
 * observability:
 *   enabled: true
 *   endpoint: http://localhost:8080
 *   service-name: my-service
 *   environment: production
 */
@Data
@ConfigurationProperties(prefix = "observability")
public class ObservabilityProperties {

    /**
     * Enable/disable observability data collection
     */
    private boolean enabled = true;

    /**
     * Observability backend endpoint URL
     */
    private String endpoint = "http://localhost:8080";

    /**
     * Service name (defaults to spring.application.name)
     */
    private String serviceName;

    /**
     * Environment (e.g., dev, staging, production)
     */
    private String environment = "default";

    /**
     * Kubernetes pod name (auto-detected from env)
     */
    private String podName;

    /**
     * Kubernetes container name
     */
    private String containerName;

    /**
     * Kubernetes node name (auto-detected from env)
     */
    private String nodeName;

    /**
     * Metrics configuration
     */
    private MetricsConfig metrics = new MetricsConfig();

    /**
     * Tracing configuration
     */
    private TracingConfig tracing = new TracingConfig();

    /**
     * Logging configuration
     */
    private LoggingConfig logging = new LoggingConfig();

    @Data
    public static class MetricsConfig {
        private boolean enabled = true;
        private int exportIntervalSeconds = 15;
        private boolean includeJvmMetrics = true;
        private boolean includeHttpMetrics = true;
    }

    @Data
    public static class TracingConfig {
        private boolean enabled = true;
        private double samplingRate = 1.0; // 100% sampling by default
        private boolean propagateContext = true;
    }

    @Data
    public static class LoggingConfig {
        private boolean enabled = true;
        private String minLevel = "INFO";
        private boolean includeTraceContext = true;
    }
}

