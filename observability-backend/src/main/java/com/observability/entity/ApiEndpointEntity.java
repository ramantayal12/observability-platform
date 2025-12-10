package com.observability.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * API Endpoint entity for storing endpoint configurations per team.
 * Contains base values for latency, throughput, and error rates that
 * are used to generate time series data with realistic variations.
 */
@Entity
@Table(name = "api_endpoints", indexes = {
    @Index(name = "idx_api_endpoints_team", columnList = "team_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApiEndpointEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    /**
     * Full endpoint string (e.g., "GET /api/v1/users")
     */
    @Column(nullable = false, length = 255)
    private String endpoint;

    /**
     * HTTP method (GET, POST, PUT, DELETE, etc.)
     */
    @Column(nullable = false, length = 10)
    private String method;

    /**
     * Base latency in milliseconds - used to generate time series with variation
     */
    @Column(name = "base_latency", nullable = false)
    private Double baseLatency;

    /**
     * Base throughput in requests per minute
     */
    @Column(name = "base_throughput", nullable = false)
    private Double baseThroughput;

    /**
     * Base error rate as percentage (0-100)
     */
    @Column(name = "base_error_rate", nullable = false)
    private Double baseErrorRate;

    /**
     * Whether this endpoint is enabled/visible
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;

    @Column(name = "created_at")
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}

