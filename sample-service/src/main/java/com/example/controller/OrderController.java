package com.example.controller;

import com.example.model.Order;
import com.example.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * REST API for orders
 * HTTP requests are automatically traced by the SDK's HttpRequestInterceptor
 */
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
@Slf4j
public class OrderController {

    private final OrderService orderService;

    /**
     * Create a new order
     * POST /api/orders
     * 
     * The SDK automatically:
     * 1. Creates a span for this HTTP request
     * 2. Generates traceId and spanId if not present in headers
     * 3. Records HTTP metrics (latency, status code)
     * 4. Forwards logs with trace context
     */
    @PostMapping
    public ResponseEntity<Order> createOrder(@RequestBody CreateOrderRequest request) {
        log.info("Received create order request for customer: {}", request.customerId());
        
        Order order = orderService.createOrder(request.customerId(), request.items());
        
        return ResponseEntity.ok(order);
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<Order> getOrder(@PathVariable String orderId) {
        log.info("Fetching order: {}", orderId);
        return ResponseEntity.ok(orderService.getOrder(orderId));
    }

    @GetMapping
    public ResponseEntity<List<Order>> listOrders() {
        log.info("Listing all orders");
        return ResponseEntity.ok(orderService.listOrders());
    }

    @DeleteMapping("/{orderId}")
    public ResponseEntity<Order> cancelOrder(@PathVariable String orderId) {
        log.info("Cancelling order: {}", orderId);
        return ResponseEntity.ok(orderService.cancelOrder(orderId));
    }

    /**
     * Health check endpoint
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of("status", "UP"));
    }

    // Request DTOs
    public record CreateOrderRequest(
            String customerId,
            List<Order.OrderItem> items
    ) {}
}

