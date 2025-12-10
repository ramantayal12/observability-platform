package com.observability.service;

import com.observability.dto.response.TeamResponse;
import com.observability.dto.response.UserResponse;
import com.observability.entity.UserEntity;
import com.observability.entity.UserTeamEntity;
import com.observability.repository.UserRepository;
import com.observability.repository.UserTeamRepository;
import com.observability.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {
    
    private final UserRepository userRepository;
    private final UserTeamRepository userTeamRepository;
    private final TeamService teamService;
    
    public UserResponse findById(Long id) {
        UserEntity user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", id));
        return toResponse(user);
    }
    
    public UserResponse findByEmail(String email) {
        UserEntity user = userRepository.findByEmailAndActiveTrue(email)
                .orElseThrow(() -> new ResourceNotFoundException("User", "email", email));
        return toResponse(user);
    }
    
    public List<UserResponse> findByOrganization(Long organizationId) {
        return userRepository.findByOrganizationIdAndActiveTrue(organizationId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public UserResponse create(Long organizationId, String email, String name, String role) {
        UserEntity entity = UserEntity.builder()
                .organizationId(organizationId)
                .email(email)
                .name(name)
                .role(role != null ? role : "member")
                .build();
        return toResponse(userRepository.save(entity));
    }
    
    @Transactional
    public void addToTeam(Long userId, Long teamId, String role) {
        if (!userTeamRepository.existsByUserIdAndTeamId(userId, teamId)) {
            UserTeamEntity membership = UserTeamEntity.builder()
                    .userId(userId)
                    .teamId(teamId)
                    .role(role != null ? role : "member")
                    .build();
            userTeamRepository.save(membership);
        }
    }
    
    @Transactional
    public void removeFromTeam(Long userId, Long teamId) {
        userTeamRepository.deleteByUserIdAndTeamId(userId, teamId);
    }
    
    @Transactional
    public void updateLastLogin(Long userId) {
        userRepository.findById(userId).ifPresent(user -> {
            user.setLastLoginAt(LocalDateTime.now());
            userRepository.save(user);
        });
    }
    
    private UserResponse toResponse(UserEntity entity) {
        List<Long> teamIds = userTeamRepository.findTeamIdsByUserId(entity.getId());
        List<UserResponse.TeamMembershipResponse> teams = teamIds.stream()
                .map(teamId -> {
                    TeamResponse team = teamService.findById(teamId);
                    UserTeamEntity membership = userTeamRepository.findByUserIdAndTeamId(entity.getId(), teamId).orElse(null);
                    return UserResponse.TeamMembershipResponse.builder()
                            .teamId(teamId)
                            .teamName(team.getName())
                            .teamSlug(team.getSlug())
                            .role(membership != null ? membership.getRole() : "member")
                            .build();
                })
                .collect(Collectors.toList());
        
        return UserResponse.builder()
                .id(entity.getId())
                .organizationId(entity.getOrganizationId())
                .email(entity.getEmail())
                .name(entity.getName())
                .avatarUrl(entity.getAvatarUrl())
                .role(entity.getRole())
                .active(entity.getActive())
                .lastLoginAt(entity.getLastLoginAt())
                .createdAt(entity.getCreatedAt())
                .teams(teams)
                .build();
    }
}

