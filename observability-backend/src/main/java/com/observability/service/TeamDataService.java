package com.observability.service;

import com.observability.common.exception.AccessDeniedException;
import com.observability.common.exception.ResourceNotFoundException;
import com.observability.entity.*;
import com.observability.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for team-specific data operations with user access validation.
 * Ensures users can only access data for teams they belong to.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TeamDataService {

    private final TeamOverviewDataRepository overviewDataRepository;
    private final TeamRepository teamRepository;
    private final UserTeamRepository userTeamRepository;
    private final ChartConfigRepository chartConfigRepository;
    private final ApiEndpointRepository apiEndpointRepository;
    private final AlertRepository alertRepository;
    private final LogRepository logRepository;
    private final TraceRepository traceRepository;
    private final SpanRepository spanRepository;
    private final MockDataGenerator mockDataGenerator;

    /**
     * Validate that a user has access to a specific team
     */
    public void validateUserTeamAccess(Long userId, Long teamId) {
        if (userId == null || teamId == null) {
            throw new AccessDeniedException("User or team ID is missing");
        }
        
        if (!userTeamRepository.existsByUserIdAndTeamId(userId, teamId)) {
            log.warn("User {} attempted to access team {} without permission", userId, teamId);
            throw new AccessDeniedException("You do not have access to this team");
        }
    }

    /**
     * Get user's role in a team
     */
    public String getUserRoleInTeam(Long userId, Long teamId) {
        return userTeamRepository.findByUserIdAndTeamId(userId, teamId)
                .map(ut -> ut.getRole())
                .orElse(null);
    }

    /**
     * Get teams accessible by a user
     */
    public List<Long> getAccessibleTeamIds(Long userId) {
        return userTeamRepository.findTeamIdsByUserId(userId);
    }

    /**
     * Get overview data for a team (with access validation)
     */
    public Map<String, Object> getTeamOverview(Long userId, Long teamId, Long startTime, Long endTime) {
        validateUserTeamAccess(userId, teamId);
        
        TeamEntity team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", "id", teamId));
        
        LocalDateTime start = startTime != null 
                ? LocalDateTime.ofInstant(Instant.ofEpochMilli(startTime), ZoneId.systemDefault())
                : LocalDateTime.now().minusHours(1);
        LocalDateTime end = endTime != null 
                ? LocalDateTime.ofInstant(Instant.ofEpochMilli(endTime), ZoneId.systemDefault())
                : LocalDateTime.now();
        
        // Try to get real data first
        List<TeamOverviewDataEntity> dataPoints = overviewDataRepository
                .findByTeamIdAndTimestampBetweenOrderByTimestampAsc(teamId, start, end);
        
        if (dataPoints.isEmpty()) {
            // Generate mock data for this team
            return generateMockTeamOverview(team, startTime, endTime);
        }
        
        return buildOverviewResponse(team, dataPoints, start, end);
    }

    /**
     * Generate mock overview data for a team using API endpoints from database
     */
    private Map<String, Object> generateMockTeamOverview(TeamEntity team, Long startTime, Long endTime) {
        long end = endTime != null ? endTime : System.currentTimeMillis();
        long start = startTime != null ? startTime : end - 3600000;
        long timeRange = end - start;
        int dataPoints = mockDataGenerator.calculateDataPoints(timeRange);

        // Get API endpoints from database
        List<ApiEndpointEntity> apiEndpoints = apiEndpointRepository.findByTeamIdAndEnabledTrue(team.getId());

        // Fallback to default endpoints if none in database
        if (apiEndpoints.isEmpty()) {
            log.warn("No API endpoints found for team {}, using defaults", team.getId());
            apiEndpoints = getDefaultApiEndpoints(team);
        }

        // Build endpoint data maps from database
        Map<String, Double> endpointBaseLatency = new HashMap<>();
        Map<String, Double> endpointBaseThroughput = new HashMap<>();
        Map<String, Double> endpointBaseErrorRate = new HashMap<>();
        List<String> endpoints = new ArrayList<>();

        double totalLatency = 0, totalThroughput = 0, totalErrorRate = 0;
        for (ApiEndpointEntity ep : apiEndpoints) {
            String endpoint = ep.getEndpoint();
            endpoints.add(endpoint);

            endpointBaseLatency.put(endpoint, ep.getBaseLatency());
            endpointBaseThroughput.put(endpoint, ep.getBaseThroughput());
            endpointBaseErrorRate.put(endpoint, ep.getBaseErrorRate());

            totalLatency += ep.getBaseLatency();
            totalThroughput += ep.getBaseThroughput();
            totalErrorRate += ep.getBaseErrorRate();
        }

        // Generate time series data for each endpoint
        List<Map<String, Object>> latencyData = new ArrayList<>();
        List<Map<String, Object>> throughputData = new ArrayList<>();
        List<Map<String, Object>> errorRateData = new ArrayList<>();
        List<Map<String, Object>> serviceLatency = new ArrayList<>();

        long interval = timeRange / dataPoints;
        for (int i = 0; i < dataPoints; i++) {
            long timestamp = start + (i * interval);

            for (String endpoint : endpoints) {
                double variation = 0.8 + Math.random() * 0.4;

                latencyData.add(Map.of(
                        "timestamp", timestamp,
                        "endpoint", endpoint,
                        "value", Math.round(endpointBaseLatency.get(endpoint) * variation * 100.0) / 100.0
                ));
                throughputData.add(Map.of(
                        "timestamp", timestamp,
                        "endpoint", endpoint,
                        "value", Math.round(endpointBaseThroughput.get(endpoint) * variation * 100.0) / 100.0
                ));
                errorRateData.add(Map.of(
                        "timestamp", timestamp,
                        "endpoint", endpoint,
                        "value", Math.round(endpointBaseErrorRate.get(endpoint) * variation * 100.0) / 100.0
                ));
            }
        }

        // Generate service latency for bar chart
        for (String endpoint : endpoints) {
            serviceLatency.add(Map.of(
                    "serviceName", endpoint,
                    "avgLatency", Math.round(endpointBaseLatency.get(endpoint) * 100.0) / 100.0
            ));
        }

        Map<String, Object> result = new HashMap<>();
        result.put("team", Map.of(
                "id", team.getId(),
                "name", team.getName(),
                "slug", team.getSlug(),
                "color", team.getColor() != null ? team.getColor() : "#3B82F6"
        ));
        result.put("stats", Map.of(
                "avgLatency", Math.round((totalLatency / endpoints.size()) * 100.0) / 100.0,
                "throughput", Math.round(totalThroughput * 100.0) / 100.0,
                "errorRate", Math.round((totalErrorRate / endpoints.size()) * 100.0) / 100.0,
                "activeServices", endpoints.size()
        ));
        result.put("latencyData", latencyData);
        result.put("throughputData", throughputData);
        result.put("errorRateData", errorRateData);
        result.put("serviceLatency", serviceLatency);
        result.put("timeRange", Map.of("startTime", start, "endTime", end, "duration", timeRange, "dataPoints", dataPoints));

        // Fetch chart configuration from database
        result.put("charts", getChartConfigsForTeam(team.getId(), "overview"));

        return result;
    }

    /**
     * Build overview response from real data
     */
    private Map<String, Object> buildOverviewResponse(TeamEntity team, List<TeamOverviewDataEntity> dataPoints,
                                                       LocalDateTime start, LocalDateTime end) {
        List<Map<String, Object>> latencyData = new ArrayList<>();
        List<Map<String, Object>> throughputData = new ArrayList<>();
        List<Map<String, Object>> errorRateData = new ArrayList<>();

        double totalLatency = 0, totalThroughput = 0, totalErrorRate = 0;
        int maxServices = 0;

        for (TeamOverviewDataEntity dp : dataPoints) {
            long timestamp = dp.getTimestamp().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();

            if (dp.getAvgLatency() != null) {
                latencyData.add(Map.of("timestamp", timestamp, "value", dp.getAvgLatency()));
                totalLatency += dp.getAvgLatency();
            }
            if (dp.getThroughput() != null) {
                throughputData.add(Map.of("timestamp", timestamp, "value", dp.getThroughput()));
                totalThroughput += dp.getThroughput();
            }
            if (dp.getErrorRate() != null) {
                errorRateData.add(Map.of("timestamp", timestamp, "value", dp.getErrorRate()));
                totalErrorRate += dp.getErrorRate();
            }
            if (dp.getActiveServices() != null && dp.getActiveServices() > maxServices) {
                maxServices = dp.getActiveServices();
            }
        }

        int count = dataPoints.size();
        long startMs = start.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
        long endMs = end.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();

        return Map.of(
                "team", Map.of(
                        "id", team.getId(),
                        "name", team.getName(),
                        "slug", team.getSlug(),
                        "color", team.getColor() != null ? team.getColor() : "#3B82F6"
                ),
                "stats", Map.of(
                        "avgLatency", count > 0 ? Math.round(totalLatency / count * 100.0) / 100.0 : 0,
                        "throughput", count > 0 ? Math.round(totalThroughput / count * 100.0) / 100.0 : 0,
                        "errorRate", count > 0 ? Math.round(totalErrorRate / count * 100.0) / 100.0 : 0,
                        "activeServices", maxServices
                ),
                "latencyData", latencyData,
                "throughputData", throughputData,
                "errorRateData", errorRateData,
                "timeRange", Map.of("startTime", startMs, "endTime", endMs, "duration", endMs - startMs, "dataPoints", count)
        );
    }

    /**
     * Save overview data for a team
     */
    @Transactional
    public TeamOverviewDataEntity saveOverviewData(Long teamId, Double avgLatency, Double throughput,
                                                    Double errorRate, Integer activeServices) {
        TeamOverviewDataEntity entity = TeamOverviewDataEntity.builder()
                .teamId(teamId)
                .timestamp(LocalDateTime.now())
                .avgLatency(avgLatency)
                .throughput(throughput)
                .errorRate(errorRate)
                .activeServices(activeServices)
                .build();
        return overviewDataRepository.save(entity);
    }

    /**
     * Get metrics data for a team
     */
    public Map<String, Object> getTeamMetrics(Long userId, Long teamId, Long startTime, Long endTime, String serviceName) {
        validateUserTeamAccess(userId, teamId);

        TeamEntity team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", "id", teamId));

        // Generate team-specific mock metrics
        return generateMockTeamMetrics(team, startTime, endTime, serviceName);
    }

    private Map<String, Object> generateMockTeamMetrics(TeamEntity team, Long startTime, Long endTime, String serviceName) {
        long end = endTime != null ? endTime : System.currentTimeMillis();
        long start = startTime != null ? startTime : end - 3600000;
        long timeRange = end - start;
        int dataPoints = mockDataGenerator.calculateDataPoints(timeRange);

        List<Map<String, Object>> apiMetrics = new ArrayList<>();

        // Get API endpoints from database
        List<ApiEndpointEntity> apiEndpoints = apiEndpointRepository.findByTeamIdAndEnabledTrue(team.getId());

        // Fallback to default endpoints if none in database
        if (apiEndpoints.isEmpty()) {
            log.warn("No API endpoints found for team {} metrics, using defaults", team.getId());
            apiEndpoints = getDefaultApiEndpoints(team);
        }

        for (ApiEndpointEntity ep : apiEndpoints) {
            double baseLatency = ep.getBaseLatency();
            double baseThroughput = ep.getBaseThroughput();
            double baseError = ep.getBaseErrorRate();

            List<Map<String, Object>> latencyData = new ArrayList<>();
            List<Map<String, Object>> throughputData = new ArrayList<>();
            List<Map<String, Object>> errorData = new ArrayList<>();

            long interval = timeRange / dataPoints;
            for (int i = 0; i < dataPoints; i++) {
                long timestamp = start + (i * interval);
                double variation = 0.8 + Math.random() * 0.4;

                latencyData.add(Map.of("timestamp", timestamp, "value", Math.round(baseLatency * variation * 100.0) / 100.0));
                throughputData.add(Map.of("timestamp", timestamp, "value", Math.round(baseThroughput * variation * 100.0) / 100.0));
                errorData.add(Map.of("timestamp", timestamp, "value", Math.round(baseError * variation * 100.0) / 100.0));
            }

            apiMetrics.add(Map.of(
                    "endpoint", ep.getEndpoint(),
                    "avgLatency", Math.round(baseLatency * 100.0) / 100.0,
                    "throughput", Math.round(baseThroughput * 100.0) / 100.0,
                    "errorRate", Math.round(baseError * 100.0) / 100.0,
                    "latencyData", latencyData,
                    "throughputData", throughputData,
                    "errorData", errorData
            ));
        }

        Map<String, Object> result = new HashMap<>();
        result.put("team", Map.of("id", team.getId(), "name", team.getName(), "color", team.getColor()));
        result.put("apiMetrics", apiMetrics);
        result.put("timeRange", Map.of("startTime", start, "endTime", end, "duration", timeRange, "dataPoints", dataPoints));

        // Fetch chart configuration from database
        result.put("charts", getChartConfigsForTeam(team.getId(), "metrics"));

        return result;
    }

    /**
     * Get logs for a team from the database with pagination
     */
    public Map<String, Object> getTeamLogs(Long userId, Long teamId, Long startTime, Long endTime,
                                            String level, String serviceName, Integer limit, Integer offset) {
        validateUserTeamAccess(userId, teamId);

        TeamEntity team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", "id", teamId));

        long end = endTime != null ? endTime : System.currentTimeMillis();
        long start = startTime != null ? startTime : end - 3600000;
        int logLimit = limit != null ? Math.min(limit, 500) : 100;
        int logOffset = offset != null ? offset : 0;
        int pageNumber = logOffset / logLimit;

        Instant startInstant = Instant.ofEpochMilli(start);
        Instant endInstant = Instant.ofEpochMilli(end);

        // Fetch logs from database with pagination
        List<LogEntity> logEntities = logRepository.findByTeamIdAndFilters(
                teamId, level, serviceName, startInstant, endInstant, PageRequest.of(pageNumber, logLimit));

        List<Map<String, Object>> logs = logEntities.stream()
                .map(this::convertLogToMap)
                .collect(Collectors.toList());

        // Get total count for pagination info (only on first page)
        long totalCount = logs.size();
        boolean hasMore = logs.size() >= logLimit;

        // Get facet counts for filtering (only on first page to avoid overhead)
        Map<String, Object> facets = logOffset == 0 ? buildLogFacets(logEntities) : Map.of();

        Map<String, Object> result = new HashMap<>();
        result.put("logs", logs);
        result.put("total", totalCount);
        result.put("hasMore", hasMore);
        result.put("offset", logOffset);
        result.put("limit", logLimit);
        result.put("team", Map.of("id", team.getId(), "name", team.getName()));
        result.put("facets", facets);
        result.put("timeRange", Map.of("startTime", start, "endTime", end));

        return result;
    }

    private Map<String, Object> convertLogToMap(LogEntity log) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", log.getId().toString());
        map.put("timestamp", log.getTimestamp().toEpochMilli());
        map.put("level", log.getLevel());
        map.put("serviceName", log.getServiceName());
        map.put("message", log.getMessage());
        map.put("logger", log.getLogger());
        map.put("traceId", log.getTraceId());
        map.put("spanId", log.getSpanId());
        map.put("pod", log.getPod());
        map.put("container", log.getContainer());
        map.put("node", log.getNode());
        return map;
    }

    private Map<String, Object> buildLogFacets(List<LogEntity> logs) {
        Map<String, Long> levelCounts = logs.stream()
                .collect(Collectors.groupingBy(LogEntity::getLevel, Collectors.counting()));
        Map<String, Long> serviceCounts = logs.stream()
                .collect(Collectors.groupingBy(LogEntity::getServiceName, Collectors.counting()));
        Map<String, Long> podCounts = logs.stream()
                .filter(l -> l.getPod() != null)
                .collect(Collectors.groupingBy(LogEntity::getPod, Collectors.counting()));

        return Map.of(
                "levels", levelCounts,
                "services", serviceCounts,
                "pods", podCounts
        );
    }

    /**
     * Get traces for a team from the database
     */
    public Map<String, Object> getTeamTraces(Long userId, Long teamId, Long startTime, Long endTime,
                                              String serviceName, Integer limit) {
        validateUserTeamAccess(userId, teamId);

        TeamEntity team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", "id", teamId));

        long end = endTime != null ? endTime : System.currentTimeMillis();
        long start = startTime != null ? startTime : end - 3600000;
        int traceLimit = limit != null ? Math.min(limit, 500) : 200;

        Instant startInstant = Instant.ofEpochMilli(start);
        Instant endInstant = Instant.ofEpochMilli(end);

        // Fetch traces from database
        List<TraceEntity> traceEntities = traceRepository.findByTeamIdAndFilters(
                teamId, serviceName, null, startInstant, endInstant, PageRequest.of(0, traceLimit));

        List<Map<String, Object>> traces = traceEntities.stream()
                .map(this::convertTraceToMap)
                .collect(Collectors.toList());

        // Get facet counts for filtering
        Map<String, Object> facets = buildTraceFacets(traceEntities);

        Map<String, Object> result = new HashMap<>();
        result.put("traces", traces);
        result.put("total", traces.size());
        result.put("team", Map.of("id", team.getId(), "name", team.getName()));
        result.put("facets", facets);
        result.put("timeRange", Map.of("startTime", start, "endTime", end));

        return result;
    }

    private Map<String, Object> convertTraceToMap(TraceEntity trace) {
        Map<String, Object> map = new HashMap<>();
        map.put("traceId", trace.getTraceId());
        map.put("serviceName", trace.getServiceName());
        map.put("operationName", trace.getRootOperation());
        map.put("duration", trace.getDuration());
        map.put("spanCount", trace.getSpanCount() != null ? trace.getSpanCount() : 1);
        map.put("timestamp", trace.getStartTime().toEpochMilli());
        map.put("error", "ERROR".equals(trace.getStatus()));
        map.put("status", trace.getStatus());

        // Fetch spans for this trace
        List<SpanEntity> spans = spanRepository.findByTraceIdOrderByStartTimeAsc(trace.getTraceId());
        if (!spans.isEmpty()) {
            map.put("spans", spans.stream().map(this::convertSpanToMap).collect(Collectors.toList()));
        }

        return map;
    }

    private Map<String, Object> convertSpanToMap(SpanEntity span) {
        Map<String, Object> map = new HashMap<>();
        map.put("spanId", span.getSpanId());
        map.put("parentSpanId", span.getParentSpanId());
        map.put("operationName", span.getOperationName());
        map.put("serviceName", span.getServiceName());
        map.put("duration", span.getDuration());
        map.put("startTime", span.getStartTime().toEpochMilli());
        map.put("status", span.getStatus());
        map.put("kind", span.getKind());
        return map;
    }

    private Map<String, Object> buildTraceFacets(List<TraceEntity> traces) {
        Map<String, Long> serviceCounts = traces.stream()
                .collect(Collectors.groupingBy(TraceEntity::getServiceName, Collectors.counting()));
        Map<String, Long> statusCounts = traces.stream()
                .filter(t -> t.getStatus() != null)
                .collect(Collectors.groupingBy(TraceEntity::getStatus, Collectors.counting()));

        return Map.of(
                "services", serviceCounts,
                "statuses", statusCounts
        );
    }

    /**
     * Get services for a team
     */
    public Map<String, Object> getTeamServices(Long userId, Long teamId) {
        validateUserTeamAccess(userId, teamId);

        TeamEntity team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", "id", teamId));

        return generateMockTeamServices(team);
    }

    private Map<String, Object> generateMockTeamServices(TeamEntity team) {
        Random teamRandom = new Random(team.getId());
        long now = System.currentTimeMillis();

        List<String> serviceNames = List.of(
                team.getSlug() + "-api",
                team.getSlug() + "-worker",
                team.getSlug() + "-db",
                team.getSlug() + "-cache"
        );

        List<Map<String, Object>> services = new ArrayList<>();
        for (String serviceName : serviceNames) {
            double errorRate = teamRandom.nextDouble() * 5;
            String status = errorRate > 3 ? "degraded" : "healthy";

            services.add(Map.of(
                    "name", serviceName,
                    "status", status,
                    "metricCount", 50 + teamRandom.nextInt(150),
                    "logCount", 100 + teamRandom.nextInt(900),
                    "traceCount", 20 + teamRandom.nextInt(80),
                    "errorRate", Math.round(errorRate * 100.0) / 100.0,
                    "lastSeen", now - teamRandom.nextInt(60000),
                    "teamId", team.getId()
            ));
        }

        return Map.of(
                "services", services,
                "total", services.size(),
                "team", Map.of("id", team.getId(), "name", team.getName())
        );
    }

    /**
     * Get chart configurations for a team and page type from the database.
     * Returns a list of chart config maps suitable for the frontend.
     */
    private List<Map<String, Object>> getChartConfigsForTeam(Long teamId, String pageType) {
        List<ChartConfigEntity> configs = chartConfigRepository
                .findByTeamIdAndPageTypeAndEnabledTrueOrderByDisplayOrderAsc(teamId, pageType);

        if (configs.isEmpty()) {
            log.warn("No chart configs found for team {} and page {}, returning defaults", teamId, pageType);
            return getDefaultChartConfigs(pageType);
        }

        return configs.stream()
                .map(this::convertChartConfigToMap)
                .collect(Collectors.toList());
    }

    /**
     * Convert a ChartConfigEntity to a Map for the API response
     */
    private Map<String, Object> convertChartConfigToMap(ChartConfigEntity config) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", config.getChartId());
        map.put("title", config.getTitle());
        map.put("type", config.getChartType());
        map.put("unit", config.getUnit());
        map.put("dataKey", config.getDataKey());
        if (config.getPercentile() != null) {
            map.put("percentile", config.getPercentile());
        }
        return map;
    }

    /**
     * Get default chart configurations when none are found in the database
     */
    private List<Map<String, Object>> getDefaultChartConfigs(String pageType) {
        if ("overview".equals(pageType)) {
            return List.of(
                    Map.of("id", "latency", "title", "Latency Overview", "type", "line", "unit", "ms", "dataKey", "latencyData"),
                    Map.of("id", "throughput", "title", "Throughput", "type", "line", "unit", "req/min", "dataKey", "throughputData"),
                    Map.of("id", "errorRate", "title", "Error Rate", "type", "line", "unit", "%", "dataKey", "errorRateData"),
                    Map.of("id", "serviceLatency", "title", "Service Latency", "type", "bar", "unit", "ms", "dataKey", "serviceLatency")
            );
        } else if ("metrics".equals(pageType)) {
            return List.of(
                    Map.of("id", "latency", "title", "Latency Trends", "type", "line", "unit", "ms", "dataKey", "latencyData"),
                    Map.of("id", "throughput", "title", "Throughput Trends", "type", "line", "unit", "req/min", "dataKey", "throughputData"),
                    Map.of("id", "errorRate", "title", "Error Rate Trends", "type", "line", "unit", "%", "dataKey", "errorData"),
                    Map.of("id", "p99", "title", "P99 Latency", "type", "line", "unit", "ms", "dataKey", "latencyData", "percentile", 99)
            );
        }
        return List.of();
    }

    /**
     * Get default API endpoints when none are found in the database
     */
    private List<ApiEndpointEntity> getDefaultApiEndpoints(TeamEntity team) {
        Random random = new Random(team.getId());
        List<ApiEndpointEntity> defaults = new ArrayList<>();

        String[] methods = {"GET", "POST", "GET", "PUT", "DELETE"};
        String[] paths = {"/users", "/data", "/status", "/config", "/cache"};

        for (int i = 0; i < methods.length; i++) {
            defaults.add(ApiEndpointEntity.builder()
                    .teamId(team.getId())
                    .endpoint(methods[i] + " /api/v1/" + team.getSlug() + paths[i])
                    .method(methods[i])
                    .baseLatency(30 + random.nextDouble() * 150)
                    .baseThroughput(100 + random.nextDouble() * 500)
                    .baseErrorRate(0.1 + random.nextDouble() * 3)
                    .enabled(true)
                    .build());
        }

        return defaults;
    }

    /**
     * Get alerts for a team from the database
     */
    public Map<String, Object> getTeamAlerts(Long userId, Long teamId, String status, String severity) {
        validateUserTeamAccess(userId, teamId);

        TeamEntity team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", "id", teamId));

        List<AlertEntity> alertEntities;
        if (status != null && !status.isEmpty()) {
            alertEntities = alertRepository.findByTeamIdAndStatusOrderByCreatedAtDesc(teamId, status);
        } else {
            alertEntities = alertRepository.findByTeamIdOrderByCreatedAtDesc(teamId);
        }

        // Filter by severity if provided
        if (severity != null && !severity.isEmpty()) {
            alertEntities = alertEntities.stream()
                    .filter(a -> severity.equalsIgnoreCase(a.getSeverity()))
                    .collect(Collectors.toList());
        }

        List<Map<String, Object>> alerts = alertEntities.stream()
                .map(this::convertAlertToMap)
                .collect(Collectors.toList());

        // Build summary stats
        Map<String, Long> statusCounts = alertEntities.stream()
                .collect(Collectors.groupingBy(AlertEntity::getStatus, Collectors.counting()));
        Map<String, Long> severityCounts = alertEntities.stream()
                .collect(Collectors.groupingBy(AlertEntity::getSeverity, Collectors.counting()));

        Map<String, Object> result = new HashMap<>();
        result.put("alerts", alerts);
        result.put("total", alerts.size());
        result.put("team", Map.of("id", team.getId(), "name", team.getName()));
        result.put("summary", Map.of(
                "byStatus", statusCounts,
                "bySeverity", severityCounts,
                "activeCount", statusCounts.getOrDefault("active", 0L),
                "criticalCount", severityCounts.getOrDefault("critical", 0L)
        ));

        return result;
    }

    private Map<String, Object> convertAlertToMap(AlertEntity alert) {
        Map<String, Object> map = new HashMap<>();
        map.put("id", alert.getId());
        map.put("name", alert.getName());
        map.put("type", alert.getType());
        map.put("severity", alert.getSeverity());
        map.put("status", alert.getStatus());
        map.put("serviceName", alert.getServiceName());
        map.put("metric", alert.getMetric());
        map.put("operator", alert.getOperator());
        map.put("threshold", alert.getThreshold());
        map.put("currentValue", alert.getCurrentValue());
        map.put("condition", alert.getCondition());
        map.put("createdAt", alert.getCreatedAt() != null ?
                alert.getCreatedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli() : null);
        map.put("triggeredAt", alert.getTriggeredAt() != null ?
                alert.getTriggeredAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli() : null);
        map.put("acknowledgedAt", alert.getAcknowledgedAt() != null ?
                alert.getAcknowledgedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli() : null);
        map.put("resolvedAt", alert.getResolvedAt() != null ?
                alert.getResolvedAt().atZone(ZoneId.systemDefault()).toInstant().toEpochMilli() : null);
        return map;
    }

    /**
     * Get a single trace by ID with all its spans
     */
    public Map<String, Object> getTrace(Long userId, Long teamId, String traceId) {
        validateUserTeamAccess(userId, teamId);

        TeamEntity team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team", "id", teamId));

        // Fetch trace from database
        Optional<TraceEntity> traceOpt = traceRepository.findByTraceId(traceId);

        if (traceOpt.isEmpty()) {
            throw new ResourceNotFoundException("Trace", "traceId", traceId);
        }

        TraceEntity trace = traceOpt.get();

        // Verify trace belongs to this team
        if (!teamId.equals(trace.getTeamId())) {
            throw new AccessDeniedException("Trace does not belong to this team");
        }

        // Fetch all spans for this trace
        List<SpanEntity> spans = spanRepository.findByTraceIdOrderByStartTimeAsc(traceId);

        // Build trace response with spans
        Map<String, Object> traceMap = new HashMap<>();
        traceMap.put("traceId", trace.getTraceId());
        traceMap.put("serviceName", trace.getServiceName());
        traceMap.put("operationName", trace.getRootOperation());
        traceMap.put("duration", trace.getDuration());
        traceMap.put("spanCount", spans.size());
        traceMap.put("timestamp", trace.getStartTime().toEpochMilli());
        traceMap.put("error", "ERROR".equals(trace.getStatus()));
        traceMap.put("status", trace.getStatus());

        // Convert spans with depth calculation
        List<Map<String, Object>> spanMaps = buildSpanHierarchy(spans);
        traceMap.put("spans", spanMaps);

        Map<String, Object> result = new HashMap<>();
        result.put("trace", traceMap);
        result.put("team", Map.of("id", team.getId(), "name", team.getName()));

        return result;
    }

    /**
     * Build span hierarchy with depth for waterfall visualization
     */
    private List<Map<String, Object>> buildSpanHierarchy(List<SpanEntity> spans) {
        // Create a map of spanId -> span for quick lookup
        Map<String, SpanEntity> spanMap = spans.stream()
                .collect(Collectors.toMap(SpanEntity::getSpanId, s -> s));

        // Calculate depth for each span
        Map<String, Integer> depthMap = new HashMap<>();
        for (SpanEntity span : spans) {
            int depth = 0;
            String parentId = span.getParentSpanId();
            while (parentId != null && spanMap.containsKey(parentId)) {
                depth++;
                parentId = spanMap.get(parentId).getParentSpanId();
            }
            depthMap.put(span.getSpanId(), depth);
        }

        // Convert to maps with depth
        return spans.stream().map(span -> {
            Map<String, Object> map = new HashMap<>();
            map.put("spanId", span.getSpanId());
            map.put("parentSpanId", span.getParentSpanId());
            map.put("operationName", span.getOperationName());
            map.put("serviceName", span.getServiceName());
            map.put("duration", span.getDuration());
            map.put("startTime", span.getStartTime().toEpochMilli());
            map.put("status", span.getStatus());
            map.put("kind", span.getKind());
            map.put("depth", depthMap.getOrDefault(span.getSpanId(), 0));
            map.put("error", "ERROR".equals(span.getStatus()));

            // Add tags/attributes if available
            if (span.getAttributes() != null && !span.getAttributes().isEmpty()) {
                try {
                    // Parse JSON attributes
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    Map<String, Object> attrs = mapper.readValue(span.getAttributes(), Map.class);
                    map.put("tags", attrs);
                } catch (Exception e) {
                    log.warn("Failed to parse span attributes: {}", e.getMessage());
                    map.put("tags", Map.of());
                }
            } else {
                map.put("tags", Map.of());
            }

            return map;
        }).collect(Collectors.toList());
    }
}

