package com.observability.repository;

import com.observability.entity.OrganizationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OrganizationRepository extends JpaRepository<OrganizationEntity, Long> {
    
    Optional<OrganizationEntity> findBySlug(String slug);
    
    Optional<OrganizationEntity> findByName(String name);
    
    boolean existsBySlug(String slug);
    
    boolean existsByName(String name);
}

