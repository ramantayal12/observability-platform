package com.example.service;

import com.example.model.Order;
import com.observability.sdk.annotation.Traced;
import com.observability.sdk.metrics.MetricsCollector;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Random;

/**
 * Simulates inventory management
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class InventoryService {

    private final MetricsCollector metricsCollector;
    private final Random random = new Random();

    @Traced(value = "inventory.check", kind = "CLIENT")
    public boolean checkStock(List<Order.OrderItem> items) {
        log.info("Checking stock for {} items", items.size());
        
        // Simulate database/API call
        simulateLatency(20, 80);
        
        // Simulate 98% in-stock rate
        boolean inStock = random.nextDouble() < 0.98;
        
        for (Order.OrderItem item : items) {
            metricsCollector.recordMetric("inventory.checked", 1, Map.of(
                    "product_id", item.getProductId(),
                    "in_stock", String.valueOf(inStock)
            ));
        }
        
        if (inStock) {
            log.info("All items in stock");
        } else {
            log.warn("Some items out of stock");
        }
        
        return inStock;
    }

    @Traced("inventory.reserve")
    public void reserveStock(List<Order.OrderItem> items) {
        log.info("Reserving stock for {} items", items.size());
        simulateLatency(10, 50);
        
        for (Order.OrderItem item : items) {
            metricsCollector.incrementCounter("inventory.reserved", Map.of(
                    "product_id", item.getProductId(),
                    "quantity", String.valueOf(item.getQuantity())
            ));
        }
        
        log.info("Stock reserved successfully");
    }

    @Traced("inventory.restore")
    public void restoreStock(List<Order.OrderItem> items) {
        log.info("Restoring stock for {} items", items.size());
        simulateLatency(10, 50);
        
        for (Order.OrderItem item : items) {
            metricsCollector.incrementCounter("inventory.restored", Map.of(
                    "product_id", item.getProductId(),
                    "quantity", String.valueOf(item.getQuantity())
            ));
        }
        
        log.info("Stock restored successfully");
    }

    private void simulateLatency(int minMs, int maxMs) {
        try {
            Thread.sleep(random.nextInt(maxMs - minMs) + minMs);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}

