package com.observability.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.observability.entity.SpanEntity;
import com.observability.entity.TraceEntity;
import com.observability.model.Span;
import com.observability.model.Trace;
import com.observability.repository.SpanRepository;
import com.observability.repository.TraceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class TraceService {

    private final TraceRepository traceRepository;
    private final SpanRepository spanRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public void saveSpan(Span span) {
        // Find or create trace
        TraceEntity trace = traceRepository.findByTraceId(span.getTraceId())
                .orElseGet(() -> createTrace(span));

        // Create span entity (no relationship to trace - NoSQL friendly)
        SpanEntity spanEntity = toSpanEntity(span);
        spanRepository.save(spanEntity);

        // Update trace timing
        updateTraceTiming(trace, span);
    }

    @Transactional
    public void saveSpans(List<Span> spans) {
        // Group spans by trace ID
        Map<String, List<Span>> spansByTrace = spans.stream()
                .collect(Collectors.groupingBy(Span::getTraceId));
        
        for (Map.Entry<String, List<Span>> entry : spansByTrace.entrySet()) {
            String traceId = entry.getKey();
            List<Span> traceSpans = entry.getValue();
            
            // Find or create trace
            TraceEntity trace = traceRepository.findByTraceId(traceId)
                    .orElseGet(() -> createTrace(traceSpans.get(0)));
            
            // Save all spans (no relationship to trace - NoSQL friendly)
            List<SpanEntity> spanEntities = traceSpans.stream()
                    .map(this::toSpanEntity)
                    .collect(Collectors.toList());
            spanRepository.saveAll(spanEntities);
            
            // Update trace timing
            for (Span span : traceSpans) {
                updateTraceTiming(trace, span);
            }
            traceRepository.save(trace);
        }
        log.info("Saved {} spans across {} traces", spans.size(), spansByTrace.size());
    }

    public List<Trace> getTraces(String serviceName, String status, Long minDuration,
                                  Long maxDuration, Instant start, Instant end, int limit) {
        List<TraceEntity> entities = traceRepository.findByFilters(
                serviceName, status, minDuration, maxDuration, start, end, PageRequest.of(0, limit));
        return entities.stream()
                .map(this::toTraceModel)
                .collect(Collectors.toList());
    }

    public Optional<Trace> getTrace(String traceId) {
        return traceRepository.findByTraceId(traceId)
                .map(this::toTraceModelWithSpans);
    }

    public List<Span> getSpansByTraceId(String traceId) {
        return spanRepository.findByTraceIdOrderByStartTimeAsc(traceId).stream()
                .map(this::toSpanModel)
                .collect(Collectors.toList());
    }

    public List<String> getDistinctServices() {
        return traceRepository.findDistinctServiceNames();
    }

    public Map<String, Long> getStatusCounts(Instant start, Instant end) {
        List<Object[]> results = traceRepository.countByStatus(start, end);
        Map<String, Long> counts = new HashMap<>();
        for (Object[] row : results) {
            counts.put((String) row[0], (Long) row[1]);
        }
        return counts;
    }

    @Transactional
    public void deleteOldTraces(Instant before) {
        traceRepository.deleteByStartTimeBefore(before);
        spanRepository.deleteByStartTimeBefore(before);
        log.info("Deleted traces and spans before {}", before);
    }

    private TraceEntity createTrace(Span span) {
        TraceEntity trace = TraceEntity.builder()
                .traceId(span.getTraceId())
                .serviceName(span.getServiceName())
                .startTime(Instant.ofEpochMilli(span.getStartTime()))
                .endTime(Instant.ofEpochMilli(span.getEndTime()))
                .duration(span.getDuration())
                .status(span.getStatus() != null ? span.getStatus() : "OK")
                .rootOperation(span.getParentSpanId() == null ? span.getOperationName() : null)
                .spanCount(0)
                .build();
        return traceRepository.save(trace);
    }

    private void updateTraceTiming(TraceEntity trace, Span span) {
        Instant spanStart = Instant.ofEpochMilli(span.getStartTime());
        Instant spanEnd = Instant.ofEpochMilli(span.getEndTime());
        
        if (trace.getStartTime() == null || spanStart.isBefore(trace.getStartTime())) {
            trace.setStartTime(spanStart);
        }
        if (trace.getEndTime() == null || spanEnd.isAfter(trace.getEndTime())) {
            trace.setEndTime(spanEnd);
        }
        trace.setDuration(trace.getEndTime().toEpochMilli() - trace.getStartTime().toEpochMilli());
        trace.setSpanCount(trace.getSpanCount() + 1);
        
        if ("ERROR".equals(span.getStatus())) {
            trace.setStatus("ERROR");
        }
        if (span.getParentSpanId() == null && trace.getRootOperation() == null) {
            trace.setRootOperation(span.getOperationName());
        }
    }

    private SpanEntity toSpanEntity(Span span) {
        String attributesJson = null;
        if (span.getAttributes() != null) {
            try {
                attributesJson = objectMapper.writeValueAsString(span.getAttributes());
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize span attributes", e);
            }
        }

        return SpanEntity.builder()
                .spanId(span.getSpanId())
                .traceId(span.getTraceId())
                .parentSpanId(span.getParentSpanId())
                .operationName(span.getOperationName())
                .startTime(Instant.ofEpochMilli(span.getStartTime()))
                .endTime(Instant.ofEpochMilli(span.getEndTime()))
                .duration(span.getDuration())
                .serviceName(span.getServiceName())
                .status(span.getStatus())
                .kind(span.getKind())
                .pod(span.getPod())
                .container(span.getContainer())
                .node(span.getNode())
                .attributes(attributesJson)
                .build();
    }

    private Trace toTraceModel(TraceEntity entity) {
        return Trace.builder()
                .traceId(entity.getTraceId())
                .startTime(entity.getStartTime().toEpochMilli())
                .endTime(entity.getEndTime().toEpochMilli())
                .duration(entity.getDuration())
                .serviceName(entity.getServiceName())
                .build();
    }

    private Trace toTraceModelWithSpans(TraceEntity entity) {
        List<Span> spans = spanRepository.findByTraceIdOrderByStartTimeAsc(entity.getTraceId())
                .stream()
                .map(this::toSpanModel)
                .collect(Collectors.toList());

        return Trace.builder()
                .traceId(entity.getTraceId())
                .startTime(entity.getStartTime().toEpochMilli())
                .endTime(entity.getEndTime().toEpochMilli())
                .duration(entity.getDuration())
                .serviceName(entity.getServiceName())
                .spans(spans)
                .build();
    }

    @SuppressWarnings("unchecked")
    private Span toSpanModel(SpanEntity entity) {
        Map<String, String> attributes = null;
        if (entity.getAttributes() != null) {
            try {
                attributes = objectMapper.readValue(entity.getAttributes(), Map.class);
            } catch (JsonProcessingException e) {
                log.warn("Failed to deserialize span attributes", e);
            }
        }

        return Span.builder()
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
}

