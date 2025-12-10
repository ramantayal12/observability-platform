package com.observability.mapper;

import com.observability.dto.response.SpanResponse;
import com.observability.dto.response.TraceResponse;
import com.observability.entity.TraceEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Mapper for TraceEntity conversions.
 */
@Component
@RequiredArgsConstructor
public class TraceMapper {

    private final SpanMapper spanMapper;

    public TraceResponse toDto(TraceEntity entity) {
        if (entity == null) return null;
        
        return TraceResponse.builder()
                .id(entity.getId())
                .traceId(entity.getTraceId())
                .startTime(entity.getStartTime().toEpochMilli())
                .endTime(entity.getEndTime().toEpochMilli())
                .duration(entity.getDuration())
                .serviceName(entity.getServiceName())
                .status(entity.getStatus())
                .rootOperation(entity.getRootOperation())
                .spanCount(entity.getSpanCount())
                .build();
    }

    public TraceResponse toDtoWithSpans(TraceEntity entity, List<SpanResponse> spans) {
        if (entity == null) return null;
        
        return TraceResponse.builder()
                .id(entity.getId())
                .traceId(entity.getTraceId())
                .startTime(entity.getStartTime().toEpochMilli())
                .endTime(entity.getEndTime().toEpochMilli())
                .duration(entity.getDuration())
                .serviceName(entity.getServiceName())
                .status(entity.getStatus())
                .rootOperation(entity.getRootOperation())
                .spanCount(entity.getSpanCount())
                .spans(spans)
                .build();
    }

    public List<TraceResponse> toDtoList(List<TraceEntity> entities) {
        return entities.stream().map(this::toDto).toList();
    }
}

