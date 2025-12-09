/**
 * Overview Page
 * System health dashboard
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
    let autoRefreshInterval = null;
    let charts = {};
    let currentTimeRange = stateManager.get('filters.timeRange') || 60 * 60 * 1000;
    let timeRangePicker = null;

    /**
     * Initialize the page
     */
    async function init() {
        console.log('Initializing Overview page...');

        // Setup UI
        setupTimePicker();
        setupAutoRefresh();
        setupCharts();

        // Listen for time range changes
        eventBus.on(Events.TIME_RANGE_CHANGED, handleTimeRangeChange);

        // Load initial data
        await loadOverview();

        // Setup auto-refresh if enabled
        const autoRefreshEnabled = localStorage.getItem('observability_auto_refresh') === 'true';
        if (autoRefreshEnabled) {
            startAutoRefresh();
        }
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
                await loadOverview();
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
     * Setup time picker for the overview page
     */
    function setupTimePicker() {
        timeRangePicker = new TimeRangePicker({
            buttonId: 'timePickerBtn',
            dropdownId: 'timePickerDropdown',
            labelId: 'timePickerLabel'
        });

        // Set initial time range
        currentTimeRange = timeRangePicker.getRange();
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
     * Start auto-refresh
     */
    function startAutoRefresh() {
        stopAutoRefresh();
        autoRefreshInterval = setInterval(() => {
            loadOverview();
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
     * Setup charts using InteractiveChart component
     */
    function setupCharts() {
        if (typeof InteractiveChart === 'undefined') {
            console.warn('[Overview] InteractiveChart not available');
            return;
        }

        // API Latency Chart - multi-line by endpoint
        charts.latency = new InteractiveChart({
            containerId: 'latencyChartContainer',
            unit: 'ms',
            height: 220,
            showLegend: true
        });

        // Service Latency Chart - bar chart by service
        charts.serviceLatency = new InteractiveChart({
            containerId: 'serviceLatencyChartContainer',
            chartType: 'bar',
            unit: 'ms',
            height: 220,
            showLegend: true,
            fill: false
        });

        // Throughput Chart - multi-line by service
        charts.throughput = new InteractiveChart({
            containerId: 'throughputChartContainer',
            unit: 'req/min',
            height: 220,
            showLegend: true
        });

        // Error Rate Chart - multi-line by service
        charts.errorRate = new InteractiveChart({
            containerId: 'errorRateChartContainer',
            unit: '%',
            height: 220,
            showLegend: true
        });
    }

    /**
     * Load overview data
     */
    async function loadOverview() {
        console.log('[Overview] Loading overview data...');
        try {
            const data = await apiService.fetchOverview({ timeRange: currentTimeRange });
            console.log('[Overview] Data received:', data);

            // Update stats
            updateStats(data.stats);

            // Update charts
            updateCharts(data);

            // Update recent activity
            updateRecentActivity(data.recentActivity || []);

        } catch (error) {
            console.error('[Overview] Error loading overview:', error);
            notificationManager.error('Failed to load overview data');
        }
    }

    /**
     * Update stats cards
     */
    function updateStats(stats) {
        if (!stats) return;

        const avgLatencyEl = document.getElementById('avgApiLatency');
        const throughputEl = document.getElementById('throughput');
        const errorRateEl = document.getElementById('errorRate');
        const activeServicesEl = document.getElementById('activeServices');

        if (avgLatencyEl) avgLatencyEl.textContent = `${stats.avgLatency.toFixed(2)} ms`;
        if (throughputEl) throughputEl.textContent = `${stats.throughput.toFixed(0)} req/min`;
        if (errorRateEl) errorRateEl.textContent = `${stats.errorRate.toFixed(2)}%`;
        if (activeServicesEl) activeServicesEl.textContent = stats.activeServices;
    }

    /**
     * Update charts with new data using InteractiveChart (API endpoint level)
     */
    function updateCharts(data) {
        console.log('[Overview] Updating charts with data:', data);

        // Update latency chart - group by API endpoint
        if (charts.latency && data.latencyData) {
            const seriesData = groupDataBySeries(data.latencyData, 'endpoint');
            charts.latency.setData(seriesData);
        }

        // Update throughput chart - group by API endpoint
        if (charts.throughput && data.throughputData) {
            const seriesData = groupDataBySeries(data.throughputData, 'endpoint');
            charts.throughput.setData(seriesData);
        }

        // Update error rate chart - group by API endpoint
        if (charts.errorRate && data.errorRateData) {
            const seriesData = groupDataBySeries(data.errorRateData, 'endpoint');
            charts.errorRate.setData(seriesData);
        }

        // Update service latency chart - bar chart by API endpoint
        if (charts.serviceLatency && data.serviceLatency) {
            const seriesData = {};
            data.serviceLatency.forEach(d => {
                seriesData[d.serviceName] = [d.avgLatency];
            });
            charts.serviceLatency.setData(seriesData, ['Avg Latency']);
        }
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

    /**
     * Get time since timestamp
     */
    function getTimeSince(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
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
    });

})();

