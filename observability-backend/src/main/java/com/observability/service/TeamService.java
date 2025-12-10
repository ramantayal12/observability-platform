package com.observability.service;

import com.observability.dto.response.TeamResponse;
import com.observability.entity.TeamEntity;
import com.observability.repository.TeamRepository;
import com.observability.repository.UserTeamRepository;
import com.observability.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamService {
    
    private final TeamRepository teamRepository;
    private final UserTeamRepository userTeamRepository;
    
    public List<TeamResponse> findByOrganization(Long organizationId) {
        return teamRepository.findByOrganizationIdAndActiveTrue(organizationId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
    
    public List<TeamResponse> findByUser(Long userId) {
        List<Long> teamIds = userTeamRepository.findTeamIdsByUserId(userId);
        return teamRepository.findActiveByIds(teamIds).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
    
    public TeamResponse findById(Long id) {
        return teamRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Team", "id", id));
    }
    
    public TeamResponse findBySlug(Long organizationId, String slug) {
        return teamRepository.findByOrganizationIdAndSlug(organizationId, slug)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Team", "slug", slug));
    }
    
    @Transactional
    public TeamResponse create(Long organizationId, String name, String slug, String description, String color) {
        TeamEntity entity = TeamEntity.builder()
                .organizationId(organizationId)
                .name(name)
                .slug(slug != null ? slug : name.toLowerCase().replaceAll("\\s+", "-"))
                .description(description)
                .color(color != null ? color : "#3B82F6")
                .build();
        return toResponse(teamRepository.save(entity));
    }
    
    public boolean userHasAccessToTeam(Long userId, Long teamId) {
        return userTeamRepository.existsByUserIdAndTeamId(userId, teamId);
    }
    
    private TeamResponse toResponse(TeamEntity entity) {
        return TeamResponse.builder()
                .id(entity.getId())
                .organizationId(entity.getOrganizationId())
                .name(entity.getName())
                .slug(entity.getSlug())
                .description(entity.getDescription())
                .active(entity.getActive())
                .color(entity.getColor())
                .icon(entity.getIcon())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}

