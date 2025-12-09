package com.observability.service;

import com.observability.entity.MetricEntity;
import com.observability.model.MetricData;
import com.observability.repository.MetricRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MetricService {

    private final MetricRepository metricRepository;

    @Transactional
    public void saveMetric(MetricData metricData) {
        MetricEntity entity = MetricEntity.builder()
                .serviceName(metricData.getServiceName())
                .metricName(metricData.getMetricName())
                .endpoint(metricData.getEndpoint())
                .value(metricData.getValue())
                .timestamp(Instant.ofEpochMilli(metricData.getTimestamp()))
                .method(metricData.getMethod())
                .statusCode(metricData.getStatusCode())
                .pod(metricData.getPod())
                .container(metricData.getContainer())
                .node(metricData.getNode())
                .operationType(metricData.getOperationType())
                .build();
        metricRepository.save(entity);
    }

    @Transactional
    public void saveMetrics(List<MetricData> metrics) {
        List<MetricEntity> entities = metrics.stream()
                .map(this::toEntity)
                .collect(Collectors.toList());
        metricRepository.saveAll(entities);
        log.info("Saved {} metrics", entities.size());
    }

    public List<MetricData> getMetrics(String serviceName, String metricName, 
                                        Instant start, Instant end, int limit) {
        List<MetricEntity> entities = metricRepository.findByFilters(
                serviceName, metricName, start, end, PageRequest.of(0, limit));
        return entities.stream()
                .map(this::toModel)
                .collect(Collectors.toList());
    }

    public List<String> getDistinctServices() {
        return metricRepository.findDistinctServiceNames();
    }

    public List<String> getDistinctMetricNames() {
        return metricRepository.findDistinctMetricNames();
    }

    public Double getAverageValue(String metricName, String serviceName, Instant start, Instant end) {
        return metricRepository.findAverageValue(metricName, serviceName, start, end);
    }

    @Transactional
    public void deleteOldMetrics(Instant before) {
        metricRepository.deleteByTimestampBefore(before);
        log.info("Deleted metrics before {}", before);
    }

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

