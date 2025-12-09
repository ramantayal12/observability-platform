package com.observability.sdk.logging;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.LoggerContext;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.AppenderBase;
import com.observability.sdk.config.ObservabilityProperties;
import com.observability.sdk.exporter.OtlpExporter;
import com.observability.sdk.model.LogData;
import com.observability.sdk.tracing.TracingService;
import com.observability.sdk.tracing.TracingService.SpanContext;
import jakarta.annotation.PostConstruct;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;

/**
 * Logback appender that forwards logs to the Observability backend
 */
public class ObservabilityLogAppender extends AppenderBase<ILoggingEvent> {

    private final ObservabilityProperties properties;
    private final OtlpExporter exporter;
    private final TracingService tracingService;
    private Level minLevel;

    public ObservabilityLogAppender(ObservabilityProperties properties, 
                                     OtlpExporter exporter, 
                                     TracingService tracingService) {
        this.properties = properties;
        this.exporter = exporter;
        this.tracingService = tracingService;
        this.minLevel = Level.toLevel(properties.getLogging().getMinLevel(), Level.INFO);
        setName("ObservabilityAppender");
    }

    @PostConstruct
    public void init() {
        // Attach to root logger
        LoggerContext context = (LoggerContext) LoggerFactory.getILoggerFactory();
        setContext(context);
        start();
        
        Logger rootLogger = context.getLogger(Logger.ROOT_LOGGER_NAME);
        rootLogger.addAppender(this);
    }

    @Override
    protected void append(ILoggingEvent event) {
        if (!isStarted() || !properties.getLogging().isEnabled()) {
            return;
        }

        // Check minimum level
        if (!event.getLevel().isGreaterOrEqual(minLevel)) {
            return;
        }

        // Skip our own logs to prevent infinite loop
        if (event.getLoggerName().startsWith("com.observability.sdk")) {
            return;
        }

        try {
            LogData.LogDataBuilder builder = LogData.builder()
                    .serviceName(properties.getServiceName())
                    .level(event.getLevel().toString())
                    .message(event.getFormattedMessage())
                    .timestamp(event.getTimeStamp())
                    .logger(event.getLoggerName());

            // Add trace context if available
            if (properties.getLogging().isIncludeTraceContext()) {
                SpanContext context = tracingService.getCurrentContext();
                if (context != null) {
                    builder.traceId(context.getTraceId());
                    builder.spanId(context.getSpanId());
                }
            }

            // Add MDC as attributes
            Map<String, String> attributes = new HashMap<>();
            if (event.getMDCPropertyMap() != null) {
                attributes.putAll(event.getMDCPropertyMap());
            }
            
            // Add thread info
            attributes.put("thread.name", event.getThreadName());
            
            // Add exception info if present
            if (event.getThrowableProxy() != null) {
                attributes.put("exception.type", event.getThrowableProxy().getClassName());
                attributes.put("exception.message", event.getThrowableProxy().getMessage());
            }
            
            builder.attributes(attributes);

            exporter.exportLog(builder.build());
        } catch (Exception e) {
            // Silently ignore to prevent logging loops
        }
    }
}

