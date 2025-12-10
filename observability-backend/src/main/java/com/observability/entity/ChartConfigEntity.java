package com.observability.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Chart configuration entity for storing chart settings per team and page.
 * Allows different teams to have different chart layouts.
 */
@Entity
@Table(name = "chart_configs", indexes = {
    @Index(name = "idx_chart_config_team_page", columnList = "team_id, page_type"),
    @Index(name = "idx_chart_config_team", columnList = "team_id")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChartConfigEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "team_id", nullable = false)
    private Long teamId;

    /**
     * Page type where this chart should be displayed.
     * Values: "overview", "metrics"
     */
    @Column(name = "page_type", nullable = false, length = 50)
    private String pageType;

    /**
     * Unique chart identifier within the page (e.g., "latency", "throughput", "errorRate")
     */
    @Column(name = "chart_id", nullable = false, length = 50)
    private String chartId;

    /**
     * Display title for the chart
     */
    @Column(nullable = false, length = 100)
    private String title;

    /**
     * Chart type: "line", "bar", "area", etc.
     */
    @Column(name = "chart_type", nullable = false, length = 20)
    @Builder.Default
    private String chartType = "line";

    /**
     * Unit for the chart values (e.g., "ms", "req/min", "%")
     */
    @Column(length = 20)
    private String unit;

    /**
     * Data key to map to the response data (e.g., "latencyData", "throughputData")
     */
    @Column(name = "data_key", nullable = false, length = 50)
    private String dataKey;

    /**
     * Optional percentile value for percentile-based charts (e.g., 50, 90, 99)
     */
    @Column
    private Integer percentile;

    /**
     * Display order for sorting charts on the page
     */
    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;

    /**
     * Whether this chart is enabled/visible
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean enabled = true;

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

