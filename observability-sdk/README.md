# Observability SDK

A Spring Boot auto-configuration library that automatically sends metrics, traces, and logs to the Observability Backend via OTLP.

## Quick Start

### 1. Add Dependency

```xml
<dependency>
    <groupId>com.observability</groupId>
    <artifactId>observability-sdk</artifactId>
    <version>1.0.0</version>
</dependency>
```

### 2. Configure (application.yml)

```yaml
spring:
  application:
    name: my-service

observability:
  enabled: true
  endpoint: http://localhost:8080
  environment: production
  
  metrics:
    enabled: true
    export-interval-seconds: 15
    include-jvm-metrics: true
    include-http-metrics: true
  
  tracing:
    enabled: true
    sampling-rate: 1.0  # 100% sampling
    propagate-context: true
  
  logging:
    enabled: true
    min-level: INFO
    include-trace-context: true
```

### 3. That's It!

The SDK auto-configures and starts collecting:
- **HTTP Metrics**: Request count, latency, error rate per endpoint
- **JVM Metrics**: Heap memory, CPU, thread count
- **Distributed Traces**: Automatic span creation for HTTP requests
- **Logs**: Forwarded to backend with trace context

## Features

### Automatic HTTP Instrumentation
All incoming HTTP requests are automatically traced and measured.

### Custom Tracing with @Traced
```java
@Traced("process-order")
public void processOrder(Order order) {
    // Automatically creates a span
}

@Traced(value = "call-payment-api", kind = "CLIENT")
public PaymentResult callPaymentService() {
    // Creates a CLIENT span for external calls
}
```

### Custom Metrics
```java
@Autowired
private MetricsCollector metricsCollector;

// Record a gauge
metricsCollector.recordMetric("orders.pending", 42, Map.of("region", "us-east"));

// Increment a counter
metricsCollector.incrementCounter("orders.created", Map.of("type", "express"));
```

### Trace Context Propagation
W3C Trace Context headers are automatically propagated:
- Incoming `traceparent` headers are parsed
- Outgoing responses include `traceparent` for downstream services

### Kubernetes Auto-Detection
Pod and node names are auto-detected from environment variables:
- `HOSTNAME` → pod name
- `NODE_NAME` → node name

## Configuration Reference

| Property | Default | Description |
|----------|---------|-------------|
| `observability.enabled` | `true` | Enable/disable SDK |
| `observability.endpoint` | `http://localhost:8080` | Backend URL |
| `observability.service-name` | `${spring.application.name}` | Service name |
| `observability.environment` | `default` | Environment name |
| `observability.pod-name` | `${HOSTNAME}` | Kubernetes pod name |
| `observability.container-name` | - | Container name |
| `observability.node-name` | `${NODE_NAME}` | Kubernetes node name |
| `observability.metrics.enabled` | `true` | Enable metrics |
| `observability.metrics.export-interval-seconds` | `15` | Export interval |
| `observability.metrics.include-jvm-metrics` | `true` | Collect JVM metrics |
| `observability.metrics.include-http-metrics` | `true` | Collect HTTP metrics |
| `observability.tracing.enabled` | `true` | Enable tracing |
| `observability.tracing.sampling-rate` | `1.0` | Sampling rate (0.0-1.0) |
| `observability.tracing.propagate-context` | `true` | Propagate trace context |
| `observability.logging.enabled` | `true` | Enable log forwarding |
| `observability.logging.min-level` | `INFO` | Minimum log level |
| `observability.logging.include-trace-context` | `true` | Add trace IDs to logs |

## Building

```bash
cd observability-sdk
mvn clean install
```

## Architecture

```
Your Spring Boot App
        │
        ▼
┌─────────────────────────────────────┐
│     Observability SDK               │
│  ┌─────────────────────────────┐    │
│  │ HttpRequestInterceptor      │────┼──► Traces
│  │ MetricsCollector            │────┼──► Metrics  
│  │ ObservabilityLogAppender    │────┼──► Logs
│  └─────────────────────────────┘    │
│              │                      │
│              ▼                      │
│  ┌─────────────────────────────┐    │
│  │      OtlpExporter           │    │
│  │   (Batching & Buffering)    │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
                │
                ▼ OTLP/HTTP
┌─────────────────────────────────────┐
│     Observability Backend           │
│   POST /v1/metrics                  │
│   POST /v1/traces                   │
│   POST /v1/logs                     │
└─────────────────────────────────────┘
```

