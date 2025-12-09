/**
 * ChartWidget Component
 * Reusable chart widget wrapper with title, actions, and InteractiveChart
 */

class ChartWidget {
    constructor(options = {}) {
        this.containerId = options.containerId;
        this.title = options.title || 'Chart';
        this.subtitle = options.subtitle || '';
        this.unit = options.unit || '';
        this.chartType = options.chartType || 'line';
        this.height = options.height || 250;
        this.showLegend = options.showLegend !== false;
        this.showActions = options.showActions !== false;
        this.fill = options.fill;
        
        this.container = document.getElementById(this.containerId);
        this.chart = null;
        this.chartContainerId = `${this.containerId}-chart`;
        
        if (this.container) {
            this.render();
            this.initChart();
        }
    }

    /**
     * Render the widget structure
     */
    render() {
        if (!this.container) return;

        this.container.innerHTML = `
            <div class="chart-widget">
                <div class="chart-widget-header">
                    <div class="chart-widget-title-group">
                        <h3 class="chart-widget-title">${this.escapeHtml(this.title)}</h3>
                        ${this.subtitle ? `<span class="chart-widget-subtitle">${this.escapeHtml(this.subtitle)}</span>` : ''}
                    </div>
                    ${this.showActions ? `
                        <div class="chart-widget-actions">
                            <button class="chart-widget-action" title="Expand" data-action="expand">
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M1.5 1a.5.5 0 00-.5.5v4a.5.5 0 001 0V2h3.5a.5.5 0 000-1h-4zm13 0h-4a.5.5 0 000 1H14v3.5a.5.5 0 001 0v-4a.5.5 0 00-.5-.5zM1 10.5a.5.5 0 01.5-.5h4a.5.5 0 010 1H2v3.5a.5.5 0 01-1 0v-4zm14 0v4a.5.5 0 01-.5.5h-4a.5.5 0 010-1H14v-3.5a.5.5 0 011 0z"/>
                                </svg>
                            </button>
                        </div>
                    ` : ''}
                </div>
                <div class="chart-widget-body" id="${this.chartContainerId}"></div>
            </div>
        `;

        this.attachEventListeners();
    }

    /**
     * Initialize the InteractiveChart
     */
    initChart() {
        if (typeof InteractiveChart === 'undefined') {
            console.warn('[ChartWidget] InteractiveChart not available');
            return;
        }

        const chartOptions = {
            containerId: this.chartContainerId,
            unit: this.unit,
            height: this.height,
            showLegend: this.showLegend,
            chartType: this.chartType
        };

        if (this.fill !== undefined) {
            chartOptions.fill = this.fill;
        }

        this.chart = new InteractiveChart(chartOptions);
    }

    /**
     * Set chart data
     */
    setData(data) {
        if (this.chart) {
            this.chart.setData(data);
        }
    }

    /**
     * Update title
     */
    setTitle(title, subtitle) {
        this.title = title;
        if (subtitle !== undefined) this.subtitle = subtitle;
        
        const titleEl = this.container.querySelector('.chart-widget-title');
        const subtitleEl = this.container.querySelector('.chart-widget-subtitle');
        
        if (titleEl) titleEl.textContent = title;
        if (subtitleEl && subtitle !== undefined) subtitleEl.textContent = subtitle;
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const expandBtn = this.container.querySelector('[data-action="expand"]');
        if (expandBtn) {
            expandBtn.addEventListener('click', () => this.toggleExpand());
        }
    }

    /**
     * Toggle expanded view
     */
    toggleExpand() {
        const widget = this.container.querySelector('.chart-widget');
        if (widget) {
            widget.classList.toggle('expanded');
            // Re-render chart after expansion
            if (this.chart) {
                setTimeout(() => this.chart.resize(), 300);
            }
        }
    }

    /**
     * Escape HTML
     */
    escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    /**
     * Destroy the widget
     */
    destroy() {
        if (this.chart && typeof this.chart.destroy === 'function') {
            this.chart.destroy();
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.ChartWidget = ChartWidget;
}

