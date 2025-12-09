package com.observability.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "logs", indexes = {
    @Index(name = "idx_logs_service", columnList = "serviceName"),
    @Index(name = "idx_logs_timestamp", columnList = "timestamp"),
    @Index(name = "idx_logs_level", columnList = "level"),
    @Index(name = "idx_logs_trace", columnList = "traceId")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LogEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String serviceName;

    @Column(nullable = false, length = 10)
    private String level;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(nullable = false)
    private Instant timestamp;

    @Column(length = 255)
    private String logger;

    @Column(length = 32)
    private String traceId;

    @Column(length = 16)
    private String spanId;

    @Column(length = 50)
    private String pod;

    @Column(length = 50)
    private String container;

    @Column(length = 50)
    private String node;

    @Column(columnDefinition = "JSON")
    private String attributes;
}

