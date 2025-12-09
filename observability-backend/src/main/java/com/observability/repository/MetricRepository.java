package com.observability.repository;

import com.observability.entity.MetricEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface MetricRepository extends JpaRepository<MetricEntity, Long> {

    List<MetricEntity> findByTimestampBetweenOrderByTimestampDesc(Instant start, Instant end);

    List<MetricEntity> findByServiceNameAndTimestampBetweenOrderByTimestampDesc(
            String serviceName, Instant start, Instant end);

    List<MetricEntity> findByMetricNameAndTimestampBetweenOrderByTimestampDesc(
            String metricName, Instant start, Instant end);

    @Query("SELECT m FROM MetricEntity m WHERE " +
           "(:serviceName IS NULL OR m.serviceName = :serviceName) AND " +
           "(:metricName IS NULL OR m.metricName = :metricName) AND " +
           "m.timestamp BETWEEN :start AND :end " +
           "ORDER BY m.timestamp DESC")
    List<MetricEntity> findByFilters(
            @Param("serviceName") String serviceName,
            @Param("metricName") String metricName,
            @Param("start") Instant start,
            @Param("end") Instant end,
            Pageable pageable);

    @Query("SELECT DISTINCT m.serviceName FROM MetricEntity m")
    List<String> findDistinctServiceNames();

    @Query("SELECT DISTINCT m.metricName FROM MetricEntity m")
    List<String> findDistinctMetricNames();

    @Query("SELECT DISTINCT m.endpoint FROM MetricEntity m WHERE m.endpoint IS NOT NULL")
    List<String> findDistinctEndpoints();

    @Query("SELECT AVG(m.value) FROM MetricEntity m WHERE " +
           "m.metricName = :metricName AND " +
           "m.serviceName = :serviceName AND " +
           "m.timestamp BETWEEN :start AND :end")
    Double findAverageValue(
            @Param("metricName") String metricName,
            @Param("serviceName") String serviceName,
            @Param("start") Instant start,
            @Param("end") Instant end);

    @Query("SELECT m FROM MetricEntity m WHERE " +
           "m.metricName = :metricName AND " +
           "m.timestamp BETWEEN :start AND :end " +
           "ORDER BY m.value DESC")
    List<MetricEntity> findTopByMetricName(
            @Param("metricName") String metricName,
            @Param("start") Instant start,
            @Param("end") Instant end,
            Pageable pageable);

    void deleteByTimestampBefore(Instant timestamp);
}

