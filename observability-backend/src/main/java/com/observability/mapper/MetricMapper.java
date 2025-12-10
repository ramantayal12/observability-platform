package com.observability.mapper;

import com.observability.dto.request.MetricRequest;
import com.observability.dto.response.MetricResponse;
import com.observability.entity.MetricEntity;
import org.springframework.stereotype.Component;

import java.time.Instant;

/**
 * Mapper for MetricEntity conversions.
 */
@Component
public class MetricMapper implements EntityMapper<MetricEntity, MetricResponse, MetricRequest> {

    @Override
    public MetricResponse toDto(MetricEntity entity) {
        if (entity == null) return null;
        
        return MetricResponse.builder()
                .id(entity.getId())
                .serviceName(entity.getServiceName())
                .metricName(entity.getMetricName())
                .endpoint(entity.getEndpoint())
                .value(entity.getValue())
                .timestamp(entity.getTimestamp().toEpochMilli())
                .method(entity.getMethod())
                .statusCode(entity.getStatusCode())
                .pod(entity.getPod())
                .container(entity.getContainer())
                .node(entity.getNode())
                .operationType(entity.getOperationType())
                .build();
    }

    @Override
    public MetricEntity toEntity(MetricRequest request) {
        if (request == null) return null;
        
        long timestamp = request.getTimestamp() != null 
                ? request.getTimestamp() 
                : System.currentTimeMillis();
        
        return MetricEntity.builder()
                .serviceName(request.getServiceName())
                .metricName(request.getMetricName())
                .endpoint(request.getEndpoint())
                .value(request.getValue())
                .timestamp(Instant.ofEpochMilli(timestamp))
                .method(request.getMethod())
                .statusCode(request.getStatusCode())
                .pod(request.getPod())
                .container(request.getContainer())
                .node(request.getNode())
                .operationType(request.getOperationType())
                .build();
    }
}

