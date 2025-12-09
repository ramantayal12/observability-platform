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
    let apiDetailsTable = null;

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
        setupApiDetailsTable();

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
     * Setup auto-refresh
     */
    function setupAutoRefresh() {
        const autoRefreshBtn = document.getElementById('autoRefreshBtn');
        const isEnabled = localStorage.getItem('observability_auto_refresh') === 'true';
        
        if (isEnabled) {
            autoRefreshBtn.classList.add('active');
        }

        autoRefreshBtn.addEventListener('click', () => {
            const enabled = autoRefreshBtn.classList.toggle('active');
            localStorage.setItem('observability_auto_refresh', enabled);
            
            if (enabled) {
                startAutoRefresh();
                notificationManager.success('Auto-refresh enabled');
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

        // Service Metrics Chart - bar chart
        charts.serviceMetrics = new InteractiveChart({
            containerId: 'serviceMetricsChartContainer',
            chartType: 'bar',
            unit: '',
            height: 250,
            showLegend: true,
            fill: false
        });
    }

    /**
     * Update charts
     */
    function updateCharts(data) {
        const metrics = data.metrics || {};

        // Latency Chart - show by endpoint
        updateLatencyChart(metrics['api.latency'] || []);

        // Throughput Chart - show by service
        updateThroughputChart(metrics['throughput'] || []);

        // Error Rate Chart - show by service
        updateErrorRateChart(metrics['error.rate'] || []);

        // Service Metrics Chart
        updateServiceMetricsChart(data);
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
     * Update throughput chart with multi-series data
     */
    function updateThroughputChart(data) {
        if (!charts.throughput) return;

        const seriesData = groupDataBySeries(data, 'serviceName');
        charts.throughput.setData(seriesData);
    }

    /**
     * Update error rate chart with multi-series data
     */
    function updateErrorRateChart(data) {
        if (!charts.errorRate) return;

        const seriesData = groupDataBySeries(data, 'serviceName');
        charts.errorRate.setData(seriesData);
    }

    /**
     * Update service metrics chart
     */
    function updateServiceMetricsChart(data) {
        if (!charts.serviceMetrics) return;

        // Group metrics by service
        const serviceData = {};
        const allMetrics = data.allMetrics || Object.values(data.metrics || {}).flat();

        allMetrics.forEach(metric => {
            const service = metric.serviceName || 'Unknown';
            if (!serviceData[service]) {
                serviceData[service] = 0;
            }
            serviceData[service]++;
        });

        // Convert to series format for InteractiveChart
        const services = Object.keys(serviceData);
        const seriesData = {};
        services.forEach(service => {
            seriesData[service] = [serviceData[service]];
        });

        charts.serviceMetrics.setData(seriesData, ['Metric Count']);
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
     * Update metrics table
     */
    function updateTable(data) {
        const tbody = document.getElementById('metricsTableBody');
        if (!tbody) return;

        // Use allMetrics array if available, otherwise flatten metrics object
        const allMetrics = data.allMetrics || Object.values(data.metrics || {}).flat();

        if (allMetrics.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No metrics found</td></tr>';
            return;
        }

        // Sort by timestamp (most recent first)
        const sorted = [...allMetrics].sort((a, b) => b.timestamp - a.timestamp);
        const recent = sorted.slice(0, 100); // Show last 100

        tbody.innerHTML = recent.map(metric => `
            <tr>
                <td>${new Date(metric.timestamp).toLocaleString()}</td>
                <td>${metric.serviceName || 'N/A'}</td>
                <td>${metric.metricName || 'N/A'}</td>
                <td>${metric.value.toFixed(2)}</td>
                <td>${metric.endpoint || 'N/A'}</td>
            </tr>
        `).join('');
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

    /**
     * Setup API Details Table
     */
    function setupApiDetailsTable() {
        console.log('[Metrics] Setting up API Details Table...');
        console.log('[Metrics] ApiDetailsTable available:', typeof ApiDetailsTable !== 'undefined');

        if (typeof ApiDetailsTable !== 'undefined') {
            try {
                apiDetailsTable = new ApiDetailsTable({
                    containerId: 'apiDetailsTable',
                    title: 'API Endpoint Metrics',
                    showFilters: true,
                    maxRows: 50
                });
                console.log('[Metrics] API Details Table initialized successfully');
            } catch (error) {
                console.error('[Metrics] Error initializing API Details Table:', error);
            }
        } else {
            console.warn('[Metrics] ApiDetailsTable component not found');
        }
    }

    /**
     * Load API endpoint details
     */
    async function loadApiDetails() {
        if (!apiDetailsTable) return;

        try {
            // Generate mock API endpoint data
            const apiData = generateMockApiData();
            apiDetailsTable.setData(apiData);
        } catch (error) {
            console.error('Error loading API details:', error);
        }
    }

    /**
     * Generate mock API endpoint time series data
     */
    function generateMockApiData() {
        const endpoints = [
            'GET /api/v1/metrics',
            'POST /api/v1/metrics',
            'GET /api/v1/logs',
            'POST /api/v1/logs',
            'GET /api/v1/traces',
            'GET /api/v1/services',
            'GET /api/v1/dashboards',
            'GET /api/v1/alerts'
        ];

        const now = Date.now();
        const timeSeriesData = {};

        endpoints.forEach(endpoint => {
            const dataPoints = [];
            const baseLatency = Math.random() * 80 + 20; // 20-100ms base

            // Generate 60 data points (last hour, one per minute)
            for (let i = 60; i >= 0; i--) {
                const timestamp = now - (i * 60 * 1000); // Go back i minutes
                const variation = (Math.random() - 0.5) * 40; // ±20ms variation
                const latency = Math.max(5, baseLatency + variation);

                dataPoints.push({
                    x: timestamp,
                    y: latency
                });
            }

            timeSeriesData[endpoint] = dataPoints;
        });

        return timeSeriesData;
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
        if (apiDetailsTable) {
            apiDetailsTable.destroy();
        }
    });

})();

