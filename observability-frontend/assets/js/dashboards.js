/**
 * Dashboards Page
 * Custom dashboard builder
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
    let dashboards = [];
    let currentDashboard = null;
    let apiDetailsTable = null;

    /**
     * Initialize the page
     */
    async function init() {
        console.log('Initializing Dashboards page...');

        // Load dashboards from localStorage
        loadDashboards();

        // Setup UI
        setupNewDashboardButton();
        setupNewWidgetButton();
        setupModals();
        setupApiDetailsTable();

        // Render dashboards list
        renderDashboardsList();

        // Load first dashboard if exists
        if (dashboards.length > 0) {
            loadDashboard(dashboards[0].id);
        } else {
            showEmptyState();
        }

        // Load API details
        await loadApiDetails();
    }

    /**
     * Load dashboards from localStorage
     */
    function loadDashboards() {
        const saved = localStorage.getItem('observability_dashboards');
        if (saved) {
            try {
                dashboards = JSON.parse(saved);
            } catch (e) {
                console.error('Error loading dashboards:', e);
                dashboards = [];
            }
        }
    }

    /**
     * Save dashboards to localStorage
     */
    function saveDashboards() {
        localStorage.setItem('observability_dashboards', JSON.stringify(dashboards));
    }

    /**
     * Setup new dashboard button
     */
    function setupNewDashboardButton() {
        const btn = document.getElementById('newDashboardBtn');
        if (btn) {
            btn.addEventListener('click', () => {
                openNewDashboardModal();
            });
        }
    }

    /**
     * Setup new widget button
     */
    function setupNewWidgetButton() {
        const btn = document.getElementById('newWidgetBtn');
        if (btn) {
            btn.addEventListener('click', () => {
                if (currentDashboard) {
                    openNewWidgetModal();
                } else {
                    notificationManager.warning('Please create a dashboard first');
                }
            });
        }
    }

    /**
     * Setup modals
     */
    function setupModals() {
        // New Dashboard Modal
        const newDashboardModal = document.getElementById('newDashboardModal');
        const closeNewDashboard = document.getElementById('closeNewDashboard');
        const cancelNewDashboard = document.getElementById('cancelNewDashboard');
        const createDashboardBtn = document.getElementById('createDashboardBtn');

        if (closeNewDashboard) {
            closeNewDashboard.addEventListener('click', () => {
                newDashboardModal.classList.remove('active');
            });
        }

        if (cancelNewDashboard) {
            cancelNewDashboard.addEventListener('click', () => {
                newDashboardModal.classList.remove('active');
            });
        }

        if (createDashboardBtn) {
            createDashboardBtn.addEventListener('click', createDashboard);
        }

        // New Widget Modal
        const newWidgetModal = document.getElementById('newWidgetModal');
        const closeNewWidget = document.getElementById('closeNewWidget');
        const cancelNewWidget = document.getElementById('cancelNewWidget');
        const addWidgetBtn = document.getElementById('addWidgetBtn');

        if (closeNewWidget) {
            closeNewWidget.addEventListener('click', () => {
                newWidgetModal.classList.remove('active');
            });
        }

        if (cancelNewWidget) {
            cancelNewWidget.addEventListener('click', () => {
                newWidgetModal.classList.remove('active');
            });
        }

        if (addWidgetBtn) {
            addWidgetBtn.addEventListener('click', addWidget);
        }
    }

    /**
     * Open new dashboard modal
     */
    function openNewDashboardModal() {
        const modal = document.getElementById('newDashboardModal');
        document.getElementById('dashboardName').value = '';
        document.getElementById('dashboardDescription').value = '';
        modal.classList.add('active');
    }

    /**
     * Create dashboard
     */
    function createDashboard() {
        const name = document.getElementById('dashboardName').value.trim();
        const description = document.getElementById('dashboardDescription').value.trim();

        if (!name) {
            notificationManager.error('Please enter a dashboard name');
            return;
        }

        const dashboard = {
            id: Date.now().toString(),
            name,
            description,
            widgets: [],
            createdAt: Date.now()
        };

        dashboards.push(dashboard);
        saveDashboards();
        renderDashboardsList();
        loadDashboard(dashboard.id);

        document.getElementById('newDashboardModal').classList.remove('active');
        notificationManager.success('Dashboard created successfully');
    }

    /**
     * Open new widget modal
     */
    function openNewWidgetModal() {
        const modal = document.getElementById('newWidgetModal');
        document.getElementById('widgetTitle').value = '';
        document.getElementById('widgetMetric').value = 'api.latency';
        document.getElementById('widgetAggregation').value = 'avg';
        modal.classList.add('active');
    }

    /**
     * Add widget
     */
    function addWidget() {
        if (!currentDashboard) return;

        const title = document.getElementById('widgetTitle').value.trim();
        const metric = document.getElementById('widgetMetric').value;
        const aggregation = document.getElementById('widgetAggregation').value;
        const type = document.querySelector('input[name="widgetType"]:checked')?.value || 'timeseries';

        if (!title) {
            notificationManager.error('Please enter a widget title');
            return;
        }

        const widget = {
            id: Date.now().toString(),
            title,
            type,
            metric,
            aggregation,
            createdAt: Date.now()
        };

        currentDashboard.widgets.push(widget);
        saveDashboards();
        renderDashboard();

        document.getElementById('newWidgetModal').classList.remove('active');
        notificationManager.success('Widget added successfully');
    }

    /**
     * Render dashboards list
     */
    function renderDashboardsList() {
        const list = document.getElementById('dashboardsList');
        if (!list) return;

        if (dashboards.length === 0) {
            list.innerHTML = '<div class="empty-state"><p>No dashboards yet</p></div>';
            return;
        }

        list.innerHTML = dashboards.map(dashboard => `
            <div class="dashboard-item ${currentDashboard?.id === dashboard.id ? 'active' : ''}" 
                 onclick="window.loadDashboard('${dashboard.id}')">
                <div class="dashboard-name">${dashboard.name}</div>
                <div class="dashboard-meta">${dashboard.widgets.length} widgets</div>
            </div>
        `).join('');
    }

    /**
     * Load dashboard
     */
    window.loadDashboard = function(dashboardId) {
        currentDashboard = dashboards.find(d => d.id === dashboardId);
        if (currentDashboard) {
            renderDashboardsList();
            renderDashboard();
        }
    };

    /**
     * Render dashboard
     */
    async function renderDashboard() {
        const canvas = document.getElementById('dashboardCanvas');
        if (!canvas) return;

        if (!currentDashboard || currentDashboard.widgets.length === 0) {
            showEmptyState();
            return;
        }

        // Create widget containers
        canvas.innerHTML = currentDashboard.widgets.map(widget => `
            <div class="widget-card" id="widget-${widget.id}">
                <div class="widget-header">
                    <h3>${widget.title}</h3>
                    <button class="btn btn-ghost btn-sm" onclick="window.removeWidget('${widget.id}')">×</button>
                </div>
                <div class="widget-body">
                    <div class="widget-content" id="widget-content-${widget.id}">
                        <div class="loading-spinner">Loading...</div>
                    </div>
                </div>
            </div>
        `).join('');

        // Load data for each widget
        await loadWidgetData();
    }

    /**
     * Load data for all widgets
     */
    async function loadWidgetData() {
        if (!currentDashboard) return;

        try {
            // Fetch metrics data
            const data = await apiService.fetchMetrics({
                startTime: Date.now() - 3600000, // Last hour
                endTime: Date.now()
            });

            // Render each widget with data
            currentDashboard.widgets.forEach(widget => {
                renderWidget(widget, data);
            });

        } catch (error) {
            console.error('Error loading widget data:', error);
            notificationManager.error('Failed to load widget data');
        }
    }

    /**
     * Render individual widget with data
     */
    function renderWidget(widget, data) {
        const container = document.getElementById(`widget-content-${widget.id}`);
        if (!container) return;

        const metricData = data.metrics?.[widget.metric] || [];
        const stats = data.statistics?.[widget.metric];

        if (widget.type === 'timeseries') {
            renderTimeseriesWidget(container, widget, metricData);
        } else if (widget.type === 'stat') {
            renderStatWidget(container, widget, stats);
        } else if (widget.type === 'table') {
            renderTableWidget(container, widget, metricData);
        } else {
            container.innerHTML = `<div class="widget-placeholder">${widget.type} - ${widget.metric}</div>`;
        }
    }

    /**
     * Render timeseries widget using InteractiveChart
     */
    function renderTimeseriesWidget(container, widget, data) {
        const chartContainerId = 'chart-container-' + widget.id;
        container.innerHTML = `<div id="${chartContainerId}" style="height: 100%;"></div>`;

        if (typeof InteractiveChart === 'undefined') {
            console.warn('[Dashboards] InteractiveChart not available');
            return;
        }

        // Group data by service for multi-line display
        const seriesData = {};
        data.forEach(d => {
            const seriesName = d.serviceName || widget.metric || 'Value';
            if (!seriesData[seriesName]) {
                seriesData[seriesName] = [];
            }
            seriesData[seriesName].push({
                x: d.timestamp,
                y: d.value
            });
        });

        // Sort each series by timestamp
        Object.keys(seriesData).forEach(key => {
            seriesData[key].sort((a, b) => a.x - b.x);
        });

        const chart = new InteractiveChart({
            containerId: chartContainerId,
            unit: widget.unit || '',
            height: 200,
            showLegend: true
        });

        chart.setData(seriesData);
    }

    /**
     * Render stat widget
     */
    function renderStatWidget(container, widget, stats) {
        if (!stats) {
            container.innerHTML = '<div class="stat-value">--</div>';
            return;
        }

        let value = 0;
        const metricConfig = AppConfig.METRICS[widget.metric] || {};
        const unit = metricConfig.unit || '';

        switch (widget.aggregation) {
            case 'avg': value = stats.avg || 0; break;
            case 'min': value = stats.min || 0; break;
            case 'max': value = stats.max || 0; break;
            case 'sum': value = stats.data?.reduce((a, b) => a + b.value, 0) || 0; break;
            default: value = stats.avg || 0;
        }

        container.innerHTML = `
            <div class="stat-display">
                <div class="stat-value">${value.toFixed(2)}</div>
                <div class="stat-unit">${unit}</div>
                <div class="stat-label">${widget.aggregation.toUpperCase()}</div>
            </div>
        `;
    }

    /**
     * Render table widget
     */
    function renderTableWidget(container, widget, data) {
        if (!data || data.length === 0) {
            container.innerHTML = '<div class="empty-state">No data available</div>';
            return;
        }

        const recent = data.slice(-10).reverse(); // Last 10 entries

        container.innerHTML = `
            <table class="widget-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${recent.map(d => `
                        <tr>
                            <td>${new Date(d.timestamp).toLocaleTimeString()}</td>
                            <td>${d.value.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    /**
     * Remove widget
     */
    window.removeWidget = function(widgetId) {
        if (!currentDashboard) return;

        currentDashboard.widgets = currentDashboard.widgets.filter(w => w.id !== widgetId);
        saveDashboards();
        renderDashboard();
        notificationManager.success('Widget removed');
    };

    /**
     * Show empty state
     */
    function showEmptyState() {
        const canvas = document.getElementById('dashboardCanvas');
        if (canvas) {
            canvas.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="currentColor" opacity="0.3">
                        <rect x="8" y="8" width="20" height="20" rx="2"/>
                        <rect x="36" y="8" width="20" height="12" rx="2"/>
                        <rect x="8" y="36" width="20" height="20" rx="2"/>
                        <rect x="36" y="28" width="20" height="28" rx="2"/>
                    </svg>
                    <p>No widgets yet. Click "Add Widget" to get started.</p>
                </div>
            `;
        }
    }

    /**
     * Setup API Details Table
     */
    function setupApiDetailsTable() {
        console.log('[Dashboards] Setting up API Details Table...');
        console.log('[Dashboards] ApiDetailsTable available:', typeof ApiDetailsTable !== 'undefined');

        if (typeof ApiDetailsTable !== 'undefined') {
            try {
                apiDetailsTable = new ApiDetailsTable({
                    containerId: 'apiDetailsTable',
                    title: 'API Endpoint Metrics',
                    showFilters: true,
                    maxRows: 50
                });
                console.log('[Dashboards] API Details Table initialized successfully');
            } catch (error) {
                console.error('[Dashboards] Error initializing API Details Table:', error);
            }
        } else {
            console.warn('[Dashboards] ApiDetailsTable component not found');
        }
    }

    /**
     * Load API endpoint details
     */
    async function loadApiDetails() {
        if (!apiDetailsTable) return;

        try {
            // Generate mock API endpoint data
            const apiData = generateMockApiData();
            apiDetailsTable.setData(apiData);
        } catch (error) {
            console.error('Error loading API details:', error);
        }
    }

    /**
     * Generate mock API endpoint time series data
     */
    function generateMockApiData() {
        const endpoints = [
            'GET /api/v1/metrics',
            'POST /api/v1/metrics',
            'GET /api/v1/logs',
            'POST /api/v1/logs',
            'GET /api/v1/traces',
            'GET /api/v1/services',
            'GET /api/v1/dashboards',
            'GET /api/v1/alerts'
        ];

        const now = Date.now();
        const timeSeriesData = {};

        endpoints.forEach(endpoint => {
            const dataPoints = [];
            const baseLatency = Math.random() * 80 + 20; // 20-100ms base

            // Generate 60 data points (last hour, one per minute)
            for (let i = 60; i >= 0; i--) {
                const timestamp = now - (i * 60 * 1000); // Go back i minutes
                const variation = (Math.random() - 0.5) * 40; // ±20ms variation
                const latency = Math.max(5, baseLatency + variation);

                dataPoints.push({
                    x: timestamp,
                    y: latency
                });
            }

            timeSeriesData[endpoint] = dataPoints;
        });

        return timeSeriesData;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

