/**
 * StatWidget - Widget for displaying statistical values
 * Extends BaseWidget to provide stat card rendering
 */
class StatWidget extends BaseWidget {
    constructor(config = {}) {
        super(config);
        this.type = 'stat';
        this.aggregation = config.aggregation || 'avg'; // avg, min, max, sum, count
        this.unit = config.unit || '';
        this.showTrend = config.showTrend !== false;
        this.trendValue = null;
        this.trendDirection = null;
        this.format = config.format || 'number'; // number, percentage, bytes, duration
        this.decimals = config.decimals !== undefined ? config.decimals : 2;
    }

    /**
     * Render stat content
     */
    renderContent(data) {
        const value = this.calculateValue(data);
        const formattedValue = this.formatValue(value);
        
        return `
            <div class="stat-display">
                <div class="stat-value-large">${formattedValue}</div>
                ${this.unit ? `<div class="stat-unit">${this.unit}</div>` : ''}
                <div class="stat-label">${this.aggregation.toUpperCase()}</div>
                ${this.showTrend && this.trendValue !== null ? this.renderTrend() : ''}
            </div>
        `;
    }

    /**
     * Calculate value based on aggregation type
     */
    calculateValue(data) {
        if (!data) return 0;

        // If data is a single value
        if (typeof data === 'number') {
            return data;
        }

        // If data is an object with statistics
        if (data.statistics) {
            return data.statistics[this.aggregation] || 0;
        }

        // If data is an array of values
        if (Array.isArray(data)) {
            const values = data.map(item => item.value || 0);
            
            switch (this.aggregation) {
                case 'avg':
                    return values.reduce((a, b) => a + b, 0) / values.length || 0;
                case 'min':
                    return Math.min(...values);
                case 'max':
                    return Math.max(...values);
                case 'sum':
                    return values.reduce((a, b) => a + b, 0);
                case 'count':
                    return values.length;
                default:
                    return values.reduce((a, b) => a + b, 0) / values.length || 0;
            }
        }

        return 0;
    }

    /**
     * Format value based on format type
     */
    formatValue(value) {
        switch (this.format) {
            case 'percentage':
                return (value * 100).toFixed(this.decimals) + '%';
            
            case 'bytes':
                return this.formatBytes(value);
            
            case 'duration':
                return this.formatDuration(value);
            
            case 'number':
            default:
                if (value >= 1000000) {
                    return (value / 1000000).toFixed(1) + 'M';
                } else if (value >= 1000) {
                    return (value / 1000).toFixed(1) + 'K';
                }
                return value.toFixed(this.decimals);
        }
    }

    /**
     * Format bytes to human-readable format
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(this.decimals)) + ' ' + sizes[i];
    }

    /**
     * Format duration in milliseconds to human-readable format
     */
    formatDuration(ms) {
        if (ms < 1000) {
            return ms.toFixed(0) + 'ms';
        } else if (ms < 60000) {
            return (ms / 1000).toFixed(1) + 's';
        } else if (ms < 3600000) {
            return (ms / 60000).toFixed(1) + 'm';
        } else {
            return (ms / 3600000).toFixed(1) + 'h';
        }
    }

    /**
     * Render trend indicator
     */
    renderTrend() {
        if (this.trendValue === null) return '';

        const isPositive = this.trendValue > 0;
        const isNegative = this.trendValue < 0;
        const trendClass = isPositive ? 'trend-up' : isNegative ? 'trend-down' : 'trend-neutral';
        
        return `
            <div class="stat-trend ${trendClass}">
                ${isPositive ? `
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M6 2l4 4H8v4H4V6H2l4-4z"/>
                    </svg>
                ` : isNegative ? `
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                        <path d="M6 10l-4-4h2V2h4v4h2l-4 4z"/>
                    </svg>
                ` : ''}
                <span>${Math.abs(this.trendValue).toFixed(1)}%</span>
            </div>
        `;
    }

    /**
     * Set trend value
     */
    setTrend(value, direction) {
        this.trendValue = value;
        this.trendDirection = direction;
    }

    /**
     * Update configuration
     */
    updateConfig(config) {
        super.updateConfig(config);
        
        if (config.aggregation) this.aggregation = config.aggregation;
        if (config.unit) this.unit = config.unit;
        if (config.format) this.format = config.format;
        if (config.decimals !== undefined) this.decimals = config.decimals;
        
        // Re-render with new config
        if (this.data) {
            this.update(this.data);
        }
    }
}

