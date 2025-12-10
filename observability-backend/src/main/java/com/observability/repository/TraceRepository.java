package com.observability.repository;

import com.observability.entity.TraceEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface TraceRepository extends JpaRepository<TraceEntity, Long> {

    Optional<TraceEntity> findByTraceId(String traceId);

    List<TraceEntity> findByStartTimeBetweenOrderByStartTimeDesc(Instant start, Instant end);

    List<TraceEntity> findByServiceNameAndStartTimeBetweenOrderByStartTimeDesc(
            String serviceName, Instant start, Instant end);

    @Query("SELECT t FROM TraceEntity t WHERE " +
           "(:serviceName IS NULL OR t.serviceName = :serviceName) AND " +
           "(:status IS NULL OR t.status = :status) AND " +
           "(:minDuration IS NULL OR t.duration >= :minDuration) AND " +
           "(:maxDuration IS NULL OR t.duration <= :maxDuration) AND " +
           "t.startTime BETWEEN :start AND :end " +
           "ORDER BY t.startTime DESC")
    List<TraceEntity> findByFilters(
            @Param("serviceName") String serviceName,
            @Param("status") String status,
            @Param("minDuration") Long minDuration,
            @Param("maxDuration") Long maxDuration,
            @Param("start") Instant start,
            @Param("end") Instant end,
            Pageable pageable);

    @Query("SELECT DISTINCT t.serviceName FROM TraceEntity t")
    List<String> findDistinctServiceNames();

    @Query("SELECT DISTINCT t.status FROM TraceEntity t")
    List<String> findDistinctStatuses();

    @Query("SELECT t.status, COUNT(t) FROM TraceEntity t WHERE " +
           "t.startTime BETWEEN :start AND :end " +
           "GROUP BY t.status")
    List<Object[]> countByStatus(@Param("start") Instant start, @Param("end") Instant end);

    @Query("SELECT AVG(t.duration) FROM TraceEntity t WHERE " +
           "t.serviceName = :serviceName AND " +
           "t.startTime BETWEEN :start AND :end")
    Double findAverageDuration(
            @Param("serviceName") String serviceName,
            @Param("start") Instant start,
            @Param("end") Instant end);

    void deleteByStartTimeBefore(Instant timestamp);

    // Team-based queries
    @Query("SELECT t FROM TraceEntity t WHERE t.teamId = :teamId AND " +
           "t.startTime BETWEEN :start AND :end " +
           "ORDER BY t.startTime DESC")
    List<TraceEntity> findByTeamIdAndStartTimeBetween(
            @Param("teamId") Long teamId,
            @Param("start") Instant start,
            @Param("end") Instant end,
            Pageable pageable);

    @Query("SELECT t FROM TraceEntity t WHERE t.teamId = :teamId AND " +
           "(:serviceName IS NULL OR t.serviceName = :serviceName) AND " +
           "(:status IS NULL OR t.status = :status) AND " +
           "t.startTime BETWEEN :start AND :end " +
           "ORDER BY t.startTime DESC")
    List<TraceEntity> findByTeamIdAndFilters(
            @Param("teamId") Long teamId,
            @Param("serviceName") String serviceName,
            @Param("status") String status,
            @Param("start") Instant start,
            @Param("end") Instant end,
            Pageable pageable);
}

