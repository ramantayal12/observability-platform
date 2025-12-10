package com.observability.repository;

import com.observability.entity.LogEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface LogRepository extends JpaRepository<LogEntity, Long> {

    List<LogEntity> findByTimestampBetweenOrderByTimestampDesc(Instant start, Instant end);

    List<LogEntity> findByServiceNameAndTimestampBetweenOrderByTimestampDesc(
            String serviceName, Instant start, Instant end);

    List<LogEntity> findByLevelAndTimestampBetweenOrderByTimestampDesc(
            String level, Instant start, Instant end);

    List<LogEntity> findByTraceIdOrderByTimestampAsc(String traceId);

    @Query("SELECT l FROM LogEntity l WHERE " +
           "(:serviceName IS NULL OR l.serviceName = :serviceName) AND " +
           "(:level IS NULL OR l.level = :level) AND " +
           "(:pod IS NULL OR l.pod = :pod) AND " +
           "(:container IS NULL OR l.container = :container) AND " +
           "l.timestamp BETWEEN :start AND :end " +
           "ORDER BY l.timestamp DESC")
    List<LogEntity> findByFilters(
            @Param("serviceName") String serviceName,
            @Param("level") String level,
            @Param("pod") String pod,
            @Param("container") String container,
            @Param("start") Instant start,
            @Param("end") Instant end,
            Pageable pageable);

    @Query("SELECT l FROM LogEntity l WHERE " +
           "LOWER(l.message) LIKE LOWER(CONCAT('%', :query, '%')) AND " +
           "l.timestamp BETWEEN :start AND :end " +
           "ORDER BY l.timestamp DESC")
    List<LogEntity> searchByMessage(
            @Param("query") String query,
            @Param("start") Instant start,
            @Param("end") Instant end,
            Pageable pageable);

    @Query("SELECT DISTINCT l.serviceName FROM LogEntity l")
    List<String> findDistinctServiceNames();

    @Query("SELECT DISTINCT l.level FROM LogEntity l")
    List<String> findDistinctLevels();

    @Query("SELECT DISTINCT l.pod FROM LogEntity l WHERE l.pod IS NOT NULL")
    List<String> findDistinctPods();

    @Query("SELECT DISTINCT l.container FROM LogEntity l WHERE l.container IS NOT NULL")
    List<String> findDistinctContainers();

    @Query("SELECT l.level, COUNT(l) FROM LogEntity l WHERE " +
           "l.timestamp BETWEEN :start AND :end " +
           "GROUP BY l.level")
    List<Object[]> countByLevel(@Param("start") Instant start, @Param("end") Instant end);

    void deleteByTimestampBefore(Instant timestamp);

    // Team-based queries
    @Query("SELECT l FROM LogEntity l WHERE l.teamId = :teamId AND " +
           "l.timestamp BETWEEN :start AND :end " +
           "ORDER BY l.timestamp DESC")
    List<LogEntity> findByTeamIdAndTimestampBetween(
            @Param("teamId") Long teamId,
            @Param("start") Instant start,
            @Param("end") Instant end,
            Pageable pageable);

    @Query("SELECT l FROM LogEntity l WHERE l.teamId = :teamId AND " +
           "(:level IS NULL OR l.level = :level) AND " +
           "(:serviceName IS NULL OR l.serviceName = :serviceName) AND " +
           "l.timestamp BETWEEN :start AND :end " +
           "ORDER BY l.timestamp DESC")
    List<LogEntity> findByTeamIdAndFilters(
            @Param("teamId") Long teamId,
            @Param("level") String level,
            @Param("serviceName") String serviceName,
            @Param("start") Instant start,
            @Param("end") Instant end,
            Pageable pageable);
}

