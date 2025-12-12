package com.observability.repository.clickhouse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.*;

/**
 * ClickHouse repository for spans (unified traces + spans + metrics).
 * Metrics are derived from span data using materialized views.
 */
@Repository
@Slf4j
@RequiredArgsConstructor
public class ClickHouseSpansRepository {

    @Qualifier("clickHouseJdbcTemplate")
    private final JdbcTemplate jdbcTemplate;

    /**
     * Get traces (root spans) with filters
     */
    public List<Map<String, Object>> getTraces(UUID teamId, Instant start, Instant end,
            List<String> services, String status, Long minDuration, Long maxDuration,
            int limit, int offset) {
        
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT trace_id, service_name, operation_name, start_time, end_time, ");
        sql.append("duration_ms, status, http_method, http_status_code ");
        sql.append("FROM spans WHERE team_id = ? AND is_root = 1 ");
        sql.append("AND start_time >= ? AND start_time <= ? ");
        
        List<Object> params = new ArrayList<>();
        params.add(teamId.toString());
        params.add(start);
        params.add(end);
        
        if (services != null && !services.isEmpty()) {
            sql.append("AND service_name IN (").append(String.join(",", 
                Collections.nCopies(services.size(), "?"))).append(") ");
            params.addAll(services);
        }
        if (status != null) {
            sql.append("AND status = ? ");
            params.add(status);
        }
        if (minDuration != null) {
            sql.append("AND duration_ms >= ? ");
            params.add(minDuration);
        }
        if (maxDuration != null) {
            sql.append("AND duration_ms <= ? ");
            params.add(maxDuration);
        }
        
        sql.append("ORDER BY start_time DESC LIMIT ? OFFSET ?");
        params.add(limit);
        params.add(offset);
        
        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
    }

    /**
     * Get all spans for a specific trace (waterfall view)
     */
    public List<Map<String, Object>> getSpansByTraceId(UUID teamId, String traceId) {
        String sql = "SELECT span_id, parent_span_id, operation_name, service_name, " +
                "span_kind, start_time, end_time, duration_ms, status, status_message, " +
                "http_method, http_url, http_status_code, host, pod, attributes " +
                "FROM spans WHERE team_id = ? AND trace_id = ? " +
                "ORDER BY start_time ASC";
        
        return jdbcTemplate.queryForList(sql, teamId.toString(), traceId);
    }

    /**
     * Get trace summary statistics
     */
    public Map<String, Object> getTraceSummary(UUID teamId, Instant start, Instant end) {
        String sql = "SELECT count() as total_traces, " +
                "countIf(status = 'ERROR') as error_traces, " +
                "avg(duration_ms) as avg_duration, " +
                "quantile(0.50)(duration_ms) as p50_duration, " +
                "quantile(0.95)(duration_ms) as p95_duration, " +
                "quantile(0.99)(duration_ms) as p99_duration " +
                "FROM spans WHERE team_id = ? AND is_root = 1 " +
                "AND start_time >= ? AND start_time <= ?";
        
        return jdbcTemplate.queryForMap(sql, teamId.toString(), start, end);
    }

    /**
     * Get service metrics (derived from spans)
     */
    public List<Map<String, Object>> getServiceMetrics(UUID teamId, Instant start, Instant end) {
        String sql = "SELECT service_name, " +
                "count() as request_count, " +
                "countIf(status = 'ERROR') as error_count, " +
                "avg(duration_ms) as avg_latency, " +
                "quantile(0.50)(duration_ms) as p50_latency, " +
                "quantile(0.95)(duration_ms) as p95_latency, " +
                "quantile(0.99)(duration_ms) as p99_latency " +
                "FROM spans WHERE team_id = ? AND is_root = 1 " +
                "AND start_time >= ? AND start_time <= ? " +
                "GROUP BY service_name ORDER BY request_count DESC";
        
        return jdbcTemplate.queryForList(sql, teamId.toString(), start, end);
    }

    /**
     * Get endpoint metrics (derived from spans)
     */
    public List<Map<String, Object>> getEndpointMetrics(UUID teamId, Instant start, Instant end,
            String serviceName) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT service_name, operation_name, http_method, ");
        sql.append("count() as request_count, ");
        sql.append("countIf(status = 'ERROR') as error_count, ");
        sql.append("avg(duration_ms) as avg_latency, ");
        sql.append("quantile(0.50)(duration_ms) as p50_latency, ");
        sql.append("quantile(0.95)(duration_ms) as p95_latency, ");
        sql.append("quantile(0.99)(duration_ms) as p99_latency ");
        sql.append("FROM spans WHERE team_id = ? AND span_kind = 'SERVER' ");
        sql.append("AND start_time >= ? AND start_time <= ? ");
        
        List<Object> params = new ArrayList<>();
        params.add(teamId.toString());
        params.add(start);
        params.add(end);
        
        if (serviceName != null) {
            sql.append("AND service_name = ? ");
            params.add(serviceName);
        }
        
        sql.append("GROUP BY service_name, operation_name, http_method ");
        sql.append("ORDER BY request_count DESC LIMIT 100");
        
        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
    }

    /**
     * Get time-series metrics for a service
     */
    public List<Map<String, Object>> getMetricsTimeSeries(UUID teamId, Instant start, Instant end,
            String serviceName, String interval) {
        String intervalFunc = switch (interval) {
            case "5m" -> "toStartOfFiveMinutes";
            case "1h" -> "toStartOfHour";
            case "1d" -> "toStartOfDay";
            default -> "toStartOfMinute";
        };
        
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT ").append(intervalFunc).append("(start_time) as timestamp, ");
        sql.append("count() as request_count, ");
        sql.append("countIf(status = 'ERROR') as error_count, ");
        sql.append("avg(duration_ms) as avg_latency ");
        sql.append("FROM spans WHERE team_id = ? AND is_root = 1 ");
        sql.append("AND start_time >= ? AND start_time <= ? ");
        
        List<Object> params = new ArrayList<>();
        params.add(teamId.toString());
        params.add(start);
        params.add(end);
        
        if (serviceName != null) {
            sql.append("AND service_name = ? ");
            params.add(serviceName);
        }
        
        sql.append("GROUP BY timestamp ORDER BY timestamp ASC");
        
        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
    }

    /**
     * Get service dependencies from span parent-child relationships
     */
    public List<Map<String, Object>> getServiceDependencies(UUID teamId, Instant start, Instant end) {
        String sql = "SELECT parent.service_name as source, child.service_name as target, " +
                "count() as call_count " +
                "FROM spans child " +
                "INNER JOIN spans parent ON child.parent_span_id = parent.span_id " +
                "AND child.team_id = parent.team_id AND child.trace_id = parent.trace_id " +
                "WHERE child.team_id = ? AND child.start_time >= ? AND child.start_time <= ? " +
                "AND parent.service_name != child.service_name " +
                "GROUP BY source, target ORDER BY call_count DESC LIMIT 100";
        
        return jdbcTemplate.queryForList(sql, teamId.toString(), start, end);
    }
}

