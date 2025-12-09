package com.observability.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Scheduled service to clean up old telemetry data
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DataCleanupService {

    private final MetricService metricService;
    private final LogService logService;
    private final TraceService traceService;

    @Value("${observability.retention.metrics-days:7}")
    private int metricsRetentionDays;

    @Value("${observability.retention.logs-days:7}")
    private int logsRetentionDays;

    @Value("${observability.retention.traces-days:7}")
    private int tracesRetentionDays;

    /**
     * Run cleanup every hour
     */
    @Scheduled(fixedRate = 3600000) // 1 hour
    public void cleanupOldData() {
        log.info("Starting scheduled data cleanup...");

        Instant metricsThreshold = Instant.now().minus(metricsRetentionDays, ChronoUnit.DAYS);
        Instant logsThreshold = Instant.now().minus(logsRetentionDays, ChronoUnit.DAYS);
        Instant tracesThreshold = Instant.now().minus(tracesRetentionDays, ChronoUnit.DAYS);

        try {
            metricService.deleteOldMetrics(metricsThreshold);
            log.info("Cleaned up metrics older than {} days", metricsRetentionDays);
        } catch (Exception e) {
            log.error("Failed to cleanup old metrics", e);
        }

        try {
            logService.deleteOldLogs(logsThreshold);
            log.info("Cleaned up logs older than {} days", logsRetentionDays);
        } catch (Exception e) {
            log.error("Failed to cleanup old logs", e);
        }

        try {
            traceService.deleteOldTraces(tracesThreshold);
            log.info("Cleaned up traces older than {} days", tracesRetentionDays);
        } catch (Exception e) {
            log.error("Failed to cleanup old traces", e);
        }

        log.info("Data cleanup completed");
    }
}

