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
    let teamSelector = null;

    /**
     * Initialize the page
     */
    async function init() {
        console.log('Initializing Metrics page...');

        // Setup UI
        setupTeamSelector();
        setupTimePicker();
        setupAutoRefresh();
        setupFilters();
        initializeCharts();

        // Listen for time range changes
        eventBus.on(Events.TIME_RANGE_CHANGED, handleTimeRangeChange);

        // Listen for team changes
        eventBus.on('team:changed', handleTeamChange);

        // Load initial data
        await loadMetrics();

        // Setup auto-refresh if enabled
        const autoRefreshEnabled = localStorage.getItem('observability_auto_refresh') === 'true';
        if (autoRefreshEnabled) {
            startAutoRefresh();
        }
    }

    /**
     * Setup team selector
     */
    function setupTeamSelector() {
        if (window.TeamSelector) {
            teamSelector = new TeamSelector({
                containerId: 'teamSelectorContainer'
            });
        }
    }

    /**
     * Handle team change
     */
    function handleTeamChange(team) {
        console.log('[Metrics] Team changed:', team);
        // Clear existing charts so they get re-initialized with new team's config
        Object.values(charts).forEach(chart => chart && chart.destroy && chart.destroy());
        charts = {};
        loadMetrics();
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

            // Use team-specific endpoint
            const data = await apiService.fetchTeamMetrics({
                serviceName: currentFilters.service || undefined,
                startTime,
                endTime
            });

            // Update stats
            updateStats(data);

            // Update API metrics table
            updateCharts(data);

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
        // Handle new apiMetrics format
        const apiMetrics = data.apiMetrics || [];

        let avgLatency = 0;
        let p95Latency = 0;
        let throughput = 0;
        let errorRate = 0;

        if (apiMetrics.length > 0) {
            // Calculate from apiMetrics
            let totalLatency = 0;
            let totalThroughput = 0;
            let totalErrorRate = 0;
            let allLatencyValues = [];

            apiMetrics.forEach(metric => {
                totalLatency += metric.avgLatency || 0;
                totalThroughput += metric.throughput || 0;
                totalErrorRate += metric.errorRate || 0;

                if (metric.latencyData) {
                    allLatencyValues.push(...metric.latencyData.map(d => d.value));
                }
            });

            avgLatency = totalLatency / apiMetrics.length;
            throughput = totalThroughput;
            errorRate = totalErrorRate / apiMetrics.length;
            p95Latency = calculatePercentile(allLatencyValues, 95);
        } else {
            // Legacy format
            const statistics = data.statistics || {};
            if (statistics['api.latency']) {
                avgLatency = statistics['api.latency'].avg || 0;
                const latencyData = statistics['api.latency'].data || [];
                p95Latency = calculatePercentile(latencyData.map(m => m.value), 95);
            }
            if (statistics['throughput']) {
                throughput = statistics['throughput'].avg || 0;
            }
            if (statistics['error.rate']) {
                errorRate = statistics['error.rate'].avg || 0;
            }
        }

        // Update DOM
        document.getElementById('avgLatency').textContent = `${avgLatency.toFixed(2)} ms`;
        document.getElementById('p95Latency').textContent = `${p95Latency.toFixed(2)} ms`;
        document.getElementById('throughput').textContent = `${throughput.toFixed(0)} req/min`;
        document.getElementById('errorRate').textContent = `${errorRate.toFixed(2)}%`;
    }

    /**
     * Initialize interactive charts - charts will be created dynamically based on backend config
     */
    function initializeCharts() {
        if (typeof InteractiveChart === 'undefined') {
            console.warn('[Metrics] InteractiveChart not available');
            return;
        }
        // Charts will be created dynamically when data is received
        console.log('[Metrics] Charts will be initialized from backend config');
    }

    /**
     * Initialize charts from backend configuration
     */
    function initializeChartsFromConfig(chartConfigs) {
        if (!chartConfigs || chartConfigs.length === 0) {
            console.warn('[Metrics] No chart configuration received from backend');
            return;
        }

        const chartsGrid = document.querySelector('.charts-grid');
        if (!chartsGrid) return;

        // Clear existing chart cards and create new ones based on config
        chartsGrid.innerHTML = '';

        chartConfigs.forEach(config => {
            const chartCard = document.createElement('div');
            chartCard.className = 'chart-card';
            chartCard.innerHTML = `
                <div class="chart-header">
                    <h3 class="chart-title">${config.title}</h3>
                </div>
                <div class="chart-body" id="${config.id}ChartContainer"></div>
            `;
            chartsGrid.appendChild(chartCard);

            // Create the chart instance
            charts[config.id] = new InteractiveChart({
                containerId: `${config.id}ChartContainer`,
                chartType: config.type || 'line',
                unit: config.unit || '',
                height: 250,
                showLegend: true
            });
        });

        console.log('[Metrics] Charts initialized from backend config:', Object.keys(charts));
    }

    /**
     * Update charts and API endpoints list
     */
    function updateCharts(data) {
        console.log('[Metrics] Updating charts and API endpoints with data:', data);

        // Initialize charts from backend config if not already done
        if (data.charts && Object.keys(charts).length === 0) {
            initializeChartsFromConfig(data.charts);
        }

        // Render API endpoints list (linear)
        renderApiEndpointsList(data);

        // Update interactive charts using backend config
        updateInteractiveCharts(data);
    }

    /**
     * Render API endpoints list (linear scrollable)
     */
    function renderApiEndpointsList(data) {
        const listEl = document.getElementById('apiEndpointsList');
        const countEl = document.getElementById('apiEndpointCount');

        if (!listEl) return;

        const apiMetrics = data.apiMetrics || [];

        if (countEl) {
            countEl.textContent = `${apiMetrics.length} endpoints`;
        }

        if (apiMetrics.length === 0) {
            listEl.innerHTML = '<div class="api-loading">No API endpoints found</div>';
            return;
        }

        // Render endpoint items
        listEl.innerHTML = apiMetrics.map(metric => {
            const { method, path } = parseEndpoint(metric.endpoint);
            const latencyValues = metric.latencyData ? metric.latencyData.map(d => d.value) : [];
            const p50 = calculatePercentile(latencyValues, 50);
            const p90 = calculatePercentile(latencyValues, 90);
            const p99 = calculatePercentile(latencyValues, 99);

            return `
                <div class="api-endpoint-item">
                    <div class="api-endpoint-info">
                        <span class="api-method ${method.toLowerCase()}">${method}</span>
                        <span class="api-path">${path}</span>
                    </div>
                    <div class="api-endpoint-stats">
                        <div class="api-stat">
                            <span class="api-stat-value latency">${(metric.avgLatency || 0).toFixed(1)} ms</span>
                            <span class="api-stat-label">Avg</span>
                        </div>
                        <div class="api-stat">
                            <span class="api-stat-value latency">${p50.toFixed(1)} ms</span>
                            <span class="api-stat-label">P50</span>
                        </div>
                        <div class="api-stat">
                            <span class="api-stat-value latency">${p90.toFixed(1)} ms</span>
                            <span class="api-stat-label">P90</span>
                        </div>
                        <div class="api-stat">
                            <span class="api-stat-value latency">${p99.toFixed(1)} ms</span>
                            <span class="api-stat-label">P99</span>
                        </div>
                        <div class="api-stat">
                            <span class="api-stat-value throughput">${(metric.throughput || 0).toFixed(0)} req/m</span>
                            <span class="api-stat-label">Throughput</span>
                        </div>
                        <div class="api-stat">
                            <span class="api-stat-value error">${(metric.errorRate || 0).toFixed(2)}%</span>
                            <span class="api-stat-label">Error</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Update interactive charts with data based on backend config
     */
    function updateInteractiveCharts(data) {
        const apiMetrics = data.apiMetrics || [];
        const chartConfigs = data.charts || [];

        // Prepare data for each chart based on its config
        chartConfigs.forEach(config => {
            const chart = charts[config.id];
            if (!chart) return;

            const chartData = {};

            apiMetrics.forEach(metric => {
                const endpoint = metric.endpoint || 'Unknown';
                let seriesData = [];

                // Map dataKey to the correct data array
                if (config.dataKey === 'latencyData' && metric.latencyData) {
                    if (config.percentile) {
                        // Apply percentile multiplier for P99 approximation
                        const multiplier = config.percentile === 99 ? 2.2 : config.percentile === 90 ? 1.8 : 1.5;
                        seriesData = metric.latencyData.map(d => ({ x: d.timestamp, y: d.value * multiplier }));
                    } else {
                        seriesData = metric.latencyData.map(d => ({ x: d.timestamp, y: d.value }));
                    }
                } else if (config.dataKey === 'throughputData' && metric.throughputData) {
                    seriesData = metric.throughputData.map(d => ({ x: d.timestamp, y: d.value }));
                } else if (config.dataKey === 'errorData' && metric.errorData) {
                    seriesData = metric.errorData.map(d => ({ x: d.timestamp, y: d.value }));
                }

                if (seriesData.length > 0) {
                    chartData[endpoint] = seriesData;
                }
            });

            chart.setData(chartData);
        });
    }

    /**
     * Parse endpoint string into method and path
     */
    function parseEndpoint(endpoint) {
        if (!endpoint) return { method: 'GET', path: '/unknown' };
        const parts = endpoint.split(' ');
        if (parts.length >= 2) {
            return { method: parts[0], path: parts.slice(1).join(' ') };
        }
        return { method: 'GET', path: endpoint };
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
        Object.values(charts).forEach(chart => chart && chart.destroy && chart.destroy());
    });

})();

