/**
 * Metrics Page
 * Enterprise-level metrics exploration and analysis
 */

(function() {
    'use strict';

    // Check authentication first
    const authService = AuthService.getInstance();
    if (!authService.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    // Get singleton instances
    const eventBus = EventBus.getInstance();
    const stateManager = StateManager.getInstance();
    const apiService = ApiService.getInstance();
    const notificationManager = NotificationManager.getInstance();

    // Page state
    let charts = {};
    let currentFilters = {
        service: '',
        metric: '',
        timeRange: 3600000 // 1 hour
    };
    let autoRefreshInterval = null;
    let timeRangePicker = null;

    /**
     * Initialize the page
     */
    async function init() {
        console.log('Initializing Metrics page...');

        // Setup UI
        setupTimePicker();
        setupAutoRefresh();
        setupFilters();
        initializeCharts();

        // Listen for time range changes
        eventBus.on(Events.TIME_RANGE_CHANGED, handleTimeRangeChange);

        // Load initial data
        await loadMetrics();

        // Setup auto-refresh if enabled
        const autoRefreshEnabled = localStorage.getItem('observability_auto_refresh') === 'true';
        if (autoRefreshEnabled) {
            startAutoRefresh();
        }
    }

    /**
     * Setup time picker
     */
    function setupTimePicker() {
        timeRangePicker = new TimeRangePicker({
            buttonId: 'timePickerBtn',
            dropdownId: 'timePickerDropdown',
            labelId: 'timePickerLabel'
        });

        // Set initial time range
        currentFilters.timeRange = timeRangePicker.getRange();
    }

    /**
     * Handle time range change
     */
    function handleTimeRangeChange(data) {
        console.log('[Metrics] Time range changed:', data);
        currentFilters.timeRange = data.range;
        loadMetrics();
    }

    /**
     * Setup auto-refresh and manual refresh
     */
    function setupAutoRefresh() {
        // Manual refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.classList.add('spinning');
                await loadMetrics();
                refreshBtn.classList.remove('spinning');
                notificationManager.success('Data refreshed');
            });
        }

        // Auto-refresh toggle button
        const autoRefreshBtn = document.getElementById('autoRefreshBtn');
        if (!autoRefreshBtn) return;

        const isEnabled = localStorage.getItem('observability_auto_refresh') === 'true';

        if (isEnabled) {
            autoRefreshBtn.classList.add('active');
        }

        autoRefreshBtn.addEventListener('click', () => {
            const enabled = autoRefreshBtn.classList.toggle('active');
            localStorage.setItem('observability_auto_refresh', enabled);

            if (enabled) {
                startAutoRefresh();
                notificationManager.success('Auto-refresh enabled (30s)');
            } else {
                stopAutoRefresh();
                notificationManager.info('Auto-refresh disabled');
            }
        });
    }

    /**
     * Start auto-refresh
     */
    function startAutoRefresh() {
        stopAutoRefresh(); // Clear any existing interval
        autoRefreshInterval = setInterval(() => {
            loadMetrics();
        }, 30000); // 30 seconds
    }

    /**
     * Stop auto-refresh
     */
    function stopAutoRefresh() {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
    }

    /**
     * Setup filters
     */
    function setupFilters() {
        const applyFiltersBtn = document.getElementById('applyFiltersBtn');
        const serviceFilter = document.getElementById('serviceFilter');
        const metricFilter = document.getElementById('metricFilter');

        applyFiltersBtn.addEventListener('click', () => {
            currentFilters.service = serviceFilter.value;
            currentFilters.metric = metricFilter.value;
            loadMetrics();
        });
    }

    /**
     * Load metrics data
     */
    async function loadMetrics() {
        try {
            const endTime = Date.now();
            const startTime = endTime - currentFilters.timeRange;

            const data = await apiService.fetchMetrics({
                serviceName: currentFilters.service || undefined,
                startTime,
                endTime
            });

            // Update stats
            updateStats(data);

            // Update charts
            updateCharts(data);

            // Update table
            updateTable(data);

            // Load API details
            await loadApiDetails();

            // Update service filter options
            updateServiceFilter(data);

        } catch (error) {
            console.error('Error loading metrics:', error);
            notificationManager.error('Failed to load metrics');
        }
    }

    /**
     * Update stats cards
     */
    function updateStats(data) {
        const metrics = data.metrics || {};
        const statistics = data.statistics || {};

        // Calculate stats
        let avgLatency = 0;
        let p95Latency = 0;
        let throughput = 0;
        let errorRate = 0;

        // API Latency
        if (statistics['api.latency']) {
            avgLatency = statistics['api.latency'].avg || 0;
            const latencyData = statistics['api.latency'].data || [];
            p95Latency = calculatePercentile(latencyData.map(m => m.value), 95);
        }

        // Throughput
        if (statistics['throughput']) {
            throughput = statistics['throughput'].avg || 0;
        }

        // Error Rate
        if (statistics['error.rate']) {
            errorRate = statistics['error.rate'].avg || 0;
        }

        // Update DOM
        document.getElementById('avgLatency').textContent = `${avgLatency.toFixed(2)} ms`;
        document.getElementById('p95Latency').textContent = `${p95Latency.toFixed(2)} ms`;
        document.getElementById('throughput').textContent = `${throughput.toFixed(0)} req/min`;
        document.getElementById('errorRate').textContent = `${errorRate.toFixed(2)}%`;
    }

    /**
     * Initialize interactive charts
     */
    function initializeCharts() {
        if (typeof InteractiveChart === 'undefined') {
            console.warn('[Metrics] InteractiveChart not available');
            return;
        }

        // Latency Chart - multiple API endpoints
        charts.latency = new InteractiveChart({
            containerId: 'latencyChartContainer',
            unit: 'ms',
            height: 250,
            showLegend: true
        });

        // P50 Latency Chart
        charts.p50 = new InteractiveChart({
            containerId: 'p50ChartContainer',
            unit: 'ms',
            height: 250,
            showLegend: true
        });

        // P90 Latency Chart
        charts.p90 = new InteractiveChart({
            containerId: 'p90ChartContainer',
            unit: 'ms',
            height: 250,
            showLegend: true
        });

        // P99 Latency Chart
        charts.p99 = new InteractiveChart({
            containerId: 'p99ChartContainer',
            unit: 'ms',
            height: 250,
            showLegend: true
        });

        // Throughput Chart - multiple services
        charts.throughput = new InteractiveChart({
            containerId: 'throughputChartContainer',
            unit: 'req/min',
            height: 250,
            showLegend: true
        });

        // Error Rate Chart - multiple services
        charts.errorRate = new InteractiveChart({
            containerId: 'errorRateChartContainer',
            unit: '%',
            height: 250,
            showLegend: true
        });

        // CPU Usage Chart
        charts.cpu = new InteractiveChart({
            containerId: 'cpuChartContainer',
            unit: '%',
            height: 250,
            showLegend: true
        });

        // Memory Usage Chart
        charts.memory = new InteractiveChart({
            containerId: 'memoryChartContainer',
            unit: 'MB',
            height: 250,
            showLegend: true
        });

        // Service Metrics Chart - bar chart
        charts.serviceMetrics = new InteractiveChart({
            containerId: 'serviceMetricsChartContainer',
            chartType: 'bar',
            unit: '',
            height: 250,
            showLegend: true,
            fill: false
        });

        // Status Codes Chart - bar chart
        charts.statusCodes = new InteractiveChart({
            containerId: 'statusCodesChartContainer',
            chartType: 'bar',
            unit: '',
            height: 250,
            showLegend: true,
            fill: false
        });

        // Pod CPU Usage Chart
        charts.podCpu = new InteractiveChart({
            containerId: 'podCpuChartContainer',
            unit: '%',
            height: 250,
            showLegend: true
        });

        // Pod Memory Usage Chart
        charts.podMemory = new InteractiveChart({
            containerId: 'podMemoryChartContainer',
            unit: 'MB',
            height: 250,
            showLegend: true
        });

        // Container CPU Usage Chart
        charts.containerCpu = new InteractiveChart({
            containerId: 'containerCpuChartContainer',
            unit: '%',
            height: 250,
            showLegend: true
        });

        // Container Memory Usage Chart
        charts.containerMemory = new InteractiveChart({
            containerId: 'containerMemoryChartContainer',
            unit: 'MB',
            height: 250,
            showLegend: true
        });
    }

    /**
     * Update charts
     */
    function updateCharts(data) {
        const metrics = data.metrics || {};

        // Latency Chart - show by endpoint
        updateLatencyChart(metrics['api.latency'] || []);

        // Separate Percentile Charts
        updatePercentileCharts(metrics['api.latency'] || []);

        // Throughput Chart - show by service
        updateThroughputChart(metrics['throughput'] || []);

        // Error Rate Chart - show by service
        updateErrorRateChart(metrics['error.rate'] || []);

        // CPU Usage Chart
        updateCpuChart(data);

        // Memory Usage Chart
        updateMemoryChart(data);

        // Service Metrics Chart
        updateServiceMetricsChart(data);

        // Status Codes Chart
        updateStatusCodesChart(data);

        // Pod Level Charts
        updatePodCharts(data);

        // Container Level Charts
        updateContainerCharts(data);
    }

    /**
     * Update latency chart with multi-series data
     */
    function updateLatencyChart(data) {
        if (!charts.latency) return;

        // Group data by endpoint/service for multi-line display
        const seriesData = groupDataBySeries(data, 'endpoint');
        charts.latency.setData(seriesData);
    }

    /**
     * Update separate percentile charts (P50, P90 by endpoint, P99 by operation type)
     */
    function updatePercentileCharts(data) {
        if (!charts.p50 && !charts.p90 && !charts.p99) return;

        const now = Date.now();
        const timeRange = currentFilters.timeRange;
        const dataPoints = 60;
        const interval = timeRange / dataPoints;

        // Endpoints for P50 and P90
        const endpoints = [
            { name: 'GET /api/v1/metrics', baseLatency: 45 },
            { name: 'POST /api/v1/logs', baseLatency: 65 },
            { name: 'GET /api/v1/traces', baseLatency: 55 },
            { name: 'GET /api/v1/services', baseLatency: 35 }
        ];

        // Operation types for P99
        const operations = [
            { name: 'HTTP GET', baseLatency: 40 },
            { name: 'HTTP POST', baseLatency: 70 },
            { name: 'HTTP PUT', baseLatency: 55 },
            { name: 'HTTP DELETE', baseLatency: 45 },
            { name: 'Database Query', baseLatency: 85 },
            { name: 'Cache Lookup', baseLatency: 15 }
        ];

        const p50Data = {};
        const p90Data = {};
        const p99Data = {};

        // P50 and P90 by endpoint
        endpoints.forEach(endpoint => {
            p50Data[endpoint.name] = [];
            p90Data[endpoint.name] = [];

            for (let i = 0; i < dataPoints; i++) {
                const timestamp = now - timeRange + (i * interval);
                const base = endpoint.baseLatency + Math.sin(i / 10) * 15;
                p50Data[endpoint.name].push({ x: timestamp, y: base + Math.random() * 10 });
                p90Data[endpoint.name].push({ x: timestamp, y: base * 1.8 + Math.random() * 15 });
            }
        });

        // P99 by operation type
        operations.forEach(op => {
            p99Data[op.name] = [];

            for (let i = 0; i < dataPoints; i++) {
                const timestamp = now - timeRange + (i * interval);
                const base = op.baseLatency + Math.sin(i / 8) * 20;
                p99Data[op.name].push({ x: timestamp, y: base * 2.5 + Math.random() * 30 });
            }
        });

        if (charts.p50) charts.p50.setData(p50Data);
        if (charts.p90) charts.p90.setData(p90Data);
        if (charts.p99) charts.p99.setData(p99Data);
    }

    /**
     * Update throughput chart with multi-series data (by API endpoint)
     */
    function updateThroughputChart(data) {
        if (!charts.throughput) return;

        const seriesData = groupDataBySeries(data, 'endpoint');
        charts.throughput.setData(seriesData);
    }

    /**
     * Update error rate chart with multi-series data (by API endpoint)
     */
    function updateErrorRateChart(data) {
        if (!charts.errorRate) return;

        const seriesData = groupDataBySeries(data, 'endpoint');
        charts.errorRate.setData(seriesData);
    }

    /**
     * Update CPU usage chart
     */
    function updateCpuChart(data) {
        if (!charts.cpu) return;

        const now = Date.now();
        const timeRange = currentFilters.timeRange;
        const dataPoints = 60;
        const interval = timeRange / dataPoints;

        const services = ['api-gateway', 'auth-service', 'metrics-service', 'logs-service'];
        const seriesData = {};

        services.forEach(service => {
            const baseUsage = 20 + Math.random() * 30;
            seriesData[service] = [];
            for (let i = 0; i < dataPoints; i++) {
                const timestamp = now - timeRange + (i * interval);
                const usage = baseUsage + Math.sin(i / 8) * 15 + Math.random() * 10;
                seriesData[service].push({ x: timestamp, y: Math.min(100, Math.max(0, usage)) });
            }
        });

        charts.cpu.setData(seriesData);
    }

    /**
     * Update Memory usage chart
     */
    function updateMemoryChart(data) {
        if (!charts.memory) return;

        const now = Date.now();
        const timeRange = currentFilters.timeRange;
        const dataPoints = 60;
        const interval = timeRange / dataPoints;

        const services = ['api-gateway', 'auth-service', 'metrics-service', 'logs-service'];
        const seriesData = {};

        services.forEach(service => {
            const baseMemory = 256 + Math.random() * 512;
            seriesData[service] = [];
            for (let i = 0; i < dataPoints; i++) {
                const timestamp = now - timeRange + (i * interval);
                // Memory tends to grow slowly over time with occasional GC drops
                const growth = i * 0.5;
                const gcDrop = (i % 15 === 0) ? -50 : 0;
                const memory = baseMemory + growth + gcDrop + Math.random() * 20;
                seriesData[service].push({ x: timestamp, y: Math.max(100, memory) });
            }
        });

        charts.memory.setData(seriesData);
    }

    /**
     * Update service metrics chart - shows request count by API endpoint
     */
    function updateServiceMetricsChart(data) {
        if (!charts.serviceMetrics) return;

        // Group metrics by API endpoint
        const endpointData = {};
        const allMetrics = data.allMetrics || Object.values(data.metrics || {}).flat();

        allMetrics.forEach(metric => {
            const endpoint = metric.endpoint || 'Unknown';
            if (!endpointData[endpoint]) {
                endpointData[endpoint] = 0;
            }
            endpointData[endpoint]++;
        });

        // Convert to series format for InteractiveChart
        const endpoints = Object.keys(endpointData);
        const seriesData = {};
        endpoints.forEach(endpoint => {
            seriesData[endpoint] = [endpointData[endpoint]];
        });

        charts.serviceMetrics.setData(seriesData, ['Request Count']);
    }

    /**
     * Update status codes chart
     */
    function updateStatusCodesChart(data) {
        if (!charts.statusCodes) return;

        // Generate mock status code distribution
        const statusCodes = {
            '200 OK': Math.floor(Math.random() * 5000 + 8000),
            '201 Created': Math.floor(Math.random() * 500 + 200),
            '400 Bad Request': Math.floor(Math.random() * 100 + 50),
            '401 Unauthorized': Math.floor(Math.random() * 50 + 10),
            '404 Not Found': Math.floor(Math.random() * 80 + 30),
            '500 Server Error': Math.floor(Math.random() * 30 + 5)
        };

        const seriesData = {};
        Object.keys(statusCodes).forEach(code => {
            seriesData[code] = [statusCodes[code]];
        });

        charts.statusCodes.setData(seriesData, ['Count']);
    }

    /**
     * Update pod level charts
     */
    function updatePodCharts(data) {
        if (!charts.podCpu && !charts.podMemory) return;

        const now = Date.now();
        const timeRange = currentFilters.timeRange;
        const dataPoints = 60;
        const interval = timeRange / dataPoints;

        // Pod data from MockDataService
        const pods = [
            { name: 'api-gateway-7d8f9c6b5-x2k4m', baseCpu: 25, baseMemory: 256 },
            { name: 'api-gateway-7d8f9c6b5-p9n3q', baseCpu: 22, baseMemory: 248 },
            { name: 'user-service-5c4d3b2a1-h7j8k', baseCpu: 35, baseMemory: 384 },
            { name: 'payment-service-9e8f7g6h-q1w2e', baseCpu: 40, baseMemory: 512 },
            { name: 'auth-service-6f5e4d3c-z9x8c', baseCpu: 18, baseMemory: 192 }
        ];

        const cpuData = {};
        const memoryData = {};

        pods.forEach(pod => {
            cpuData[pod.name] = [];
            memoryData[pod.name] = [];

            for (let i = 0; i < dataPoints; i++) {
                const timestamp = now - timeRange + (i * interval);
                const cpuVariation = Math.sin(i / 8) * 10 + Math.random() * 5;
                const memVariation = Math.sin(i / 12) * 50 + Math.random() * 30;

                cpuData[pod.name].push({ x: timestamp, y: Math.max(0, Math.min(100, pod.baseCpu + cpuVariation)) });
                memoryData[pod.name].push({ x: timestamp, y: Math.max(0, pod.baseMemory + memVariation) });
            }
        });

        if (charts.podCpu) charts.podCpu.setData(cpuData);
        if (charts.podMemory) charts.podMemory.setData(memoryData);
    }

    /**
     * Update container level charts
     */
    function updateContainerCharts(data) {
        if (!charts.containerCpu && !charts.containerMemory) return;

        const now = Date.now();
        const timeRange = currentFilters.timeRange;
        const dataPoints = 60;
        const interval = timeRange / dataPoints;

        // Container data
        const containers = [
            { name: 'api-gateway (x2k4m)', baseCpu: 20, baseMemory: 180 },
            { name: 'envoy-proxy (x2k4m)', baseCpu: 5, baseMemory: 64 },
            { name: 'user-service (h7j8k)', baseCpu: 30, baseMemory: 320 },
            { name: 'payment-service (q1w2e)', baseCpu: 35, baseMemory: 420 },
            { name: 'auth-service (z9x8c)', baseCpu: 15, baseMemory: 160 }
        ];

        const cpuData = {};
        const memoryData = {};

        containers.forEach(container => {
            cpuData[container.name] = [];
            memoryData[container.name] = [];

            for (let i = 0; i < dataPoints; i++) {
                const timestamp = now - timeRange + (i * interval);
                const cpuVariation = Math.sin(i / 6) * 8 + Math.random() * 4;
                const memVariation = Math.sin(i / 10) * 40 + Math.random() * 20;

                cpuData[container.name].push({ x: timestamp, y: Math.max(0, Math.min(100, container.baseCpu + cpuVariation)) });
                memoryData[container.name].push({ x: timestamp, y: Math.max(0, container.baseMemory + memVariation) });
            }
        });

        if (charts.containerCpu) charts.containerCpu.setData(cpuData);
        if (charts.containerMemory) charts.containerMemory.setData(memoryData);
    }

    /**
     * Group time series data by a field for multi-line charts
     */
    function groupDataBySeries(data, groupByField) {
        if (!data || data.length === 0) {
            return { 'No Data': [] };
        }

        const grouped = {};

        data.forEach(item => {
            const seriesName = item[groupByField] || item.serviceName || 'Default';
            if (!grouped[seriesName]) {
                grouped[seriesName] = [];
            }
            grouped[seriesName].push({
                x: item.timestamp,
                y: item.value
            });
        });

        // Sort each series by timestamp
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => a.x - b.x);
        });

        return grouped;
    }

    /**
     * Prepare time series data for charts
     */
    function prepareTimeSeriesData(data) {
        if (!data || data.length === 0) {
            return { labels: [], values: [] };
        }

        const sorted = [...data].sort((a, b) => a.timestamp - b.timestamp);
        
        return {
            labels: sorted.map(m => new Date(m.timestamp).toLocaleTimeString()),
            values: sorted.map(m => m.value)
        };
    }

    /**
     * Update service filter options
     */
    function updateServiceFilter(data) {
        const serviceFilter = document.getElementById('serviceFilter');
        if (!serviceFilter) return;

        // Use allMetrics array if available, otherwise flatten metrics object
        const allMetrics = data.allMetrics || Object.values(data.metrics || {}).flat();
        const services = new Set();

        allMetrics.forEach(metric => {
            if (metric.serviceName) {
                services.add(metric.serviceName);
            }
        });

        const currentValue = serviceFilter.value;
        serviceFilter.innerHTML = '<option value="">All Services</option>' +
            Array.from(services).sort().map(service =>
                `<option value="${service}">${service}</option>`
            ).join('');

        serviceFilter.value = currentValue;
    }

    /**
     * Calculate percentile
     */
    function calculatePercentile(values, percentile) {
        if (values.length === 0) return 0;
        
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index] || 0;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        stopAutoRefresh();
        Object.values(charts).forEach(chart => chart && chart.destroy());
    });

})();

