package com.observability.service;

import com.observability.dto.request.MetricRequest;
import com.observability.dto.response.MetricResponse;
import com.observability.entity.MetricEntity;
import com.observability.mapper.MetricMapper;
import com.observability.model.MetricData;
import com.observability.repository.MetricRepository;
import com.observability.service.api.MetricServiceApi;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Service implementation for metric operations.
 * Implements MetricServiceApi for clean abstraction.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MetricService implements MetricServiceApi {

    private final MetricRepository metricRepository;
    private final MetricMapper metricMapper;

    // ==================== API Interface Methods ====================

    @Override
    @Transactional
    public void save(MetricRequest request) {
        MetricEntity entity = metricMapper.toEntity(request);
        metricRepository.save(entity);
        log.debug("Saved metric: {}", request.getMetricName());
    }

    @Override
    @Transactional
    public void saveAll(List<MetricRequest> requests) {
        List<MetricEntity> entities = metricMapper.toEntityList(requests);
        metricRepository.saveAll(entities);
        log.info("Saved {} metrics", entities.size());
    }

    @Override
    public List<MetricResponse> getMetrics(String serviceName, String metricName,
                                            Instant start, Instant end, int limit) {
        List<MetricEntity> entities = metricRepository.findByFilters(
                serviceName, metricName, start, end, PageRequest.of(0, limit));
        return metricMapper.toDtoList(entities);
    }

    @Override
    public List<String> getDistinctServices() {
        return metricRepository.findDistinctServiceNames();
    }

    @Override
    public List<String> getDistinctMetricNames() {
        return metricRepository.findDistinctMetricNames();
    }

    @Override
    public Double getAverageValue(String metricName, String serviceName, Instant start, Instant end) {
        return metricRepository.findAverageValue(metricName, serviceName, start, end);
    }

    @Override
    @Transactional
    public void deleteOldMetrics(Instant before) {
        metricRepository.deleteByTimestampBefore(before);
        log.info("Deleted metrics before {}", before);
    }

    // ==================== Legacy Model Methods (for backward compatibility) ====================

    @Transactional
    public void saveMetric(MetricData metricData) {
        MetricEntity entity = toEntity(metricData);
        metricRepository.save(entity);
    }

    @Transactional
    public void saveMetrics(List<MetricData> metrics) {
        List<MetricEntity> entities = metrics.stream()
                .map(this::toEntity)
                .toList();
        metricRepository.saveAll(entities);
        log.info("Saved {} metrics", entities.size());
    }

    public List<MetricData> getMetricsAsModel(String serviceName, String metricName,
                                               Instant start, Instant end, int limit) {
        List<MetricEntity> entities = metricRepository.findByFilters(
                serviceName, metricName, start, end, PageRequest.of(0, limit));
        return entities.stream()
                .map(this::toModel)
                .toList();
    }

    // ==================== Private Mapping Methods (Legacy) ====================

    private MetricEntity toEntity(MetricData data) {
        return MetricEntity.builder()
                .serviceName(data.getServiceName())
                .metricName(data.getMetricName())
                .endpoint(data.getEndpoint())
                .value(data.getValue())
                .timestamp(Instant.ofEpochMilli(data.getTimestamp()))
                .method(data.getMethod())
                .statusCode(data.getStatusCode())
                .pod(data.getPod())
                .container(data.getContainer())
                .node(data.getNode())
                .operationType(data.getOperationType())
                .build();
    }

    private MetricData toModel(MetricEntity entity) {
        return MetricData.builder()
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
}

