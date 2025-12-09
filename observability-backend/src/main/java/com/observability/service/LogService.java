package com.observability.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.observability.entity.LogEntity;
import com.observability.model.LogEntry;
import com.observability.repository.LogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class LogService {

    private final LogRepository logRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public void saveLog(LogEntry logEntry) {
        LogEntity entity = toEntity(logEntry);
        logRepository.save(entity);
    }

    @Transactional
    public void saveLogs(List<LogEntry> logs) {
        List<LogEntity> entities = logs.stream()
                .map(this::toEntity)
                .collect(Collectors.toList());
        logRepository.saveAll(entities);
        log.info("Saved {} logs", entities.size());
    }

    public List<LogEntry> getLogs(String serviceName, String level, String pod, 
                                   String container, Instant start, Instant end, int limit) {
        List<LogEntity> entities = logRepository.findByFilters(
                serviceName, level, pod, container, start, end, PageRequest.of(0, limit));
        return entities.stream()
                .map(this::toModel)
                .collect(Collectors.toList());
    }

    public List<LogEntry> searchLogs(String query, Instant start, Instant end, int limit) {
        List<LogEntity> entities = logRepository.searchByMessage(
                query, start, end, PageRequest.of(0, limit));
        return entities.stream()
                .map(this::toModel)
                .collect(Collectors.toList());
    }

    public List<LogEntry> getLogsByTraceId(String traceId) {
        return logRepository.findByTraceIdOrderByTimestampAsc(traceId).stream()
                .map(this::toModel)
                .collect(Collectors.toList());
    }

    public Map<String, Long> getLevelCounts(Instant start, Instant end) {
        List<Object[]> results = logRepository.countByLevel(start, end);
        Map<String, Long> counts = new HashMap<>();
        for (Object[] row : results) {
            counts.put((String) row[0], (Long) row[1]);
        }
        return counts;
    }

    public List<String> getDistinctServices() {
        return logRepository.findDistinctServiceNames();
    }

    public List<String> getDistinctLevels() {
        return logRepository.findDistinctLevels();
    }

    public List<String> getDistinctPods() {
        return logRepository.findDistinctPods();
    }

    public List<String> getDistinctContainers() {
        return logRepository.findDistinctContainers();
    }

    @Transactional
    public void deleteOldLogs(Instant before) {
        logRepository.deleteByTimestampBefore(before);
        log.info("Deleted logs before {}", before);
    }

    private LogEntity toEntity(LogEntry entry) {
        String attributesJson = null;
        if (entry.getAttributes() != null) {
            try {
                attributesJson = objectMapper.writeValueAsString(entry.getAttributes());
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize attributes", e);
            }
        }
        
        return LogEntity.builder()
                .serviceName(entry.getServiceName())
                .level(entry.getLevel())
                .message(entry.getMessage())
                .timestamp(Instant.ofEpochMilli(entry.getTimestamp()))
                .logger(entry.getLogger())
                .traceId(entry.getTraceId())
                .spanId(entry.getSpanId())
                .pod(entry.getPod())
                .container(entry.getContainer())
                .node(entry.getNode())
                .attributes(attributesJson)
                .build();
    }

    @SuppressWarnings("unchecked")
    private LogEntry toModel(LogEntity entity) {
        Map<String, String> attributes = null;
        if (entity.getAttributes() != null) {
            try {
                attributes = objectMapper.readValue(entity.getAttributes(), Map.class);
            } catch (JsonProcessingException e) {
                log.warn("Failed to deserialize attributes", e);
            }
        }
        
        return LogEntry.builder()
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
}

