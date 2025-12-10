package com.observability.service;

import com.observability.dto.response.OrganizationResponse;
import com.observability.entity.OrganizationEntity;
import com.observability.repository.OrganizationRepository;
import com.observability.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OrganizationService {
    
    private final OrganizationRepository organizationRepository;
    
    public List<OrganizationResponse> findAll() {
        return organizationRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
    
    public OrganizationResponse findById(Long id) {
        return organizationRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Organization", "id", id));
    }
    
    public OrganizationResponse findBySlug(String slug) {
        return organizationRepository.findBySlug(slug)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Organization", "slug", slug));
    }
    
    @Transactional
    public OrganizationResponse create(String name, String slug, String description, String plan) {
        OrganizationEntity entity = OrganizationEntity.builder()
                .name(name)
                .slug(slug != null ? slug : name.toLowerCase().replaceAll("\\s+", "-"))
                .description(description)
                .plan(plan != null ? plan : "free")
                .maxTeams(plan != null && plan.equals("enterprise") ? 100 : 10)
                .maxUsersPerTeam(plan != null && plan.equals("enterprise") ? 500 : 50)
                .build();
        return toResponse(organizationRepository.save(entity));
    }
    
    private OrganizationResponse toResponse(OrganizationEntity entity) {
        return OrganizationResponse.builder()
                .id(entity.getId())
                .name(entity.getName())
                .slug(entity.getSlug())
                .description(entity.getDescription())
                .active(entity.getActive())
                .plan(entity.getPlan())
                .maxTeams(entity.getMaxTeams())
                .maxUsersPerTeam(entity.getMaxUsersPerTeam())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}

