/**
 * MockDataService - Generates realistic mock data for development
 */

class MockDataService {
    constructor() {
        this.services = ['api-gateway', 'user-service', 'payment-service', 'notification-service', 'auth-service'];
        this.operations = ['GET /api/users', 'POST /api/orders', 'GET /api/products', 'PUT /api/users/:id', 'DELETE /api/orders/:id'];
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

        return {
            stats: {
                avgLatency: this.randomValue(150, 250),
                throughput: this.randomValue(800, 1200),
                errorRate: this.randomValue(1, 5),
                activeServices: 5
            },
            latencyData: this.generateTimeSeriesDataWithPattern(dataPoints, 100, 300, startTime, endTime, 'latency'),
            throughputData: this.generateTimeSeriesDataWithPattern(dataPoints, 700, 1300, startTime, endTime, 'throughput'),
            errorRateData: this.generateTimeSeriesDataWithPattern(dataPoints, 0, 10, startTime, endTime, 'error'),
            serviceLatency: this.services.map(service => ({
                serviceName: service,
                avgLatency: this.randomValue(80, 250),
                p95Latency: this.randomValue(200, 400),
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

        // Generate time series data for each metric type with varying patterns
        const latencyTimeSeries = this.generateTimeSeriesDataWithPattern(
            dataPoints, 100, 300, startTime, endTime, 'latency'
        );
        const throughputTimeSeries = this.generateTimeSeriesDataWithPattern(
            dataPoints, 500, 1500, startTime, endTime, 'throughput'
        );
        const errorRateTimeSeries = this.generateTimeSeriesDataWithPattern(
            dataPoints, 0, 10, startTime, endTime, 'error'
        );

        // Generate flat metrics array for table
        const metricsArray = this.services
            .filter(s => !service || s === service)
            .flatMap(serviceName => [
                {
                    serviceName,
                    metricName: 'api.latency',
                    value: this.randomValue(100, 300),
                    timestamp: endTime,
                    unit: 'ms',
                    endpoint: '/api/v1/' + serviceName.toLowerCase()
                },
                {
                    serviceName,
                    metricName: 'throughput',
                    value: this.randomValue(500, 1500),
                    timestamp: endTime,
                    unit: 'req/min',
                    endpoint: '/api/v1/' + serviceName.toLowerCase()
                },
                {
                    serviceName,
                    metricName: 'error.rate',
                    value: this.randomValue(0, 8),
                    timestamp: endTime,
                    unit: 'errors/min',
                    endpoint: '/api/v1/' + serviceName.toLowerCase()
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
        const now = Date.now();
        const levels = ['INFO', 'WARN', 'ERROR', 'DEBUG'];
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
            const level = levels[Math.floor(Math.random() * levels.length)];
            logs.push({
                timestamp: now - (i * 5000),
                level,
                serviceName: this.services[Math.floor(Math.random() * this.services.length)],
                message: messages[Math.floor(Math.random() * messages.length)],
                logger: 'com.observability.service.Handler',
                threadName: `http-nio-8080-exec-${Math.floor(Math.random() * 10)}`
            });
        }

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
            
            traces.push({
                traceId,
                serviceName: this.services[Math.floor(Math.random() * this.services.length)],
                operationName: this.operations[Math.floor(Math.random() * this.operations.length)],
                duration,
                spans: this.generateSpans(spanCount, duration),
                timestamp: now - (i * 10000),
                error: Math.random() < 0.1
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
        const services = this.services.map((name, index) => {
            const errorRate = this.randomValue(0, 15);
            const lastSeen = now - this.randomInt(0, 60000);
            const timeSinceLastSeen = now - lastSeen;
            
            let status = 'healthy';
            if (timeSinceLastSeen > 300000) status = 'down';
            else if (timeSinceLastSeen > 60000 || errorRate > 10) status = 'degraded';
            
            return {
                name,
                status,
                metricCount: this.randomInt(50, 200),
                logCount: this.randomInt(100, 1000),
                traceCount: this.randomInt(20, 100),
                errorRate,
                lastSeen
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

