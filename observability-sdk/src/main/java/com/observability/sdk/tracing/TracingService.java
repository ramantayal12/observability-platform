package com.observability.sdk.tracing;

import com.observability.sdk.config.ObservabilityProperties;
import com.observability.sdk.exporter.OtlpExporter;
import com.observability.sdk.model.SpanData;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;

import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Distributed tracing service
 * Creates and manages spans for request tracing
 */
@Slf4j
public class TracingService {

    private final ObservabilityProperties properties;
    private final OtlpExporter exporter;
    private final Random random = new Random();
    
    // Thread-local storage for current span context
    private static final ThreadLocal<SpanContext> currentContext = new ThreadLocal<>();
    
    // Active spans map
    private final Map<String, SpanData.SpanDataBuilder> activeSpans = new ConcurrentHashMap<>();

    public TracingService(ObservabilityProperties properties, OtlpExporter exporter) {
        this.properties = properties;
        this.exporter = exporter;
    }

    /**
     * Start a new span
     */
    public SpanContext startSpan(String operationName, String kind) {
        // Check sampling
        if (random.nextDouble() > properties.getTracing().getSamplingRate()) {
            return null;
        }

        SpanContext parent = currentContext.get();
        String traceId = parent != null ? parent.getTraceId() : generateTraceId();
        String spanId = generateSpanId();
        String parentSpanId = parent != null ? parent.getSpanId() : null;

        SpanContext context = new SpanContext(traceId, spanId, parentSpanId);
        currentContext.set(context);

        SpanData.SpanDataBuilder builder = SpanData.builder()
                .traceId(traceId)
                .spanId(spanId)
                .parentSpanId(parentSpanId)
                .operationName(operationName)
                .serviceName(properties.getServiceName())
                .kind(kind)
                .startTime(System.currentTimeMillis())
                .status("OK");

        activeSpans.put(spanId, builder);
        return context;
    }

    /**
     * End a span
     */
    public void endSpan(SpanContext context) {
        endSpan(context, "OK", null);
    }

    /**
     * End a span with status
     */
    public void endSpan(SpanContext context, String status, Map<String, String> attributes) {
        if (context == null) return;

        SpanData.SpanDataBuilder builder = activeSpans.remove(context.getSpanId());
        if (builder == null) return;

        long endTime = System.currentTimeMillis();
        SpanData span = builder
                .endTime(endTime)
                .duration(endTime - builder.build().getStartTime())
                .status(status)
                .attributes(attributes)
                .build();

        exporter.exportSpan(span);

        // Restore parent context
        if (context.getParentSpanId() != null) {
            currentContext.set(new SpanContext(
                    context.getTraceId(), 
                    context.getParentSpanId(), 
                    null
            ));
        } else {
            currentContext.remove();
        }
    }

    /**
     * Get current span context
     */
    public SpanContext getCurrentContext() {
        return currentContext.get();
    }

    /**
     * Set current span context (for propagation)
     */
    public void setCurrentContext(SpanContext context) {
        currentContext.set(context);
    }

    /**
     * Clear current context
     */
    public void clearContext() {
        currentContext.remove();
    }

    private String generateTraceId() {
        byte[] bytes = new byte[16];
        random.nextBytes(bytes);
        return bytesToHex(bytes);
    }

    private String generateSpanId() {
        byte[] bytes = new byte[8];
        random.nextBytes(bytes);
        return bytesToHex(bytes);
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    @Getter
    public static class SpanContext {
        private final String traceId;
        private final String spanId;
        private final String parentSpanId;

        public SpanContext(String traceId, String spanId, String parentSpanId) {
            this.traceId = traceId;
            this.spanId = spanId;
            this.parentSpanId = parentSpanId;
        }
    }
}

