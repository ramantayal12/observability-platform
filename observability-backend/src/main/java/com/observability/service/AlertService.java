package com.observability.service;

import com.observability.dto.request.AlertRequest;
import com.observability.dto.response.AlertResponse;
import com.observability.entity.AlertEntity;
import com.observability.repository.AlertRepository;
import com.observability.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AlertService {
    
    private final AlertRepository alertRepository;
    
    public List<AlertResponse> findByTeam(Long teamId) {
        return alertRepository.findByTeamIdOrderByCreatedAtDesc(teamId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
    
    public List<AlertResponse> findByTeamAndStatus(Long teamId, String status) {
        return alertRepository.findByTeamIdAndStatusOrderByCreatedAtDesc(teamId, status).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }
    
    public Page<AlertResponse> findByTeamPaged(Long teamId, Pageable pageable) {
        return alertRepository.findByTeamId(teamId, pageable).map(this::toResponse);
    }
    
    public AlertResponse findById(Long id) {
        return alertRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Alert", "id", id));
    }
    
    @Transactional
    public AlertResponse create(Long organizationId, Long teamId, AlertRequest request) {
        AlertEntity entity = AlertEntity.builder()
                .organizationId(organizationId)
                .teamId(teamId)
                .name(request.getName())
                .description(request.getDescription())
                .type(request.getType())
                .severity(request.getSeverity())
                .serviceName(request.getServiceName())
                .condition(request.getCondition())
                .metric(request.getMetric())
                .operator(request.getOperator())
                .threshold(request.getThreshold())
                .durationMinutes(request.getDurationMinutes())
                .status("active")
                .build();
        return toResponse(alertRepository.save(entity));
    }
    
    @Transactional
    public AlertResponse acknowledge(Long id, String acknowledgedBy) {
        AlertEntity entity = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert", "id", id));
        entity.setStatus("acknowledged");
        entity.setAcknowledgedAt(LocalDateTime.now());
        entity.setAcknowledgedBy(acknowledgedBy);
        return toResponse(alertRepository.save(entity));
    }
    
    @Transactional
    public AlertResponse resolve(Long id, String resolvedBy) {
        AlertEntity entity = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert", "id", id));
        entity.setStatus("resolved");
        entity.setResolvedAt(LocalDateTime.now());
        entity.setResolvedBy(resolvedBy);
        return toResponse(alertRepository.save(entity));
    }
    
    @Transactional
    public AlertResponse mute(Long id, int minutes) {
        AlertEntity entity = alertRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Alert", "id", id));
        entity.setStatus("muted");
        entity.setMutedUntil(LocalDateTime.now().plusMinutes(minutes));
        return toResponse(alertRepository.save(entity));
    }
    
    public long countActiveByTeam(Long teamId) {
        return alertRepository.countByTeamIdAndStatus(teamId, "active");
    }
    
    private AlertResponse toResponse(AlertEntity entity) {
        return AlertResponse.builder()
                .id(entity.getId())
                .organizationId(entity.getOrganizationId())
                .teamId(entity.getTeamId())
                .name(entity.getName())
                .description(entity.getDescription())
                .type(entity.getType())
                .severity(entity.getSeverity())
                .status(entity.getStatus())
                .serviceName(entity.getServiceName())
                .condition(entity.getCondition())
                .metric(entity.getMetric())
                .operator(entity.getOperator())
                .threshold(entity.getThreshold())
                .durationMinutes(entity.getDurationMinutes())
                .currentValue(entity.getCurrentValue())
                .triggeredBy(entity.getTriggeredBy())
                .triggeredAt(entity.getTriggeredAt())
                .acknowledgedAt(entity.getAcknowledgedAt())
                .acknowledgedBy(entity.getAcknowledgedBy())
                .resolvedAt(entity.getResolvedAt())
                .resolvedBy(entity.getResolvedBy())
                .mutedUntil(entity.getMutedUntil())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}

