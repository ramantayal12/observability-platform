package com.observability.service;

import com.observability.dto.request.LoginRequest;
import com.observability.dto.response.AuthResponse;
import com.observability.dto.response.ContextResponse;
import com.observability.entity.OrganizationEntity;
import com.observability.entity.TeamEntity;
import com.observability.entity.UserEntity;
import com.observability.entity.UserTeamEntity;
import com.observability.repository.OrganizationRepository;
import com.observability.repository.TeamRepository;
import com.observability.repository.UserRepository;
import com.observability.repository.UserTeamRepository;
import com.observability.common.exception.ValidationException;
import com.observability.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {
    
    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final TeamRepository teamRepository;
    private final UserTeamRepository userTeamRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    
    @Transactional
    public AuthResponse login(LoginRequest request) {
        UserEntity user = userRepository.findByEmailAndActiveTrue(request.getEmail())
                .orElseThrow(() -> new ValidationException("Invalid email or password"));
        
        // For demo purposes, accept any password if passwordHash is null
        // In production, always validate password
        if (user.getPasswordHash() != null && !passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new ValidationException("Invalid email or password");
        }
        
        // Update last login
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);
        
        // Generate JWT token
        String token = jwtTokenProvider.generateToken(user);
        
        // Build response
        return buildAuthResponse(user, token);
    }
    
    public ContextResponse getContext(Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new ValidationException("User not found"));
        
        return buildContextResponse(user);
    }
    
    public Optional<UserEntity> validateToken(String token) {
        if (!jwtTokenProvider.validateToken(token)) {
            return Optional.empty();
        }
        
        Long userId = jwtTokenProvider.getUserIdFromToken(token);
        return userRepository.findById(userId).filter(UserEntity::getActive);
    }
    
    private AuthResponse buildAuthResponse(UserEntity user, String token) {
        OrganizationEntity org = organizationRepository.findById(user.getOrganizationId())
                .orElse(null);
        
        List<AuthResponse.TeamInfo> teams = getTeamsForUser(user.getId());
        AuthResponse.TeamInfo currentTeam = teams.isEmpty() ? null : teams.get(0);
        
        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getExpirationMs())
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .name(user.getName())
                        .avatarUrl(user.getAvatarUrl())
                        .role(user.getRole())
                        .build())
                .organization(org != null ? AuthResponse.OrganizationInfo.builder()
                        .id(org.getId())
                        .name(org.getName())
                        .slug(org.getSlug())
                        .plan(org.getPlan())
                        .build() : null)
                .teams(teams)
                .currentTeam(currentTeam)
                .build();
    }
    
    private ContextResponse buildContextResponse(UserEntity user) {
        OrganizationEntity org = organizationRepository.findById(user.getOrganizationId())
                .orElse(null);
        
        List<ContextResponse.TeamInfo> teams = getContextTeamsForUser(user.getId());
        ContextResponse.TeamInfo currentTeam = teams.isEmpty() ? null : teams.get(0);
        
        return ContextResponse.builder()
                .user(ContextResponse.UserInfo.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .name(user.getName())
                        .avatarUrl(user.getAvatarUrl())
                        .role(user.getRole())
                        .build())
                .organization(org != null ? ContextResponse.OrganizationInfo.builder()
                        .id(org.getId())
                        .name(org.getName())
                        .slug(org.getSlug())
                        .plan(org.getPlan())
                        .build() : null)
                .teams(teams)
                .currentTeam(currentTeam)
                .build();
    }
    
    private List<AuthResponse.TeamInfo> getTeamsForUser(Long userId) {
        List<Long> teamIds = userTeamRepository.findTeamIdsByUserId(userId);
        return teamIds.stream()
                .map(teamId -> {
                    TeamEntity team = teamRepository.findById(teamId).orElse(null);
                    UserTeamEntity membership = userTeamRepository.findByUserIdAndTeamId(userId, teamId).orElse(null);
                    if (team == null) return null;
                    return AuthResponse.TeamInfo.builder()
                            .id(team.getId())
                            .name(team.getName())
                            .slug(team.getSlug())
                            .color(team.getColor())
                            .role(membership != null ? membership.getRole() : "member")
                            .build();
                })
                .filter(t -> t != null)
                .collect(Collectors.toList());
    }
    
    private List<ContextResponse.TeamInfo> getContextTeamsForUser(Long userId) {
        List<Long> teamIds = userTeamRepository.findTeamIdsByUserId(userId);
        return teamIds.stream()
                .map(teamId -> {
                    TeamEntity team = teamRepository.findById(teamId).orElse(null);
                    UserTeamEntity membership = userTeamRepository.findByUserIdAndTeamId(userId, teamId).orElse(null);
                    if (team == null) return null;
                    return ContextResponse.TeamInfo.builder()
                            .id(team.getId())
                            .name(team.getName())
                            .slug(team.getSlug())
                            .color(team.getColor())
                            .role(membership != null ? membership.getRole() : "member")
                            .build();
                })
                .filter(t -> t != null)
                .collect(Collectors.toList());
    }
}

