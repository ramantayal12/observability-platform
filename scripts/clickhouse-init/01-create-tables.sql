-- ClickHouse Schema for ObserveX (Simplified)
-- 3 tables: spans (includes trace info), logs, incidents
-- Metrics are derived from spans using materialized views

-- =============================================================================
-- SPANS TABLE - All trace/span data in one table (denormalized for performance)
-- =============================================================================
CREATE TABLE IF NOT EXISTS observex.spans (
    -- Identifiers
    team_id UUID,
    trace_id String,
    span_id String,
    parent_span_id Nullable(String),

    -- Trace-level info (denormalized for query efficiency)
    is_root UInt8 DEFAULT 0,  -- 1 if this is the root span

    -- Span details
    operation_name LowCardinality(String),
    service_name LowCardinality(String),
    span_kind LowCardinality(String),  -- SERVER, CLIENT, INTERNAL, PRODUCER, CONSUMER
    start_time DateTime64(3),
    end_time DateTime64(3),
    duration_ms UInt64,
    status LowCardinality(String),  -- OK, ERROR
    status_message String,

    -- HTTP attributes
    http_method LowCardinality(String),
    http_url String,
    http_status_code UInt16,

    -- Infrastructure
    host LowCardinality(String),
    pod LowCardinality(String),
    container LowCardinality(String),

    -- Flexible attributes
    attributes Map(String, String),

    -- Indexes for common queries
    INDEX idx_trace trace_id TYPE bloom_filter GRANULARITY 4,
    INDEX idx_service service_name TYPE bloom_filter GRANULARITY 4,
    INDEX idx_operation operation_name TYPE bloom_filter GRANULARITY 4,
    INDEX idx_status status TYPE set(10) GRANULARITY 4,
    INDEX idx_duration duration_ms TYPE minmax GRANULARITY 4
) ENGINE = MergeTree()
PARTITION BY (toYYYYMMDD(start_time), team_id)
ORDER BY (team_id, trace_id, start_time, span_id)
TTL start_time + INTERVAL 7 DAY
SETTINGS index_granularity = 8192;

-- =============================================================================
-- LOGS TABLE - Log entries with full-text search
-- =============================================================================
CREATE TABLE IF NOT EXISTS observex.logs (
    team_id UUID,
    timestamp DateTime64(3),
    level LowCardinality(String),
    service_name LowCardinality(String),
    logger LowCardinality(String),
    message String,
    trace_id String,
    span_id String,
    host LowCardinality(String),
    pod LowCardinality(String),
    container LowCardinality(String),
    thread LowCardinality(String),
    exception String,
    attributes Map(String, String),

    INDEX idx_level level TYPE set(5) GRANULARITY 4,
    INDEX idx_service service_name TYPE bloom_filter GRANULARITY 4,
    INDEX idx_trace trace_id TYPE bloom_filter GRANULARITY 4,
    INDEX idx_message message TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 4
) ENGINE = MergeTree()
PARTITION BY (toYYYYMMDD(timestamp), team_id)
ORDER BY (team_id, timestamp, service_name)
TTL timestamp + INTERVAL 14 DAY
SETTINGS index_granularity = 8192;

-- =============================================================================
-- INCIDENTS TABLE - Alert incidents
-- =============================================================================
CREATE TABLE IF NOT EXISTS observex.incidents (
    team_id UUID,
    incident_id UUID,
    alert_policy_id UUID,
    title String,
    description String,
    severity LowCardinality(String),
    priority LowCardinality(String),
    status LowCardinality(String),
    source LowCardinality(String),
    service_name LowCardinality(String),
    created_at DateTime64(3),
    updated_at DateTime64(3),
    resolved_at Nullable(DateTime64(3)),
    acknowledged_at Nullable(DateTime64(3)),
    acknowledged_by Nullable(String),
    attributes Map(String, String),

    INDEX idx_status status TYPE set(10) GRANULARITY 4,
    INDEX idx_severity severity TYPE set(5) GRANULARITY 4,
    INDEX idx_service service_name TYPE bloom_filter GRANULARITY 4
) ENGINE = MergeTree()
PARTITION BY (toYYYYMM(created_at), team_id)
ORDER BY (team_id, created_at, incident_id)
TTL created_at + INTERVAL 90 DAY
SETTINGS index_granularity = 8192;

