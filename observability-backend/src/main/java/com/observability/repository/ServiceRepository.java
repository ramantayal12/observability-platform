package com.observability.repository;

import com.observability.entity.ServiceEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceRepository extends JpaRepository<ServiceEntity, Long> {

    Optional<ServiceEntity> findByName(String name);

    List<ServiceEntity> findByStatus(String status);

    List<ServiceEntity> findByLastSeenAfter(Instant timestamp);

    @Query("SELECT s FROM ServiceEntity s ORDER BY s.lastSeen DESC")
    List<ServiceEntity> findAllOrderByLastSeenDesc();

    @Query("SELECT COUNT(s) FROM ServiceEntity s WHERE s.status = :status")
    Long countByStatus(@Param("status") String status);

    @Query("SELECT s FROM ServiceEntity s WHERE " +
           "(:status IS NULL OR s.status = :status) AND " +
           "(:environment IS NULL OR s.environment = :environment) " +
           "ORDER BY s.lastSeen DESC")
    List<ServiceEntity> findByFilters(
            @Param("status") String status,
            @Param("environment") String environment);
}

