package com.observability.repository;

import com.observability.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<UserEntity, Long> {
    
    Optional<UserEntity> findByEmail(String email);
    
    Optional<UserEntity> findByEmailAndActiveTrue(String email);
    
    List<UserEntity> findByOrganizationIdAndActiveTrue(Long organizationId);
    
    List<UserEntity> findByOrganizationId(Long organizationId);
    
    boolean existsByEmail(String email);
}

