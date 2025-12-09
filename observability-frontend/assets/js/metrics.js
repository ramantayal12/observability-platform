/**
 * Metrics Page
 * Enterprise-level metrics exploration and analysis
 */

(function() {
    'use strict';

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

    /**
     * Initialize the page
     */
    async function init() {
        console.log('Initializing Metrics page...');
        
        // Setup UI
        setupTimePicker();
        setupAutoRefresh();
        setupFilters();
        
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
        const timePickerBtn = document.getElementById('timePickerBtn');
        const timePickerDropdown = document.getElementById('timePickerDropdown');
        const timeOptions = document.querySelectorAll('.time-option');

        timePickerBtn.addEventListener('click', () => {
            timePickerDropdown.classList.toggle('active');
        });

        timeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const range = parseInt(option.dataset.range);
                currentFilters.timeRange = range;
                document.getElementById('timePickerLabel').textContent = option.textContent;
                timePickerDropdown.classList.remove('active');
                loadMetrics();
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!timePickerBtn.contains(e.target) && !timePickerDropdown.contains(e.target)) {
                timePickerDropdown.classList.remove('active');
            }
        });
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
     * Update charts
     */
    function updateCharts(data) {
        const metrics = data.metrics || {};

        // Latency Chart
        updateLatencyChart(metrics['api.latency'] || []);

        // Throughput Chart
        updateThroughputChart(metrics['throughput'] || []);

        // Error Rate Chart
        updateErrorRateChart(metrics['error.rate'] || []);

        // Service Metrics Chart
        updateServiceMetricsChart(data);
    }

    /**
     * Update latency chart
     */
    function updateLatencyChart(data) {
        const ctx = document.getElementById('latencyChart');
        if (!ctx) return;

        if (charts.latency) {
            charts.latency.destroy();
        }

        const chartData = prepareTimeSeriesData(data);

        charts.latency = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'API Latency (ms)',
                    data: chartData.values,
                    borderColor: '#774FF8',
                    backgroundColor: 'rgba(119, 79, 248, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: getChartOptions('ms')
        });
    }

    /**
     * Update throughput chart
     */
    function updateThroughputChart(data) {
        const ctx = document.getElementById('throughputChart');
        if (!ctx) return;

        if (charts.throughput) {
            charts.throughput.destroy();
        }

        const chartData = prepareTimeSeriesData(data);

        charts.throughput = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Throughput (req/min)',
                    data: chartData.values,
                    borderColor: '#12B76A',
                    backgroundColor: 'rgba(18, 183, 106, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: getChartOptions('req/min')
        });
    }

    /**
     * Update error rate chart
     */
    function updateErrorRateChart(data) {
        const ctx = document.getElementById('errorRateChart');
        if (!ctx) return;

        if (charts.errorRate) {
            charts.errorRate.destroy();
        }

        const chartData = prepareTimeSeriesData(data);

        charts.errorRate = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Error Rate (%)',
                    data: chartData.values,
                    borderColor: '#F04438',
                    backgroundColor: 'rgba(240, 68, 56, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: getChartOptions('%')
        });
    }

    /**
     * Update service metrics chart
     */
    function updateServiceMetricsChart(data) {
        const ctx = document.getElementById('serviceMetricsChart');
        if (!ctx) return;

        if (charts.serviceMetrics) {
            charts.serviceMetrics.destroy();
        }

        // Group metrics by service
        const serviceData = {};
        const metrics = data.metrics || {};
        
        Object.values(metrics).flat().forEach(metric => {
            const service = metric.serviceName || 'Unknown';
            if (!serviceData[service]) {
                serviceData[service] = 0;
            }
            serviceData[service]++;
        });

        const services = Object.keys(serviceData);
        const counts = Object.values(serviceData);

        charts.serviceMetrics = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: services,
                datasets: [{
                    label: 'Metric Count',
                    data: counts,
                    backgroundColor: '#774FF8'
                }]
            },
            options: getChartOptions('count')
        });
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
     * Get chart options
     */
    function getChartOptions(unit) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return value + ' ' + unit;
                        }
                    }
                }
            }
        };
    }

    /**
     * Update metrics table
     */
    function updateTable(data) {
        const tbody = document.getElementById('metricsTableBody');
        if (!tbody) return;

        const metrics = data.metrics || {};
        const allMetrics = Object.values(metrics).flat();

        if (allMetrics.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">No metrics found</td></tr>';
            return;
        }

        // Sort by timestamp (most recent first)
        const sorted = allMetrics.sort((a, b) => b.timestamp - a.timestamp);
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

        const metrics = data.metrics || {};
        const services = new Set();

        Object.values(metrics).flat().forEach(metric => {
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

