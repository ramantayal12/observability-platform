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

    /**
     * Create gradient fill for area charts
     */
    createGradientFill(color) {
        // Return a function that creates gradient when canvas is available
        return (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return color + '20';

            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, color + '40');
            gradient.addColorStop(0.5, color + '15');
            gradient.addColorStop(1, color + '00');
            return gradient;
        };
    }

    render(container) {
        const canvasId = `${this.containerId}-canvas`;
        const legendId = `${this.containerId}-legend`;

        container.innerHTML = `
            <div class="interactive-chart">
                <div class="chart-canvas-wrapper">
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
                backgroundColor: this.fill ? this.createGradientFill(color) : 'transparent',
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#0D0D0D',
                pointHoverBorderColor: color,
                pointHoverBorderWidth: 2,
                tension: 0.35,
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
        // For bar charts, always show legend since x-axis labels are hidden
        // For other charts, hide legend if only 1 series
        if (seriesNames.length <= 1 && this.chartType !== 'bar') {
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
                    backgroundColor: 'rgba(13, 13, 13, 0.98)',
                    titleColor: '#FFFFFF',
                    titleFont: { size: 13, weight: '600', family: 'Inter' },
                    bodyColor: '#9FA6B2',
                    bodyFont: { size: 12, family: 'JetBrains Mono' },
                    borderColor: 'rgba(119, 79, 248, 0.3)',
                    borderWidth: 1,
                    padding: { top: 12, bottom: 12, left: 14, right: 14 },
                    cornerRadius: 8,
                    displayColors: true,
                    boxWidth: 8,
                    boxHeight: 8,
                    boxPadding: 6,
                    usePointStyle: true,
                    callbacks: {
                        title: function(tooltipItems) {
                            if (isTimeSeries && tooltipItems[0]) {
                                const date = new Date(tooltipItems[0].parsed.x);
                                return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                            }
                            return tooltipItems[0]?.label || '';
                        },
                        label: function(context) {
                            let value = context.parsed.y;
                            if (typeof value === 'number') {
                                value = value.toLocaleString('en-US', { maximumFractionDigits: 2 });
                            }
                            return ` ${context.dataset.label}: ${value}${unit ? ' ' + unit : ''}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    display: this.chartType !== 'bar', // Hide x-axis for bar charts - use legend instead
                    grid: {
                        color: 'rgba(255, 255, 255, 0.04)',
                        drawBorder: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: '#6B7280',
                        font: { size: 11, family: 'Inter' },
                        maxTicksLimit: 8,
                        padding: 8
                    }
                },
                y: {
                    beginAtZero: true,
                    stacked: this.stacked,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.04)',
                        drawBorder: false
                    },
                    border: {
                        display: false
                    },
                    ticks: {
                        color: '#6B7280',
                        font: { size: 11, family: 'JetBrains Mono' },
                        padding: 12,
                        callback: function(value) {
                            if (value >= 1000) {
                                return (value / 1000).toFixed(1) + 'k' + (unit ? ' ' + unit : '');
                            }
                            return value + (unit ? ' ' + unit : '');
                        }
                    }
                }
            },
            elements: {
                line: {
                    borderWidth: 2,
                    tension: 0.35
                },
                point: {
                    radius: 0,
                    hoverRadius: 6,
                    hoverBorderWidth: 2,
                    hoverBackgroundColor: '#0D0D0D'
                }
            }
        };

        if (isTimeSeries) {
            baseOptions.scales.x = {
                type: 'time',
                time: {
                    unit: 'minute',
                    displayFormats: {
                        minute: 'HH:mm',
                        hour: 'HH:mm'
                    }
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.04)',
                    drawBorder: false
                },
                border: {
                    display: false
                },
                ticks: {
                    color: '#6B7280',
                    font: { size: 11, family: 'Inter' },
                    maxTicksLimit: 8,
                    padding: 8
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

