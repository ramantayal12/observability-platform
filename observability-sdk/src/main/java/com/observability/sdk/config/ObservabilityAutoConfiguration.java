package com.observability.sdk.config;

import com.observability.sdk.exporter.OtlpExporter;
import com.observability.sdk.interceptor.HttpRequestInterceptor;
import com.observability.sdk.interceptor.TracingInterceptor;
import com.observability.sdk.logging.ObservabilityLogAppender;
import com.observability.sdk.metrics.MetricsCollector;
import com.observability.sdk.tracing.TracingService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Auto-configuration for Observability SDK
 * Automatically configures metrics, tracing, and logging when the library is added
 */
@Configuration
@EnableConfigurationProperties(ObservabilityProperties.class)
@ConditionalOnProperty(name = "observability.enabled", havingValue = "true", matchIfMissing = true)
@Slf4j
public class ObservabilityAutoConfiguration implements WebMvcConfigurer {

    private final ObservabilityProperties properties;

    @Value("${spring.application.name:unknown-service}")
    private String applicationName;

    public ObservabilityAutoConfiguration(ObservabilityProperties properties) {
        this.properties = properties;
        if (properties.getServiceName() == null) {
            properties.setServiceName(applicationName);
        }
        // Auto-detect Kubernetes environment variables
        if (properties.getPodName() == null) {
            properties.setPodName(System.getenv("HOSTNAME"));
        }
        if (properties.getNodeName() == null) {
            properties.setNodeName(System.getenv("NODE_NAME"));
        }
        log.info("Observability SDK initialized for service: {}", properties.getServiceName());
    }

    @Bean
    public OtlpExporter otlpExporter() {
        return new OtlpExporter(properties);
    }

    @Bean
    @ConditionalOnProperty(name = "observability.metrics.enabled", havingValue = "true", matchIfMissing = true)
    public MetricsCollector metricsCollector(OtlpExporter exporter) {
        log.info("Enabling metrics collection with {}s export interval", 
                properties.getMetrics().getExportIntervalSeconds());
        return new MetricsCollector(properties, exporter);
    }

    @Bean
    @ConditionalOnProperty(name = "observability.tracing.enabled", havingValue = "true", matchIfMissing = true)
    public TracingService tracingService(OtlpExporter exporter) {
        log.info("Enabling distributed tracing with {}% sampling rate", 
                properties.getTracing().getSamplingRate() * 100);
        return new TracingService(properties, exporter);
    }

    @Bean
    @ConditionalOnProperty(name = "observability.tracing.enabled", havingValue = "true", matchIfMissing = true)
    public HttpRequestInterceptor httpRequestInterceptor(TracingService tracingService, MetricsCollector metricsCollector) {
        return new HttpRequestInterceptor(tracingService, metricsCollector, properties);
    }

    @Bean
    @ConditionalOnProperty(name = "observability.logging.enabled", havingValue = "true", matchIfMissing = true)
    public ObservabilityLogAppender observabilityLogAppender(OtlpExporter exporter, TracingService tracingService) {
        log.info("Enabling log forwarding with min level: {}", properties.getLogging().getMinLevel());
        return new ObservabilityLogAppender(properties, exporter, tracingService);
    }

    @Bean
    public TracingInterceptor tracingInterceptor(TracingService tracingService) {
        return new TracingInterceptor(tracingService);
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        if (properties.getTracing().isEnabled()) {
            registry.addInterceptor(httpRequestInterceptor(
                    tracingService(otlpExporter()), 
                    metricsCollector(otlpExporter())
            )).addPathPatterns("/**");
        }
    }
}

