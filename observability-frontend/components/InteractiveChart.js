/**
 * InteractiveChart Component
 * Reusable chart with interactive legend (Grafana-style)
 * Supports multiple series with click-to-toggle functionality
 */
class InteractiveChart {
    constructor(options = {}) {
        this.containerId = options.containerId;
        this.title = options.title || 'Chart';
        this.chartType = options.chartType || 'line';
        this.unit = options.unit || '';
        this.showLegend = options.showLegend !== false;
        this.fill = options.fill !== false;
        this.stacked = options.stacked || false;
        this.height = options.height || 300;
        
        this.chart = null;
        this.datasets = [];
        this.selectedSeries = new Set();
        this.seriesColors = {};
        
        this.colorPalette = [
            '#774FF8', '#12B76A', '#F2CC0C', '#F04438', '#06AED5',
            '#9E77ED', '#F79009', '#667085', '#EC4899', '#14B8A6'
        ];
        
        this.init();
    }
    
    init() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error(`[InteractiveChart] Container "${this.containerId}" not found`);
            return;
        }
        this.render(container);
    }
    
    render(container) {
        const canvasId = `${this.containerId}-canvas`;
        const legendId = `${this.containerId}-legend`;
        
        container.innerHTML = `
            <div class="interactive-chart">
                <div class="chart-canvas-wrapper" style="height: ${this.height}px;">
                    <canvas id="${canvasId}"></canvas>
                </div>
                ${this.showLegend ? `<div class="chart-legend" id="${legendId}"></div>` : ''}
            </div>
        `;
    }
    
    /**
     * Set chart data with multiple series
     * @param {Object} seriesData - Object with series names as keys and data arrays as values
     * Each data array should contain objects with {x: timestamp, y: value} or just values
     */
    setData(seriesData, labels = null) {
        this.datasets = [];
        const seriesNames = Object.keys(seriesData);
        
        // Assign colors and select all by default
        seriesNames.forEach((name, index) => {
            if (!this.seriesColors[name]) {
                this.seriesColors[name] = this.colorPalette[index % this.colorPalette.length];
            }
            this.selectedSeries.add(name);
            
            const color = this.seriesColors[name];
            const data = seriesData[name];
            
            this.datasets.push({
                label: name,
                data: data,
                borderColor: color,
                backgroundColor: this.fill ? color + '20' : 'transparent',
                borderWidth: 2,
                pointRadius: 2,
                pointHoverRadius: 5,
                tension: 0.4,
                fill: this.fill
            });
        });
        
        this.labels = labels;
        this.renderLegend();
        this.updateChart();
    }
    
    /**
     * Set single series data (backward compatible)
     */
    setSingleSeries(data, label = 'Value', color = '#774FF8') {
        this.setData({ [label]: data });
    }
    
    renderLegend() {
        if (!this.showLegend) return;
        
        const legendContainer = document.getElementById(`${this.containerId}-legend`);
        if (!legendContainer) return;
        
        const seriesNames = Object.keys(this.seriesColors);
        if (seriesNames.length <= 1) {
            legendContainer.innerHTML = '';
            return;
        }
        
        legendContainer.innerHTML = seriesNames.map(name => `
            <div class="legend-item ${this.selectedSeries.has(name) ? 'active' : ''}" 
                 data-series="${name}">
                <span class="legend-color" style="background: ${this.seriesColors[name]};"></span>
                <span class="legend-label">${name}</span>
            </div>
        `).join('');
        
        // Add click handlers
        legendContainer.querySelectorAll('.legend-item').forEach(item => {
            item.addEventListener('click', () => {
                const seriesName = item.getAttribute('data-series');
                this.toggleSeries(seriesName);
            });
        });
    }
    
    toggleSeries(seriesName) {
        if (this.selectedSeries.has(seriesName)) {
            // Don't allow deselecting if it's the last one
            if (this.selectedSeries.size > 1) {
                this.selectedSeries.delete(seriesName);
            }
        } else {
            this.selectedSeries.add(seriesName);
        }
        this.updateLegendStyles();
        this.updateChartVisibility();
    }
    
    updateLegendStyles() {
        const legendContainer = document.getElementById(`${this.containerId}-legend`);
        if (!legendContainer) return;
        
        legendContainer.querySelectorAll('.legend-item').forEach(item => {
            const seriesName = item.getAttribute('data-series');
            if (this.selectedSeries.has(seriesName)) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
    
    updateChartVisibility() {
        if (!this.chart) return;
        
        this.chart.data.datasets.forEach((dataset, index) => {
            const isSelected = this.selectedSeries.has(dataset.label);
            dataset.borderWidth = isSelected ? 2 : 0.5;
            dataset.pointRadius = isSelected ? 2 : 0;
            dataset.hidden = !isSelected;
        });
        
        this.chart.update('none');
    }
    
    updateChart() {
        const canvas = document.getElementById(`${this.containerId}-canvas`);
        if (!canvas) return;
        
        if (this.chart) {
            this.chart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        const isTimeSeries = this.datasets.length > 0 && 
            this.datasets[0].data.length > 0 && 
            typeof this.datasets[0].data[0] === 'object' &&
            this.datasets[0].data[0].x !== undefined;
        
        const options = this.getChartOptions(isTimeSeries);
        
        this.chart = new Chart(ctx, {
            type: this.chartType,
            data: {
                labels: this.labels || [],
                datasets: this.datasets
            },
            options: options
        });
    }
    
    getChartOptions(isTimeSeries) {
        const unit = this.unit;
        
        const baseOptions = {
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
                            let value = context.parsed.y;
                            if (typeof value === 'number') {
                                value = value.toFixed(2);
                            }
                            return `${context.dataset.label}: ${value}${unit ? ' ' + unit : ''}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#9FA6B2',
                        maxTicksLimit: 8
                    }
                },
                y: {
                    beginAtZero: true,
                    stacked: this.stacked,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#9FA6B2',
                        callback: function(value) {
                            return value + (unit ? ' ' + unit : '');
                        }
                    }
                }
            }
        };
        
        if (isTimeSeries) {
            baseOptions.scales.x = {
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
                    color: '#9FA6B2',
                    maxTicksLimit: 8
                }
            };
        }
        
        return baseOptions;
    }
    
    /**
     * Update existing chart data without full re-render
     */
    update(seriesData, labels = null) {
        if (!this.chart) {
            this.setData(seriesData, labels);
            return;
        }
        
        // Update datasets
        Object.keys(seriesData).forEach((name, index) => {
            if (this.chart.data.datasets[index]) {
                this.chart.data.datasets[index].data = seriesData[name];
            }
        });
        
        if (labels) {
            this.chart.data.labels = labels;
        }
        
        this.chart.update('none');
    }
    
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        this.datasets = [];
        this.selectedSeries.clear();
    }
}

// Make globally available
window.InteractiveChart = InteractiveChart;

