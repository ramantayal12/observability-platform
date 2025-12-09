package com.observability.repository;

import com.observability.entity.SpanEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface SpanRepository extends JpaRepository<SpanEntity, Long> {

    List<SpanEntity> findByTraceIdOrderByStartTimeAsc(String traceId);

    List<SpanEntity> findByServiceNameAndStartTimeBetweenOrderByStartTimeDesc(
            String serviceName, Instant start, Instant end);

    @Query("SELECT s FROM SpanEntity s WHERE " +
           "(:serviceName IS NULL OR s.serviceName = :serviceName) AND " +
           "(:operationName IS NULL OR s.operationName LIKE CONCAT('%', :operationName, '%')) AND " +
           "(:status IS NULL OR s.status = :status) AND " +
           "s.startTime BETWEEN :start AND :end " +
           "ORDER BY s.startTime DESC")
    List<SpanEntity> findByFilters(
            @Param("serviceName") String serviceName,
            @Param("operationName") String operationName,
            @Param("status") String status,
            @Param("start") Instant start,
            @Param("end") Instant end,
            Pageable pageable);

    @Query("SELECT DISTINCT s.serviceName FROM SpanEntity s")
    List<String> findDistinctServiceNames();

    @Query("SELECT DISTINCT s.operationName FROM SpanEntity s")
    List<String> findDistinctOperationNames();

    @Query("SELECT DISTINCT s.pod FROM SpanEntity s WHERE s.pod IS NOT NULL")
    List<String> findDistinctPods();

    @Query("SELECT DISTINCT s.container FROM SpanEntity s WHERE s.container IS NOT NULL")
    List<String> findDistinctContainers();

    @Query("SELECT AVG(s.duration) FROM SpanEntity s WHERE " +
           "s.operationName = :operationName AND " +
           "s.startTime BETWEEN :start AND :end")
    Double findAverageDurationByOperation(
            @Param("operationName") String operationName,
            @Param("start") Instant start,
            @Param("end") Instant end);

    void deleteByStartTimeBefore(Instant timestamp);
}

