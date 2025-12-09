package com.observability.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Generates realistic mock data for development/demo purposes
 */
@Service
@Slf4j
public class MockDataGenerator {

    private static final List<String> SERVICES = List.of(
            "api-gateway", "user-service", "payment-service", "notification-service", "auth-service"
    );

    private static final List<String> OPERATIONS = List.of(
            "GET /api/users", "POST /api/orders", "GET /api/products", 
            "PUT /api/users/:id", "DELETE /api/orders/:id"
    );

    private static final List<Map<String, String>> PODS = List.of(
            Map.of("name", "api-gateway-7d8f9c6b5-x2k4m", "service", "api-gateway", "node", "node-1"),
            Map.of("name", "api-gateway-7d8f9c6b5-p9n3q", "service", "api-gateway", "node", "node-2"),
            Map.of("name", "user-service-5c4d3b2a1-h7j8k", "service", "user-service", "node", "node-1"),
            Map.of("name", "user-service-5c4d3b2a1-m4n5p", "service", "user-service", "node", "node-3"),
            Map.of("name", "payment-service-9e8f7g6h-q1w2e", "service", "payment-service", "node", "node-2"),
            Map.of("name", "payment-service-9e8f7g6h-r3t4y", "service", "payment-service", "node", "node-1"),
            Map.of("name", "notification-service-1a2b3c4d-u5i6o", "service", "notification-service", "node", "node-3"),
            Map.of("name", "auth-service-6f5e4d3c-z9x8c", "service", "auth-service", "node", "node-2")
    );

    private static final List<Map<String, String>> CONTAINERS = List.of(
            Map.of("name", "api-gateway", "pod", "api-gateway-7d8f9c6b5-x2k4m", "image", "observex/api-gateway:v1.2.3"),
            Map.of("name", "envoy-proxy", "pod", "api-gateway-7d8f9c6b5-x2k4m", "image", "envoyproxy/envoy:v1.28"),
            Map.of("name", "user-service", "pod", "user-service-5c4d3b2a1-h7j8k", "image", "observex/user-service:v2.1.0"),
            Map.of("name", "payment-service", "pod", "payment-service-9e8f7g6h-q1w2e", "image", "observex/payment-service:v1.5.2"),
            Map.of("name", "notification-service", "pod", "notification-service-1a2b3c4d-u5i6o", "image", "observex/notification:v1.0.1"),
            Map.of("name", "auth-service", "pod", "auth-service-6f5e4d3c-z9x8c", "image", "observex/auth-service:v3.0.0")
    );

    private static final List<String> LOG_MESSAGES = List.of(
            "Request processed successfully",
            "Database connection established",
            "Cache miss for key: user_123",
            "Authentication successful for user",
            "Failed to connect to external service",
            "Slow query detected: 2.5s",
            "Rate limit exceeded for IP",
            "Payment processed successfully",
            "Email sent to user",
            "Session expired for user"
    );

    private static final List<Map<String, Object>> API_ENDPOINTS = List.of(
            Map.of("endpoint", "GET /api/v1/metrics", "baseLatency", 45, "baseThroughput", 1200, "baseError", 0.5),
            Map.of("endpoint", "POST /api/v1/metrics", "baseLatency", 85, "baseThroughput", 800, "baseError", 1.2),
            Map.of("endpoint", "GET /api/v1/logs", "baseLatency", 120, "baseThroughput", 600, "baseError", 0.8),
            Map.of("endpoint", "POST /api/v1/logs", "baseLatency", 95, "baseThroughput", 400, "baseError", 2.1),
            Map.of("endpoint", "GET /api/v1/traces", "baseLatency", 180, "baseThroughput", 350, "baseError", 1.5),
            Map.of("endpoint", "GET /api/v1/services", "baseLatency", 55, "baseThroughput", 900, "baseError", 0.3),
            Map.of("endpoint", "GET /api/v1/dashboards", "baseLatency", 65, "baseThroughput", 500, "baseError", 0.4),
            Map.of("endpoint", "GET /api/v1/alerts", "baseLatency", 40, "baseThroughput", 700, "baseError", 0.2)
    );

    public List<String> getServices() {
        return SERVICES;
    }

    public List<Map<String, String>> getPods() {
        return PODS;
    }

    public List<Map<String, String>> getContainers() {
        return CONTAINERS;
    }

    public List<Map<String, Object>> getApiEndpoints() {
        return API_ENDPOINTS;
    }

    public String randomService() {
        return SERVICES.get(ThreadLocalRandom.current().nextInt(SERVICES.size()));
    }

    public String randomOperation() {
        return OPERATIONS.get(ThreadLocalRandom.current().nextInt(OPERATIONS.size()));
    }

    public Map<String, String> randomPodForService(String service) {
        List<Map<String, String>> servicePods = PODS.stream()
                .filter(p -> p.get("service").equals(service))
                .toList();
        if (servicePods.isEmpty()) {
            return PODS.get(0);
        }
        return servicePods.get(ThreadLocalRandom.current().nextInt(servicePods.size()));
    }

    public Map<String, String> randomContainerForPod(String podName) {
        List<Map<String, String>> podContainers = CONTAINERS.stream()
                .filter(c -> c.get("pod").equals(podName))
                .toList();
        if (podContainers.isEmpty()) {
            return CONTAINERS.get(0);
        }
        return podContainers.get(ThreadLocalRandom.current().nextInt(podContainers.size()));
    }

    public String randomLogMessage() {
        return LOG_MESSAGES.get(ThreadLocalRandom.current().nextInt(LOG_MESSAGES.size()));
    }

    public String randomLogLevel() {
        double rand = ThreadLocalRandom.current().nextDouble();
        if (rand < 0.6) return "INFO";
        if (rand < 0.8) return "WARN";
        if (rand < 0.9) return "ERROR";
        return "DEBUG";
    }

    public double randomValue(double min, double max) {
        return Math.round((ThreadLocalRandom.current().nextDouble() * (max - min) + min) * 100.0) / 100.0;
    }

    public int randomInt(int min, int max) {
        return ThreadLocalRandom.current().nextInt(min, max + 1);
    }

    public String generateId(int length) {
        String chars = "0123456789abcdef";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) {
            sb.append(chars.charAt(ThreadLocalRandom.current().nextInt(chars.length())));
        }
        return sb.toString();
    }

    public int calculateDataPoints(long timeRange) {
        if (timeRange <= 5 * 60 * 1000) return 10;
        if (timeRange <= 15 * 60 * 1000) return 15;
        if (timeRange <= 30 * 60 * 1000) return 20;
        if (timeRange <= 60 * 60 * 1000) return 30;
        if (timeRange <= 3 * 60 * 60 * 1000) return 36;
        if (timeRange <= 6 * 60 * 60 * 1000) return 48;
        if (timeRange <= 12 * 60 * 60 * 1000) return 60;
        if (timeRange <= 24 * 60 * 60 * 1000) return 72;
        if (timeRange <= 2 * 24 * 60 * 60 * 1000) return 96;
        return 168;
    }
}

