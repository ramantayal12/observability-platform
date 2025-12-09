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
    getOverview() {
        const now = Date.now();
        const dataPoints = 20;
        
        return {
            stats: {
                avgLatency: this.randomValue(150, 250),
                throughput: this.randomValue(800, 1200),
                errorRate: this.randomValue(1, 5),
                activeServices: 5
            },
            latencyData: this.generateTimeSeriesData(dataPoints, 100, 300, now),
            throughputData: this.generateTimeSeriesData(dataPoints, 700, 1300, now),
            errorRateData: this.generateTimeSeriesData(dataPoints, 0, 10, now),
            serviceLatency: this.services.map(service => ({
                serviceName: service,
                avgLatency: this.randomValue(80, 250),
                p95Latency: this.randomValue(200, 400),
                timestamp: now
            })),
            recentActivity: this.generateRecentActivity(10)
        };
    }

    /**
     * Generate mock metrics data
     */
    getMetrics(params = {}) {
        const now = Date.now();
        const dataPoints = 30;
        const service = params.serviceName;
        
        const metrics = this.services
            .filter(s => !service || s === service)
            .flatMap(serviceName => [
                {
                    serviceName,
                    metricName: 'api.latency',
                    value: this.randomValue(100, 300),
                    timestamp: now,
                    unit: 'ms'
                },
                {
                    serviceName,
                    metricName: 'throughput',
                    value: this.randomValue(500, 1500),
                    timestamp: now,
                    unit: 'req/min'
                },
                {
                    serviceName,
                    metricName: 'error.rate',
                    value: this.randomValue(0, 8),
                    timestamp: now,
                    unit: 'errors/min'
                }
            ]);

        return {
            metrics,
            timeSeries: {
                latency: this.generateTimeSeriesData(dataPoints, 100, 300, now),
                throughput: this.generateTimeSeriesData(dataPoints, 500, 1500, now),
                errorRate: this.generateTimeSeriesData(dataPoints, 0, 10, now)
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
     * Generate time series data
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

