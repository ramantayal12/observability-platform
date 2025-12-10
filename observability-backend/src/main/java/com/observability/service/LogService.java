package com.observability.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.observability.dto.request.LogRequest;
import com.observability.dto.response.LogResponse;
import com.observability.entity.LogEntity;
import com.observability.mapper.LogMapper;
import com.observability.model.LogEntry;
import com.observability.repository.LogRepository;
import com.observability.service.api.LogServiceApi;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service implementation for log operations.
 * Implements LogServiceApi for clean abstraction.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LogService implements LogServiceApi {

    private final LogRepository logRepository;
    private final LogMapper logMapper;
    private final ObjectMapper objectMapper;

    // ==================== API Interface Methods ====================

    @Override
    @Transactional
    public void save(LogRequest request) {
        LogEntity entity = logMapper.toEntity(request);
        logRepository.save(entity);
        log.debug("Saved log: {}", request.getMessage());
    }

    @Override
    @Transactional
    public void saveAll(List<LogRequest> requests) {
        List<LogEntity> entities = logMapper.toEntityList(requests);
        logRepository.saveAll(entities);
        log.info("Saved {} logs", entities.size());
    }

    @Override
    public List<LogResponse> getLogs(String serviceName, String level, String traceId,
                                      Instant start, Instant end, int limit) {
        List<LogEntity> entities;
        if (traceId != null && !traceId.isEmpty()) {
            entities = logRepository.findByTraceIdOrderByTimestampAsc(traceId);
        } else {
            entities = logRepository.findByFilters(
                    serviceName, level, null, null, start, end, PageRequest.of(0, limit));
        }
        return logMapper.toDtoList(entities);
    }

    @Override
    public List<LogResponse> searchLogs(String query, Instant start, Instant end, int limit) {
        List<LogEntity> entities = logRepository.searchByMessage(
                query, start, end, PageRequest.of(0, limit));
        return logMapper.toDtoList(entities);
    }

    @Override
    public Map<String, Long> getLogCountByLevel(String serviceName, Instant start, Instant end) {
        List<Object[]> results = logRepository.countByLevel(start, end);
        Map<String, Long> counts = new HashMap<>();
        for (Object[] row : results) {
            counts.put((String) row[0], (Long) row[1]);
        }
        return counts;
    }

    @Override
    public List<String> getDistinctServices() {
        return logRepository.findDistinctServiceNames();
    }

    @Override
    @Transactional
    public void deleteOldLogs(Instant before) {
        logRepository.deleteByTimestampBefore(before);
        log.info("Deleted logs before {}", before);
    }

    // ==================== Legacy Model Methods (for backward compatibility) ====================

    @Transactional
    public void saveLog(LogEntry logEntry) {
        LogEntity entity = toEntity(logEntry);
        logRepository.save(entity);
    }

    @Transactional
    public void saveLogs(List<LogEntry> logs) {
        List<LogEntity> entities = logs.stream()
                .map(this::toEntity)
                .toList();
        logRepository.saveAll(entities);
        log.info("Saved {} logs", entities.size());
    }

    public List<LogEntry> getLogsAsModel(String serviceName, String level, String pod,
                                          String container, Instant start, Instant end, int limit) {
        List<LogEntity> entities = logRepository.findByFilters(
                serviceName, level, pod, container, start, end, PageRequest.of(0, limit));
        return entities.stream()
                .map(this::toModel)
                .toList();
    }

    public List<LogEntry> searchLogsAsModel(String query, Instant start, Instant end, int limit) {
        List<LogEntity> entities = logRepository.searchByMessage(
                query, start, end, PageRequest.of(0, limit));
        return entities.stream()
                .map(this::toModel)
                .toList();
    }

    public List<LogEntry> getLogsByTraceId(String traceId) {
        return logRepository.findByTraceIdOrderByTimestampAsc(traceId).stream()
                .map(this::toModel)
                .toList();
    }

    public Map<String, Long> getLevelCounts(Instant start, Instant end) {
        return getLogCountByLevel(null, start, end);
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

    // ==================== Private Mapping Methods (Legacy) ====================

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

