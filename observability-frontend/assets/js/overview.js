/**
 * Overview Page
 * System health dashboard
 */

(function() {
    'use strict';

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
     * Setup auto-refresh
     */
    function setupAutoRefresh() {
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
                notificationManager.success('Auto-refresh enabled');
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
     * Setup charts
     */
    function setupCharts() {
        const chartConfig = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#9FA6B2'
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#9FA6B2'
                    }
                }
            }
        };

        // API Latency Chart
        const latencyCtx = document.getElementById('latencyChart');
        if (latencyCtx) {
            charts.latency = new Chart(latencyCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Latency (ms)',
                        data: [],
                        borderColor: '#774FF8',
                        backgroundColor: 'rgba(119, 79, 248, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: chartConfig
            });
        }

        // Throughput Chart
        const throughputCtx = document.getElementById('throughputChart');
        if (throughputCtx) {
            charts.throughput = new Chart(throughputCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Throughput (req/min)',
                        data: [],
                        borderColor: '#12B76A',
                        backgroundColor: 'rgba(18, 183, 106, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: chartConfig
            });
        }

        // Error Rate Chart
        const errorRateCtx = document.getElementById('errorRateChart');
        if (errorRateCtx) {
            charts.errorRate = new Chart(errorRateCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Error Rate',
                        data: [],
                        borderColor: '#F04438',
                        backgroundColor: 'rgba(240, 68, 56, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: chartConfig
            });
        }

        // Service Latency Chart
        const serviceLatencyCtx = document.getElementById('serviceLatencyChart');
        if (serviceLatencyCtx) {
            charts.serviceLatency = new Chart(serviceLatencyCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Avg Latency (ms)',
                        data: [],
                        backgroundColor: '#774FF8'
                    }]
                },
                options: {
                    ...chartConfig,
                    scales: {
                        ...chartConfig.scales,
                        x: {
                            ...chartConfig.scales.x,
                            ticks: {
                                ...chartConfig.scales.x.ticks,
                                maxRotation: 45,
                                minRotation: 45
                            }
                        }
                    }
                }
            });
        }
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
     * Update charts with new data
     */
    function updateCharts(data) {
        console.log('[Overview] Updating charts with data:', data);
        console.log('[Overview] Available charts:', Object.keys(charts));

        // Update latency chart
        if (charts.latency && data.latencyData) {
            console.log('[Overview] Updating latency chart with', data.latencyData.length, 'points');
            charts.latency.data.labels = data.latencyData.map(d =>
                new Date(d.timestamp).toLocaleTimeString()
            );
            charts.latency.data.datasets[0].data = data.latencyData.map(d => d.value);
            charts.latency.update();
        }

        // Update throughput chart
        if (charts.throughput && data.throughputData) {
            charts.throughput.data.labels = data.throughputData.map(d => 
                new Date(d.timestamp).toLocaleTimeString()
            );
            charts.throughput.data.datasets[0].data = data.throughputData.map(d => d.value);
            charts.throughput.update();
        }

        // Update error rate chart
        if (charts.errorRate && data.errorRateData) {
            charts.errorRate.data.labels = data.errorRateData.map(d => 
                new Date(d.timestamp).toLocaleTimeString()
            );
            charts.errorRate.data.datasets[0].data = data.errorRateData.map(d => d.value);
            charts.errorRate.update();
        }

        // Update service latency chart
        if (charts.serviceLatency && data.serviceLatency) {
            charts.serviceLatency.data.labels = data.serviceLatency.map(d => d.serviceName);
            charts.serviceLatency.data.datasets[0].data = data.serviceLatency.map(d => d.avgLatency);
            charts.serviceLatency.update();
        }
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

