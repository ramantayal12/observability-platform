/**
 * API Details Chart Component
 * Interactive chart showing API endpoint latency over time (Grafana-style)
 */
class ApiDetailsTable {
    constructor(options = {}) {
        this.containerId = options.containerId || 'apiDetailsTable';
        this.title = options.title || 'API Endpoint Latency';
        this.data = [];
        this.chart = null;
        this.selectedEndpoints = new Set();
        this.endpointColors = {};
        this.colorPalette = [
            '#5E60CE', '#73C991', '#F2CC0C', '#FF8C42', '#F77F00',
            '#9E77ED', '#06AED5', '#F72585', '#12B76A', '#F79009'
        ];

        this.init();
    }

    init() {
        console.log('[ApiDetailsChart] Initializing...');
        this.render();
        this.attachEventListeners();
        console.log('[ApiDetailsChart] Initialization complete');
    }

    render() {
        console.log('[ApiDetailsChart] Rendering, looking for container:', this.containerId);
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`[ApiDetailsChart] Container with id "${this.containerId}" not found`);
            return;
        }
        console.log('[ApiDetailsChart] Container found, rendering chart...');

        container.innerHTML = `
            <div class="chart-card">
                <div class="chart-header">
                    <h3 class="chart-title">${this.title}</h3>
                </div>
                <div class="chart-body" style="min-height: 350px;">
                    <canvas id="${this.containerId}Canvas"></canvas>
                </div>
                <div class="api-legend" id="${this.containerId}Legend">
                    <!-- Legend populated by JS -->
                </div>
            </div>
        `;
    }

    attachEventListeners() {
        // Legend items will be clickable to toggle endpoints
    }

    setData(timeSeriesData) {
        // timeSeriesData should be an object with endpoint names as keys
        // and arrays of {timestamp, latency} as values
        this.data = timeSeriesData || {};
        this.assignColors();
        this.renderLegend();
        this.updateChart();
    }

    assignColors() {
        const endpoints = Object.keys(this.data);
        endpoints.forEach((endpoint, index) => {
            if (!this.endpointColors[endpoint]) {
                this.endpointColors[endpoint] = this.colorPalette[index % this.colorPalette.length];
            }
            // Select all endpoints by default
            this.selectedEndpoints.add(endpoint);
        });
    }

    renderLegend() {
        const legendContainer = document.getElementById(`${this.containerId}Legend`);
        if (!legendContainer) return;

        const endpoints = Object.keys(this.data);

        legendContainer.innerHTML = `
            <div style="padding: 16px; display: flex; flex-wrap: wrap; gap: 12px; border-top: 1px solid var(--border-primary);">
                ${endpoints.map(endpoint => `
                    <div class="api-legend-item" data-endpoint="${endpoint}" style="cursor: pointer; display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 4px; background: var(--bg-tertiary); transition: all 0.2s;">
                        <div class="legend-color-box" style="width: 12px; height: 12px; border-radius: 2px; background: ${this.endpointColors[endpoint]};"></div>
                        <span style="font-size: 13px; color: var(--text-primary);">${endpoint}</span>
                    </div>
                `).join('')}
            </div>
        `;

        // Add click handlers to legend items
        legendContainer.querySelectorAll('.api-legend-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const endpoint = e.currentTarget.getAttribute('data-endpoint');
                this.toggleEndpoint(endpoint);
            });
        });
    }

    toggleEndpoint(endpoint) {
        if (this.selectedEndpoints.has(endpoint)) {
            this.selectedEndpoints.delete(endpoint);
        } else {
            this.selectedEndpoints.add(endpoint);
        }
        this.updateLegendStyles();
        this.updateChart();
    }

    updateLegendStyles() {
        const legendContainer = document.getElementById(`${this.containerId}Legend`);
        if (!legendContainer) return;

        legendContainer.querySelectorAll('.api-legend-item').forEach(item => {
            const endpoint = item.getAttribute('data-endpoint');
            if (this.selectedEndpoints.has(endpoint)) {
                item.style.opacity = '1';
                item.style.background = 'var(--bg-tertiary)';
            } else {
                item.style.opacity = '0.4';
                item.style.background = 'var(--bg-secondary)';
            }
        });
    }

    updateChart() {
        const canvas = document.getElementById(`${this.containerId}Canvas`);
        if (!canvas) return;

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        // Prepare datasets
        const datasets = [];
        Object.keys(this.data).forEach(endpoint => {
            const isSelected = this.selectedEndpoints.has(endpoint);
            const color = this.endpointColors[endpoint];

            datasets.push({
                label: endpoint,
                data: this.data[endpoint],
                borderColor: color,
                backgroundColor: color + '20',
                borderWidth: isSelected ? 2 : 0.5,
                pointRadius: isSelected ? 3 : 0,
                pointHoverRadius: 5,
                tension: 0.4,
                hidden: !isSelected,
                opacity: isSelected ? 1 : 0.2
            });
        });

        // Create chart
        const ctx = canvas.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: { datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(26, 29, 38, 0.95)',
                        titleColor: '#E4E7EB',
                        bodyColor: '#9FA6B2',
                        borderColor: '#2D3139',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + ' ms';
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute',
                            displayFormats: {
                                minute: 'HH:mm'
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#9FA6B2'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.05)'
                        },
                        ticks: {
                            color: '#9FA6B2',
                            callback: function(value) {
                                return value + ' ms';
                            }
                        }
                    }
                }
            }
        });
    }

    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        this.data = {};
        this.selectedEndpoints.clear();
        this.endpointColors = {};
    }
}

// Make it globally available
window.ApiDetailsTable = ApiDetailsTable;

