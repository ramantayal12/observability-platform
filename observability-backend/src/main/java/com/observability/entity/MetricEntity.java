package com.observability.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "metrics", indexes = {
    @Index(name = "idx_metrics_org", columnList = "organization_id"),
    @Index(name = "idx_metrics_team", columnList = "team_id"),
    @Index(name = "idx_metrics_service", columnList = "serviceName"),
    @Index(name = "idx_metrics_timestamp", columnList = "timestamp"),
    @Index(name = "idx_metrics_name", columnList = "metricName")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MetricEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(nullable = false, length = 100)
    private String serviceName;

    @Column(nullable = false, length = 100)
    private String metricName;

    @Column(length = 255)
    private String endpoint;

    @Column(nullable = false)
    private Double value;

    @Column(nullable = false)
    private Instant timestamp;

    @Column(length = 10)
    private String method;

    private Integer statusCode;

    @Column(length = 50)
    private String pod;

    @Column(length = 50)
    private String container;

    @Column(length = 50)
    private String node;

    @Column(length = 100)
    private String operationType;
}

