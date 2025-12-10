package com.observability.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "traces", indexes = {
    @Index(name = "idx_traces_trace_id", columnList = "traceId", unique = true),
    @Index(name = "idx_traces_service", columnList = "serviceName"),
    @Index(name = "idx_traces_start_time", columnList = "startTime")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TraceEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 32, unique = true)
    private String traceId;

    @Column(nullable = false)
    private Instant startTime;

    @Column(nullable = false)
    private Instant endTime;

    @Column(nullable = false)
    private Long duration; // milliseconds

    @Column(nullable = false, length = 100)
    private String serviceName;

    @Column(length = 20)
    private String status; // SUCCESS, ERROR

    @Column(length = 255)
    private String rootOperation;

    private Integer spanCount;
}

