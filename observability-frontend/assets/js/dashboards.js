/**
 * Dashboards Page
 * Custom dashboard builder - Create and manage your own monitoring dashboards
 */

(function() {
    'use strict';

    // Use PageUtils for common initialization
    if (!PageUtils.requireAuth()) return;

    // Get singleton instances using PageUtils
    const { eventBus, stateManager, apiService, notificationManager } = PageUtils.getServices();

    // Page state
    let dashboards = [];
    let currentDashboard = null;
    let currentView = 'list'; // 'list' or 'dashboard'
    let autoRefresh = null;

    /**
     * Initialize the page
     */
    async function init() {
        console.log('Initializing Dashboards page...');

        // Load dashboards from localStorage
        loadDashboards();

        // Setup UI using PageUtils
        PageUtils.setupTeamSelector();

        // Setup auto-refresh using PageUtils
        autoRefresh = PageUtils.setupAutoRefresh({
            onRefresh: async () => {
                await loadApiDetails();
                if (currentDashboard) {
                    loadDashboard(currentDashboard.id);
                }
            }
        });

        setupNewDashboardButton();
        setupBackButton();
        setupDashboardActions();
        setupModals();

        // Listen for team changes
        eventBus.on('team:changed', handleTeamChange);

        // Render dashboards list
        renderDashboardsList();
        showListView();
    }

    /**
     * Handle team change
     */
    function handleTeamChange(team) {
        console.log('[Dashboards] Team changed:', team);
        loadDashboards();
        renderDashboardsList();
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
        // Header button
        const headerBtn = document.getElementById('createDashboardHeaderBtn');
        if (headerBtn) {
            headerBtn.addEventListener('click', () => {
                openNewDashboardModal();
            });
        }
    }

    /**
     * Setup back button
     */
    function setupBackButton() {
        const backBtn = document.getElementById('backToDashboards');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                showListView();
            });
        }
    }

    /**
     * Setup dashboard action buttons
     */
    function setupDashboardActions() {
        // Add widget button
        const addWidgetBtn = document.getElementById('addWidgetBtn');
        if (addWidgetBtn) {
            addWidgetBtn.addEventListener('click', () => {
                if (currentDashboard) {
                    openAddWidgetModal();
                }
            });
        }

        // Edit dashboard button
        const editBtn = document.getElementById('editDashboardBtn');
        if (editBtn) {
            editBtn.addEventListener('click', () => {
                if (currentDashboard) {
                    openEditDashboardModal();
                }
            });
        }

        // Delete dashboard button
        const deleteBtn = document.getElementById('deleteDashboardBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                if (currentDashboard) {
                    deleteDashboard(currentDashboard.id);
                }
            });
        }
    }

    /**
     * Show list view
     */
    function showListView() {
        currentView = 'list';
        currentDashboard = null;
        document.getElementById('dashboardListView').classList.remove('hidden');
        document.getElementById('dashboardView').classList.add('hidden');
        document.querySelector('.dashboard-page-header').classList.remove('hidden');
    }

    /**
     * Show dashboard view
     */
    function showDashboardView() {
        currentView = 'dashboard';
        document.getElementById('dashboardListView').classList.add('hidden');
        document.getElementById('dashboardView').classList.remove('hidden');
        document.querySelector('.dashboard-page-header').classList.add('hidden');
    }

    /**
     * Setup modals
     */
    function setupModals() {
        // New Dashboard Modal - close buttons
        const newDashboardModal = document.getElementById('newDashboardModal');
        if (newDashboardModal) {
            newDashboardModal.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', () => {
                    newDashboardModal.classList.remove('active');
                });
            });
            newDashboardModal.querySelector('.modal-overlay')?.addEventListener('click', () => {
                newDashboardModal.classList.remove('active');
            });
        }

        const createDashboardBtn = document.getElementById('createDashboardBtn');
        if (createDashboardBtn) {
            createDashboardBtn.addEventListener('click', createDashboard);
        }

        // Add Widget Modal - close buttons
        const addWidgetModal = document.getElementById('addWidgetModal');
        if (addWidgetModal) {
            addWidgetModal.querySelectorAll('.modal-close').forEach(btn => {
                btn.addEventListener('click', () => {
                    addWidgetModal.classList.remove('active');
                });
            });
            addWidgetModal.querySelector('.modal-overlay')?.addEventListener('click', () => {
                addWidgetModal.classList.remove('active');
            });

            // Widget type selection
            addWidgetModal.querySelectorAll('.widget-type-card').forEach(card => {
                card.addEventListener('click', () => {
                    addWidgetModal.querySelectorAll('.widget-type-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    document.getElementById('widgetConfigForm').classList.remove('hidden');
                    document.getElementById('saveWidgetBtn').disabled = false;
                });
            });
        }

        const saveWidgetBtn = document.getElementById('saveWidgetBtn');
        if (saveWidgetBtn) {
            saveWidgetBtn.addEventListener('click', addWidget);
        }
    }

    /**
     * Open new dashboard modal
     */
    function openNewDashboardModal() {
        const modal = document.getElementById('newDashboardModal');
        const nameInput = document.getElementById('dashboardNameInput');
        const descInput = document.getElementById('dashboardDescInput');
        if (nameInput) nameInput.value = '';
        if (descInput) descInput.value = '';
        modal.classList.add('active');
    }

    /**
     * Open edit dashboard modal
     */
    function openEditDashboardModal() {
        if (!currentDashboard) return;
        const modal = document.getElementById('newDashboardModal');
        const nameInput = document.getElementById('dashboardNameInput');
        const descInput = document.getElementById('dashboardDescInput');
        if (nameInput) nameInput.value = currentDashboard.name;
        if (descInput) descInput.value = currentDashboard.description || '';
        modal.classList.add('active');
    }

    /**
     * Open add widget modal
     */
    function openAddWidgetModal() {
        const modal = document.getElementById('addWidgetModal');
        const titleInput = document.getElementById('widgetTitleInput');
        if (titleInput) titleInput.value = '';
        document.getElementById('widgetConfigForm')?.classList.add('hidden');
        document.getElementById('saveWidgetBtn').disabled = true;
        modal.querySelectorAll('.widget-type-card').forEach(c => c.classList.remove('selected'));
        modal.classList.add('active');
    }

    /**
     * Create dashboard
     */
    function createDashboard() {
        const nameInput = document.getElementById('dashboardNameInput');
        const descInput = document.getElementById('dashboardDescInput');
        const name = nameInput?.value.trim();
        const description = descInput?.value.trim();

        if (!name) {
            notificationManager.error('Please enter a dashboard name');
            return;
        }

        // Check if editing existing dashboard
        if (currentDashboard && currentView === 'dashboard') {
            currentDashboard.name = name;
            currentDashboard.description = description;
            saveDashboards();
            document.getElementById('newDashboardModal').classList.remove('active');
            notificationManager.success('Dashboard updated successfully');
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
        openDashboard(dashboard.id);

        document.getElementById('newDashboardModal').classList.remove('active');
        notificationManager.success('Dashboard created successfully');
    }

    /**
     * Delete dashboard
     */
    function deleteDashboard(dashboardId) {
        if (!confirm('Are you sure you want to delete this dashboard?')) return;

        dashboards = dashboards.filter(d => d.id !== dashboardId);
        saveDashboards();
        showListView();
        renderDashboardsList();
        notificationManager.success('Dashboard deleted');
    }

    /**
     * Add widget
     */
    function addWidget() {
        if (!currentDashboard) return;

        const titleInput = document.getElementById('widgetTitleInput');
        const metricSelect = document.getElementById('widgetMetricSelect');
        const aggSelect = document.getElementById('widgetAggSelect');
        const selectedType = document.querySelector('.widget-type-card.selected');

        const title = titleInput?.value.trim();
        const metric = metricSelect?.value || 'api.latency';
        const aggregation = aggSelect?.value || 'avg';
        const type = selectedType?.dataset.type || 'timeseries';

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

        document.getElementById('addWidgetModal').classList.remove('active');
        notificationManager.success('Widget added successfully');
    }

    /**
     * Render dashboards list as cards
     */
    function renderDashboardsList() {
        const grid = document.getElementById('dashboardsGrid');
        if (!grid) return;

        if (dashboards.length === 0) {
            grid.innerHTML = `
                <div class="empty-dashboards-state">
                    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" opacity="0.3">
                        <rect x="10" y="10" width="25" height="25" rx="3" stroke="currentColor" stroke-width="2"/>
                        <rect x="45" y="10" width="25" height="15" rx="3" stroke="currentColor" stroke-width="2"/>
                        <rect x="10" y="45" width="25" height="25" rx="3" stroke="currentColor" stroke-width="2"/>
                        <rect x="45" y="35" width="25" height="35" rx="3" stroke="currentColor" stroke-width="2"/>
                    </svg>
                    <h3>No Dashboards Yet</h3>
                    <p>Create your first custom dashboard to start monitoring your metrics</p>
                    <button class="btn btn-primary" onclick="document.getElementById('createDashboardHeaderBtn').click()">
                        Create Dashboard
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = dashboards.map(dashboard => `
            <div class="dashboard-card" onclick="window.openDashboard('${dashboard.id}')">
                <div class="dashboard-card-header">
                    <h3 class="dashboard-card-title">${escapeHtml(dashboard.name)}</h3>
                    <span class="dashboard-card-widgets">${dashboard.widgets.length} widgets</span>
                </div>
                <p class="dashboard-card-desc">${escapeHtml(dashboard.description || 'No description')}</p>
                <div class="dashboard-card-footer">
                    <span class="dashboard-card-date">Created ${formatDate(dashboard.createdAt)}</span>
                </div>
            </div>
        `).join('');
    }

    /**
     * Open dashboard (view mode)
     */
    window.openDashboard = function(dashboardId) {
        currentDashboard = dashboards.find(d => d.id === dashboardId);
        if (currentDashboard) {
            showDashboardView();
            renderDashboard();
        }
    };

    /**
     * Load dashboard (legacy support)
     */
    window.loadDashboard = window.openDashboard;

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

    // Use PageUtils for common helper functions
    const escapeHtml = PageUtils.escapeHtml;
    const formatDate = PageUtils.formatDate;
    const generateHexId = PageUtils.generateHexId;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (autoRefresh) autoRefresh.cleanup();
    });

})();

