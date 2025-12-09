package com.observability.sdk.metrics;

import com.observability.sdk.config.ObservabilityProperties;
import com.observability.sdk.exporter.OtlpExporter;
import com.observability.sdk.model.MetricData;
import lombok.extern.slf4j.Slf4j;

import java.lang.management.ManagementFactory;
import java.lang.management.MemoryMXBean;
import java.lang.management.OperatingSystemMXBean;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Collects and exports metrics
 */
@Slf4j
public class MetricsCollector {

    private final ObservabilityProperties properties;
    private final OtlpExporter exporter;
    private final ScheduledExecutorService scheduler;
    
    // Counters for HTTP metrics
    private final Map<String, AtomicLong> requestCounts = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> errorCounts = new ConcurrentHashMap<>();
    private final Map<String, AtomicLong> latencySums = new ConcurrentHashMap<>();

    public MetricsCollector(ObservabilityProperties properties, OtlpExporter exporter) {
        this.properties = properties;
        this.exporter = exporter;
        this.scheduler = Executors.newScheduledThreadPool(1);

        // Schedule JVM metrics collection
        if (properties.getMetrics().isIncludeJvmMetrics()) {
            int interval = properties.getMetrics().getExportIntervalSeconds();
            scheduler.scheduleAtFixedRate(this::collectJvmMetrics, interval, interval, TimeUnit.SECONDS);
        }

        Runtime.getRuntime().addShutdownHook(new Thread(scheduler::shutdown));
    }

    /**
     * Record HTTP request metrics
     */
    public void recordHttpRequest(String method, String path, int statusCode, long durationMs) {
        String key = method + ":" + path;
        
        requestCounts.computeIfAbsent(key, k -> new AtomicLong()).incrementAndGet();
        latencySums.computeIfAbsent(key, k -> new AtomicLong()).addAndGet(durationMs);
        
        if (statusCode >= 400) {
            errorCounts.computeIfAbsent(key, k -> new AtomicLong()).incrementAndGet();
        }

        // Export latency metric
        exporter.exportMetric(MetricData.builder()
                .name("http.server.duration")
                .value(durationMs)
                .timestamp(System.currentTimeMillis())
                .type("histogram")
                .endpoint(path)
                .method(method)
                .statusCode(statusCode)
                .labels(Map.of(
                        "method", method,
                        "path", path,
                        "status_code", String.valueOf(statusCode)
                ))
                .build());
    }

    /**
     * Record custom metric
     */
    public void recordMetric(String name, double value, Map<String, String> labels) {
        exporter.exportMetric(MetricData.builder()
                .name(name)
                .value(value)
                .timestamp(System.currentTimeMillis())
                .type("gauge")
                .labels(labels)
                .build());
    }

    /**
     * Increment counter
     */
    public void incrementCounter(String name, Map<String, String> labels) {
        exporter.exportMetric(MetricData.builder()
                .name(name)
                .value(1)
                .timestamp(System.currentTimeMillis())
                .type("counter")
                .labels(labels)
                .build());
    }

    /**
     * Collect JVM metrics
     */
    private void collectJvmMetrics() {
        try {
            long timestamp = System.currentTimeMillis();
            MemoryMXBean memoryBean = ManagementFactory.getMemoryMXBean();
            OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
            Runtime runtime = Runtime.getRuntime();

            // Heap memory
            long heapUsed = memoryBean.getHeapMemoryUsage().getUsed();
            long heapMax = memoryBean.getHeapMemoryUsage().getMax();
            double heapPercent = heapMax > 0 ? (heapUsed * 100.0 / heapMax) : 0;

            exporter.exportMetric(MetricData.builder()
                    .name("jvm.memory.heap.used")
                    .value(heapUsed)
                    .timestamp(timestamp)
                    .type("gauge")
                    .build());

            exporter.exportMetric(MetricData.builder()
                    .name("jvm.memory.heap.percent")
                    .value(heapPercent)
                    .timestamp(timestamp)
                    .type("gauge")
                    .build());

            // CPU
            double cpuLoad = osBean.getSystemLoadAverage();
            if (cpuLoad >= 0) {
                exporter.exportMetric(MetricData.builder()
                        .name("system.cpu.load")
                        .value(cpuLoad)
                        .timestamp(timestamp)
                        .type("gauge")
                        .build());
            }

            // Threads
            exporter.exportMetric(MetricData.builder()
                    .name("jvm.threads.count")
                    .value(Thread.activeCount())
                    .timestamp(timestamp)
                    .type("gauge")
                    .build());

        } catch (Exception e) {
            log.warn("Failed to collect JVM metrics: {}", e.getMessage());
        }
    }
}

