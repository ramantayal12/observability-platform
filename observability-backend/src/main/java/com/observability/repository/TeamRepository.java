package com.observability.repository;

import com.observability.entity.TeamEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TeamRepository extends JpaRepository<TeamEntity, Long> {
    
    List<TeamEntity> findByOrganizationIdAndActiveTrue(Long organizationId);
    
    List<TeamEntity> findByOrganizationId(Long organizationId);
    
    Optional<TeamEntity> findByOrganizationIdAndSlug(Long organizationId, String slug);
    
    Optional<TeamEntity> findByOrganizationIdAndName(Long organizationId, String name);
    
    boolean existsByOrganizationIdAndSlug(Long organizationId, String slug);
    
    @Query("SELECT t FROM TeamEntity t WHERE t.id IN :teamIds AND t.active = true")
    List<TeamEntity> findActiveByIds(List<Long> teamIds);
}

