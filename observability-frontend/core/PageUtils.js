/**
 * PageUtils - Shared utilities for page initialization and common functions
 * Reduces code duplication across page JS files
 */

const PageUtils = (function() {
    'use strict';

    /**
     * Check if user is authenticated, redirect to login if not
     * @returns {boolean} true if authenticated
     */
    function requireAuth() {
        const authService = AuthService.getInstance();
        if (!authService.isAuthenticated()) {
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    /**
     * Get all singleton service instances
     * @returns {Object} Object containing all service instances
     */
    function getServices() {
        return {
            authService: AuthService.getInstance(),
            eventBus: EventBus.getInstance(),
            stateManager: StateManager.getInstance(),
            apiService: ApiService.getInstance(),
            notificationManager: NotificationManager.getInstance(),
            sharedDataService: typeof SharedDataService !== 'undefined' ? SharedDataService.getInstance() : null
        };
    }

    /**
     * Setup team selector component
     * @param {string} containerId - Container element ID (default: 'teamSelectorContainer')
     * @returns {TeamSelector|null} TeamSelector instance or null
     */
    function setupTeamSelector(containerId = 'teamSelectorContainer') {
        if (window.TeamSelector) {
            return new TeamSelector({ containerId });
        }
        return null;
    }

    /**
     * Setup time range picker component
     * @param {Object} options - Options for TimeRangePicker
     * @returns {TimeRangePicker|null} TimeRangePicker instance or null
     */
    function setupTimePicker(options = {}) {
        const defaults = {
            buttonId: 'timePickerBtn',
            dropdownId: 'timePickerDropdown',
            labelId: 'timePickerLabel'
        };
        return new TimeRangePicker({ ...defaults, ...options });
    }

    /**
     * Setup auto-refresh functionality
     * @param {Object} options - Configuration options
     * @param {Function} options.onRefresh - Callback function to refresh data
     * @param {number} options.interval - Refresh interval in ms (default: 30000)
     * @param {string} options.refreshBtnId - Refresh button ID (default: 'refreshBtn')
     * @param {string} options.autoRefreshBtnId - Auto-refresh toggle button ID (default: 'autoRefreshBtn')
     * @returns {Object} Object with start, stop, and cleanup methods
     */
    function setupAutoRefresh(options = {}) {
        const {
            onRefresh,
            interval = 30000,
            refreshBtnId = 'refreshBtn',
            autoRefreshBtnId = 'autoRefreshBtn'
        } = options;

        const notificationManager = NotificationManager.getInstance();
        let autoRefreshInterval = null;

        function start() {
            stop();
            autoRefreshInterval = setInterval(() => {
                if (onRefresh) onRefresh();
            }, interval);
        }

        function stop() {
            if (autoRefreshInterval) {
                clearInterval(autoRefreshInterval);
                autoRefreshInterval = null;
            }
        }

        // Setup manual refresh button
        const refreshBtn = document.getElementById(refreshBtnId);
        if (refreshBtn && onRefresh) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.classList.add('spinning');
                await onRefresh();
                refreshBtn.classList.remove('spinning');
                notificationManager.success('Data refreshed');
            });
        }

        // Setup auto-refresh toggle button
        const autoRefreshBtn = document.getElementById(autoRefreshBtnId);
        if (autoRefreshBtn) {
            const isEnabled = localStorage.getItem('observability_auto_refresh') === 'true';
            if (isEnabled) {
                autoRefreshBtn.classList.add('active');
            }

            autoRefreshBtn.addEventListener('click', () => {
                const enabled = autoRefreshBtn.classList.toggle('active');
                localStorage.setItem('observability_auto_refresh', enabled);

                if (enabled) {
                    start();
                    notificationManager.success('Auto-refresh enabled (30s)');
                } else {
                    stop();
                    notificationManager.info('Auto-refresh disabled');
                }
            });
        }

        return { start, stop, cleanup: stop };
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped HTML string
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text || '';
        return div.innerHTML;
    }

    /**
     * Get human-readable time since timestamp
     * @param {number} timestamp - Unix timestamp in milliseconds
     * @returns {string} Human-readable time string
     */
    function getTimeSince(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    /**
     * Format duration in milliseconds to human-readable string
     * @param {number} ms - Duration in milliseconds
     * @returns {string} Formatted duration string
     */
    function formatDuration(ms) {
        if (ms < 1000) return `${ms.toFixed(0)}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
        return `${(ms / 3600000).toFixed(1)}h`;
    }

    /**
     * Format timestamp to locale time string
     * @param {number} timestamp - Unix timestamp in milliseconds
     * @param {Object} options - Intl.DateTimeFormat options
     * @returns {string} Formatted time string
     */
    function formatTimestamp(timestamp, options = {}) {
        const defaults = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };
        return new Date(timestamp).toLocaleTimeString('en-US', { ...defaults, ...options });
    }

    /**
     * Format date to locale date string
     * @param {number|Date} date - Date or timestamp
     * @returns {string} Formatted date string
     */
    function formatDate(date) {
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * Calculate percentile from array of values
     * @param {number[]} values - Array of numeric values
     * @param {number} percentile - Percentile to calculate (0-100)
     * @returns {number} Percentile value
     */
    function calculatePercentile(values, percentile) {
        if (!values || values.length === 0) return 0;

        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)] || 0;
    }

    /**
     * Capitalize first letter of string
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    function capitalizeFirst(str) {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    /**
     * Generate random hex ID
     * @param {number} length - Length of ID (default: 16)
     * @returns {string} Random hex string
     */
    function generateHexId(length = 16) {
        return Array.from({ length }, () =>
            Math.floor(Math.random() * 16).toString(16)
        ).join('');
    }

    /**
     * Debounce function execution
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    function debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Parse endpoint string into method and path
     * @param {string} endpoint - Endpoint string (e.g., "GET /api/users")
     * @returns {Object} Object with method and path properties
     */
    function parseEndpoint(endpoint) {
        if (!endpoint) return { method: 'GET', path: '/unknown' };
        const parts = endpoint.split(' ');
        if (parts.length >= 2) {
            return { method: parts[0], path: parts.slice(1).join(' ') };
        }
        return { method: 'GET', path: endpoint };
    }

    /**
     * Get color based on duration value
     * @param {number} duration - Duration in milliseconds
     * @returns {string} CSS color variable
     */
    function getDurationColor(duration) {
        if (duration < 50) return 'var(--success)';
        if (duration < 100) return 'var(--info)';
        if (duration < 500) return 'var(--warning)';
        return 'var(--error)';
    }

    /**
     * Get severity color for log levels
     * @param {string} level - Log level (ERROR, WARN, INFO, DEBUG, TRACE)
     * @returns {string} CSS color variable
     */
    function getSeverityColor(level) {
        const colors = {
            'ERROR': 'var(--error)',
            'WARN': 'var(--warning)',
            'INFO': 'var(--info)',
            'DEBUG': 'var(--text-secondary)',
            'TRACE': 'var(--text-muted)'
        };
        return colors[level?.toUpperCase()] || 'var(--text-secondary)';
    }

    /**
     * Initialize page with common setup
     * @param {Object} options - Initialization options
     * @param {Function} options.onLoad - Callback after initial data load
     * @param {Function} options.onTeamChange - Callback when team changes
     * @param {Function} options.onTimeRangeChange - Callback when time range changes
     * @returns {Object} Page context with services and components
     */
    function initPage(options = {}) {
        if (!requireAuth()) return null;

        const services = getServices();
        const teamSelector = setupTeamSelector();
        const timePicker = setupTimePicker();

        let currentTimeRange = timePicker ? timePicker.getRange() : 3600000;

        // Listen for team changes
        if (options.onTeamChange) {
            services.eventBus.on('team:changed', options.onTeamChange);
        }

        // Listen for time range changes
        if (options.onTimeRangeChange) {
            services.eventBus.on(Events.TIME_RANGE_CHANGED, (data) => {
                currentTimeRange = data.range;
                options.onTimeRangeChange(data);
            });
        }

        return {
            ...services,
            teamSelector,
            timePicker,
            getTimeRange: () => currentTimeRange
        };
    }

    return {
        requireAuth,
        getServices,
        setupTeamSelector,
        setupTimePicker,
        setupAutoRefresh,
        escapeHtml,
        getTimeSince,
        formatDuration,
        formatTimestamp,
        formatDate,
        calculatePercentile,
        capitalizeFirst,
        generateHexId,
        debounce,
        parseEndpoint,
        getDurationColor,
        getSeverityColor,
        initPage
    };
})();

// Make available globally
window.PageUtils = PageUtils;

