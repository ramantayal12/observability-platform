package com.observability.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Entity to store team-level overview metrics and statistics.
 * Each team has its own set of metrics that are updated periodically.
 */
@Entity
@Table(name = "team_overview_data", indexes = {
    @Index(name = "idx_team_overview_team", columnList = "team_id"),
    @Index(name = "idx_team_overview_timestamp", columnList = "timestamp")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamOverviewDataEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;

    // Key metrics
    @Column(name = "avg_latency")
    private Double avgLatency;

    @Column(name = "throughput")
    private Double throughput;

    @Column(name = "error_rate")
    private Double errorRate;

    @Column(name = "active_services")
    private Integer activeServices;

    @Column(name = "total_requests")
    private Long totalRequests;

    @Column(name = "error_count")
    private Long errorCount;

    // Resource metrics
    @Column(name = "cpu_usage")
    private Double cpuUsage;

    @Column(name = "memory_usage")
    private Double memoryUsage;

    // Counts
    @Column(name = "log_count")
    private Long logCount;

    @Column(name = "trace_count")
    private Long traceCount;

    @Column(name = "alert_count")
    private Integer alertCount;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}

