/**
 * ChartWidget - Widget for displaying time-series charts
 * Extends BaseWidget to provide chart rendering capabilities
 */
class ChartWidget extends BaseWidget {
    constructor(config = {}) {
        super(config);
        this.type = 'chart';
        this.chartType = config.chartType || 'line'; // line, bar, area
        this.chartInstance = null;
        this.color = config.color || '#774FF8';
        this.unit = config.unit || '';
        this.showLegend = config.showLegend !== false;
        this.fill = config.fill !== false;
    }

    /**
     * Render chart content
     */
    renderContent(data) {
        const canvasId = `chart-${this.id}`;
        return `<canvas id="${canvasId}" style="max-height: 300px;"></canvas>`;
    }

    /**
     * After render - initialize chart
     */
    afterRender() {
        this.initializeChart();
    }

    /**
     * Initialize Chart.js chart
     */
    initializeChart() {
        const canvasId = `chart-${this.id}`;
        const canvas = document.getElementById(canvasId);
        
        if (!canvas) {
            console.error(`[ChartWidget] Canvas not found: ${canvasId}`);
            return;
        }

        // Destroy existing chart
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        // Prepare data
        const chartData = this.prepareChartData(this.data);

        // Create chart
        this.chartInstance = new Chart(canvas, {
            type: this.chartType === 'area' ? 'line' : this.chartType,
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: this.title,
                    data: chartData.values,
                    borderColor: this.color,
                    backgroundColor: this.fill ? this.hexToRgba(this.color, 0.1) : 'transparent',
                    tension: 0.4,
                    fill: this.fill,
                    borderWidth: 2
                }]
            },
            options: this.getChartOptions()
        });
    }

    /**
     * Prepare data for chart
     */
    prepareChartData(data) {
        if (!data || !Array.isArray(data)) {
            return { labels: [], values: [] };
        }

        const labels = data.map(item => {
            if (item.timestamp) {
                return new Date(item.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
            }
            return item.label || '';
        });

        const values = data.map(item => item.value || 0);

        return { labels, values };
    }

    /**
     * Get chart options
     */
    getChartOptions() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: this.showLegend,
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: { size: 13 },
                    bodyFont: { size: 12 },
                    callbacks: {
                        label: (context) => {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            label += context.parsed.y.toFixed(2);
                            if (this.unit) {
                                label += ' ' + this.unit;
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 0,
                        autoSkipPadding: 20
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        callback: (value) => {
                            return value.toFixed(0) + (this.unit ? ' ' + this.unit : '');
                        }
                    }
                }
            }
        };
    }

    /**
     * Convert hex color to rgba
     */
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Update chart with new data
     */
    async update(data) {
        this.data = data;
        
        if (this.chartInstance) {
            const chartData = this.prepareChartData(data);
            this.chartInstance.data.labels = chartData.labels;
            this.chartInstance.data.datasets[0].data = chartData.values;
            this.chartInstance.update('none'); // Update without animation
        } else {
            await super.update(data);
        }
    }

    /**
     * Destroy widget and chart
     */
    destroy() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
        super.destroy();
    }

    /**
     * Update configuration
     */
    updateConfig(config) {
        super.updateConfig(config);
        
        if (config.color) this.color = config.color;
        if (config.unit) this.unit = config.unit;
        if (config.chartType) this.chartType = config.chartType;
        
        // Reinitialize chart with new config
        if (this.chartInstance && this.data) {
            this.initializeChart();
        }
    }
}

