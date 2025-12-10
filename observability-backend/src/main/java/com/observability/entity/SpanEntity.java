package com.observability.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "spans", indexes = {
    @Index(name = "idx_spans_org", columnList = "organization_id"),
    @Index(name = "idx_spans_team", columnList = "team_id"),
    @Index(name = "idx_spans_span_id", columnList = "spanId"),
    @Index(name = "idx_spans_trace_id", columnList = "traceId"),
    @Index(name = "idx_spans_service", columnList = "serviceName"),
    @Index(name = "idx_spans_start_time", columnList = "startTime")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SpanEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "organization_id", nullable = false)
    private Long organizationId;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    @Column(nullable = false, length = 16)
    private String spanId;

    @Column(nullable = false, length = 32)
    private String traceId;

    @Column(length = 16)
    private String parentSpanId;

    @Column(nullable = false, length = 255)
    private String operationName;

    @Column(nullable = false)
    private Instant startTime;

    @Column(nullable = false)
    private Instant endTime;

    @Column(nullable = false)
    private Long duration; // milliseconds

    @Column(nullable = false, length = 100)
    private String serviceName;

    @Column(length = 20)
    private String status; // OK, ERROR

    @Column(length = 10)
    private String kind; // SERVER, CLIENT, INTERNAL, PRODUCER, CONSUMER

    @Column(length = 50)
    private String pod;

    @Column(length = 50)
    private String container;

    @Column(length = 50)
    private String node;

    @Column(columnDefinition = "JSON")
    private String attributes;
}

