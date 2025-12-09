/**
 * MockDataService - Generates realistic mock data for development
 */

class MockDataService {
    constructor() {
        this.services = ['api-gateway', 'user-service', 'payment-service', 'notification-service', 'auth-service'];
        this.operations = ['GET /api/users', 'POST /api/orders', 'GET /api/products', 'PUT /api/users/:id', 'DELETE /api/orders/:id'];

        // Pod and container data
        this.pods = [
            { name: 'api-gateway-7d8f9c6b5-x2k4m', service: 'api-gateway', node: 'node-1' },
            { name: 'api-gateway-7d8f9c6b5-p9n3q', service: 'api-gateway', node: 'node-2' },
            { name: 'user-service-5c4d3b2a1-h7j8k', service: 'user-service', node: 'node-1' },
            { name: 'user-service-5c4d3b2a1-m4n5p', service: 'user-service', node: 'node-3' },
            { name: 'payment-service-9e8f7g6h-q1w2e', service: 'payment-service', node: 'node-2' },
            { name: 'payment-service-9e8f7g6h-r3t4y', service: 'payment-service', node: 'node-1' },
            { name: 'notification-service-1a2b3c4d-u5i6o', service: 'notification-service', node: 'node-3' },
            { name: 'auth-service-6f5e4d3c-z9x8c', service: 'auth-service', node: 'node-2' }
        ];

        this.containers = [
            { name: 'api-gateway', pod: 'api-gateway-7d8f9c6b5-x2k4m', image: 'observex/api-gateway:v1.2.3' },
            { name: 'envoy-proxy', pod: 'api-gateway-7d8f9c6b5-x2k4m', image: 'envoyproxy/envoy:v1.28' },
            { name: 'api-gateway', pod: 'api-gateway-7d8f9c6b5-p9n3q', image: 'observex/api-gateway:v1.2.3' },
            { name: 'user-service', pod: 'user-service-5c4d3b2a1-h7j8k', image: 'observex/user-service:v2.1.0' },
            { name: 'user-service', pod: 'user-service-5c4d3b2a1-m4n5p', image: 'observex/user-service:v2.1.0' },
            { name: 'payment-service', pod: 'payment-service-9e8f7g6h-q1w2e', image: 'observex/payment-service:v1.5.2' },
            { name: 'payment-service', pod: 'payment-service-9e8f7g6h-r3t4y', image: 'observex/payment-service:v1.5.2' },
            { name: 'notification-service', pod: 'notification-service-1a2b3c4d-u5i6o', image: 'observex/notification:v1.0.1' },
            { name: 'auth-service', pod: 'auth-service-6f5e4d3c-z9x8c', image: 'observex/auth-service:v3.0.0' }
        ];
    }

    /**
     * Generate mock overview data
     */
    getOverview(params = {}) {
        const endTime = params.endTime || Date.now();
        const startTime = params.startTime || (endTime - 3600000); // Default 1 hour
        const timeRange = endTime - startTime;
        const dataPoints = this.calculateDataPoints(timeRange);

        console.log(`[MockDataService] Generating overview for time range: ${this.formatTimeRange(timeRange)} (${dataPoints} points)`);

        // Define API endpoints for detailed metrics
        const apiEndpoints = [
            { endpoint: 'GET /api/v1/metrics', baseLatency: 45, baseThroughput: 1200, baseError: 0.5 },
            { endpoint: 'POST /api/v1/metrics', baseLatency: 85, baseThroughput: 800, baseError: 1.2 },
            { endpoint: 'GET /api/v1/logs', baseLatency: 120, baseThroughput: 600, baseError: 0.8 },
            { endpoint: 'POST /api/v1/logs', baseLatency: 95, baseThroughput: 400, baseError: 2.1 },
            { endpoint: 'GET /api/v1/traces', baseLatency: 180, baseThroughput: 350, baseError: 1.5 },
            { endpoint: 'GET /api/v1/services', baseLatency: 55, baseThroughput: 900, baseError: 0.3 },
            { endpoint: 'GET /api/v1/dashboards', baseLatency: 65, baseThroughput: 500, baseError: 0.4 },
            { endpoint: 'GET /api/v1/alerts', baseLatency: 40, baseThroughput: 700, baseError: 0.2 }
        ];

        // Generate API endpoint-level time series data
        const latencyData = [];
        const throughputData = [];
        const errorRateData = [];

        apiEndpoints.forEach(api => {
            const latency = this.generateTimeSeriesDataWithPattern(dataPoints, api.baseLatency * 0.7, api.baseLatency * 1.5, startTime, endTime, 'latency');
            latency.forEach(d => { d.endpoint = api.endpoint; });
            latencyData.push(...latency);

            const throughput = this.generateTimeSeriesDataWithPattern(dataPoints, api.baseThroughput * 0.6, api.baseThroughput * 1.4, startTime, endTime, 'throughput');
            throughput.forEach(d => { d.endpoint = api.endpoint; });
            throughputData.push(...throughput);

            const errors = this.generateTimeSeriesDataWithPattern(dataPoints, 0, api.baseError * 3, startTime, endTime, 'error');
            errors.forEach(d => { d.endpoint = api.endpoint; });
            errorRateData.push(...errors);
        });

        return {
            stats: {
                avgLatency: this.randomValue(150, 250),
                throughput: this.randomValue(800, 1200),
                errorRate: this.randomValue(1, 5),
                activeServices: apiEndpoints.length
            },
            latencyData: latencyData,
            throughputData: throughputData,
            errorRateData: errorRateData,
            serviceLatency: apiEndpoints.map(api => ({
                serviceName: api.endpoint,
                avgLatency: this.randomValue(api.baseLatency * 0.8, api.baseLatency * 1.2),
                p95Latency: this.randomValue(api.baseLatency * 1.5, api.baseLatency * 2),
                timestamp: endTime
            })),
            recentActivity: this.generateRecentActivity(10),
            timeRange: {
                startTime,
                endTime,
                duration: timeRange,
                dataPoints
            }
        };
    }

    /**
     * Generate mock metrics data
     */
    getMetrics(params = {}) {
        const endTime = params.endTime || Date.now();
        const startTime = params.startTime || (endTime - 3600000); // Default 1 hour
        const service = params.serviceName;

        // Calculate appropriate number of data points based on time range
        const timeRange = endTime - startTime;
        const dataPoints = this.calculateDataPoints(timeRange);

        console.log(`[MockDataService] Generating metrics for time range: ${this.formatTimeRange(timeRange)} (${dataPoints} points)`);

        // Define API endpoints for detailed metrics
        const apiEndpoints = [
            { endpoint: 'GET /api/v1/metrics', baseLatency: 45, baseThroughput: 1200, baseError: 0.5 },
            { endpoint: 'POST /api/v1/metrics', baseLatency: 85, baseThroughput: 800, baseError: 1.2 },
            { endpoint: 'GET /api/v1/logs', baseLatency: 120, baseThroughput: 600, baseError: 0.8 },
            { endpoint: 'POST /api/v1/logs', baseLatency: 95, baseThroughput: 400, baseError: 2.1 },
            { endpoint: 'GET /api/v1/traces', baseLatency: 180, baseThroughput: 350, baseError: 1.5 },
            { endpoint: 'GET /api/v1/services', baseLatency: 55, baseThroughput: 900, baseError: 0.3 },
            { endpoint: 'GET /api/v1/dashboards', baseLatency: 65, baseThroughput: 500, baseError: 0.4 },
            { endpoint: 'GET /api/v1/alerts', baseLatency: 40, baseThroughput: 700, baseError: 0.2 }
        ];

        // Generate time series data for each API endpoint
        const latencyTimeSeries = [];
        const throughputTimeSeries = [];
        const errorRateTimeSeries = [];

        apiEndpoints.forEach(api => {
            // Generate latency data for this endpoint
            const latencyData = this.generateTimeSeriesDataWithPattern(
                dataPoints,
                api.baseLatency * 0.7,
                api.baseLatency * 1.5,
                startTime,
                endTime,
                'latency'
            );
            latencyData.forEach(d => {
                d.endpoint = api.endpoint;
                d.serviceName = api.endpoint.split('/')[3] || 'api';
            });
            latencyTimeSeries.push(...latencyData);

            // Generate throughput data for this endpoint
            const throughputData = this.generateTimeSeriesDataWithPattern(
                dataPoints,
                api.baseThroughput * 0.6,
                api.baseThroughput * 1.4,
                startTime,
                endTime,
                'throughput'
            );
            throughputData.forEach(d => {
                d.endpoint = api.endpoint;
                d.serviceName = api.endpoint.split('/')[3] || 'api';
            });
            throughputTimeSeries.push(...throughputData);

            // Generate error rate data for this endpoint
            const errorData = this.generateTimeSeriesDataWithPattern(
                dataPoints,
                0,
                api.baseError * 3,
                startTime,
                endTime,
                'error'
            );
            errorData.forEach(d => {
                d.endpoint = api.endpoint;
                d.serviceName = api.endpoint.split('/')[3] || 'api';
            });
            errorRateTimeSeries.push(...errorData);
        });

        // Generate flat metrics array for table
        const metricsArray = apiEndpoints.flatMap(api => [
            {
                serviceName: api.endpoint.split('/')[3] || 'api',
                metricName: 'api.latency',
                value: this.randomValue(api.baseLatency * 0.8, api.baseLatency * 1.2),
                timestamp: endTime,
                unit: 'ms',
                endpoint: api.endpoint
            },
            {
                serviceName: api.endpoint.split('/')[3] || 'api',
                metricName: 'throughput',
                value: this.randomValue(api.baseThroughput * 0.8, api.baseThroughput * 1.2),
                timestamp: endTime,
                unit: 'req/min',
                endpoint: api.endpoint
            },
            {
                serviceName: api.endpoint.split('/')[3] || 'api',
                metricName: 'error.rate',
                value: this.randomValue(0, api.baseError * 2),
                timestamp: endTime,
                unit: 'errors/min',
                endpoint: api.endpoint
            }
        ]);

        // Calculate statistics
        const calculateStats = (data) => {
            const values = data.map(d => d.value);
            return {
                avg: values.reduce((a, b) => a + b, 0) / values.length,
                min: Math.min(...values),
                max: Math.max(...values),
                data: data
            };
        };

        return {
            // Metrics grouped by type (for charts)
            metrics: {
                'api.latency': latencyTimeSeries,
                'throughput': throughputTimeSeries,
                'error.rate': errorRateTimeSeries
            },
            // Statistics for each metric type
            statistics: {
                'api.latency': calculateStats(latencyTimeSeries),
                'throughput': calculateStats(throughputTimeSeries),
                'error.rate': calculateStats(errorRateTimeSeries)
            },
            // Flat array of all metrics (for table)
            allMetrics: metricsArray,
            // Metadata
            timeRange: {
                startTime,
                endTime,
                duration: timeRange,
                dataPoints
            }
        };
    }

    /**
     * Generate mock logs data
     */
    getLogs(params = {}) {
        const count = params.limit || 50;
        const logs = [];
        const endTime = params.endTime || Date.now();
        const startTime = params.startTime || (endTime - 3600000); // Default 1 hour
        const timeRange = endTime - startTime;
        const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
        const levelWeights = [0.6, 0.2, 0.1, 0.1]; // 60% INFO, 20% WARN, 10% ERROR, 10% DEBUG
        const messages = [
            'Request processed successfully',
            'Database connection established',
            'Cache miss for key: user_123',
            'Authentication successful for user',
            'Failed to connect to external service',
            'Slow query detected: 2.5s',
            'Rate limit exceeded for IP',
            'Payment processed successfully',
            'Email sent to user',
            'Session expired for user'
        ];

        for (let i = 0; i < count; i++) {
            // Spread logs across the time range with some randomness
            const randomOffset = Math.random() * timeRange;
            const timestamp = startTime + randomOffset;

            // Weighted level selection
            const rand = Math.random();
            let level;
            if (rand < levelWeights[0]) level = 'INFO';
            else if (rand < levelWeights[0] + levelWeights[1]) level = 'WARN';
            else if (rand < levelWeights[0] + levelWeights[1] + levelWeights[2]) level = 'ERROR';
            else level = 'DEBUG';

            const service = this.services[Math.floor(Math.random() * this.services.length)];
            const servicePods = this.pods.filter(p => p.service === service);
            const pod = servicePods.length > 0 ? servicePods[Math.floor(Math.random() * servicePods.length)] : this.pods[0];
            const podContainers = this.containers.filter(c => c.pod === pod.name);
            const container = podContainers.length > 0 ? podContainers[Math.floor(Math.random() * podContainers.length)] : this.containers[0];

            logs.push({
                timestamp,
                level,
                serviceName: service,
                message: messages[Math.floor(Math.random() * messages.length)],
                logger: 'com.observability.service.Handler',
                threadName: `http-nio-8080-exec-${Math.floor(Math.random() * 10)}`,
                pod: pod.name,
                container: container.name,
                node: pod.node
            });
        }

        // Sort by timestamp descending (most recent first)
        logs.sort((a, b) => b.timestamp - a.timestamp);

        return { logs };
    }

    /**
     * Generate mock traces data
     */
    getTraces(params = {}) {
        const count = params.limit || 20;
        const traces = [];
        const now = Date.now();

        for (let i = 0; i < count; i++) {
            const spanCount = this.randomInt(2, 8);
            const duration = this.randomValue(50, 500);
            const traceId = this.generateId();
            const service = this.services[Math.floor(Math.random() * this.services.length)];
            const servicePods = this.pods.filter(p => p.service === service);
            const pod = servicePods.length > 0 ? servicePods[Math.floor(Math.random() * servicePods.length)] : this.pods[0];
            const podContainers = this.containers.filter(c => c.pod === pod.name);
            const container = podContainers.length > 0 ? podContainers[Math.floor(Math.random() * podContainers.length)] : this.containers[0];

            traces.push({
                traceId,
                serviceName: service,
                operationName: this.operations[Math.floor(Math.random() * this.operations.length)],
                duration,
                spans: this.generateSpans(spanCount, duration),
                timestamp: now - (i * 10000),
                error: Math.random() < 0.1,
                pod: pod.name,
                container: container.name,
                node: pod.node
            });
        }

        return { traces };
    }

    /**
     * Get single trace by ID
     */
    getTrace(traceId) {
        const spanCount = this.randomInt(3, 10);
        const duration = this.randomValue(100, 600);
        
        return {
            trace: {
                traceId,
                serviceName: this.services[0],
                operationName: this.operations[0],
                duration,
                spans: this.generateSpans(spanCount, duration),
                timestamp: Date.now(),
                error: false
            }
        };
    }

    /**
     * Generate mock services data
     */
    getServices() {
        const now = Date.now();
        const podStatuses = ['running', 'starting', 'degraded', 'terminated'];

        const services = this.services.map((name, index) => {
            const errorRate = this.randomValue(0, 15);
            const lastSeen = now - this.randomInt(0, 60000);
            const timeSinceLastSeen = now - lastSeen;

            let status = 'healthy';
            if (timeSinceLastSeen > 300000) status = 'down';
            else if (timeSinceLastSeen > 60000 || errorRate > 10) status = 'degraded';

            // Get pods for this service
            const servicePods = this.pods.filter(p => p.service === name);
            const pods = servicePods.map(pod => {
                // Determine pod status based on service status and randomness
                let podStatus = 'running';
                if (status === 'down') {
                    podStatus = Math.random() > 0.3 ? 'terminated' : 'degraded';
                } else if (status === 'degraded') {
                    podStatus = Math.random() > 0.5 ? 'degraded' : 'running';
                } else {
                    // Healthy service - mostly running pods, occasionally starting
                    podStatus = Math.random() > 0.9 ? 'starting' : 'running';
                }

                // Get containers for this pod
                const podContainers = this.containers.filter(c => c.pod === pod.name);
                const containers = podContainers.map(container => ({
                    name: container.name,
                    image: container.image,
                    status: podStatus === 'running' ? 'running' :
                            podStatus === 'starting' ? (Math.random() > 0.5 ? 'waiting' : 'running') :
                            podStatus === 'degraded' ? 'crashLoopBackOff' : 'terminated',
                    restarts: podStatus === 'degraded' ? this.randomInt(3, 15) : this.randomInt(0, 2),
                    cpu: `${this.randomInt(10, 80)}m`,
                    memory: `${this.randomInt(64, 512)}Mi`,
                    ready: podStatus === 'running'
                }));

                return {
                    name: pod.name,
                    node: pod.node,
                    status: podStatus,
                    ready: podStatus === 'running' ? `${containers.length}/${containers.length}` :
                           podStatus === 'starting' ? `0/${containers.length}` :
                           `${Math.floor(containers.length / 2)}/${containers.length}`,
                    restarts: containers.reduce((sum, c) => sum + c.restarts, 0),
                    age: this.formatAge(now - this.randomInt(3600000, 86400000 * 7)),
                    cpu: `${this.randomInt(20, 200)}m`,
                    memory: `${this.randomInt(128, 1024)}Mi`,
                    containers: containers
                };
            });

            return {
                name,
                status,
                metricCount: this.randomInt(50, 200),
                logCount: this.randomInt(100, 1000),
                traceCount: this.randomInt(20, 100),
                errorRate,
                lastSeen,
                pods: pods,
                podSummary: {
                    total: pods.length,
                    running: pods.filter(p => p.status === 'running').length,
                    starting: pods.filter(p => p.status === 'starting').length,
                    degraded: pods.filter(p => p.status === 'degraded').length,
                    terminated: pods.filter(p => p.status === 'terminated').length
                }
            };
        });

        return {
            services,
            total: services.length,
            healthy: services.filter(s => s.status === 'healthy').length,
            degraded: services.filter(s => s.status === 'degraded').length,
            down: services.filter(s => s.status === 'down').length
        };
    }

    /**
     * Format age string
     */
    formatAge(ms) {
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    }

    /**
     * Calculate appropriate number of data points based on time range
     */
    calculateDataPoints(timeRange) {
        // 5 minutes = 5 points
        if (timeRange <= 5 * 60 * 1000) return 10;
        // 15 minutes = 15 points
        if (timeRange <= 15 * 60 * 1000) return 15;
        // 30 minutes = 20 points
        if (timeRange <= 30 * 60 * 1000) return 20;
        // 1 hour = 30 points
        if (timeRange <= 60 * 60 * 1000) return 30;
        // 3 hours = 36 points
        if (timeRange <= 3 * 60 * 60 * 1000) return 36;
        // 6 hours = 48 points
        if (timeRange <= 6 * 60 * 60 * 1000) return 48;
        // 12 hours = 60 points
        if (timeRange <= 12 * 60 * 60 * 1000) return 60;
        // 24 hours = 72 points
        if (timeRange <= 24 * 60 * 60 * 1000) return 72;
        // 2 days = 96 points
        if (timeRange <= 2 * 24 * 60 * 60 * 1000) return 96;
        // 7 days = 168 points
        return 168;
    }

    /**
     * Format time range for display
     */
    formatTimeRange(timeRange) {
        const minutes = timeRange / (60 * 1000);
        const hours = timeRange / (60 * 60 * 1000);
        const days = timeRange / (24 * 60 * 60 * 1000);

        if (minutes < 60) return `${minutes} minutes`;
        if (hours < 24) return `${hours} hours`;
        return `${days} days`;
    }

    /**
     * Generate time series data with realistic patterns
     */
    generateTimeSeriesDataWithPattern(points, min, max, startTime, endTime, pattern = 'default') {
        const data = [];
        const interval = (endTime - startTime) / points;

        for (let i = 0; i < points; i++) {
            const timestamp = startTime + (i * interval);
            const progress = i / points;

            // Add pattern-based variation
            let value;
            switch (pattern) {
                case 'latency':
                    // Latency tends to spike occasionally
                    value = this.randomValue(min, max);
                    if (Math.random() < 0.1) {
                        value = this.randomValue(max * 0.8, max * 1.2);
                    }
                    break;
                case 'throughput':
                    // Throughput varies with time of day pattern
                    const hourOfDay = new Date(timestamp).getHours();
                    const peakHours = hourOfDay >= 9 && hourOfDay <= 17;
                    const multiplier = peakHours ? 1.3 : 0.7;
                    value = this.randomValue(min * multiplier, max * multiplier);
                    break;
                case 'error':
                    // Errors are usually low with occasional spikes
                    value = Math.random() < 0.85 ? this.randomValue(min, max * 0.3) : this.randomValue(max * 0.5, max);
                    break;
                default:
                    value = this.randomValue(min, max);
            }

            data.push({
                timestamp: Math.floor(timestamp),
                value: Math.max(min, Math.min(max, value))
            });
        }

        return data;
    }

    /**
     * Generate time series data (legacy method for backward compatibility)
     */
    generateTimeSeriesData(points, min, max, endTime) {
        const data = [];
        const interval = 60000; // 1 minute

        for (let i = points - 1; i >= 0; i--) {
            data.push({
                timestamp: endTime - (i * interval),
                value: this.randomValue(min, max)
            });
        }

        return data;
    }

    /**
     * Generate spans for a trace
     */
    generateSpans(count, totalDuration) {
        const spans = [];
        const operations = ['HTTP GET', 'Database Query', 'Cache Lookup', 'External API Call', 'Message Queue'];
        
        for (let i = 0; i < count; i++) {
            spans.push({
                spanId: this.generateId(8),
                operationName: operations[Math.floor(Math.random() * operations.length)],
                duration: this.randomValue(10, totalDuration / count),
                tags: {
                    'http.method': 'GET',
                    'http.status_code': Math.random() < 0.9 ? '200' : '500',
                    'component': 'http-client'
                }
            });
        }
        
        return spans;
    }

    /**
     * Generate recent activity
     */
    generateRecentActivity(count) {
        const activities = [];
        const now = Date.now();
        const types = ['deployment', 'alert', 'incident', 'config_change'];
        const descriptions = [
            'Deployed version 2.1.0 to production',
            'High latency alert triggered',
            'Database connection pool exhausted',
            'Updated rate limiting configuration',
            'Service restarted due to memory leak',
            'New feature flag enabled',
            'SSL certificate renewed',
            'Cache cleared for user service'
        ];

        for (let i = 0; i < count; i++) {
            activities.push({
                type: types[Math.floor(Math.random() * types.length)],
                description: descriptions[Math.floor(Math.random() * descriptions.length)],
                timestamp: now - (i * 300000),
                service: this.services[Math.floor(Math.random() * this.services.length)]
            });
        }

        return activities;
    }

    /**
     * Generate random value between min and max
     */
    randomValue(min, max) {
        return Math.round((Math.random() * (max - min) + min) * 100) / 100;
    }

    /**
     * Generate random integer between min and max
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Generate random ID
     */
    generateId(length = 16) {
        const chars = '0123456789abcdef';
        let id = '';
        for (let i = 0; i < length; i++) {
            id += chars[Math.floor(Math.random() * chars.length)];
        }
        return id;
    }

    /**
     * Singleton instance
     */
    static getInstance() {
        if (!MockDataService.instance) {
            MockDataService.instance = new MockDataService();
        }
        return MockDataService.instance;
    }
}

