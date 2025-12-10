package com.observability.repository;

import com.observability.entity.AlertEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AlertRepository extends JpaRepository<AlertEntity, Long> {
    
    List<AlertEntity> findByTeamIdOrderByCreatedAtDesc(Long teamId);
    
    List<AlertEntity> findByTeamIdAndStatusOrderByCreatedAtDesc(Long teamId, String status);
    
    Page<AlertEntity> findByTeamId(Long teamId, Pageable pageable);
    
    Page<AlertEntity> findByOrganizationId(Long organizationId, Pageable pageable);
    
    List<AlertEntity> findByTeamIdAndSeverity(Long teamId, String severity);
    
    List<AlertEntity> findByTeamIdAndServiceName(Long teamId, String serviceName);
    
    @Query("SELECT a FROM AlertEntity a WHERE a.teamId = :teamId AND a.status IN :statuses ORDER BY a.createdAt DESC")
    List<AlertEntity> findByTeamIdAndStatuses(Long teamId, List<String> statuses);
    
    @Query("SELECT a FROM AlertEntity a WHERE a.teamId = :teamId AND a.triggeredAt >= :since ORDER BY a.triggeredAt DESC")
    List<AlertEntity> findRecentByTeamId(Long teamId, LocalDateTime since);
    
    @Query("SELECT COUNT(a) FROM AlertEntity a WHERE a.teamId = :teamId AND a.status = :status")
    long countByTeamIdAndStatus(Long teamId, String status);
    
    @Query("SELECT a.severity, COUNT(a) FROM AlertEntity a WHERE a.teamId = :teamId AND a.status = 'active' GROUP BY a.severity")
    List<Object[]> countActiveBySeverity(Long teamId);
}

