// Configuration
const API_BASE_URL = 'http://localhost:8080/api';
const REFRESH_INTERVAL = 5000;
const AUTO_REFRESH_KEY = 'observability_auto_refresh';

// State
let currentView = 'overview';
let currentService = '';
let currentTimeRange = 3600000;
let currentLogLevel = '';
let currentLogSearch = '';
let currentLoggerFilter = '';
let currentTraceIdFilter = '';
let autoRefreshEnabled = localStorage.getItem(AUTO_REFRESH_KEY) === 'true';

let apiLatencyChart, serviceLatencyChart, metricsTimelineChart;
let logs = [];
let traces = [];
let refreshIntervalId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeCharts();
    setupEventListeners();
    setupAutoRefresh();
    loadData();
    if (autoRefreshEnabled) {
        startAutoRefresh();
    }
});

// Navigation
function initializeNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const view = item.dataset.view;
            switchView(view);
        });
    });
}

function switchView(view) {
    currentView = view;

    // Update navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.view === view) {
            item.classList.add('active');
        }
    });

    // Update views
    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
    });
    document.getElementById(view + 'View').classList.add('active');

    // Update title
    document.querySelector('.view-title').textContent =
        view.charAt(0).toUpperCase() + view.slice(1);

    // Load data for view
    if (view === 'logs' || view === 'traces') {
        loadData();
    }
}

// Event Listeners
function setupEventListeners() {
    // Time range presets
    document.querySelectorAll('.time-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.time-preset').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTimeRange = parseInt(btn.dataset.range);
            loadData();
        });
    });

    // Refresh button
    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadData();
    });

    // Auto-refresh toggle
    const autoRefreshToggle = document.getElementById('autoRefreshToggle');
    autoRefreshToggle.checked = autoRefreshEnabled;
    autoRefreshToggle.addEventListener('change', (e) => {
        autoRefreshEnabled = e.target.checked;
        localStorage.setItem(AUTO_REFRESH_KEY, autoRefreshEnabled);
        if (autoRefreshEnabled) {
            startAutoRefresh();
        } else {
            stopAutoRefresh();
        }
    });

    // Log filters
    document.querySelectorAll('.level-filter').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.level-filter').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentLogLevel = btn.dataset.level;
            filterAndRenderLogs();
        });
    });

    const logSearchInput = document.getElementById('logSearchInput');
    const clearSearch = document.getElementById('clearSearch');

    logSearchInput.addEventListener('input', (e) => {
        currentLogSearch = e.target.value;
        clearSearch.classList.toggle('visible', currentLogSearch.length > 0);
        filterAndRenderLogs();
    });

    clearSearch.addEventListener('click', () => {
        logSearchInput.value = '';
        currentLogSearch = '';
        clearSearch.classList.remove('visible');
        filterAndRenderLogs();
    });

    document.getElementById('loggerFilter').addEventListener('input', (e) => {
        currentLoggerFilter = e.target.value;
        filterAndRenderLogs();
    });

    document.getElementById('traceIdFilter').addEventListener('input', (e) => {
        currentTraceIdFilter = e.target.value;
        filterAndRenderLogs();
    });

    document.getElementById('clearFilters').addEventListener('click', () => {
        currentLogLevel = '';
        currentLogSearch = '';
        currentLoggerFilter = '';
        currentTraceIdFilter = '';
        document.getElementById('logSearchInput').value = '';
        document.getElementById('loggerFilter').value = '';
        document.getElementById('traceIdFilter').value = '';
        document.querySelectorAll('.level-filter').forEach(b => b.classList.remove('active'));
        document.querySelector('.level-filter[data-level=""]').classList.add('active');
        filterAndRenderLogs();
    });

    document.getElementById('exportLogs').addEventListener('click', exportLogs);

    // Service filters
    document.getElementById('logServiceFilter')?.addEventListener('change', (e) => {
        currentService = e.target.value;
        loadData();
    });

    document.getElementById('metricServiceFilter')?.addEventListener('change', (e) => {
        currentService = e.target.value;
        loadData();
    });

    document.getElementById('traceServiceFilter')?.addEventListener('change', (e) => {
        currentService = e.target.value;
        loadData();
    });
}

function setupAutoRefresh() {
    if (autoRefreshEnabled) {
        startAutoRefresh();
    }
}

function startAutoRefresh() {
    if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
    }
    refreshIntervalId = setInterval(() => {
        loadData();
    }, REFRESH_INTERVAL);
}

function stopAutoRefresh() {
    if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
        refreshIntervalId = null;
    }
}

// Charts
function initializeCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(36, 39, 46, 0.95)',
                titleColor: '#DDE2E9',
                bodyColor: '#9FA6B2',
                borderColor: 'rgba(204, 214, 246, 0.2)',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: (context) => `${context.parsed.y.toFixed(2)} ms`
                }
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(204, 214, 246, 0.05)', borderColor: 'rgba(204, 214, 246, 0.1)' },
                ticks: { color: '#6E7781', maxRotation: 0 }
            },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(204, 214, 246, 0.05)', borderColor: 'rgba(204, 214, 246, 0.1)' },
                ticks: {
                    color: '#6E7781',
                    callback: (value) => value + ' ms'
                }
            }
        }
    };

    apiLatencyChart = new Chart(document.getElementById('apiLatencyChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                data: [],
                borderColor: '#F2CC0C',
                backgroundColor: 'rgba(242, 204, 12, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: '#F2CC0C',
                pointBorderColor: '#111217',
                pointBorderWidth: 2
            }]
        },
        options: chartOptions
    });

    serviceLatencyChart = new Chart(document.getElementById('serviceLatencyChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                data: [],
                borderColor: '#73C991',
                backgroundColor: 'rgba(115, 201, 145, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: '#73C991',
                pointBorderColor: '#111217',
                pointBorderWidth: 2
            }]
        },
        options: chartOptions
    });

    metricsTimelineChart = new Chart(document.getElementById('metricsTimelineChart'), {
        type: 'line',
        data: {
            labels: [],
            datasets: []
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                legend: { display: true, labels: { color: '#9FA6B2' } }
            }
        }
    });
}

// Data Loading
async function loadData() {
    try {
        if (currentView === 'overview' || currentView === 'metrics') {
            await loadMetrics();
        }
        if (currentView === 'logs') {
            await loadLogs();
        }
        if (currentView === 'traces') {
            await loadTraces();
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

async function loadMetrics() {
    try {
        const endTime = Date.now();
        const startTime = endTime - currentTimeRange;
        const params = new URLSearchParams({
            startTime: startTime.toString(),
            endTime: endTime.toString()
        });

        if (currentService) params.append('serviceName', currentService);

        const response = await fetch(`${API_BASE_URL}/dashboard/metrics?${params}`);
        const data = await response.json();

        updateMetricsCharts(data);
        updateStatsCards(data);
    } catch (error) {
        console.error('Error loading metrics:', error);
    }
}

function updateMetricsCharts(data) {
    const apiMetrics = data.metrics['api.latency'] || [];
    const serviceMetrics = data.metrics['service.latency'] || [];

    if (apiMetrics.length > 0) {
        const apiData = apiMetrics.slice(-50);
        apiLatencyChart.data.labels = apiData.map(m => formatTime(m.timestamp));
        apiLatencyChart.data.datasets[0].data = apiData.map(m => m.value);
        apiLatencyChart.update('none');
    }

    if (serviceMetrics.length > 0) {
        const svcData = serviceMetrics.slice(-50);
        serviceLatencyChart.data.labels = svcData.map(m => formatTime(m.timestamp));
        serviceLatencyChart.data.datasets[0].data = svcData.map(m => m.value);
        serviceLatencyChart.update('none');
    }

    // Update metrics timeline
    if (currentView === 'metrics') {
        metricsTimelineChart.data.labels = apiMetrics.map(m => formatTime(m.timestamp));
        metricsTimelineChart.data.datasets = [
            {
                label: 'API Latency',
                data: apiMetrics.map(m => m.value),
                borderColor: '#F2CC0C',
                backgroundColor: 'rgba(242, 204, 12, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            },
            {
                label: 'Service Latency',
                data: serviceMetrics.map(m => m.value),
                borderColor: '#73C991',
                backgroundColor: 'rgba(115, 201, 145, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }
        ];
        metricsTimelineChart.update('none');
    }
}

function updateStatsCards(data) {
    const apiStats = data.statistics['api.latency'];
    if (apiStats) {
        document.getElementById('avgApiLatency').textContent = `${apiStats.avg.toFixed(2)} ms`;
    }

    const svcStats = data.statistics['service.latency'];
    if (svcStats) {
        document.getElementById('avgServiceLatency').textContent = `${svcStats.avg.toFixed(2)} ms`;
    }

    const allMetrics = Object.values(data.metrics).flat();
    const errors = allMetrics.filter(m => m.statusCode >= 400).length;
    document.getElementById('totalErrors').textContent = errors;
}

async function loadLogs() {
    try {
        const endTime = Date.now();
        const startTime = endTime - currentTimeRange;
        const params = new URLSearchParams({
            startTime: startTime.toString(),
            endTime: endTime.toString(),
            limit: '1000'
        });

        if (currentService) params.append('serviceName', currentService);

        const response = await fetch(`${API_BASE_URL}/dashboard/logs?${params}`);
        const data = await response.json();

        logs = data.logs || [];
        updateLogStats(logs);
        filterAndRenderLogs();
    } catch (error) {
        console.error('Error loading logs:', error);
    }
}

function filterAndRenderLogs() {
    let filtered = logs;

    if (currentLogLevel) {
        filtered = filtered.filter(log => log.level === currentLogLevel);
    }

    if (currentLogSearch) {
        const search = currentLogSearch.toLowerCase();
        filtered = filtered.filter(log =>
            log.message.toLowerCase().includes(search)
        );
    }

    if (currentLoggerFilter) {
        const logger = currentLoggerFilter.toLowerCase();
        filtered = filtered.filter(log =>
            log.logger && log.logger.toLowerCase().includes(logger)
        );
    }

    if (currentTraceIdFilter) {
        const traceId = currentTraceIdFilter.toLowerCase();
        filtered = filtered.filter(log =>
            log.traceId && log.traceId.toLowerCase().includes(traceId)
        );
    }

    document.getElementById('filteredLogs').textContent = filtered.length;
    renderLogs(filtered);
}

function updateLogStats(logs) {
    document.getElementById('totalLogs').textContent = logs.length;

    const counts = {
        DEBUG: 0,
        INFO: 0,
        WARN: 0,
        ERROR: 0
    };

    logs.forEach(log => {
        if (counts.hasOwnProperty(log.level)) {
            counts[log.level]++;
        }
    });

    document.getElementById('debugCount').textContent = counts.DEBUG;
    document.getElementById('infoCount').textContent = counts.INFO;
    document.getElementById('warnCount').textContent = counts.WARN;
    document.getElementById('errorCount').textContent = counts.ERROR;
}

function renderLogs(logsToRender) {
    const container = document.getElementById('logsContainer');

    if (logsToRender.length === 0) {
        container.innerHTML = '<p class="empty-state">No logs match the current filters</p>';
        return;
    }

    container.innerHTML = logsToRender
        .slice().reverse()
        .map(log => `
            <div class="log-entry ${log.level.toLowerCase()}">
                <div class="log-header">
                    <span class="log-level-badge ${log.level.toLowerCase()}">${log.level}</span>
                    <span class="log-time">${formatDateTime(log.timestamp)}</span>
                    ${log.logger ? `<span class="log-time">${escapeHtml(log.logger)}</span>` : ''}
                    ${log.traceId ? `<span class="log-trace-id">Trace: ${log.traceId.substring(0, 8)}...</span>` : ''}
                </div>
                <div class="log-message">${escapeHtml(log.message)}</div>
            </div>
        `)
        .join('');
}

async function loadTraces() {
    try {
        const endTime = Date.now();
        const startTime = endTime - currentTimeRange;
        const params = new URLSearchParams({
            startTime: startTime.toString(),
            endTime: endTime.toString(),
            limit: '100'
        });

        if (currentService) params.append('serviceName', currentService);

        const response = await fetch(`${API_BASE_URL}/dashboard/traces?${params}`);
        const data = await response.json();

        traces = data.traces || [];
        document.getElementById('activeTraces').textContent = traces.length;
        renderTraces(traces);
    } catch (error) {
        console.error('Error loading traces:', error);
    }
}

function renderTraces(tracesToRender) {
    const container = document.getElementById('tracesContainer');

    if (tracesToRender.length === 0) {
        container.innerHTML = '<p class="empty-state">No traces available</p>';
        return;
    }

    container.innerHTML = tracesToRender.map(trace => `
        <div class="trace-item">
            <div class="trace-header">
                <span class="trace-id">${trace.traceId}</span>
                <span class="trace-duration">${trace.duration} ms</span>
            </div>
            <div class="trace-spans">
                ${trace.spans.map(span => {
        const percentage = (span.duration / trace.duration) * 100;
        return `
                        <div class="span-item">
                            <div class="span-name">${escapeHtml(span.operationName)}</div>
                            <div class="span-duration">${span.duration} ms</div>
                            <div class="span-waterfall">
                                <div class="span-waterfall-bar" style="width: ${percentage}%"></div>
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `).join('');
}

// Export Logs
function exportLogs() {
    if (logs.length === 0) {
        alert('No logs to export');
        return;
    }

    const csv = [
        ['Timestamp', 'Level', 'Logger', 'Message', 'Trace ID', 'Span ID'],
        ...logs.map(log => [
            new Date(log.timestamp).toISOString(),
            log.level,
            log.logger || '',
            log.message,
            log.traceId || '',
            log.spanId || ''
        ])
    ]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// Utilities
function formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function formatDateTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
