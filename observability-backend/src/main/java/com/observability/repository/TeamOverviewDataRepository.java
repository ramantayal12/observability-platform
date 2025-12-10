package com.observability.repository;

import com.observability.entity.TeamOverviewDataEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TeamOverviewDataRepository extends JpaRepository<TeamOverviewDataEntity, Long> {
    
    /**
     * Find latest overview data for a team
     */
    Optional<TeamOverviewDataEntity> findTopByTeamIdOrderByTimestampDesc(Long teamId);
    
    /**
     * Find overview data for a team within a time range
     */
    List<TeamOverviewDataEntity> findByTeamIdAndTimestampBetweenOrderByTimestampAsc(
            Long teamId, LocalDateTime startTime, LocalDateTime endTime);
    
    /**
     * Find all data points for a team ordered by timestamp
     */
    List<TeamOverviewDataEntity> findByTeamIdOrderByTimestampDesc(Long teamId);
    
    /**
     * Delete old data for cleanup
     */
    void deleteByTimestampBefore(LocalDateTime cutoff);
    
    /**
     * Get aggregated stats for a team within a time range
     */
    @Query("SELECT AVG(t.avgLatency), AVG(t.throughput), AVG(t.errorRate), MAX(t.activeServices) " +
           "FROM TeamOverviewDataEntity t WHERE t.teamId = :teamId " +
           "AND t.timestamp BETWEEN :startTime AND :endTime")
    Object[] getAggregatedStats(@Param("teamId") Long teamId, 
                                @Param("startTime") LocalDateTime startTime, 
                                @Param("endTime") LocalDateTime endTime);
    
    /**
     * Check if team has any data
     */
    boolean existsByTeamId(Long teamId);
}

