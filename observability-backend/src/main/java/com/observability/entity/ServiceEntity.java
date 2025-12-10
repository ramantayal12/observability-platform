package com.observability.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "services", indexes = {
    @Index(name = "idx_services_org", columnList = "organization_id"),
    @Index(name = "idx_services_team", columnList = "team_id"),
    @Index(name = "idx_services_name", columnList = "name")
}, uniqueConstraints = {
    @UniqueConstraint(name = "uk_service_team_name", columnNames = {"team_id", "name"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ServiceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 20)
    private String status; // healthy, degraded, down

    @Column(nullable = false)
    private Instant lastSeen;

    @Column(nullable = false)
    private Instant firstSeen;

    private Long metricCount;

    private Long logCount;

    private Long traceCount;

    private Long errorCount;

    private Double errorRate;

    @Column(length = 255)
    private String version;

    @Column(length = 50)
    private String environment;

    @Column(columnDefinition = "JSON")
    private String metadata;
}

