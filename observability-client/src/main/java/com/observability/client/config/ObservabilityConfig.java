package com.observability.client.config;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ObservabilityConfig {
    @Builder.Default
    private String backendUrl = "http://localhost:8080";
    private String apiKey;
    private String serviceName;
    @Builder.Default
    private boolean metricsEnabled = true;
    @Builder.Default
    private boolean logsEnabled = true;
    @Builder.Default
    private boolean tracingEnabled = true;
    @Builder.Default
    private int batchSize = 50;
    @Builder.Default
    private int flushIntervalMs = 5000;
}
