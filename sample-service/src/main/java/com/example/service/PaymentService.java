package com.example.service;

import com.observability.sdk.annotation.Traced;
import com.observability.sdk.metrics.MetricsCollector;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Random;

/**
 * Simulates payment processing
 * Demonstrates @Traced annotation with CLIENT kind for external service calls
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class PaymentService {

    private final MetricsCollector metricsCollector;
    private final Random random = new Random();

    /**
     * Process payment - simulates calling external payment gateway
     * kind = "CLIENT" indicates this is an outbound call
     */
    @Traced(value = "payment.process", kind = "CLIENT")
    public boolean processPayment(String customerId, BigDecimal amount) {
        log.info("Processing payment of {} for customer {}", amount, customerId);
        
        // Simulate API latency
        simulateLatency(50, 200);
        
        // Simulate 95% success rate
        boolean success = random.nextDouble() < 0.95;
        
        if (success) {
            log.info("Payment successful for customer {}", customerId);
            metricsCollector.incrementCounter("payments.success", Map.of(
                    "customer_id", customerId
            ));
        } else {
            log.error("Payment failed for customer {}", customerId);
            metricsCollector.incrementCounter("payments.failed", Map.of(
                    "customer_id", customerId
            ));
        }
        
        metricsCollector.recordMetric("payments.amount", amount.doubleValue(), Map.of(
                "customer_id", customerId,
                "status", success ? "success" : "failed"
        ));
        
        return success;
    }

    @Traced(value = "payment.refund", kind = "CLIENT")
    public boolean refundPayment(String customerId, BigDecimal amount) {
        log.info("Refunding {} to customer {}", amount, customerId);
        
        simulateLatency(30, 100);
        
        metricsCollector.incrementCounter("payments.refunded", Map.of(
                "customer_id", customerId
        ));
        
        log.info("Refund successful for customer {}", customerId);
        return true;
    }

    private void simulateLatency(int minMs, int maxMs) {
        try {
            Thread.sleep(random.nextInt(maxMs - minMs) + minMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}

