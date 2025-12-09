// Configuration
const API_BASE_URL = 'http://localhost:8080/api';
const REFRESH_INTERVAL = 5000; // 5 seconds

// State
let currentService = '';
let currentTimeRange = 3600000; // 1 hour
let apiLatencyChart = null;
let serviceLatencyChart = null;
let logs = [];
let traces = [];
let refreshIntervalId = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeCharts();
    setupEventListeners();
    loadData();
    startAutoRefresh();
});

// Event Listeners
function setupEventListeners() {
    document.getElementById('serviceFilter').addEventListener('change', (e) => {
        currentService = e.target.value;
        loadData();
    });

    document.getElementById('timeRange').addEventListener('change', (e) => {
        currentTimeRange = parseInt(e.target.value);
        loadData();
    });

    document.getElementById('refreshBtn').addEventListener('click', () => {
        loadData();
    });

    document.getElementById('logSearch').addEventListener('input', (e) => {
        filterLogs(e.target.value);
    });

    document.getElementById('logLevelFilter').addEventListener('change', (e) => {
        filterLogsByLevel(e.target.value);
    });

    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Chart Initialization
function initializeCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(30, 38, 66, 0.95)',
                titleColor: '#ffffff',
                bodyColor: '#a0aec0',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: function(context) {
                        return `${context.parsed.y.toFixed(2)} ms`;
                    }
                }
            }
        },
        scales: {
            x: {
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: '#718096',
                    maxRotation: 0
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                },
                ticks: {
                    color: '#718096',
                    callback: function(value) {
                        return value + ' ms';
                    }
                }
            }
        }
    };

    // API Latency Chart
    const apiCtx = document.getElementById('apiLatencyChart').getContext('2d');
    apiLatencyChart = new Chart(apiCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'API Latency',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#667eea',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            }]
        },
        options: chartOptions
    });

    // Service Latency Chart
    const serviceCtx = document.getElementById('serviceLatencyChart').getContext('2d');
    serviceLatencyChart = new Chart(serviceCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Service Latency',
                data: [],
                borderColor: '#38ef7d',
                backgroundColor: 'rgba(56, 239, 125, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#38ef7d',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2
            }]
        },
        options: chartOptions
    });
}

// Data Loading
async function loadData() {
    try {
        await Promise.all([
            loadMetrics(),
            loadLogs(),
            loadTraces()
        ]);
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
        
        if (currentService) {
            params.append('serviceName', currentService);
        }

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

    // Update API Latency Chart
    if (apiMetrics.length > 0) {
        const apiData = apiMetrics.slice(-50); // Last 50 points
        apiLatencyChart.data.labels = apiData.map((m, i) => formatTime(m.timestamp));
        apiLatencyChart.data.datasets[0].data = apiData.map(m => m.value);
        apiLatencyChart.update();
    }

    // Update Service Latency Chart
    if (serviceMetrics.length > 0) {
        const svcData = serviceMetrics.slice(-50);
        serviceLatencyChart.data.labels = svcData.map((m, i) => formatTime(m.timestamp));
        serviceLatencyChart.data.datasets[0].data = svcData.map(m => m.value);
        serviceLatencyChart.update();
    }
}

function updateStatsCards(data) {
    // Average API Latency
    const apiStats = data.statistics['api.latency'];
    if (apiStats) {
        document.getElementById('avgApiLatency').textContent = 
            `${apiStats.avg.toFixed(2)} ms`;
    }

    // Average Service Latency
    const svcStats = data.statistics['service.latency'];
    if (svcStats) {
        document.getElementById('avgServiceLatency').textContent = 
            `${svcStats.avg.toFixed(2)} ms`;
    }

    // Count errors (status code >= 400)
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
            limit: '500'
        });
        
        if (currentService) {
            params.append('serviceName', currentService);
        }

        const response = await fetch(`${API_BASE_URL}/dashboard/logs?${params}`);
        const data = await response.json();

        logs = data.logs || [];
        renderLogs(logs);
    } catch (error) {
        console.error('Error loading logs:', error);
    }
}

function renderLogs(logsToRender) {
    const container = document.getElementById('logsContainer');
    
    if (logsToRender.length === 0) {
        container.innerHTML = '<p class="empty-state">No logs available</p>';
        return;
    }

    container.innerHTML = logsToRender
        .slice().reverse() // Most recent first
        .map(log => `
            <div class="log-entry">
                <div class="log-header">
                    <span class="log-level ${log.level.toLowerCase()}">${log.level}</span>
                    <span class="log-time">${formatDateTime(log.timestamp)}</span>
                    ${log.traceId ? `<span class="log-time">Trace: ${log.traceId.substring(0, 8)}</span>` : ''}
                </div>
                <div class="log-message">${escapeHtml(log.message)}</div>
            </div>
        `)
        .join('');
}

function filterLogs(searchTerm) {
    const filtered = logs.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase())
    );
    renderLogs(filtered);
}

function filterLogsByLevel(level) {
    if (!level) {
        renderLogs(logs);
        return;
    }
    
    const filtered = logs.filter(log => log.level === level);
    renderLogs(filtered);
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
        
        if (currentService) {
            params.append('serviceName', currentService);
        }

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

// Auto Refresh
function startAutoRefresh() {
    if (refreshIntervalId) {
        clearInterval(refreshIntervalId);
    }
    
    refreshIntervalId = setInterval(() => {
        loadData();
    }, REFRESH_INTERVAL);
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
