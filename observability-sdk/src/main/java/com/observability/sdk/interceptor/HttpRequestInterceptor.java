package com.observability.sdk.interceptor;

import com.observability.sdk.config.ObservabilityProperties;
import com.observability.sdk.metrics.MetricsCollector;
import com.observability.sdk.tracing.TracingService;
import com.observability.sdk.tracing.TracingService.SpanContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Map;

/**
 * Intercepts HTTP requests to automatically create spans and record metrics
 */
@Slf4j
@RequiredArgsConstructor
public class HttpRequestInterceptor implements HandlerInterceptor {

    private final TracingService tracingService;
    private final MetricsCollector metricsCollector;
    private final ObservabilityProperties properties;

    private static final String SPAN_CONTEXT_ATTR = "observability.spanContext";
    private static final String START_TIME_ATTR = "observability.startTime";

    // Trace context headers (W3C Trace Context)
    private static final String TRACEPARENT_HEADER = "traceparent";
    private static final String TRACESTATE_HEADER = "tracestate";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        long startTime = System.currentTimeMillis();
        request.setAttribute(START_TIME_ATTR, startTime);

        // Extract trace context from incoming headers
        String traceparent = request.getHeader(TRACEPARENT_HEADER);
        if (traceparent != null && properties.getTracing().isPropagateContext()) {
            SpanContext parentContext = parseTraceparent(traceparent);
            if (parentContext != null) {
                tracingService.setCurrentContext(parentContext);
            }
        }

        // Start span for this request
        String operationName = request.getMethod() + " " + getPathPattern(request);
        SpanContext spanContext = tracingService.startSpan(operationName, "SERVER");
        
        if (spanContext != null) {
            request.setAttribute(SPAN_CONTEXT_ATTR, spanContext);
            
            // Add trace context to response headers for downstream propagation
            response.setHeader(TRACEPARENT_HEADER, formatTraceparent(spanContext));
        }

        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, 
                                 Object handler, Exception ex) {
        Long startTime = (Long) request.getAttribute(START_TIME_ATTR);
        SpanContext spanContext = (SpanContext) request.getAttribute(SPAN_CONTEXT_ATTR);

        long duration = startTime != null ? System.currentTimeMillis() - startTime : 0;
        int statusCode = response.getStatus();
        String status = (statusCode >= 400 || ex != null) ? "ERROR" : "OK";

        // End span
        if (spanContext != null) {
            Map<String, String> attributes = Map.of(
                    "http.method", request.getMethod(),
                    "http.url", request.getRequestURI(),
                    "http.status_code", String.valueOf(statusCode),
                    "http.user_agent", request.getHeader("User-Agent") != null ? 
                            request.getHeader("User-Agent") : "unknown"
            );
            tracingService.endSpan(spanContext, status, attributes);
        }

        // Record HTTP metrics
        if (properties.getMetrics().isIncludeHttpMetrics()) {
            metricsCollector.recordHttpRequest(
                    request.getMethod(),
                    getPathPattern(request),
                    statusCode,
                    duration
            );
        }
    }

    private String getPathPattern(HttpServletRequest request) {
        // Normalize path by replacing IDs with placeholders
        String path = request.getRequestURI();
        // Replace UUIDs
        path = path.replaceAll("[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "{id}");
        // Replace numeric IDs
        path = path.replaceAll("/\\d+", "/{id}");
        return path;
    }

    private SpanContext parseTraceparent(String traceparent) {
        try {
            // Format: version-traceId-parentId-flags
            String[] parts = traceparent.split("-");
            if (parts.length >= 3) {
                return new SpanContext(parts[1], parts[2], null);
            }
        } catch (Exception e) {
            log.debug("Failed to parse traceparent header: {}", traceparent);
        }
        return null;
    }

    private String formatTraceparent(SpanContext context) {
        // Format: version-traceId-spanId-flags
        return String.format("00-%s-%s-01", context.getTraceId(), context.getSpanId());
    }
}

