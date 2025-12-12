-- Materialized Views for Pre-Aggregated Data
-- Metrics are derived from spans (no separate metrics table needed)

-- =============================================================================
-- SERVICE METRICS - Per minute (derived from spans)
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS observex.service_metrics_1m
ENGINE = SummingMergeTree()
PARTITION BY (toYYYYMMDD(timestamp_minute), team_id)
ORDER BY (team_id, service_name, timestamp_minute)
TTL timestamp_minute + INTERVAL 7 DAY
AS SELECT
    team_id,
    toStartOfMinute(start_time) AS timestamp_minute,
    service_name,
    count() AS request_count,
    countIf(status = 'ERROR') AS error_count,
    avg(duration_ms) AS avg_latency,
    quantile(0.50)(duration_ms) AS p50_latency,
    quantile(0.90)(duration_ms) AS p90_latency,
    quantile(0.95)(duration_ms) AS p95_latency,
    quantile(0.99)(duration_ms) AS p99_latency,
    max(duration_ms) AS max_latency
FROM observex.spans
WHERE is_root = 1
GROUP BY team_id, timestamp_minute, service_name;

-- =============================================================================
-- ENDPOINT METRICS - Per minute (derived from spans)
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS observex.endpoint_metrics_1m
ENGINE = SummingMergeTree()
PARTITION BY (toYYYYMMDD(timestamp_minute), team_id)
ORDER BY (team_id, service_name, operation_name, http_method, timestamp_minute)
TTL timestamp_minute + INTERVAL 7 DAY
AS SELECT
    team_id,
    toStartOfMinute(start_time) AS timestamp_minute,
    service_name,
    operation_name,
    http_method,
    count() AS request_count,
    countIf(status = 'ERROR') AS error_count,
    avg(duration_ms) AS avg_latency,
    quantile(0.50)(duration_ms) AS p50_latency,
    quantile(0.95)(duration_ms) AS p95_latency,
    quantile(0.99)(duration_ms) AS p99_latency
FROM observex.spans
WHERE span_kind = 'SERVER'
GROUP BY team_id, timestamp_minute, service_name, operation_name, http_method;

-- =============================================================================
-- LOG COUNTS - Per minute
-- =============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS observex.log_counts_1m
ENGINE = SummingMergeTree()
PARTITION BY (toYYYYMMDD(timestamp_minute), team_id)
ORDER BY (team_id, service_name, level, timestamp_minute)
TTL timestamp_minute + INTERVAL 7 DAY
AS SELECT
    team_id,
    toStartOfMinute(timestamp) AS timestamp_minute,
    service_name,
    level,
    count() AS log_count
FROM observex.logs
GROUP BY team_id, timestamp_minute, service_name, level;

