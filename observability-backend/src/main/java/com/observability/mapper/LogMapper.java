package com.observability.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.observability.dto.request.LogRequest;
import com.observability.dto.response.LogResponse;
import com.observability.entity.LogEntity;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Map;

/**
 * Mapper for LogEntity conversions.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class LogMapper implements EntityMapper<LogEntity, LogResponse, LogRequest> {

    private final ObjectMapper objectMapper;

    @Override
    public LogResponse toDto(LogEntity entity) {
        if (entity == null) return null;
        
        Map<String, String> attributes = null;
        if (entity.getAttributes() != null) {
            try {
                attributes = objectMapper.readValue(entity.getAttributes(), Map.class);
            } catch (JsonProcessingException e) {
                log.warn("Failed to deserialize log attributes", e);
            }
        }
        
        return LogResponse.builder()
                .id(entity.getId())
                .serviceName(entity.getServiceName())
                .level(entity.getLevel())
                .message(entity.getMessage())
                .timestamp(entity.getTimestamp().toEpochMilli())
                .logger(entity.getLogger())
                .traceId(entity.getTraceId())
                .spanId(entity.getSpanId())
                .pod(entity.getPod())
                .container(entity.getContainer())
                .node(entity.getNode())
                .attributes(attributes)
                .build();
    }

    @Override
    public LogEntity toEntity(LogRequest request) {
        if (request == null) return null;
        
        String attributesJson = null;
        if (request.getAttributes() != null) {
            try {
                attributesJson = objectMapper.writeValueAsString(request.getAttributes());
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize log attributes", e);
            }
        }
        
        long timestamp = request.getTimestamp() != null 
                ? request.getTimestamp() 
                : System.currentTimeMillis();
        
        return LogEntity.builder()
                .serviceName(request.getServiceName())
                .level(request.getLevel())
                .message(request.getMessage())
                .timestamp(Instant.ofEpochMilli(timestamp))
                .logger(request.getLogger())
                .traceId(request.getTraceId())
                .spanId(request.getSpanId())
                .pod(request.getPod())
                .container(request.getContainer())
                .node(request.getNode())
                .attributes(attributesJson)
                .build();
    }
}

