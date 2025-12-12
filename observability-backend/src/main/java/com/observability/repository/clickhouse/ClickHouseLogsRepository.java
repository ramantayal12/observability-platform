package com.observability.repository.clickhouse;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;

/**
 * ClickHouse repository for log data.
 * Optimized for full-text search and high-volume log storage.
 */
@Repository
@Slf4j
@RequiredArgsConstructor
public class ClickHouseLogsRepository {

    @Qualifier("clickHouseJdbcTemplate")
    private final JdbcTemplate jdbcTemplate;

    /**
     * Query logs with filters and pagination
     */
    public List<Map<String, Object>> getLogs(UUID teamId, Instant startTime, Instant endTime,
            List<String> levels, List<String> services, String searchQuery,
            int limit, int offset) {
        
        StringBuilder sql = new StringBuilder("""
            SELECT 
                timestamp,
                level,
                service_name,
                logger,
                message,
                trace_id,
                span_id,
                host,
                pod,
                container,
                thread,
                exception
            FROM observex.logs
            WHERE team_id = ?
                AND timestamp >= ?
                AND timestamp <= ?
            """);
        
        List<Object> params = new ArrayList<>();
        params.add(teamId.toString());
        params.add(LocalDateTime.ofInstant(startTime, ZoneOffset.UTC));
        params.add(LocalDateTime.ofInstant(endTime, ZoneOffset.UTC));
        
        if (levels != null && !levels.isEmpty()) {
            sql.append(" AND level IN (");
            sql.append(String.join(",", Collections.nCopies(levels.size(), "?")));
            sql.append(")");
            params.addAll(levels);
        }
        
        if (services != null && !services.isEmpty()) {
            sql.append(" AND service_name IN (");
            sql.append(String.join(",", Collections.nCopies(services.size(), "?")));
            sql.append(")");
            params.addAll(services);
        }
        
        if (searchQuery != null && !searchQuery.isBlank()) {
            sql.append(" AND message ILIKE ?");
            params.add("%" + searchQuery + "%");
        }
        
        sql.append(" ORDER BY timestamp DESC LIMIT ? OFFSET ?");
        params.add(limit);
        params.add(offset);
        
        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
    }

    /**
     * Get log facets (counts by level, service, etc.)
     */
    public Map<String, Object> getLogFacets(UUID teamId, Instant startTime, Instant endTime) {
        Map<String, Object> facets = new HashMap<>();
        
        // Level counts
        String levelSql = """
            SELECT level, count() as count
            FROM observex.logs
            WHERE team_id = ? AND timestamp >= ? AND timestamp <= ?
            GROUP BY level
            ORDER BY count DESC
            """;
        facets.put("levels", jdbcTemplate.queryForList(levelSql,
            teamId.toString(),
            LocalDateTime.ofInstant(startTime, ZoneOffset.UTC),
            LocalDateTime.ofInstant(endTime, ZoneOffset.UTC)));
        
        // Service counts
        String serviceSql = """
            SELECT service_name, count() as count
            FROM observex.logs
            WHERE team_id = ? AND timestamp >= ? AND timestamp <= ?
            GROUP BY service_name
            ORDER BY count DESC
            LIMIT 20
            """;
        facets.put("services", jdbcTemplate.queryForList(serviceSql,
            teamId.toString(),
            LocalDateTime.ofInstant(startTime, ZoneOffset.UTC),
            LocalDateTime.ofInstant(endTime, ZoneOffset.UTC)));
        
        return facets;
    }

    /**
     * Get log histogram (counts per time bucket)
     */
    public List<Map<String, Object>> getLogHistogram(UUID teamId, Instant startTime, 
            Instant endTime, String interval) {
        String intervalFunc = getIntervalFunction(interval);
        
        String sql = """
            SELECT 
                %s(timestamp) as time_bucket,
                level,
                count() as count
            FROM observex.logs
            WHERE team_id = ?
                AND timestamp >= ?
                AND timestamp <= ?
            GROUP BY time_bucket, level
            ORDER BY time_bucket ASC
            """.formatted(intervalFunc);
        
        return jdbcTemplate.queryForList(sql,
            teamId.toString(),
            LocalDateTime.ofInstant(startTime, ZoneOffset.UTC),
            LocalDateTime.ofInstant(endTime, ZoneOffset.UTC));
    }

    /**
     * Batch insert logs
     */
    public void batchInsert(List<Map<String, Object>> logs) {
        String sql = """
            INSERT INTO observex.logs 
            (team_id, timestamp, level, service_name, logger, message, trace_id, span_id,
             host, pod, container, thread, exception, attributes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;
        
        List<Object[]> batchArgs = logs.stream()
            .map(l -> new Object[]{
                l.get("team_id"), l.get("timestamp"), l.get("level"),
                l.get("service_name"), l.get("logger"), l.get("message"),
                l.get("trace_id"), l.get("span_id"), l.get("host"),
                l.get("pod"), l.get("container"), l.get("thread"),
                l.get("exception"), l.get("attributes")
            })
            .toList();
        
        jdbcTemplate.batchUpdate(sql, batchArgs);
        log.debug("Inserted {} logs into ClickHouse", logs.size());
    }

    private String getIntervalFunction(String interval) {
        return switch (interval.toLowerCase()) {
            case "1m", "minute" -> "toStartOfMinute";
            case "5m" -> "toStartOfFiveMinutes";
            case "1h", "hour" -> "toStartOfHour";
            default -> "toStartOfMinute";
        };
    }
}

