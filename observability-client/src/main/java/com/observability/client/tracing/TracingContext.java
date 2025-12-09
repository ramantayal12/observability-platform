package com.observability.client.tracing;

import lombok.Data;

import java.util.UUID;

@Data
public class TracingContext {
    private static final ThreadLocal<TracingContext> CONTEXT = ThreadLocal.withInitial(TracingContext::new);

    private String traceId;
    private String spanId;
    private String parentSpanId;

    public static TracingContext current() {
        return CONTEXT.get();
    }

    public static void startTrace() {
        TracingContext context = current();
        context.traceId = UUID.randomUUID().toString();
        context.spanId = UUID.randomUUID().toString();
        context.parentSpanId = null;
    }

    public static String startSpan(String parentSpanId) {
        TracingContext context = current();
        if (context.traceId == null) {
            startTrace();
        }
        String newSpanId = UUID.randomUUID().toString();
        context.parentSpanId = parentSpanId != null ? parentSpanId : context.spanId;
        context.spanId = newSpanId;
        return newSpanId;
    }

    public static void clear() {
        CONTEXT.remove();
    }

    public static String getTraceId() {
        return current().traceId;
    }

    public static String getSpanId() {
        return current().spanId;
    }

    public static String getParentSpanId() {
        return current().parentSpanId;
    }
}
