# Observability Platform

A complete observability platform for monitoring Java microservices, featuring automatic instrumentation, metrics collection, distributed tracing, and a beautiful real-time dashboard.

## 🚀 Features

- **Automatic Instrumentation**: Just add a dependency and configuration - no code changes needed
- **Metrics Collection**: API latency, service latency, and custom metrics
- **Distributed Tracing**: Full trace and span visualization with waterfall charts
- **Log Aggregation**: Centralized logging with filtering and search
- **Real-time Dashboard**: Beautiful dark-themed dashboard with live charts
- **Easy Integration**: Simple configuration with credentials

## 📁 Project Structure

```
observability-platform/
├── observability-backend/     # Spring Boot backend service
├── observability-client/      # Java client library
├── observability-frontend/    # Web dashboard
└── sample-service/           # Example integration
```

## 🎯 Quick Start

### 1. Build the Client Library

```bash
cd observability-client
mvn clean install
```

### 2. Start the Backend

```bash
cd observability-backend
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`

### 3. Open the Dashboard

Open `observability-frontend/index.html` in your browser, or serve it with a simple HTTP server:

```bash
cd observability-frontend
python3 -m http.server 3000
```

Then navigate to `http://localhost:3000`

### 4. Run the Sample Service

```bash
cd sample-service
mvn spring-boot:run
```

The sample service will start on `http://localhost:8081`

### 5. Generate Traffic

Test the sample service endpoints:

```bash
# Hello endpoint
curl "http://localhost:8081/api/hello?name=John"

# Get user
curl "http://localhost:8081/api/users/123"

# Create order
curl -X POST http://localhost:8081/api/orders \
  -H "Content-Type: application/json" \
  -d '{"items": 3, "total": 99.99}'

# Slow endpoint
curl "http://localhost:8081/api/slow"

# Test error handling
curl "http://localhost:8081/api/error"
```

Watch the metrics, logs, and traces appear in real-time on the dashboard! 📊

## 🔧 Integrating with Your Service

### Step 1: Add the Dependency

Add to your `pom.xml`:

```xml
<dependency>
    <groupId>com.observability</groupId>
    <artifactId>observability-client</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Step 2: Add Configuration

In your `application.yml`:

```yaml
observability:
  backend-url: http://localhost:8080
  service-name: my-service
  api-key: your-api-key-here
```

### Step 3: Initialize the Client

In your Spring Boot application:

```java
@SpringBootApplication
public class MyApplication {
    
    @PostConstruct
    public void initObservability() {
        ObservabilityConfig config = ObservabilityConfig.builder()
                .backendUrl("http://localhost:8080")
                .serviceName("my-service")
                .apiKey("your-api-key")
                .build();
        
        ObservabilityClient.initialize(config);
    }
    
    @Bean
    public FilterRegistrationBean<ObservabilityFilter> observabilityFilter() {
        FilterRegistrationBean<ObservabilityFilter> bean = new FilterRegistrationBean<>();
        bean.setFilter(new ObservabilityFilter());
        bean.addUrlPatterns("/*");
        return bean;
    }
}
```

That's it! Your service now sends metrics, logs, and traces automatically! ✨

## 📊 Dashboard Features

### Real-time Charts
- **API Latency**: Track response times for all endpoints
- **Service Latency**: Monitor internal operation performance
- **Live Updates**: Auto-refreshes every 5 seconds

### Logs Viewer
- Filter by log level (DEBUG, INFO, WARN, ERROR)
- Search through log messages
- Trace correlation for debugging

### Traces & Spans
- View distributed traces across services
- Waterfall visualization of span timing
- Detailed span metadata and tags

### Stats Cards
- Average API latency
- Average service latency
- Total errors
- Active traces count

## 🎨 Dashboard Customization

The dashboard features:
- **Dark Mode**: Modern dark theme with glassmorphism
- **Gradients**: Beautiful color gradients for visual appeal
- **Animations**: Smooth transitions and hover effects
- **Responsive**: Works on desktop and mobile devices

## 📝 Manual Instrumentation

For custom metrics and logs:

```java
@Autowired
private ObservabilityClient client;

// Record a custom metric
client.recordMetric("custom.metric", "operation-name", 
    durationMs, "GET", 200);

// Record a custom log
client.recordLog("INFO", "Custom log message", "MyClass");

// Record a custom span
Map<String, String> tags = Map.of("key", "value");
client.recordSpan("Custom Operation", startTime, endTime, tags);
```

## 🏗️ Architecture

```
┌─────────────────┐
│ Your Service    │
│ + Client Lib    │───┐
└─────────────────┘   │
                      │ HTTP
┌─────────────────┐   │
│ Another Service │───┤
│ + Client Lib    │   │
└─────────────────┘   │
                      ▼
              ┌──────────────┐
              │   Backend    │
              │   Service    │
              └──────────────┘
                      │
                      │ REST API
                      ▼
              ┌──────────────┐
              │  Dashboard   │
              │   (Browser)  │
              └──────────────┘
```

## 🔒 Security

The API key in the configuration can be used for authentication. The backend can be extended to validate API keys before accepting data.

## 🚀 Production Deployment

For production use, consider:

1. **Database**: Replace in-memory storage with PostgreSQL, MongoDB, or ClickHouse
2. **Message Queue**: Use Kafka or RabbitMQ for async data ingestion
3. **Scaling**: Deploy multiple backend instances behind a load balancer
4. **Retention**: Implement data retention policies
5. **Alerting**: Add alert rules for anomalies
6. **Authentication**: Implement proper API key validation

## 📦 Technologies Used

### Backend
- Spring Boot 3.2.0
- Java 17
- Lombok

### Client Library
- Java 17
- Jackson for JSON
- Java HTTP Client

### Frontend
- Vanilla JavaScript
- Chart.js for visualizations
- Modern CSS with glassmorphism

## 🤝 Contributing

Feel free to extend this platform with:
- Additional chart types
- Custom aggregations
- Alert rules
- Export functionality
- More visualization options

## 📄 License

This is a demonstration project for educational purposes.

---

**Built with ❤️ for modern microservices observability**
