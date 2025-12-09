/**
 * Services Page
 * Enterprise-level service health monitoring
 */

(function() {
    'use strict';

    // Check authentication first
    const authService = AuthService.getInstance();
    if (!authService.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    // Get singleton instances
    const eventBus = EventBus.getInstance();
    const stateManager = StateManager.getInstance();
    const apiService = ApiService.getInstance();
    const notificationManager = NotificationManager.getInstance();

    // Page state
    let autoRefreshInterval = null;
    let services = [];
    let currentTimeRange = stateManager.get('filters.timeRange') || 60 * 60 * 1000;
    let timeRangePicker = null;

    /**
     * Initialize the page
     */
    async function init() {
        console.log('Initializing Services page...');

        // Setup UI
        setupTimePicker();
        setupAutoRefresh();

        // Listen for time range changes
        eventBus.on(Events.TIME_RANGE_CHANGED, handleTimeRangeChange);

        // Load initial data
        await loadServices();

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
        timeRangePicker = new TimeRangePicker({
            buttonId: 'timePickerBtn',
            dropdownId: 'timePickerDropdown',
            labelId: 'timePickerLabel'
        });

        // Set initial time range
        currentTimeRange = timeRangePicker.getRange();
    }

    /**
     * Handle time range change
     */
    function handleTimeRangeChange(data) {
        console.log('[Services] Time range changed:', data);
        currentTimeRange = data.range;
        loadServices();
    }

    /**
     * Setup auto-refresh and manual refresh
     */
    function setupAutoRefresh() {
        // Manual refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                refreshBtn.classList.add('spinning');
                await loadServices();
                refreshBtn.classList.remove('spinning');
                notificationManager.success('Data refreshed');
            });
        }

        // Auto-refresh toggle button
        const autoRefreshBtn = document.getElementById('autoRefreshBtn');
        if (!autoRefreshBtn) return;

        const isEnabled = localStorage.getItem('observability_auto_refresh') === 'true';

        if (isEnabled) {
            autoRefreshBtn.classList.add('active');
        }

        autoRefreshBtn.addEventListener('click', () => {
            const enabled = autoRefreshBtn.classList.toggle('active');
            localStorage.setItem('observability_auto_refresh', enabled);

            if (enabled) {
                startAutoRefresh();
                notificationManager.success('Auto-refresh enabled (30s)');
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
            loadServices();
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
     * Load services data
     */
    async function loadServices() {
        try {
            const data = await apiService.fetchServices();
            
            services = data.services || [];

            // Update stats
            updateStats(data);

            // Render services
            renderServices();

        } catch (error) {
            console.error('Error loading services:', error);
            notificationManager.error('Failed to load services');
        }
    }

    /**
     * Update stats cards
     */
    function updateStats(data) {
        document.getElementById('totalServices').textContent = data.total || 0;
        document.getElementById('healthyServices').textContent = data.healthy || 0;
        document.getElementById('degradedServices').textContent = data.degraded || 0;
        document.getElementById('downServices').textContent = data.down || 0;
    }

    /**
     * Render services grid
     */
    function renderServices() {
        const grid = document.getElementById('servicesGrid');
        if (!grid) return;

        if (services.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="currentColor" opacity="0.3">
                        <circle cx="32" cy="32" r="24"/>
                    </svg>
                    <p>No services found</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = services.map(service => renderServiceCard(service)).join('');
    }

    /**
     * Render single service card
     */
    function renderServiceCard(service) {
        const statusClass = `status-${service.status}`;
        const statusIcon = getStatusIcon(service.status);
        const timeSinceLastSeen = getTimeSince(service.lastSeen);

        return `
            <div class="service-card ${statusClass}">
                <div class="service-header">
                    <div class="service-icon">
                        ${statusIcon}
                    </div>
                    <div class="service-status">
                        <span class="badge badge-${getStatusBadgeClass(service.status)}">
                            ${service.status.toUpperCase()}
                        </span>
                    </div>
                </div>
                
                <h3 class="service-name">${service.name}</h3>
                
                <div class="service-stats">
                    <div class="service-stat">
                        <span class="stat-label">Metrics</span>
                        <span class="stat-value">${service.metricCount || 0}</span>
                    </div>
                    <div class="service-stat">
                        <span class="stat-label">Logs</span>
                        <span class="stat-value">${service.logCount || 0}</span>
                    </div>
                    <div class="service-stat">
                        <span class="stat-label">Traces</span>
                        <span class="stat-value">${service.traceCount || 0}</span>
                    </div>
                </div>
                
                <div class="service-footer">
                    <div class="service-error-rate">
                        <span class="label">Error Rate:</span>
                        <span class="value ${service.errorRate > 10 ? 'error' : ''}">${service.errorRate.toFixed(2)}%</span>
                    </div>
                    <div class="service-last-seen">
                        <span class="label">Last seen:</span>
                        <span class="value">${timeSinceLastSeen}</span>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Get status icon
     */
    function getStatusIcon(status) {
        const icons = {
            'healthy': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
            `,
            'degraded': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                </svg>
            `,
            'down': `
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
                </svg>
            `
        };
        return icons[status] || icons['healthy'];
    }

    /**
     * Get status badge class
     */
    function getStatusBadgeClass(status) {
        const map = {
            'healthy': 'success',
            'degraded': 'warning',
            'down': 'error'
        };
        return map[status] || 'neutral';
    }

    /**
     * Get time since timestamp
     */
    function getTimeSince(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
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

