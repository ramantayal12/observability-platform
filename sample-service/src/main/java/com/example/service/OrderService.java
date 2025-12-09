package com.example.service;

import com.example.model.Order;
import com.observability.sdk.annotation.Traced;
import com.observability.sdk.metrics.MetricsCollector;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
@RequiredArgsConstructor
public class OrderService {

    private final MetricsCollector metricsCollector;
    private final PaymentService paymentService;
    private final InventoryService inventoryService;
    
    // In-memory store for demo
    private final Map<String, Order> orders = new ConcurrentHashMap<>();

    /**
     * Create a new order
     * The @Traced annotation automatically creates a span for this method
     */
    @Traced("order.create")
    public Order createOrder(String customerId, List<Order.OrderItem> items) {
        log.info("Creating order for customer: {}", customerId);
        
        // Calculate total
        BigDecimal total = items.stream()
                .map(item -> item.getPrice().multiply(BigDecimal.valueOf(item.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // Check inventory (creates child span)
        boolean inStock = inventoryService.checkStock(items);
        if (!inStock) {
            log.warn("Items out of stock for customer: {}", customerId);
            throw new RuntimeException("Items out of stock");
        }

        // Process payment (creates child span)
        boolean paymentSuccess = paymentService.processPayment(customerId, total);
        if (!paymentSuccess) {
            log.error("Payment failed for customer: {}", customerId);
            throw new RuntimeException("Payment failed");
        }

        // Create order
        Order order = Order.builder()
                .id(UUID.randomUUID().toString())
                .customerId(customerId)
                .items(items)
                .totalAmount(total)
                .status("CONFIRMED")
                .createdAt(LocalDateTime.now())
                .build();

        orders.put(order.getId(), order);
        
        // Record custom metric
        metricsCollector.incrementCounter("orders.created", Map.of(
                "customer_id", customerId,
                "item_count", String.valueOf(items.size())
        ));
        metricsCollector.recordMetric("orders.total_amount", total.doubleValue(), Map.of(
                "customer_id", customerId
        ));

        log.info("Order created successfully: {}", order.getId());
        return order;
    }

    @Traced("order.get")
    public Order getOrder(String orderId) {
        log.debug("Fetching order: {}", orderId);
        Order order = orders.get(orderId);
        if (order == null) {
            log.warn("Order not found: {}", orderId);
            throw new RuntimeException("Order not found: " + orderId);
        }
        return order;
    }

    @Traced("order.list")
    public List<Order> listOrders() {
        log.debug("Listing all orders");
        return List.copyOf(orders.values());
    }

    @Traced("order.cancel")
    public Order cancelOrder(String orderId) {
        log.info("Cancelling order: {}", orderId);
        Order order = getOrder(orderId);
        order.setStatus("CANCELLED");
        
        // Refund payment
        paymentService.refundPayment(order.getCustomerId(), order.getTotalAmount());
        
        // Restore inventory
        inventoryService.restoreStock(order.getItems());
        
        metricsCollector.incrementCounter("orders.cancelled", Map.of("order_id", orderId));
        log.info("Order cancelled: {}", orderId);
        return order;
    }
}

