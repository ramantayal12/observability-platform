package com.observability.repository;

import com.observability.entity.UserTeamEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserTeamRepository extends JpaRepository<UserTeamEntity, Long> {
    
    List<UserTeamEntity> findByUserId(Long userId);
    
    List<UserTeamEntity> findByTeamId(Long teamId);
    
    Optional<UserTeamEntity> findByUserIdAndTeamId(Long userId, Long teamId);
    
    boolean existsByUserIdAndTeamId(Long userId, Long teamId);
    
    void deleteByUserIdAndTeamId(Long userId, Long teamId);
    
    @Query("SELECT ut.teamId FROM UserTeamEntity ut WHERE ut.userId = :userId")
    List<Long> findTeamIdsByUserId(Long userId);
    
    @Query("SELECT ut.userId FROM UserTeamEntity ut WHERE ut.teamId = :teamId")
    List<Long> findUserIdsByTeamId(Long teamId);
}

