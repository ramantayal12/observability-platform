package com.observability.repository;

import com.observability.entity.ApiEndpointEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for API endpoint configurations.
 */
@Repository
public interface ApiEndpointRepository extends JpaRepository<ApiEndpointEntity, Long> {

    /**
     * Find all enabled endpoints for a team
     */
    List<ApiEndpointEntity> findByTeamIdAndEnabledTrue(Long teamId);

    /**
     * Find all endpoints for a team
     */
    List<ApiEndpointEntity> findByTeamId(Long teamId);

    /**
     * Count endpoints for a team
     */
    long countByTeamId(Long teamId);
}

