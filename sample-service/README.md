# Sample Order Service

A sample Spring Boot service demonstrating the Observability SDK integration.

## What This Demonstrates

1. **Automatic HTTP Tracing** - All REST endpoints are automatically traced
2. **Custom Method Tracing** - Using `@Traced` annotation on service methods
3. **Nested Spans** - Child spans for payment and inventory calls
4. **Custom Metrics** - Recording business metrics (orders created, payments, etc.)
5. **Log Correlation** - Logs automatically include traceId and spanId

## Running

### 1. Start the Observability Backend

```bash
cd observability-backend
mvn spring-boot:run
```

Backend runs on http://localhost:8080

### 2. Start the Sample Service

```bash
cd sample-service
mvn spring-boot:run
```

Service runs on http://localhost:8081

## Testing the API

### Create an Order

```bash
curl -X POST http://localhost:8081/api/orders \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cust-123",
    "items": [
      {
        "productId": "prod-001",
        "productName": "Widget",
        "quantity": 2,
        "price": 29.99
      },
      {
        "productId": "prod-002", 
        "productName": "Gadget",
        "quantity": 1,
        "price": 49.99
      }
    ]
  }'
```

### Get an Order

```bash
curl http://localhost:8081/api/orders/{orderId}
```

### List All Orders

```bash
curl http://localhost:8081/api/orders
```

### Cancel an Order

```bash
curl -X DELETE http://localhost:8081/api/orders/{orderId}
```

## What Gets Sent to Backend

### Traces (POST /v1/traces)

Each request creates a trace with multiple spans:

```
[Trace: abc123...]
  └── GET /api/orders (SERVER span) - 150ms
      └── order.list (INTERNAL span) - 5ms

[Trace: def456...]
  └── POST /api/orders (SERVER span) - 350ms
      ├── order.create (INTERNAL span) - 340ms
      │   ├── inventory.check (CLIENT span) - 50ms
      │   └── payment.process (CLIENT span) - 180ms
```

### Metrics (POST /v1/metrics)

- `http.server.duration` - Request latency per endpoint
- `jvm.memory.heap.used` - JVM heap memory
- `jvm.memory.heap.percent` - Heap usage percentage
- `system.cpu.load` - System CPU load
- `jvm.threads.count` - Active thread count
- `orders.created` - Custom counter
- `orders.total_amount` - Custom gauge
- `payments.success` / `payments.failed` - Payment counters

### Logs (POST /v1/logs)

All logs include trace context:

```json
{
  "serviceName": "order-service",
  "level": "INFO",
  "message": "Creating order for customer: cust-123",
  "traceId": "abc123...",
  "spanId": "def456..."
}
```

## Trace Context Propagation

When calling other services, include the `traceparent` header from the response:

```bash
# First service returns traceparent in response header
curl -i http://localhost:8081/api/orders

# Pass it to downstream service
curl http://localhost:8082/api/inventory \
  -H "traceparent: 00-abc123...-def456...-01"
```

This links traces across multiple services.

