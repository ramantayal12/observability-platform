package com.observability.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Alert entity for storing alert rules and incidents.
 */
@Entity
@Table(name = "alerts", indexes = {
    @Index(name = "idx_alert_org", columnList = "organization_id"),
    @Index(name = "idx_alert_team", columnList = "team_id"),
    @Index(name = "idx_alert_status", columnList = "status"),
    @Index(name = "idx_alert_severity", columnList = "severity")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AlertEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(nullable = false, length = 255)
    private String name;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false, length = 20)
    private String type; // metric, log, trace, apm

    @Column(nullable = false, length = 20)
    private String severity; // critical, warning, info

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "active"; // active, acknowledged, resolved, muted

    @Column(length = 100)
    private String serviceName;

    @Column(name = "`condition`", length = 500)
    private String condition; // JSON condition definition

    @Column(length = 100)
    private String metric; // e.g., error_rate, latency_p99

    @Column(length = 20)
    private String operator; // >, <, >=, <=, ==, !=

    @Column
    private Double threshold;

    @Column
    private Integer durationMinutes; // How long condition must be true

    @Column
    private Double currentValue;

    @Column(length = 255)
    private String triggeredBy; // What triggered the alert

    @Column(name = "triggered_at")
    private LocalDateTime triggeredAt;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Column(name = "acknowledged_by", length = 255)
    private String acknowledgedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;

    @Column(name = "resolved_by", length = 255)
    private String resolvedBy;

    @Column(name = "muted_until")
    private LocalDateTime mutedUntil;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}

