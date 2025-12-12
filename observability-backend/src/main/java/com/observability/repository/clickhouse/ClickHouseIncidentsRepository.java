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
 * ClickHouse repository for incidents/alerts data.
 */
@Repository
@Slf4j
@RequiredArgsConstructor
public class ClickHouseIncidentsRepository {

    @Qualifier("clickHouseJdbcTemplate")
    private final JdbcTemplate jdbcTemplate;

    /**
     * Query incidents with filters
     */
    public List<Map<String, Object>> getIncidents(UUID teamId, Instant startTime, Instant endTime,
            List<String> statuses, List<String> severities, List<String> services,
            int limit, int offset) {
        
        StringBuilder sql = new StringBuilder("""
            SELECT 
                incident_id,
                alert_policy_id,
                title,
                description,
                severity,
                priority,
                status,
                source,
                service_name,
                created_at,
                updated_at,
                resolved_at,
                acknowledged_at,
                acknowledged_by,
                pod,
                container
            FROM observex.incidents
            WHERE team_id = ?
                AND created_at >= ?
                AND created_at <= ?
            """);
        
        List<Object> params = new ArrayList<>();
        params.add(teamId.toString());
        params.add(LocalDateTime.ofInstant(startTime, ZoneOffset.UTC));
        params.add(LocalDateTime.ofInstant(endTime, ZoneOffset.UTC));
        
        if (statuses != null && !statuses.isEmpty()) {
            sql.append(" AND status IN (");
            sql.append(String.join(",", Collections.nCopies(statuses.size(), "?")));
            sql.append(")");
            params.addAll(statuses);
        }
        
        if (severities != null && !severities.isEmpty()) {
            sql.append(" AND severity IN (");
            sql.append(String.join(",", Collections.nCopies(severities.size(), "?")));
            sql.append(")");
            params.addAll(severities);
        }
        
        if (services != null && !services.isEmpty()) {
            sql.append(" AND service_name IN (");
            sql.append(String.join(",", Collections.nCopies(services.size(), "?")));
            sql.append(")");
            params.addAll(services);
        }
        
        sql.append(" ORDER BY created_at DESC LIMIT ? OFFSET ?");
        params.add(limit);
        params.add(offset);
        
        return jdbcTemplate.queryForList(sql.toString(), params.toArray());
    }

    /**
     * Get incident counts by status
     */
    public Map<String, Long> getIncidentCountsByStatus(UUID teamId, Instant startTime, Instant endTime) {
        String sql = """
            SELECT status, count() as count
            FROM observex.incidents
            WHERE team_id = ?
                AND created_at >= ?
                AND created_at <= ?
            GROUP BY status
            """;
        
        List<Map<String, Object>> results = jdbcTemplate.queryForList(sql,
            teamId.toString(),
            LocalDateTime.ofInstant(startTime, ZoneOffset.UTC),
            LocalDateTime.ofInstant(endTime, ZoneOffset.UTC));
        
        Map<String, Long> counts = new HashMap<>();
        for (Map<String, Object> row : results) {
            counts.put((String) row.get("status"), ((Number) row.get("count")).longValue());
        }
        return counts;
    }

    /**
     * Get incident counts by severity
     */
    public Map<String, Long> getIncidentCountsBySeverity(UUID teamId, Instant startTime, Instant endTime) {
        String sql = """
            SELECT severity, count() as count
            FROM observex.incidents
            WHERE team_id = ?
                AND created_at >= ?
                AND created_at <= ?
            GROUP BY severity
            """;
        
        List<Map<String, Object>> results = jdbcTemplate.queryForList(sql,
            teamId.toString(),
            LocalDateTime.ofInstant(startTime, ZoneOffset.UTC),
            LocalDateTime.ofInstant(endTime, ZoneOffset.UTC));
        
        Map<String, Long> counts = new HashMap<>();
        for (Map<String, Object> row : results) {
            counts.put((String) row.get("severity"), ((Number) row.get("count")).longValue());
        }
        return counts;
    }

    /**
     * Batch insert incidents
     */
    public void batchInsert(List<Map<String, Object>> incidents) {
        String sql = """
            INSERT INTO observex.incidents 
            (team_id, incident_id, alert_policy_id, title, description, severity, priority,
             status, source, service_name, created_at, updated_at, resolved_at,
             acknowledged_at, acknowledged_by, pod, container, attributes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """;
        
        List<Object[]> batchArgs = incidents.stream()
            .map(i -> new Object[]{
                i.get("team_id"), i.get("incident_id"), i.get("alert_policy_id"),
                i.get("title"), i.get("description"), i.get("severity"),
                i.get("priority"), i.get("status"), i.get("source"),
                i.get("service_name"), i.get("created_at"), i.get("updated_at"),
                i.get("resolved_at"), i.get("acknowledged_at"), i.get("acknowledged_by"),
                i.get("pod"), i.get("container"), i.get("attributes")
            })
            .toList();
        
        jdbcTemplate.batchUpdate(sql, batchArgs);
        log.debug("Inserted {} incidents into ClickHouse", incidents.size());
    }
}

