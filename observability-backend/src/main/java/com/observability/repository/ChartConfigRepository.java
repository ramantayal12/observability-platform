package com.observability.repository;

import com.observability.entity.ChartConfigEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChartConfigRepository extends JpaRepository<ChartConfigEntity, Long> {
    
    /**
     * Find all enabled chart configs for a team and page, ordered by display order
     */
    List<ChartConfigEntity> findByTeamIdAndPageTypeAndEnabledTrueOrderByDisplayOrderAsc(Long teamId, String pageType);
    
    /**
     * Find all chart configs for a team and page (including disabled)
     */
    List<ChartConfigEntity> findByTeamIdAndPageTypeOrderByDisplayOrderAsc(Long teamId, String pageType);
    
    /**
     * Find all chart configs for a team
     */
    List<ChartConfigEntity> findByTeamIdOrderByPageTypeAscDisplayOrderAsc(Long teamId);
    
    /**
     * Check if a chart config exists for a team, page, and chart ID
     */
    boolean existsByTeamIdAndPageTypeAndChartId(Long teamId, String pageType, String chartId);
    
    /**
     * Delete all chart configs for a team
     */
    void deleteByTeamId(Long teamId);
    
    /**
     * Count chart configs for a team and page
     */
    long countByTeamIdAndPageType(Long teamId, String pageType);
}

