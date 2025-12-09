/**
 * Dashboards Page
 * Custom dashboard builder
 */

(function() {
    'use strict';

    // Get singleton instances
    const eventBus = EventBus.getInstance();
    const stateManager = StateManager.getInstance();
    const apiService = ApiService.getInstance();
    const notificationManager = NotificationManager.getInstance();

    // Page state
    let dashboards = [];
    let currentDashboard = null;

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
        
        // Render dashboards list
        renderDashboardsList();
        
        // Load first dashboard if exists
        if (dashboards.length > 0) {
            loadDashboard(dashboards[0].id);
        } else {
            showEmptyState();
        }
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
    function renderDashboard() {
        const canvas = document.getElementById('dashboardCanvas');
        if (!canvas) return;

        if (!currentDashboard || currentDashboard.widgets.length === 0) {
            showEmptyState();
            return;
        }

        canvas.innerHTML = currentDashboard.widgets.map(widget => `
            <div class="widget-card">
                <div class="widget-header">
                    <h3>${widget.title}</h3>
                    <button class="btn btn-ghost btn-sm" onclick="window.removeWidget('${widget.id}')">×</button>
                </div>
                <div class="widget-body">
                    <div class="widget-placeholder">
                        ${widget.type} - ${widget.metric} (${widget.aggregation})
                    </div>
                </div>
            </div>
        `).join('');
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

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

