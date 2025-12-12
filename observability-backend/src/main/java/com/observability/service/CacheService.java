package com.observability.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * Redis caching service for real-time aggregations and frequently accessed data.
 * Provides sub-millisecond access to hot data.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class CacheService {

    private final RedisTemplate<String, Object> redisTemplate;

    // Cache key prefixes
    private static final String METRICS_REALTIME = "metrics:realtime:";
    private static final String SERVICE_HEALTH = "services:health:";
    private static final String OVERVIEW_STATS = "overview:stats:";
    private static final String LOG_FACETS = "logs:facets:";
    private static final String TRACE_SUMMARY = "traces:summary:";
    private static final String ALERT_COUNTS = "alerts:counts:";

    /**
     * Cache real-time metrics
     */
    public void cacheRealtimeMetrics(UUID teamId, String metricName, Map<String, Object> data) {
        String key = METRICS_REALTIME + teamId + ":" + metricName;
        redisTemplate.opsForValue().set(key, data, Duration.ofSeconds(30));
    }

    public Optional<Map<String, Object>> getRealtimeMetrics(UUID teamId, String metricName) {
        String key = METRICS_REALTIME + teamId + ":" + metricName;
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) redisTemplate.opsForValue().get(key);
        return Optional.ofNullable(data);
    }

    /**
     * Cache service health data
     */
    public void cacheServiceHealth(UUID teamId, Map<String, Object> data) {
        String key = SERVICE_HEALTH + teamId;
        redisTemplate.opsForValue().set(key, data, Duration.ofMinutes(1));
    }

    public Optional<Map<String, Object>> getServiceHealth(UUID teamId) {
        String key = SERVICE_HEALTH + teamId;
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) redisTemplate.opsForValue().get(key);
        return Optional.ofNullable(data);
    }

    /**
     * Cache overview statistics
     */
    public void cacheOverviewStats(UUID teamId, Map<String, Object> data) {
        String key = OVERVIEW_STATS + teamId;
        redisTemplate.opsForValue().set(key, data, Duration.ofMinutes(1));
    }

    public Optional<Map<String, Object>> getOverviewStats(UUID teamId) {
        String key = OVERVIEW_STATS + teamId;
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) redisTemplate.opsForValue().get(key);
        return Optional.ofNullable(data);
    }

    /**
     * Cache log facets
     */
    public void cacheLogFacets(UUID teamId, long timeRangeMs, Map<String, Object> data) {
        String key = LOG_FACETS + teamId + ":" + timeRangeMs;
        redisTemplate.opsForValue().set(key, data, Duration.ofMinutes(2));
    }

    public Optional<Map<String, Object>> getLogFacets(UUID teamId, long timeRangeMs) {
        String key = LOG_FACETS + teamId + ":" + timeRangeMs;
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) redisTemplate.opsForValue().get(key);
        return Optional.ofNullable(data);
    }

    /**
     * Cache trace summary
     */
    public void cacheTraceSummary(UUID teamId, long timeRangeMs, Map<String, Object> data) {
        String key = TRACE_SUMMARY + teamId + ":" + timeRangeMs;
        redisTemplate.opsForValue().set(key, data, Duration.ofMinutes(2));
    }

    public Optional<Map<String, Object>> getTraceSummary(UUID teamId, long timeRangeMs) {
        String key = TRACE_SUMMARY + teamId + ":" + timeRangeMs;
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) redisTemplate.opsForValue().get(key);
        return Optional.ofNullable(data);
    }

    /**
     * Cache alert counts
     */
    public void cacheAlertCounts(UUID teamId, Map<String, Object> data) {
        String key = ALERT_COUNTS + teamId;
        redisTemplate.opsForValue().set(key, data, Duration.ofSeconds(30));
    }

    public Optional<Map<String, Object>> getAlertCounts(UUID teamId) {
        String key = ALERT_COUNTS + teamId;
        @SuppressWarnings("unchecked")
        Map<String, Object> data = (Map<String, Object>) redisTemplate.opsForValue().get(key);
        return Optional.ofNullable(data);
    }

    /**
     * Invalidate all caches for a team
     */
    public void invalidateTeamCache(UUID teamId) {
        String pattern = "*:" + teamId + "*";
        var keys = redisTemplate.keys(pattern);
        if (keys != null && !keys.isEmpty()) {
            redisTemplate.delete(keys);
            log.debug("Invalidated {} cache keys for team {}", keys.size(), teamId);
        }
    }

    /**
     * Store rate limiting counter
     */
    public boolean checkRateLimit(String key, int maxRequests, int windowSeconds) {
        String rateLimitKey = "ratelimit:" + key;
        Long count = redisTemplate.opsForValue().increment(rateLimitKey);
        if (count != null && count == 1) {
            redisTemplate.expire(rateLimitKey, windowSeconds, TimeUnit.SECONDS);
        }
        return count != null && count <= maxRequests;
    }
}

