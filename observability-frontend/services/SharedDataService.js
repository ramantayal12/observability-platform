/**
 * SharedDataService - Centralized data store for consistent data across pages
 * Provides cached data and computed metrics for reusable widgets
 */

class SharedDataService {
    constructor() {
        this.cache = {
            endpoints: null,
            metrics: null,
            lastUpdated: null
        };
        this.listeners = new Map();
        this.cacheTimeout = 30000; // 30 seconds
    }

    static getInstance() {
        if (!SharedDataService.instance) {
            SharedDataService.instance = new SharedDataService();
        }
        return SharedDataService.instance;
    }

    /**
     * Subscribe to data updates
     */
    subscribe(key, callback) {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }
        this.listeners.get(key).push(callback);
        return () => {
            const callbacks = this.listeners.get(key);
            const index = callbacks.indexOf(callback);
            if (index > -1) callbacks.splice(index, 1);
        };
    }

    /**
     * Notify listeners of data updates
     */
    notify(key, data) {
        const callbacks = this.listeners.get(key) || [];
        callbacks.forEach(cb => cb(data));
    }

    /**
     * Process and cache endpoint data with computed metrics
     */
    processEndpointData(rawData) {
        const endpoints = {};
        
        // Process latency data
        if (rawData.latencyData) {
            rawData.latencyData.forEach(item => {
                const ep = item.endpoint || 'Unknown';
                if (!endpoints[ep]) {
                    endpoints[ep] = this.createEndpointEntry();
                }
                endpoints[ep].latencyData.push(item.value);
            });
        }

        // Process throughput data
        if (rawData.throughputData) {
            rawData.throughputData.forEach(item => {
                const ep = item.endpoint || 'Unknown';
                if (!endpoints[ep]) {
                    endpoints[ep] = this.createEndpointEntry();
                }
                endpoints[ep].throughputData.push(item.value);
            });
        }

        // Process error rate data
        if (rawData.errorRateData) {
            rawData.errorRateData.forEach(item => {
                const ep = item.endpoint || 'Unknown';
                if (!endpoints[ep]) {
                    endpoints[ep] = this.createEndpointEntry();
                }
                endpoints[ep].errorData.push(item.value);
            });
        }

        // Calculate computed metrics for each endpoint
        Object.keys(endpoints).forEach(ep => {
            const d = endpoints[ep];
            d.metrics = this.computeMetrics(d);
        });

        this.cache.endpoints = endpoints;
        this.cache.lastUpdated = Date.now();
        this.notify('endpoints', endpoints);
        
        return endpoints;
    }

    createEndpointEntry() {
        return {
            latencyData: [],
            throughputData: [],
            errorData: [],
            metrics: null
        };
    }

    /**
     * Compute percentile and aggregate metrics
     */
    computeMetrics(data) {
        const latency = data.latencyData;
        const throughput = data.throughputData;
        const errors = data.errorData;

        return {
            // Latency metrics
            avgLatency: this.average(latency),
            p50Latency: this.percentile(latency, 50),
            p90Latency: this.percentile(latency, 90),
            p95Latency: this.percentile(latency, 95),
            p99Latency: this.percentile(latency, 99),
            minLatency: Math.min(...latency) || 0,
            maxLatency: Math.max(...latency) || 0,
            
            // Throughput metrics
            avgThroughput: this.average(throughput),
            peakThroughput: Math.max(...throughput) || 0,
            totalRequests: throughput.reduce((a, b) => a + b, 0),
            
            // Error metrics
            avgErrorRate: this.average(errors),
            maxErrorRate: Math.max(...errors) || 0,
            error4xxRate: this.average(errors) * 0.7, // Simulated split
            error5xxRate: this.average(errors) * 0.3
        };
    }

    average(arr) {
        if (!arr || arr.length === 0) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    percentile(arr, p) {
        if (!arr || arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    /**
     * Get cached endpoints or null if stale
     */
    getEndpoints() {
        if (this.cache.endpoints && Date.now() - this.cache.lastUpdated < this.cacheTimeout) {
            return this.cache.endpoints;
        }
        return null;
    }

    clearCache() {
        this.cache = { endpoints: null, metrics: null, lastUpdated: null };
    }
}

// Make globally available
window.SharedDataService = SharedDataService;

