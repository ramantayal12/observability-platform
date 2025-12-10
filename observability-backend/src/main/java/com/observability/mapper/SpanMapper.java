package com.observability.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.observability.dto.request.SpanRequest;
import com.observability.dto.response.SpanResponse;
import com.observability.entity.SpanEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;

/**
 * Mapper for SpanEntity conversions.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SpanMapper implements EntityMapper<SpanEntity, SpanResponse, SpanRequest> {

    private final ObjectMapper objectMapper;

    @Override
    public SpanResponse toDto(SpanEntity entity) {
        if (entity == null) return null;
        
        Map<String, String> attributes = null;
        if (entity.getAttributes() != null) {
            try {
                attributes = objectMapper.readValue(entity.getAttributes(), Map.class);
            } catch (JsonProcessingException e) {
                log.warn("Failed to deserialize span attributes", e);
            }
        }
        
        return SpanResponse.builder()
                .id(entity.getId())
                .spanId(entity.getSpanId())
                .traceId(entity.getTraceId())
                .parentSpanId(entity.getParentSpanId())
                .operationName(entity.getOperationName())
                .startTime(entity.getStartTime().toEpochMilli())
                .endTime(entity.getEndTime().toEpochMilli())
                .duration(entity.getDuration())
                .serviceName(entity.getServiceName())
                .status(entity.getStatus())
                .kind(entity.getKind())
                .pod(entity.getPod())
                .container(entity.getContainer())
                .node(entity.getNode())
                .attributes(attributes)
                .build();
    }

    @Override
    public SpanEntity toEntity(SpanRequest request) {
        if (request == null) return null;
        
        String attributesJson = null;
        if (request.getAttributes() != null) {
            try {
                attributesJson = objectMapper.writeValueAsString(request.getAttributes());
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize span attributes", e);
            }
        }
        
        long startTime = request.getStartTime() != null 
                ? request.getStartTime() 
                : System.currentTimeMillis();
        long endTime = request.getEndTime() != null 
                ? request.getEndTime() 
                : System.currentTimeMillis();
        long duration = request.getDuration() != null 
                ? request.getDuration() 
                : endTime - startTime;
        
        return SpanEntity.builder()
                .spanId(request.getSpanId())
                .traceId(request.getTraceId())
                .parentSpanId(request.getParentSpanId())
                .operationName(request.getOperationName())
                .startTime(Instant.ofEpochMilli(startTime))
                .endTime(Instant.ofEpochMilli(endTime))
                .duration(duration)
                .serviceName(request.getServiceName())
                .status(request.getStatus() != null ? request.getStatus() : "OK")
                .kind(request.getKind())
                .pod(request.getPod())
                .container(request.getContainer())
                .node(request.getNode())
                .attributes(attributesJson)
                .build();
    }
}

