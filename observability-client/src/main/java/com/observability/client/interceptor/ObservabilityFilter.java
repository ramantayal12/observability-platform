package com.observability.client.interceptor;

import com.observability.client.ObservabilityClient;
import com.observability.client.tracing.TracingContext;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

public class ObservabilityFilter implements Filter {

    private final ObservabilityClient client;

    public ObservabilityFilter() {
        this.client = ObservabilityClient.getInstance();
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        if (!(request instanceof HttpServletRequest) || !(response instanceof HttpServletResponse)) {
            chain.doFilter(request, response);
            return;
        }

        HttpServletRequest httpRequest = (HttpServletRequest) request;
        HttpServletResponse httpResponse = (HttpServletResponse) response;

        // Start tracing
        TracingContext.startTrace();

        long startTime = System.currentTimeMillis();
        String endpoint = httpRequest.getRequestURI();
        String method = httpRequest.getMethod();

        try {
            chain.doFilter(request, response);
        } finally {
            long endTime = System.currentTimeMillis();
            long duration = endTime - startTime;
            int statusCode = httpResponse.getStatus();

            // Record API latency metric
            client.recordMetric("api.latency", endpoint, duration, method, statusCode);

            // Record span
            Map<String, String> tags = new HashMap<>();
            tags.put("http.method", method);
            tags.put("http.status_code", String.valueOf(statusCode));
            tags.put("http.url", endpoint);

            client.recordSpan("HTTP " + method + " " + endpoint, startTime, endTime, tags);

            // Clear tracing context
            TracingContext.clear();
        }
    }
}
