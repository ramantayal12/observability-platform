/**
 * Logs Page
 * Enterprise-level log exploration and analysis
 */

(function() {
    'use strict';

    // Get singleton instances
    const eventBus = EventBus.getInstance();
    const stateManager = StateManager.getInstance();
    const apiService = ApiService.getInstance();
    const notificationManager = NotificationManager.getInstance();

    // Page state
    let currentFilters = {
        search: '',
        service: '',
        level: '',
        timeRange: 3600000 // 1 hour
    };
    let autoRefreshInterval = null;
    let allLogs = [];

    /**
     * Initialize the page
     */
    async function init() {
        console.log('Initializing Logs page...');
        
        // Setup UI
        setupTimePicker();
        setupAutoRefresh();
        setupFilters();
        setupSearch();
        
        // Load initial data
        await loadLogs();
        
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
                loadLogs();
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
        stopAutoRefresh();
        autoRefreshInterval = setInterval(() => {
            loadLogs();
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
        const levelFilter = document.getElementById('levelFilter');
        const clearLogsBtn = document.getElementById('clearLogsBtn');
        const exportLogsBtn = document.getElementById('exportLogsBtn');

        applyFiltersBtn.addEventListener('click', () => {
            currentFilters.service = serviceFilter.value;
            currentFilters.level = levelFilter.value;
            renderLogs();
        });

        clearLogsBtn.addEventListener('click', () => {
            const container = document.getElementById('logsContainer');
            container.innerHTML = '<div class="logs-loading">No logs</div>';
            allLogs = [];
        });

        exportLogsBtn.addEventListener('click', () => {
            exportLogs();
        });
    }

    /**
     * Setup search
     */
    function setupSearch() {
        const searchInput = document.getElementById('searchInput');
        let searchTimeout;

        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentFilters.search = e.target.value.toLowerCase();
                renderLogs();
            }, 300);
        });
    }

    /**
     * Load logs data
     */
    async function loadLogs() {
        try {
            const endTime = Date.now();
            const startTime = endTime - currentFilters.timeRange;

            const data = await apiService.fetchLogs({
                serviceName: currentFilters.service || undefined,
                level: currentFilters.level || undefined,
                startTime,
                endTime,
                limit: 1000
            });

            allLogs = data.logs || [];

            // Update stats
            updateStats(data);

            // Render logs
            renderLogs();

            // Update service filter options
            updateServiceFilter();

        } catch (error) {
            console.error('Error loading logs:', error);
            notificationManager.error('Failed to load logs');
        }
    }

    /**
     * Update stats cards
     */
    function updateStats(data) {
        const levelCounts = data.levelCounts || {};
        
        document.getElementById('totalLogs').textContent = data.total || 0;
        document.getElementById('errorCount').textContent = levelCounts.ERROR || 0;
        document.getElementById('warnCount').textContent = levelCounts.WARN || 0;
        document.getElementById('infoCount').textContent = levelCounts.INFO || 0;
    }

    /**
     * Render logs
     */
    function renderLogs() {
        const container = document.getElementById('logsContainer');
        if (!container) return;

        // Filter logs
        let filtered = allLogs;

        if (currentFilters.service) {
            filtered = filtered.filter(log => log.serviceName === currentFilters.service);
        }

        if (currentFilters.level) {
            filtered = filtered.filter(log => log.level === currentFilters.level);
        }

        if (currentFilters.search) {
            filtered = filtered.filter(log => 
                log.message.toLowerCase().includes(currentFilters.search) ||
                (log.serviceName && log.serviceName.toLowerCase().includes(currentFilters.search))
            );
        }

        if (filtered.length === 0) {
            container.innerHTML = '<div class="logs-loading">No logs found</div>';
            return;
        }

        // Sort by timestamp (most recent first)
        const sorted = filtered.sort((a, b) => b.timestamp - a.timestamp);

        // Render logs
        container.innerHTML = sorted.map(log => renderLogEntry(log)).join('');
    }

    /**
     * Render single log entry
     */
    function renderLogEntry(log) {
        const levelClass = `log-level-${log.level.toLowerCase()}`;
        const timestamp = new Date(log.timestamp).toLocaleString();
        
        return `
            <div class="log-entry ${levelClass}">
                <div class="log-header">
                    <span class="log-level badge badge-${getLevelBadgeClass(log.level)}">${log.level}</span>
                    <span class="log-timestamp">${timestamp}</span>
                    <span class="log-service">${log.serviceName || 'Unknown'}</span>
                </div>
                <div class="log-message">${escapeHtml(log.message)}</div>
                ${log.logger ? `<div class="log-logger">Logger: ${log.logger}</div>` : ''}
            </div>
        `;
    }

    /**
     * Get badge class for log level
     */
    function getLevelBadgeClass(level) {
        const map = {
            'ERROR': 'error',
            'WARN': 'warning',
            'INFO': 'info',
            'DEBUG': 'neutral'
        };
        return map[level] || 'neutral';
    }

    /**
     * Update service filter options
     */
    function updateServiceFilter() {
        const serviceFilter = document.getElementById('serviceFilter');
        if (!serviceFilter) return;

        const services = new Set();
        allLogs.forEach(log => {
            if (log.serviceName) {
                services.add(log.serviceName);
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
     * Export logs to JSON
     */
    function exportLogs() {
        const dataStr = JSON.stringify(allLogs, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `logs-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        notificationManager.success('Logs exported successfully');
    }

    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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
    });

})();

