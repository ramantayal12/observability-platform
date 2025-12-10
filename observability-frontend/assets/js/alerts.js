/**
 * Alerts Page - New Relic Style
 * Enterprise-level alert and incident management
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
    const notificationManager = NotificationManager.getInstance();

    // Page state
    let alertPolicies = [];
    let incidents = [];
    let filteredIncidents = [];
    let currentFilters = {
        states: [],
        priorities: [],
        sources: [],
        pods: [],
        containers: []
    };
    let currentTimeRange = stateManager.get('filters.timeRange') || 60 * 60 * 1000;
    let timeRangePicker = null;
    let currentTab = 'incidents';
    let selectedIncidentId = null;
    let teamSelector = null;

    // FacetFilter instances
    let stateFacet = null;
    let priorityFacet = null;
    let sourceFacet = null;
    let podFacet = null;
    let containerFacet = null;

    /**
     * Initialize the page
     */
    async function init() {
        console.log('Initializing Alerts page (New Relic style)...');

        // Setup UI
        setupTeamSelector();
        setupTimePicker();
        setupAutoRefresh();
        setupTabs();
        setupFacetFilters();
        setupIncidentPanel();

        // Listen for time range changes
        eventBus.on(Events.TIME_RANGE_CHANGED, handleTimeRangeChange);

        // Listen for team changes
        eventBus.on('team:changed', handleTeamChange);

        // Load initial data
        loadAlerts();
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
        console.log('[Alerts] Team changed:', team);
        loadAlerts();
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
        console.log('[Alerts] Time range changed:', data);
        currentTimeRange = data.range;
        loadAlerts();
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
                await loadAlerts();
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
                notificationManager.success('Auto-refresh enabled (30s)');
            } else {
                notificationManager.info('Auto-refresh disabled');
            }
        });
    }

    /**
     * Setup tabs
     */
    function setupTabs() {
        document.querySelectorAll('.alert-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                switchTab(tabName);
            });
        });
    }

    /**
     * Switch tab
     */
    function switchTab(tabName) {
        currentTab = tabName;

        // Update tab buttons
        document.querySelectorAll('.alert-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update content visibility
        document.getElementById('incidentsTab').classList.toggle('hidden', tabName !== 'incidents');
        document.getElementById('policiesTab').classList.toggle('hidden', tabName !== 'policies');
    }

    /**
     * Setup facet filters using FacetFilter component
     */
    function setupFacetFilters() {
        // State facet with colors
        stateFacet = new FacetFilter({
            containerId: 'stateFacetContainer',
            title: 'State',
            multiSelect: true,
            showSearch: false,
            items: [],
            onChange: (selected) => {
                currentFilters.states = selected;
                applyFilters();
            }
        });

        // Priority facet
        priorityFacet = new FacetFilter({
            containerId: 'priorityFacetContainer',
            title: 'Priority',
            multiSelect: true,
            showSearch: false,
            items: [],
            onChange: (selected) => {
                currentFilters.priorities = selected;
                applyFilters();
            }
        });

        // Source facet
        sourceFacet = new FacetFilter({
            containerId: 'sourceFacetContainer',
            title: 'Source',
            multiSelect: true,
            showSearch: true,
            items: [],
            onChange: (selected) => {
                currentFilters.sources = selected;
                applyFilters();
            }
        });

        // Pod facet
        podFacet = new FacetFilter({
            containerId: 'podFacetContainer',
            title: 'Pod',
            multiSelect: true,
            showSearch: true,
            items: [],
            onChange: (selected) => {
                currentFilters.pods = selected;
                applyFilters();
            }
        });

        // Container facet
        containerFacet = new FacetFilter({
            containerId: 'containerFacetContainer',
            title: 'Container',
            multiSelect: true,
            showSearch: true,
            items: [],
            onChange: (selected) => {
                currentFilters.containers = selected;
                applyFilters();
            }
        });

        // Clear filters button
        const clearBtn = document.getElementById('clearAlertFiltersBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                currentFilters.states = [];
                currentFilters.priorities = [];
                currentFilters.sources = [];
                currentFilters.pods = [];
                currentFilters.containers = [];
                if (stateFacet) stateFacet.clearSelection();
                if (priorityFacet) priorityFacet.clearSelection();
                if (sourceFacet) sourceFacet.clearSelection();
                if (podFacet) podFacet.clearSelection();
                if (containerFacet) containerFacet.clearSelection();
                applyFilters();
            });
        }
    }

    /**
     * Setup incident panel
     */
    function setupIncidentPanel() {
        const closeBtn = document.getElementById('closeIncidentPanel');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('incidentDetailPanel').classList.remove('active');
                selectedIncidentId = null;
                // Remove selected state from cards
                document.querySelectorAll('.incident-card.selected').forEach(card => {
                    card.classList.remove('selected');
                });
            });
        }
    }

    /**
     * Load alerts from backend API
     */
    async function loadAlerts() {
        try {
            // Get time range
            const endTime = Date.now();
            const startTime = endTime - currentTimeRange;

            // Get current team from state or localStorage
            let teamId = null;
            if (window.stateManager) {
                const currentTeam = stateManager.get('currentTeam');
                teamId = currentTeam?.id;
            }
            if (!teamId) {
                const cached = localStorage.getItem('observability_current_team');
                if (cached) {
                    teamId = JSON.parse(cached).id;
                }
            }

            // Default to team 1 if no team selected
            if (!teamId) {
                teamId = 1;
            }

            // Fetch alerts from team-specific backend endpoint
            const apiService = window.apiService || ApiService.getInstance();
            const response = await apiService.fetchTeamAlerts(teamId);

            // Transform backend alerts to incidents format
            const alertsData = response.data?.alerts || response.alerts || [];
            incidents = alertsData.map(alert => ({
                id: `inc-${alert.id}`,
                policyId: alert.id,
                policyName: alert.name,
                title: alert.name,
                description: alert.description || `${alert.metric} ${alert.operator} ${alert.threshold}`,
                priority: alert.severity === 'critical' ? 'critical' :
                          alert.severity === 'warning' ? 'high' : 'medium',
                state: alert.status === 'active' ? 'open' :
                       alert.status === 'acknowledged' ? 'acknowledged' : 'closed',
                source: alert.serviceName || 'unknown',
                pod: generatePodName(alert.serviceName),
                container: alert.serviceName || 'main',
                openedAt: alert.triggeredAt || alert.createdAt,
                acknowledgedAt: alert.acknowledgedAt,
                closedAt: alert.resolvedAt,
                duration: alert.resolvedAt ?
                    (alert.resolvedAt - (alert.triggeredAt || alert.createdAt)) :
                    (Date.now() - (alert.triggeredAt || alert.createdAt)),
                traceId: generateHexId(32),
                spans: generateRelatedSpans(alert.serviceName || 'api-gateway', 3),
                currentValue: alert.currentValue,
                threshold: alert.threshold,
                metric: alert.metric,
                type: alert.type
            }));

            // Build policies from alerts
            alertPolicies = buildPoliciesFromAlerts(alertsData);

            // Apply filters and render
            applyFilters();
            renderPolicies();

        } catch (error) {
            console.error('Error loading alerts:', error);
            notificationManager.error('Failed to load alerts');

            // Fallback to local data
            loadLocalAlerts();
        }
    }

    /**
     * Generate pod name from service name
     */
    function generatePodName(serviceName) {
        if (!serviceName) return 'unknown-pod';
        const suffix = generateHexId(5);
        return `${serviceName}-${suffix}`;
    }

    /**
     * Build policies from alerts
     */
    function buildPoliciesFromAlerts(alerts) {
        const policyMap = new Map();

        alerts.forEach(alert => {
            const key = `${alert.name}-${alert.metric}`;
            if (!policyMap.has(key)) {
                policyMap.set(key, {
                    id: String(alert.id),
                    name: alert.name,
                    metric: alert.metric || 'unknown',
                    operator: alert.operator || '>',
                    threshold: alert.threshold || 0,
                    severity: alert.severity,
                    service: alert.serviceName || 'All',
                    status: alert.status === 'muted' ? 'muted' : 'active',
                    lastTriggered: alert.triggeredAt ? new Date(alert.triggeredAt).getTime() : null,
                    createdAt: alert.createdAt ? new Date(alert.createdAt).getTime() : Date.now(),
                    incidentCount: 1
                });
            } else {
                policyMap.get(key).incidentCount++;
            }
        });

        return Array.from(policyMap.values());
    }

    /**
     * Fallback to local mock data
     */
    function loadLocalAlerts() {
        // Load policies from localStorage
        const savedPolicies = localStorage.getItem('observability_alert_policies');
        if (savedPolicies) {
            try {
                alertPolicies = JSON.parse(savedPolicies);
            } catch (e) {
                console.error('Error loading alert policies:', e);
                alertPolicies = [];
            }
        } else {
            // Create default alert policies
            alertPolicies = [
                {
                    id: '1',
                    name: 'High API Latency',
                    metric: 'api.latency',
                    operator: '>',
                    threshold: 1000,
                    severity: 'critical',
                    service: 'All',
                    status: 'active',
                    lastTriggered: Date.now() - 1800000,
                    createdAt: Date.now() - 86400000,
                    incidentCount: 3
                },
                {
                    id: '2',
                    name: 'High Error Rate',
                    metric: 'error.rate',
                    operator: '>',
                    threshold: 5,
                    severity: 'critical',
                    service: 'api-gateway',
                    status: 'active',
                    lastTriggered: Date.now() - 3600000,
                    createdAt: Date.now() - 172800000,
                    incidentCount: 7
                },
                {
                    id: '3',
                    name: 'Low Throughput',
                    metric: 'throughput',
                    operator: '<',
                    threshold: 100,
                    severity: 'warning',
                    service: 'All',
                    status: 'muted',
                    lastTriggered: null,
                    createdAt: Date.now() - 259200000,
                    incidentCount: 0
                },
                {
                    id: '4',
                    name: 'High Memory Usage',
                    metric: 'memory.usage',
                    operator: '>',
                    threshold: 85,
                    severity: 'warning',
                    service: 'user-service',
                    status: 'active',
                    lastTriggered: Date.now() - 7200000,
                    createdAt: Date.now() - 432000000,
                    incidentCount: 2
                }
            ];
            saveAlertPolicies();
        }

        // Generate mock incidents
        generateMockIncidents();

        // Apply filters and render
        applyFilters();
        renderPolicies();
    }

    /**
     * Generate a random hex string
     */
    function generateHexId(length) {
        const chars = '0123456789abcdef';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars[Math.floor(Math.random() * chars.length)];
        }
        return result;
    }

    /**
     * Generate related spans for an incident
     */
    function generateRelatedSpans(service, count = 3) {
        const operations = {
            'api-gateway': ['HTTP GET /api/v1/metrics', 'HTTP POST /api/v1/logs', 'authenticate', 'rate-limit-check'],
            'user-service': ['getUserById', 'validateToken', 'updateUserProfile', 'checkPermissions'],
            'order-service': ['createOrder', 'getOrderStatus', 'validateOrder', 'processPayment'],
            'payment-service': ['chargeCard', 'refundPayment', 'validatePaymentMethod', 'processTransaction'],
            'inventory-service': ['checkStock', 'reserveItems', 'updateInventory', 'getProductDetails']
        };

        const ops = operations[service] || operations['api-gateway'];
        const spans = [];

        for (let i = 0; i < count; i++) {
            spans.push({
                spanId: generateHexId(16),
                operation: ops[Math.floor(Math.random() * ops.length)],
                duration: Math.floor(Math.random() * 500) + 10,
                status: i === 0 ? 'error' : (Math.random() > 0.8 ? 'error' : 'ok')
            });
        }

        return spans;
    }

    /**
     * Generate mock incidents
     */
    function generateMockIncidents() {
        const services = ['api-gateway', 'user-service', 'order-service', 'payment-service', 'inventory-service'];
        const priorities = ['critical', 'high', 'medium', 'low'];
        const states = ['open', 'acknowledged', 'closed'];

        // Pod and container mappings
        const podsByService = {
            'api-gateway': ['api-gateway-7d8f9c6b5-x2k4m', 'api-gateway-7d8f9c6b5-p9n3q'],
            'user-service': ['user-service-5c4d3b2a1-h7j8k', 'user-service-5c4d3b2a1-m4n5p'],
            'order-service': ['order-service-8a7b6c5d-r4t5y', 'order-service-8a7b6c5d-u6i7o'],
            'payment-service': ['payment-service-9e8f7g6h-q1w2e', 'payment-service-9e8f7g6h-r3t4y'],
            'inventory-service': ['inventory-service-2b3c4d5e-a1s2d', 'inventory-service-2b3c4d5e-f3g4h']
        };

        const containersByService = {
            'api-gateway': ['api-gateway', 'envoy-proxy'],
            'user-service': ['user-service', 'redis-cache'],
            'order-service': ['order-service', 'order-worker'],
            'payment-service': ['payment-service', 'payment-validator'],
            'inventory-service': ['inventory-service', 'stock-sync']
        };

        incidents = [];

        // Generate incidents based on policies
        alertPolicies.forEach(policy => {
            if (policy.status === 'active' && policy.lastTriggered) {
                // Create some incidents for this policy
                const numIncidents = Math.floor(Math.random() * 3) + 1;
                for (let i = 0; i < numIncidents; i++) {
                    const isRecent = i === 0;
                    const source = policy.service === 'All' ? services[Math.floor(Math.random() * services.length)] : policy.service;
                    const traceId = generateHexId(32);
                    const pods = podsByService[source] || podsByService['api-gateway'];
                    const containers = containersByService[source] || containersByService['api-gateway'];
                    incidents.push({
                        id: `inc-${policy.id}-${i}`,
                        policyId: policy.id,
                        policyName: policy.name,
                        title: `${policy.name} - ${policy.service}`,
                        description: `${policy.metric} ${policy.operator} ${policy.threshold}`,
                        priority: policy.severity === 'critical' ? 'critical' :
                                  policy.severity === 'warning' ? 'high' : 'medium',
                        state: isRecent ? (Math.random() > 0.5 ? 'open' : 'acknowledged') : 'closed',
                        source: source,
                        pod: pods[Math.floor(Math.random() * pods.length)],
                        container: containers[Math.floor(Math.random() * containers.length)],
                        openedAt: policy.lastTriggered - (i * 3600000),
                        acknowledgedAt: isRecent ? null : policy.lastTriggered - (i * 3600000) + 300000,
                        closedAt: isRecent ? null : policy.lastTriggered - (i * 3600000) + 1800000,
                        duration: isRecent ? Date.now() - (policy.lastTriggered - (i * 3600000)) : 1800000,
                        traceId: traceId,
                        spans: generateRelatedSpans(source, Math.floor(Math.random() * 3) + 2)
                    });
                }
            }
        });

        // Add some additional random incidents
        for (let i = 0; i < 5; i++) {
            const state = states[Math.floor(Math.random() * states.length)];
            const openedAt = Date.now() - Math.floor(Math.random() * 86400000);
            const source = services[Math.floor(Math.random() * services.length)];
            const traceId = generateHexId(32);
            const pods = podsByService[source] || podsByService['api-gateway'];
            const containers = containersByService[source] || containersByService['api-gateway'];
            incidents.push({
                id: `inc-random-${i}`,
                policyId: null,
                policyName: 'Anomaly Detection',
                title: `Unusual ${['latency', 'error rate', 'traffic'][Math.floor(Math.random() * 3)]} detected`,
                description: 'AI-detected anomaly in service behavior',
                priority: priorities[Math.floor(Math.random() * priorities.length)],
                state: state,
                source: source,
                pod: pods[Math.floor(Math.random() * pods.length)],
                container: containers[Math.floor(Math.random() * containers.length)],
                openedAt: openedAt,
                acknowledgedAt: state !== 'open' ? openedAt + 300000 : null,
                closedAt: state === 'closed' ? openedAt + 1800000 : null,
                duration: state === 'closed' ? 1800000 : Date.now() - openedAt,
                traceId: traceId,
                spans: generateRelatedSpans(source, Math.floor(Math.random() * 4) + 2)
            });
        }

        // Sort by openedAt (most recent first)
        incidents.sort((a, b) => b.openedAt - a.openedAt);
    }

    /**
     * Apply filters (multi-select)
     */
    function applyFilters() {
        filteredIncidents = [...incidents];

        if (currentFilters.states && currentFilters.states.length > 0) {
            filteredIncidents = filteredIncidents.filter(i => currentFilters.states.includes(i.state));
        }

        if (currentFilters.priorities && currentFilters.priorities.length > 0) {
            filteredIncidents = filteredIncidents.filter(i => currentFilters.priorities.includes(i.priority));
        }

        if (currentFilters.sources && currentFilters.sources.length > 0) {
            filteredIncidents = filteredIncidents.filter(i => currentFilters.sources.includes(i.source));
        }

        if (currentFilters.pods && currentFilters.pods.length > 0) {
            filteredIncidents = filteredIncidents.filter(i => currentFilters.pods.includes(i.pod));
        }

        if (currentFilters.containers && currentFilters.containers.length > 0) {
            filteredIncidents = filteredIncidents.filter(i => currentFilters.containers.includes(i.container));
        }

        updateStats();
        updateFacets();
        renderIncidents();
    }

    /**
     * Save alert policies
     */
    function saveAlertPolicies() {
        localStorage.setItem('observability_alert_policies', JSON.stringify(alertPolicies));
    }

    /**
     * Update stats
     */
    function updateStats() {
        const openIncidents = incidents.filter(i => i.state === 'open').length;
        const totalPolicies = alertPolicies.length;
        const triggeredToday = incidents.filter(i => Date.now() - i.openedAt < 86400000).length;
        const muted = alertPolicies.filter(p => p.status === 'muted').length;

        document.getElementById('activeAlerts').textContent = openIncidents;
        document.getElementById('totalRules').textContent = totalPolicies;
        document.getElementById('triggeredToday').textContent = triggeredToday;
        document.getElementById('mutedAlerts').textContent = muted;
    }

    /**
     * Update facets using FacetFilter components
     */
    function updateFacets() {
        // State facet
        if (stateFacet) {
            const openCount = incidents.filter(i => i.state === 'open').length;
            const ackCount = incidents.filter(i => i.state === 'acknowledged').length;
            const closedCount = incidents.filter(i => i.state === 'closed').length;

            stateFacet.setItems([
                { value: 'open', label: 'Open', count: openCount, color: '#f04438' },
                { value: 'acknowledged', label: 'Acknowledged', count: ackCount, color: '#f59e0b' },
                { value: 'closed', label: 'Closed', count: closedCount, color: '#12b76a' }
            ]);
            stateFacet.setSelectedValues(currentFilters.states);
        }

        // Priority facet
        if (priorityFacet) {
            const criticalCount = incidents.filter(i => i.priority === 'critical').length;
            const highCount = incidents.filter(i => i.priority === 'high').length;
            const mediumCount = incidents.filter(i => i.priority === 'medium').length;
            const lowCount = incidents.filter(i => i.priority === 'low').length;

            priorityFacet.setItems([
                { value: 'critical', label: 'P1 - Critical', count: criticalCount, color: '#f04438' },
                { value: 'high', label: 'P2 - High', count: highCount, color: '#f59e0b' },
                { value: 'medium', label: 'P3 - Medium', count: mediumCount, color: '#3b82f6' },
                { value: 'low', label: 'P4 - Low', count: lowCount, color: '#6b7280' }
            ]);
            priorityFacet.setSelectedValues(currentFilters.priorities);
        }

        // Source facet
        if (sourceFacet) {
            const sourceCounts = {};
            incidents.forEach(i => {
                sourceCounts[i.source] = (sourceCounts[i.source] || 0) + 1;
            });

            const sortedSources = Object.entries(sourceCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 15)
                .map(([source, count]) => ({
                    value: source,
                    label: source,
                    count: count
                }));

            sourceFacet.setItems(sortedSources);
            sourceFacet.setSelectedValues(currentFilters.sources);
        }

        // Pod facet
        if (podFacet) {
            const podCounts = {};
            incidents.forEach(i => {
                if (i.pod) {
                    podCounts[i.pod] = (podCounts[i.pod] || 0) + 1;
                }
            });

            const sortedPods = Object.entries(podCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 15)
                .map(([pod, count]) => ({
                    value: pod,
                    label: pod.length > 30 ? pod.substring(0, 27) + '...' : pod,
                    count: count
                }));

            podFacet.setItems(sortedPods);
            podFacet.setSelectedValues(currentFilters.pods);
        }

        // Container facet
        if (containerFacet) {
            const containerCounts = {};
            incidents.forEach(i => {
                if (i.container) {
                    containerCounts[i.container] = (containerCounts[i.container] || 0) + 1;
                }
            });

            const sortedContainers = Object.entries(containerCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 15)
                .map(([container, count]) => ({
                    value: container,
                    label: container,
                    count: count
                }));

            containerFacet.setItems(sortedContainers);
            containerFacet.setSelectedValues(currentFilters.containers);
        }
    }

    /**
     * Render incidents
     */
    function renderIncidents() {
        const container = document.getElementById('incidentsList');
        if (!container) return;

        if (filteredIncidents.length === 0) {
            container.innerHTML = `
                <div class="alerts-empty">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="currentColor" opacity="0.3">
                        <path d="M24 4a20 20 0 100 40 20 20 0 000-40zm0 36a16 16 0 110-32 16 16 0 010 32zm-2-10h4v4h-4v-4zm0-16h4v12h-4V14z"/>
                    </svg>
                    <p>No incidents found</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredIncidents.map(incident => `
            <div class="incident-card ${incident.state} ${selectedIncidentId === incident.id ? 'selected' : ''}"
                 data-incident-id="${incident.id}">
                <div class="incident-priority">
                    <span class="priority-badge ${incident.priority}">${getPriorityLabel(incident.priority)}</span>
                </div>
                <div class="incident-content">
                    <div class="incident-header">
                        <span class="incident-title">${escapeHtml(incident.title)}</span>
                        <span class="incident-state state-${incident.state}">${capitalizeFirst(incident.state)}</span>
                    </div>
                    <div class="incident-meta">
                        <span class="incident-source">${escapeHtml(incident.source)}</span>
                        <span class="incident-time">${getTimeSince(incident.openedAt)}</span>
                        <span class="incident-duration">${formatDuration(incident.duration)}</span>
                    </div>
                    <div class="incident-description">${escapeHtml(incident.description)}</div>
                    <div class="incident-trace-id">
                        <span class="trace-label">Trace:</span>
                        <code>${incident.traceId.substring(0, 16)}...</code>
                    </div>
                </div>
                <div class="incident-actions">
                    ${incident.state === 'open' ? `
                        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); window.acknowledgeIncident('${incident.id}');">
                            Acknowledge
                        </button>
                    ` : ''}
                    ${incident.state !== 'closed' ? `
                        <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation(); window.closeIncident('${incident.id}');">
                            Close
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');

        // Add click handlers for viewing incident details
        container.querySelectorAll('.incident-card').forEach(card => {
            card.addEventListener('click', () => {
                const incidentId = card.dataset.incidentId;
                viewIncident(incidentId);
            });
        });
    }

    /**
     * View incident details
     */
    function viewIncident(incidentId) {
        selectedIncidentId = incidentId;
        const incident = incidents.find(i => i.id === incidentId);

        if (!incident) return;

        // Highlight selected card
        document.querySelectorAll('.incident-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.incidentId === incidentId);
        });

        showIncidentDetails(incident);
    }

    /**
     * Show incident details in panel
     */
    function showIncidentDetails(incident) {
        const panel = document.getElementById('incidentDetailPanel');
        const content = document.getElementById('incidentDetailContent');

        const spansHtml = incident.spans.map(span => `
            <div class="span-row ${span.status}">
                <div class="span-info">
                    <code class="span-id">${span.spanId}</code>
                    <span class="span-operation">${escapeHtml(span.operation)}</span>
                </div>
                <div class="span-meta">
                    <span class="span-duration">${span.duration}ms</span>
                    <span class="span-status status-${span.status}">${span.status.toUpperCase()}</span>
                </div>
            </div>
        `).join('');

        content.innerHTML = `
            <div class="incident-detail-summary">
                <div class="detail-priority">
                    <span class="priority-badge large ${incident.priority}">${getPriorityLabel(incident.priority)}</span>
                    <span class="incident-state state-${incident.state}">${capitalizeFirst(incident.state)}</span>
                </div>
                <h2 class="detail-title">${escapeHtml(incident.title)}</h2>
                <p class="detail-description">${escapeHtml(incident.description)}</p>
            </div>

            <div class="incident-timeline">
                <h4>Timeline</h4>
                <div class="timeline-events">
                    <div class="timeline-event">
                        <span class="timeline-dot opened"></span>
                        <div class="timeline-content">
                            <span class="timeline-label">Opened</span>
                            <span class="timeline-time">${new Date(incident.openedAt).toLocaleString()}</span>
                        </div>
                    </div>
                    ${incident.acknowledgedAt ? `
                        <div class="timeline-event">
                            <span class="timeline-dot acknowledged"></span>
                            <div class="timeline-content">
                                <span class="timeline-label">Acknowledged</span>
                                <span class="timeline-time">${new Date(incident.acknowledgedAt).toLocaleString()}</span>
                            </div>
                        </div>
                    ` : ''}
                    ${incident.closedAt ? `
                        <div class="timeline-event">
                            <span class="timeline-dot closed"></span>
                            <div class="timeline-content">
                                <span class="timeline-label">Closed</span>
                                <span class="timeline-time">${new Date(incident.closedAt).toLocaleString()}</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="incident-attributes">
                <h4>Attributes</h4>
                <div class="attributes-list">
                    <div class="attribute-row">
                        <span class="attribute-key">Incident ID</span>
                        <span class="attribute-value"><code>${incident.id}</code></span>
                    </div>
                    <div class="attribute-row">
                        <span class="attribute-key">Policy</span>
                        <span class="attribute-value">${escapeHtml(incident.policyName)}</span>
                    </div>
                    <div class="attribute-row">
                        <span class="attribute-key">Source</span>
                        <span class="attribute-value">${escapeHtml(incident.source)}</span>
                    </div>
                    <div class="attribute-row">
                        <span class="attribute-key">Duration</span>
                        <span class="attribute-value">${formatDuration(incident.duration)}</span>
                    </div>
                </div>
            </div>

            <div class="incident-trace-section">
                <h4>Related Trace</h4>
                <div class="trace-info-box">
                    <div class="trace-id-row">
                        <span class="trace-label">Trace ID</span>
                        <code class="trace-id-value">${incident.traceId}</code>
                    </div>
                </div>
            </div>

            <div class="incident-spans-section">
                <h4>Related Spans (${incident.spans.length})</h4>
                <div class="spans-list">
                    ${spansHtml}
                </div>
            </div>

            <div class="incident-detail-actions">
                ${incident.state === 'open' ? `
                    <button class="btn btn-primary" onclick="window.acknowledgeIncident('${incident.id}')">
                        Acknowledge
                    </button>
                ` : ''}
                ${incident.state !== 'closed' ? `
                    <button class="btn btn-success" onclick="window.closeIncident('${incident.id}')">
                        Close Incident
                    </button>
                ` : ''}
            </div>
        `;

        panel.classList.add('active');
    }

    /**
     * Render policies
     */
    function renderPolicies() {
        const container = document.getElementById('policiesList');
        if (!container) return;

        if (alertPolicies.length === 0) {
            container.innerHTML = `
                <div class="alerts-empty">
                    <p>No alert policies configured</p>
                    <button class="btn btn-primary" onclick="document.getElementById('newAlertBtn').click()">
                        Create your first policy
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = alertPolicies.map(policy => `
            <div class="policy-card ${policy.status}">
                <div class="policy-header">
                    <div class="policy-info">
                        <span class="policy-name">${escapeHtml(policy.name)}</span>
                        <span class="policy-condition">
                            <code>${policy.metric} ${policy.operator} ${policy.threshold}</code>
                        </span>
                    </div>
                    <div class="policy-badges">
                        <span class="badge badge-${getSeverityBadgeClass(policy.severity)}">${policy.severity}</span>
                        <span class="badge badge-${policy.status === 'active' ? 'success' : 'neutral'}">${policy.status}</span>
                    </div>
                </div>
                <div class="policy-meta">
                    <span class="policy-service">Service: ${escapeHtml(policy.service)}</span>
                    <span class="policy-incidents">${policy.incidentCount} incidents</span>
                    <span class="policy-triggered">
                        ${policy.lastTriggered ? `Last triggered: ${getTimeSince(policy.lastTriggered)}` : 'Never triggered'}
                    </span>
                </div>
                <div class="policy-actions">
                    <button class="btn btn-sm btn-secondary" onclick="window.togglePolicy('${policy.id}')">
                        ${policy.status === 'active' ? 'Mute' : 'Unmute'}
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="window.deletePolicy('${policy.id}')">
                        Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Acknowledge incident
     */
    window.acknowledgeIncident = function(id) {
        const incident = incidents.find(i => i.id === id);
        if (incident && incident.state === 'open') {
            incident.state = 'acknowledged';
            incident.acknowledgedAt = Date.now();
            applyFilters();
            if (selectedIncidentId === id) {
                showIncidentDetails(incident);
            }
            notificationManager.success('Incident acknowledged');
        }
    };

    /**
     * Close incident
     */
    window.closeIncident = function(id) {
        const incident = incidents.find(i => i.id === id);
        if (incident && incident.state !== 'closed') {
            incident.state = 'closed';
            incident.closedAt = Date.now();
            incident.duration = incident.closedAt - incident.openedAt;
            applyFilters();
            if (selectedIncidentId === id) {
                showIncidentDetails(incident);
            }
            notificationManager.success('Incident closed');
        }
    };

    /**
     * Toggle policy
     */
    window.togglePolicy = function(id) {
        const policy = alertPolicies.find(p => p.id === id);
        if (policy) {
            policy.status = policy.status === 'active' ? 'muted' : 'active';
            saveAlertPolicies();
            updateStats();
            renderPolicies();
            notificationManager.success(`Policy ${policy.status === 'active' ? 'activated' : 'muted'}`);
        }
    };

    /**
     * Delete policy
     */
    window.deletePolicy = function(id) {
        if (!confirm('Are you sure you want to delete this policy?')) {
            return;
        }

        alertPolicies = alertPolicies.filter(p => p.id !== id);
        saveAlertPolicies();
        updateStats();
        renderPolicies();
        notificationManager.success('Policy deleted');
    };

    /**
     * Helper functions
     */
    function getSeverityBadgeClass(severity) {
        const map = {
            'critical': 'error',
            'warning': 'warning',
            'info': 'info'
        };
        return map[severity] || 'neutral';
    }

    function getPriorityLabel(priority) {
        const map = {
            'critical': 'P1',
            'high': 'P2',
            'medium': 'P3',
            'low': 'P4'
        };
        return map[priority] || 'P4';
    }

    function capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    function getTimeSince(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);

        if (seconds < 60) return `${seconds}s ago`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    function formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
        return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
    }

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

})();

