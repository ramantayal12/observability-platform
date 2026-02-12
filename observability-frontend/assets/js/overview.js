/**
 * Overview Page
 * System health dashboard
 */

(function() {
    'use strict';

    // Use PageUtils for common initialization
    if (!PageUtils.requireAuth()) return;

    // Get singleton instances using PageUtils
    const { eventBus, stateManager, apiService, notificationManager, sharedDataService } = PageUtils.getServices();

    // Use PageUtils for common helper functions (declare early for use throughout)
    const parseEndpoint = PageUtils.parseEndpoint;
    const escapeHtml = PageUtils.escapeHtml;
    const getTimeSince = PageUtils.getTimeSince;

    // Page state
    let charts = {};
    let sparklineCharts = {};
    let currentTimeRange = stateManager.get('filters.timeRange') || 60 * 60 * 1000;
    let autoRefresh = null;

    /**
     * Initialize the page
     */
    async function init() {
        console.log('Initializing Overview page...');

        // Setup UI using PageUtils
        PageUtils.setupTeamSelector();
        const timePicker = PageUtils.setupTimePicker();
        if (timePicker) {
            currentTimeRange = timePicker.getRange();
        }

        // Setup auto-refresh using PageUtils
        autoRefresh = PageUtils.setupAutoRefresh({ onRefresh: loadOverview });

        setupCharts();

        // Listen for time range changes
        eventBus.on(Events.TIME_RANGE_CHANGED, handleTimeRangeChange);

        // Listen for team changes
        eventBus.on('team:changed', handleTeamChange);

        // Load initial data
        await loadOverview();

        // Setup auto-refresh if enabled
        const autoRefreshEnabled = localStorage.getItem('observability_auto_refresh') === 'true';
        if (autoRefreshEnabled) {
            autoRefresh.start();
        }
    }

    /**
     * Handle team change
     */
    function handleTeamChange(team) {
        console.log('[Overview] Team changed:', team);
        // Clear existing charts so they get re-initialized with new team's config
        Object.values(charts).forEach(chart => chart && chart.destroy && chart.destroy());
        charts = {};
        loadOverview();
    }

    /**
     * Handle time range change
     */
    function handleTimeRangeChange(data) {
        console.log('[Overview] Time range changed:', data);
        currentTimeRange = data.range;
        loadOverview();
    }

    /**
     * Setup interactive charts - charts will be created dynamically based on backend config
     */
    function setupCharts() {
        if (typeof InteractiveChart === 'undefined') {
            console.warn('[Overview] InteractiveChart not available');
            return;
        }
        // Charts will be created dynamically when data is received
        console.log('[Overview] Charts will be initialized from backend config');
    }

    /**
     * Initialize charts from backend configuration
     */
    function initializeChartsFromConfig(chartConfigs) {
        if (!chartConfigs || chartConfigs.length === 0) {
            console.warn('[Overview] No chart configuration received from backend');
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

        console.log('[Overview] Charts initialized from backend config:', Object.keys(charts));
    }

    /**
     * Load overview data
     */
    async function loadOverview() {
        console.log('[Overview] ========== Loading overview data ==========');
        console.log('[Overview] Current time range:', currentTimeRange);

        try {
            // Fetch overview data (stats, charts, activity)
            const overviewData = await apiService.fetchTeamOverview({ timeRange: currentTimeRange });
            console.log('[Overview] ========== Overview data received ==========');
            console.log('[Overview] Full overview object:', overviewData);
            console.log('[Overview] Stats:', overviewData.stats);
            console.log('[Overview] Recent activity count:', overviewData.recentActivity?.length || 0);

            // Fetch services data separately (includes logCount, traceCount, podSummary)
            console.log('[Overview] Fetching services data from backend...');
            const servicesData = await apiService.fetchServices();
            console.log('[Overview] ========== Services data received ==========');
            console.log('[Overview] Services count:', servicesData.services?.length || 0);
            console.log('[Overview] Sample service:', servicesData.services?.[0]);

            // Update stats
            console.log('[Overview] Updating stats...');
            updateStats(overviewData.stats);

            // Update charts
            console.log('[Overview] Updating charts...');
            updateCharts(overviewData);

            // Update recent activity
            console.log('[Overview] Updating recent activity...');
            updateRecentActivity(overviewData.recentActivity || []);

            // Update service health grid with backend services data
            console.log('[Overview] Updating service health grid with backend data...');
            updateServiceHealthGrid(servicesData.services || []);

            console.log('[Overview] ========== Overview loaded successfully ==========');

        } catch (error) {
            console.error('[Overview] ========== Error loading overview ==========');
            console.error('[Overview] Error details:', error);
            console.error('[Overview] Error stack:', error.stack);
            notificationManager.error('Failed to load overview data');
        }
    }

    /**
     * Update service health grid
     */
    function updateServiceHealthGrid(services) {
        console.log('[Overview] Updating service health grid with', services?.length || 0, 'services');
        const grid = document.getElementById('serviceHealthGrid');
        if (!grid) {
            console.warn('[Overview] Service health grid element not found');
            return;
        }

        if (!services || services.length === 0) {
            console.log('[Overview] No services available to display');
            grid.innerHTML = '<div class="service-health-loading">No services available</div>';
            return;
        }

        // Take top 8 services for the grid
        const topServices = services.slice(0, 8);
        console.log('[Overview] Displaying top', topServices.length, 'services');

        grid.innerHTML = topServices.map(service => {
            // Use backend data directly - NO hardcoded values
            const name = service.name || service.endpoint || service.serviceName || 'Unknown';
            const latency = service.avgLatency || service.latency || 0;
            const errorRate = service.errorRate || 0;

            // Use backend logCount and traceCount directly (NO random generation)
            const logCount = service.logCount || 0;
            const traceCount = service.traceCount || 0;

            // Use backend pod summary
            const podSummary = service.podSummary || { total: 0, running: 0 };
            const podCount = `${podSummary.running}/${podSummary.total}`;

            // Use status from backend (already calculated)
            const status = service.status || 'healthy';

            console.log(`[Overview] Service: ${name}, Status: ${status}, Latency: ${latency}ms, Error: ${errorRate}%, Logs: ${logCount}, Traces: ${traceCount}, Pods: ${podCount}`);

            return `
                <div class="service-health-card-enhanced" onclick="window.location.href='services.html'">
                    <div class="service-health-header">
                        <div class="service-health-indicator ${status}"></div>
                        <div class="service-health-name">${escapeHtml(name)}</div>
                    </div>
                    <div class="service-health-metrics">
                        <div class="service-health-metric">
                            <span class="metric-value">${latency.toFixed(0)}ms</span>
                            <span class="metric-label">Latency</span>
                        </div>
                        <div class="service-health-metric">
                            <span class="metric-value">${errorRate.toFixed(1)}%</span>
                            <span class="metric-label">Errors</span>
                        </div>
                        <div class="service-health-metric">
                            <span class="metric-value">${podCount}</span>
                            <span class="metric-label">Pods</span>
                        </div>
                    </div>
                    <div class="service-health-footer">
                        <div class="service-health-stat">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M0 2a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H2a2 2 0 01-2-2V2zm2-1a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V2a1 1 0 00-1-1H2z"/>
                                <path d="M2 4h12v1H2V4zm0 3h12v1H2V7zm0 3h12v1H2v-1z"/>
                            </svg>
                            <span>${logCount.toLocaleString()} logs</span>
                        </div>
                        <div class="service-health-stat">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M1 3.5a.5.5 0 01.5-.5h13a.5.5 0 010 1h-13a.5.5 0 01-.5-.5zM7.5 7a.5.5 0 000 1h1a.5.5 0 000-1h-1zM1 10.5a.5.5 0 01.5-.5h13a.5.5 0 010 1h-13a.5.5 0 01-.5-.5z"/>
                            </svg>
                            <span>${traceCount.toLocaleString()} traces</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        console.log('[Overview] Service health grid updated successfully');
    }

    // escapeHtml is now imported from PageUtils at the bottom of the file

    /**
     * Update stats cards
     */
    function updateStats(stats) {
        if (!stats) return;

        // Main stat values
        const avgLatencyEl = document.getElementById('avgApiLatency');
        const throughputEl = document.getElementById('throughput');
        const errorRateEl = document.getElementById('errorRate');
        const activeServicesEl = document.getElementById('activeServices');

        if (avgLatencyEl) avgLatencyEl.textContent = `${stats.avgLatency.toFixed(0)} ms`;
        if (throughputEl) throughputEl.textContent = `${stats.throughput.toFixed(0)}`;
        if (errorRateEl) errorRateEl.textContent = `${stats.errorRate.toFixed(2)}%`;
        if (activeServicesEl) activeServicesEl.textContent = stats.activeServices;

        // Additional enterprise stats
        const p95LatencyEl = document.getElementById('p95Latency');
        const peakThroughputEl = document.getElementById('peakThroughput');
        const healthyServicesEl = document.getElementById('healthyServices');
        const degradedServicesEl = document.getElementById('degradedServices');
        const error4xxEl = document.getElementById('error4xx');
        const error5xxEl = document.getElementById('error5xx');

        // Calculate P95 (simulated as 1.5x avg for demo)
        if (p95LatencyEl) p95LatencyEl.textContent = `${(stats.avgLatency * 1.5).toFixed(0)}ms`;

        // Peak throughput (simulated as 1.3x avg for demo)
        if (peakThroughputEl) peakThroughputEl.textContent = `${(stats.throughput * 1.3).toFixed(0)}`;

        // Services health
        if (healthyServicesEl) healthyServicesEl.textContent = stats.activeServices;
        if (degradedServicesEl) degradedServicesEl.textContent = '0';

        // Error breakdown (simulated)
        const totalErrors = stats.errorRate * stats.throughput / 100;
        if (error4xxEl) error4xxEl.textContent = Math.floor(totalErrors * 0.7);
        if (error5xxEl) error5xxEl.textContent = Math.floor(totalErrors * 0.3);

        // Update error rate card status
        const errorRateCard = document.getElementById('errorRateCard');
        if (errorRateCard) {
            errorRateCard.classList.remove('healthy', 'warning', 'critical');
            if (stats.errorRate < 1) {
                errorRateCard.classList.add('healthy');
            } else if (stats.errorRate < 5) {
                errorRateCard.classList.add('warning');
            } else {
                errorRateCard.classList.add('critical');
            }
        }

        // Update system status in topbar
        updateSystemStatus(stats);
    }

    /**
     * Update system status indicator
     */
    function updateSystemStatus(stats) {
        const statusEl = document.getElementById('systemStatus');
        if (!statusEl) return;

        statusEl.classList.remove('warning', 'critical');

        if (stats.errorRate >= 5) {
            statusEl.classList.add('critical');
            statusEl.innerHTML = '<span class="status-dot"></span><span>System Degraded</span>';
        } else if (stats.errorRate >= 1) {
            statusEl.classList.add('warning');
            statusEl.innerHTML = '<span class="status-dot"></span><span>Minor Issues</span>';
        } else {
            statusEl.innerHTML = '<span class="status-dot"></span><span>All Systems Operational</span>';
        }
    }

    /**
     * Update charts and API endpoints list
     */
    function updateCharts(data) {
        console.log('[Overview] Updating charts and API endpoints with data:', data);

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
     * Render API endpoints table (enterprise style with detailed metrics)
     */
    function renderApiEndpointsList(data) {
        const listEl = document.getElementById('apiEndpointsList');
        const countEl = document.getElementById('apiEndpointCount');

        if (!listEl) return;

        // Use SharedDataService to process and cache endpoint data
        const endpoints = sharedDataService.processEndpointData(data);
        const endpointList = Object.keys(endpoints);

        if (countEl) {
            countEl.textContent = `${endpointList.length} endpoints`;
        }

        if (endpointList.length === 0) {
            listEl.innerHTML = '<div class="api-loading">No API endpoints found</div>';
            return;
        }

        // Destroy existing sparkline charts
        Object.values(sparklineCharts).forEach(chart => chart.destroy());
        sparklineCharts = {};

        // Render endpoint rows with detailed metrics
        listEl.innerHTML = endpointList.map((endpoint, idx) => {
            const epData = endpoints[endpoint];
            const m = epData.metrics;
            const { method, path } = parseEndpoint(endpoint);
            const errorClass = m.avgErrorRate >= 5 ? 'critical' : '';

            return `
                <div class="api-table-row" data-endpoint="${endpoint}">
                    <div class="api-endpoint-cell">
                        <span class="api-method-badge ${method.toLowerCase()}">${method}</span>
                        <span class="api-path-text" title="${path}">${path}</span>
                    </div>
                    <div class="api-metric-cell latency">${m.avgLatency.toFixed(0)}</div>
                    <div class="api-metric-cell p50">${m.p50Latency.toFixed(0)}</div>
                    <div class="api-metric-cell p90">${m.p90Latency.toFixed(0)}</div>
                    <div class="api-metric-cell p95">${m.p95Latency.toFixed(0)}</div>
                    <div class="api-metric-cell p99">${m.p99Latency.toFixed(0)}</div>
                    <div class="api-metric-cell throughput">${m.avgThroughput.toFixed(0)}/m</div>
                    <div class="api-metric-cell error ${errorClass}">${m.avgErrorRate.toFixed(2)}%</div>
                    <div class="api-sparkline-cell">
                        <canvas id="sparkline-${idx}" width="90" height="20"></canvas>
                    </div>
                </div>
            `;
        }).join('');

        // Render sparkline charts for each endpoint
        endpointList.forEach((endpoint, idx) => {
            const epData = endpoints[endpoint];
            renderSparkline(`sparkline-${idx}`, epData.latencyData);
        });
    }

    /**
     * Render a mini sparkline chart
     */
    function renderSparkline(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas || !data || data.length === 0) return;

        const ctx = canvas.getContext('2d');
        sparklineCharts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map((_, i) => i),
                datasets: [{
                    data: data,
                    borderColor: '#774FF8',
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.4,
                    fill: false
                }]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: {
                    x: { display: false },
                    y: { display: false }
                },
                animation: false
            }
        });
    }

    /**
     * Update interactive charts with data based on backend config
     */
    function updateInteractiveCharts(data) {
        // Group data by endpoint for multi-line charts
        const endpoints = groupDataByEndpoint(data);
        const endpointList = Object.keys(endpoints);

        // Get chart configs from backend
        const chartConfigs = data.charts || [];

        // Prepare data for each chart based on its config
        chartConfigs.forEach(config => {
            const chart = charts[config.id];
            if (!chart) {
                console.warn(`[Overview] Chart not found for config: ${config.id}`);
                return;
            }

            const chartData = {};

            if (config.type === 'bar' && config.dataKey === 'serviceLatency') {
                // Bar chart for service latency - use serviceLatency data directly
                const serviceLatencyData = data.serviceLatency || [];
                serviceLatencyData.forEach(item => {
                    const name = item.serviceName || item.endpoint || 'Unknown';
                    chartData[name] = [item.avgLatency];
                });
                chart.setData(chartData, ['Avg Latency']);
            } else if (config.type === 'bar') {
                // Other bar charts - use average values from grouped data
                endpointList.forEach(endpoint => {
                    const epData = endpoints[endpoint];
                    chartData[endpoint] = [epData.avgLatency];
                });
                chart.setData(chartData, ['Avg Latency']);
            } else {
                // Line chart - use time series data
                endpointList.forEach(endpoint => {
                    const epData = endpoints[endpoint];
                    let seriesData = [];

                    // Map dataKey to the correct data array
                    if (config.dataKey === 'latencyData' && epData.latencyData) {
                        seriesData = epData.latencyData.map((v, i) => ({ x: Date.now() - (epData.latencyData.length - i) * 60000, y: v }));
                    } else if (config.dataKey === 'throughputData' && epData.throughputData) {
                        seriesData = epData.throughputData.map((v, i) => ({ x: Date.now() - (epData.throughputData.length - i) * 60000, y: v }));
                    } else if (config.dataKey === 'errorRateData' && epData.errorData) {
                        seriesData = epData.errorData.map((v, i) => ({ x: Date.now() - (epData.errorData.length - i) * 60000, y: v }));
                    }

                    if (seriesData.length > 0) {
                        chartData[endpoint] = seriesData;
                    }
                });

                if (Object.keys(chartData).length > 0) {
                    chart.setData(chartData);
                } else {
                    console.warn(`[Overview] No data for chart: ${config.id}`);
                }
            }
        });
    }

    /**
     * Group data by endpoint
     */
    function groupDataByEndpoint(data) {
        const endpoints = {};

        // Process latency data
        if (data.latencyData) {
            data.latencyData.forEach(item => {
                const ep = item.endpoint || 'Unknown';
                if (!endpoints[ep]) {
                    endpoints[ep] = { latencyData: [], throughputData: [], errorData: [], latencySum: 0, throughputSum: 0, errorSum: 0, count: 0 };
                }
                endpoints[ep].latencyData.push(item.value);
                endpoints[ep].latencySum += item.value;
                endpoints[ep].count++;
            });
        }

        // Process throughput data
        if (data.throughputData) {
            data.throughputData.forEach(item => {
                const ep = item.endpoint || 'Unknown';
                if (!endpoints[ep]) {
                    endpoints[ep] = { latencyData: [], throughputData: [], errorData: [], latencySum: 0, throughputSum: 0, errorSum: 0, count: 0 };
                }
                endpoints[ep].throughputData.push(item.value);
                endpoints[ep].throughputSum += item.value;
            });
        }

        // Process error rate data
        if (data.errorRateData) {
            data.errorRateData.forEach(item => {
                const ep = item.endpoint || 'Unknown';
                if (!endpoints[ep]) {
                    endpoints[ep] = { latencyData: [], throughputData: [], errorData: [], latencySum: 0, throughputSum: 0, errorSum: 0, count: 0 };
                }
                endpoints[ep].errorData.push(item.value);
                endpoints[ep].errorSum += item.value;
            });
        }

        // Calculate averages
        Object.keys(endpoints).forEach(ep => {
            const d = endpoints[ep];
            d.avgLatency = d.count > 0 ? d.latencySum / d.count : 0;
            d.avgThroughput = d.throughputData.length > 0 ? d.throughputSum / d.throughputData.length : 0;
            d.avgErrorRate = d.errorData.length > 0 ? d.errorSum / d.errorData.length : 0;
        });

        return endpoints;
    }

    /**
     * Update recent activity
     */
    function updateRecentActivity(activities) {
        const container = document.getElementById('recentLogs');
        if (!container) return;

        if (activities.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No recent activity</p></div>';
            return;
        }

        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon activity-${activity.type}">
                    ${getActivityIcon(activity.type)}
                </div>
                <div class="activity-content">
                    <div class="activity-description">${activity.description}</div>
                    <div class="activity-meta">
                        <span>${activity.service}</span>
                        <span>${getTimeSince(activity.timestamp)}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Get activity icon
     */
    function getActivityIcon(type) {
        const icons = {
            deployment: '🚀',
            alert: '⚠️',
            incident: '🔥',
            config_change: '⚙️'
        };
        return icons[type] || '📝';
    }

    // getTimeSince is now imported from PageUtils above

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (autoRefresh) autoRefresh.cleanup();
    });

})();

