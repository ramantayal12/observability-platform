package com.sample.controller;

import com.observability.client.ObservabilityClient;
import com.observability.client.tracing.TracingContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Random;

@Slf4j
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SampleController {

    private final ObservabilityClient observabilityClient = ObservabilityClient.getInstance();
    private final Random random = new Random();

    @GetMapping("/hello")
    public Map<String, String> hello(@RequestParam(defaultValue = "World") String name) {
        log.info("Processing hello request for name: {}", name);

        // Simulate some processing time
        simulateWork(50, 150);

        observabilityClient.recordLog("INFO", "Hello endpoint called with name: " + name, "SampleController");

        return Map.of(
                "message", "Hello, " + name + "!",
                "timestamp", String.valueOf(System.currentTimeMillis()));
    }

    @GetMapping("/users/{userId}")
    public Map<String, Object> getUser(@PathVariable String userId) {
        log.info("Fetching user: {}", userId);

        // Record service operation
        long startTime = System.currentTimeMillis();

        // Start a child span for database operation
        String spanId = TracingContext.startSpan(TracingContext.getSpanId());

        // Simulate database query
        simulateWork(100, 300);

        long endTime = System.currentTimeMillis();

        Map<String, String> tags = new HashMap<>();
        tags.put("operation", "database.query");
        tags.put("table", "users");
        tags.put("userId", userId);

        observabilityClient.recordSpan("DB: Fetch User", startTime, endTime, tags);
        observabilityClient.recordMetric("service.latency", "/users/{userId}",
                endTime - startTime, "GET", 200);

        observabilityClient.recordLog("INFO", "User fetched: " + userId, "SampleController");

        return Map.of(
                "userId", userId,
                "name", "User " + userId,
                "email", "user" + userId + "@example.com",
                "role", "USER");
    }

    @PostMapping("/orders")
    public Map<String, Object> createOrder(@RequestBody Map<String, Object> order) {
        log.info("Creating order: {}", order);

        long startTime = System.currentTimeMillis();

        // Simulate validation
        String validationSpan = TracingContext.startSpan(TracingContext.getSpanId());
        simulateWork(50, 100);
        observabilityClient.recordSpan("Validate Order", startTime, System.currentTimeMillis(),
                Map.of("operation", "validation"));

        // Simulate saving to database
        long dbStart = System.currentTimeMillis();
        String dbSpan = TracingContext.startSpan(TracingContext.getSpanId());
        simulateWork(150, 250);
        observabilityClient.recordSpan("DB: Save Order", dbStart, System.currentTimeMillis(),
                Map.of("operation", "database.insert", "table", "orders"));

        long endTime = System.currentTimeMillis();

        observabilityClient.recordMetric("service.latency", "/orders",
                endTime - startTime, "POST", 201);
        observabilityClient.recordLog("INFO", "Order created successfully", "SampleController");

        return Map.of(
                "orderId", "ORD-" + System.currentTimeMillis(),
                "status", "CREATED",
                "items", order.getOrDefault("items", 0));
    }

    @GetMapping("/error")
    public Map<String, String> simulateError() {
        log.error("Simulating error endpoint");

        observabilityClient.recordLog("ERROR", "Intentional error for testing", "SampleController");

        throw new RuntimeException("This is a simulated error");
    }

    @GetMapping("/slow")
    public Map<String, Object> slowEndpoint() {
        log.warn("Processing slow request - this will take time");

        long startTime = System.currentTimeMillis();

        // Simulate slow operation
        simulateWork(2000, 3000);

        long duration = System.currentTimeMillis() - startTime;

        observabilityClient.recordLog("WARN", "Slow endpoint took " + duration + "ms", "SampleController");
        observabilityClient.recordMetric("service.latency", "/slow", duration, "GET", 200);

        return Map.of(
                "message", "This was a slow operation",
                "duration", duration);
    }

    private void simulateWork(int minMs, int maxMs) {
        try {
            int delay = minMs + random.nextInt(maxMs - minMs);
            Thread.sleep(delay);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
