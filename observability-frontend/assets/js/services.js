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
    let selectedService = null;
    let teamSelector = null;

    /**
     * Initialize the page
     */
    async function init() {
        console.log('Initializing Services page...');

        // Setup UI
        setupTeamSelector();
        setupTimePicker();
        setupAutoRefresh();
        setupServicePanel();

        // Listen for time range changes
        eventBus.on(Events.TIME_RANGE_CHANGED, handleTimeRangeChange);

        // Listen for team changes
        eventBus.on('team:changed', handleTeamChange);

        // Load initial data
        await loadServices();

        // Setup auto-refresh if enabled
        const autoRefreshEnabled = localStorage.getItem('observability_auto_refresh') === 'true';
        if (autoRefreshEnabled) {
            startAutoRefresh();
        }
    }

    /**
     * Setup team selector
     */
    function setupTeamSelector() {
        if (window.TeamSelector) {
            teamSelector = new TeamSelector({
                containerId: 'teamSelectorContainer'
            });
        }
    }

    /**
     * Handle team change
     */
    function handleTeamChange(team) {
        console.log('[Services] Team changed:', team);
        loadServices();
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
            // Use team-specific endpoint
            const data = await apiService.fetchTeamServices();
            
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

        // Add click handlers to service cards
        grid.querySelectorAll('.service-card').forEach(card => {
            card.addEventListener('click', () => {
                const serviceName = card.dataset.serviceName;
                const service = services.find(s => s.name === serviceName);
                if (service) {
                    showServiceDetails(service);
                }
            });
        });
    }

    /**
     * Render single service card
     */
    function renderServiceCard(service) {
        const statusClass = `status-${service.status}`;
        const statusIcon = getStatusIcon(service.status);
        const timeSinceLastSeen = getTimeSince(service.lastSeen);
        const isSelected = selectedService && selectedService.name === service.name;
        const podSummary = service.podSummary || { total: 0, running: 0, starting: 0, degraded: 0, terminated: 0 };

        return `
            <div class="service-card ${statusClass} ${isSelected ? 'selected' : ''}" data-service-name="${service.name}">
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
                        <span class="stat-label">Pods</span>
                        <span class="stat-value">${podSummary.running}/${podSummary.total}</span>
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
     * Setup service detail panel
     */
    function setupServicePanel() {
        const closeBtn = document.getElementById('closeServicePanel');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                closeServicePanel();
            });
        }
    }

    /**
     * Show service details in panel
     */
    function showServiceDetails(service) {
        selectedService = service;

        // Update panel header
        document.getElementById('panelServiceName').textContent = service.name;
        const statusBadge = document.getElementById('panelServiceStatus');
        statusBadge.textContent = service.status.charAt(0).toUpperCase() + service.status.slice(1);
        statusBadge.className = `service-status-badge ${service.status}`;

        // Update pod summary
        const podSummary = service.podSummary || { total: 0, running: 0, starting: 0, degraded: 0, terminated: 0 };
        document.getElementById('runningPods').textContent = podSummary.running;
        document.getElementById('startingPods').textContent = podSummary.starting;
        document.getElementById('degradedPods').textContent = podSummary.degraded;
        document.getElementById('terminatedPods').textContent = podSummary.terminated;

        // Render pods list
        renderPodsList(service.pods || []);

        // Show panel
        document.getElementById('serviceDetailPanel').classList.add('active');

        // Update selected state on cards
        document.querySelectorAll('.service-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.serviceName === service.name);
        });
    }

    /**
     * Close service panel
     */
    function closeServicePanel() {
        document.getElementById('serviceDetailPanel').classList.remove('active');
        selectedService = null;
        document.querySelectorAll('.service-card.selected').forEach(card => {
            card.classList.remove('selected');
        });
    }

    /**
     * Render pods list
     */
    function renderPodsList(pods) {
        const container = document.getElementById('podsList');
        if (!container) return;

        if (pods.length === 0) {
            container.innerHTML = '<div class="empty-state">No pods found</div>';
            return;
        }

        container.innerHTML = pods.map(pod => `
            <div class="pod-card" data-pod-name="${pod.name}">
                <div class="pod-card-header" onclick="this.parentElement.classList.toggle('expanded')">
                    <div class="pod-info">
                        <span class="pod-name">${pod.name}</span>
                        <div class="pod-meta">
                            <span>Node: ${pod.node}</span>
                            <span>Ready: ${pod.ready}</span>
                            <span>Age: ${pod.age}</span>
                        </div>
                    </div>
                    <span class="pod-status-badge ${pod.status}">${pod.status}</span>
                </div>
                <div class="pod-card-details">
                    <div class="pod-resources">
                        <div class="pod-resource">
                            <span class="label">CPU</span>
                            <span class="value">${pod.cpu}</span>
                        </div>
                        <div class="pod-resource">
                            <span class="label">Memory</span>
                            <span class="value">${pod.memory}</span>
                        </div>
                        <div class="pod-resource">
                            <span class="label">Restarts</span>
                            <span class="value ${pod.restarts > 5 ? 'error' : ''}">${pod.restarts}</span>
                        </div>
                        <div class="pod-resource">
                            <span class="label">Status</span>
                            <span class="value">${pod.status}</span>
                        </div>
                    </div>
                    ${renderContainersList(pod.containers || [])}
                </div>
            </div>
        `).join('');
    }

    /**
     * Render containers list for a pod
     */
    function renderContainersList(containers) {
        if (containers.length === 0) return '';

        return `
            <div class="containers-section">
                <div class="containers-title">Containers (${containers.length})</div>
                ${containers.map(container => `
                    <div class="container-item">
                        <div class="container-info">
                            <span class="container-name">${container.name}</span>
                            <span class="container-image">${container.image}</span>
                        </div>
                        <div class="container-status">
                            <span class="container-status-dot ${container.status}"></span>
                            <span class="container-restarts ${container.restarts > 5 ? 'high' : ''}">${container.restarts} restarts</span>
                        </div>
                    </div>
                `).join('')}
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

