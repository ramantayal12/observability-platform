/**
 * Alerts Page
 * Enterprise-level alert management
 */

(function() {
    'use strict';

    // Get singleton instances
    const eventBus = EventBus.getInstance();
    const stateManager = StateManager.getInstance();
    const notificationManager = NotificationManager.getInstance();

    // Page state
    let alertRules = [];
    let activeAlerts = [];

    /**
     * Initialize the page
     */
    async function init() {
        console.log('Initializing Alerts page...');
        
        // Setup UI
        setupModal();
        setupNewAlertButton();
        
        // Load initial data
        loadAlerts();
    }

    /**
     * Setup modal
     */
    function setupModal() {
        const modal = document.getElementById('newAlertModal');
        const closeBtn = document.getElementById('closeAlertModal');
        const cancelBtn = document.getElementById('cancelAlertBtn');
        const createBtn = document.getElementById('createAlertBtn');
        const overlay = modal.querySelector('.modal-overlay');

        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        cancelBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        overlay.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        createBtn.addEventListener('click', () => {
            createAlert();
        });
    }

    /**
     * Setup new alert button
     */
    function setupNewAlertButton() {
        const newAlertBtn = document.getElementById('newAlertBtn');
        newAlertBtn.addEventListener('click', () => {
            openNewAlertModal();
        });
    }

    /**
     * Open new alert modal
     */
    function openNewAlertModal() {
        const modal = document.getElementById('newAlertModal');
        
        // Reset form
        document.getElementById('alertName').value = '';
        document.getElementById('alertMetric').value = 'api.latency';
        document.getElementById('alertOperator').value = '>';
        document.getElementById('alertThreshold').value = '';
        document.getElementById('alertSeverity').value = 'critical';
        document.getElementById('alertService').value = '';
        
        modal.classList.add('active');
    }

    /**
     * Create alert
     */
    function createAlert() {
        const name = document.getElementById('alertName').value.trim();
        const metric = document.getElementById('alertMetric').value;
        const operator = document.getElementById('alertOperator').value;
        const threshold = document.getElementById('alertThreshold').value;
        const severity = document.getElementById('alertSeverity').value;
        const service = document.getElementById('alertService').value.trim();

        // Validation
        if (!name) {
            notificationManager.error('Please enter alert name');
            return;
        }

        if (!threshold) {
            notificationManager.error('Please enter threshold value');
            return;
        }

        // Create alert rule
        const alertRule = {
            id: Date.now().toString(),
            name,
            metric,
            operator,
            threshold: parseFloat(threshold),
            severity,
            service: service || 'All',
            status: 'active',
            lastTriggered: null,
            createdAt: Date.now()
        };

        alertRules.push(alertRule);
        saveAlertRules();
        renderAlertRules();

        // Close modal
        document.getElementById('newAlertModal').classList.remove('active');
        
        notificationManager.success('Alert rule created successfully');
    }

    /**
     * Load alerts
     */
    function loadAlerts() {
        // Load from localStorage
        const saved = localStorage.getItem('observability_alert_rules');
        if (saved) {
            try {
                alertRules = JSON.parse(saved);
            } catch (e) {
                console.error('Error loading alert rules:', e);
                alertRules = [];
            }
        } else {
            // Create default alert rules
            alertRules = [
                {
                    id: '1',
                    name: 'High API Latency',
                    metric: 'api.latency',
                    operator: '>',
                    threshold: 1000,
                    severity: 'critical',
                    service: 'All',
                    status: 'active',
                    lastTriggered: null,
                    createdAt: Date.now() - 86400000
                },
                {
                    id: '2',
                    name: 'High Error Rate',
                    metric: 'error.rate',
                    operator: '>',
                    threshold: 5,
                    severity: 'warning',
                    service: 'All',
                    status: 'active',
                    lastTriggered: Date.now() - 3600000,
                    createdAt: Date.now() - 172800000
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
                    createdAt: Date.now() - 259200000
                }
            ];
            saveAlertRules();
        }

        // Update stats
        updateStats();

        // Render alerts
        renderActiveAlerts();
        renderAlertRules();
    }

    /**
     * Save alert rules
     */
    function saveAlertRules() {
        localStorage.setItem('observability_alert_rules', JSON.stringify(alertRules));
    }

    /**
     * Update stats
     */
    function updateStats() {
        const active = alertRules.filter(r => r.lastTriggered && (Date.now() - r.lastTriggered < 3600000)).length;
        const total = alertRules.length;
        const triggeredToday = alertRules.filter(r => r.lastTriggered && (Date.now() - r.lastTriggered < 86400000)).length;
        const muted = alertRules.filter(r => r.status === 'muted').length;

        document.getElementById('activeAlerts').textContent = active;
        document.getElementById('totalRules').textContent = total;
        document.getElementById('triggeredToday').textContent = triggeredToday;
        document.getElementById('mutedAlerts').textContent = muted;
    }

    /**
     * Render active alerts
     */
    function renderActiveAlerts() {
        const container = document.getElementById('activeAlertsContainer');
        if (!container) return;

        const active = alertRules.filter(r => r.lastTriggered && (Date.now() - r.lastTriggered < 3600000));

        if (active.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="currentColor" opacity="0.3">
                        <path d="M32 8a2 2 0 00-2 2v1.17A5 5 0 0025 16v16l-8 8v4h30v-4l-8-8V16a5 5 0 00-5-5.83V10a2 2 0 00-2-2z"/>
                    </svg>
                    <p>No active alerts</p>
                </div>
            `;
            return;
        }

        container.innerHTML = active.map(alert => `
            <div class="alert-item alert-${alert.severity}">
                <div class="alert-header">
                    <span class="badge badge-${getSeverityBadgeClass(alert.severity)}">${alert.severity.toUpperCase()}</span>
                    <span class="alert-time">${getTimeSince(alert.lastTriggered)}</span>
                </div>
                <div class="alert-title">${alert.name}</div>
                <div class="alert-condition">${alert.metric} ${alert.operator} ${alert.threshold}</div>
            </div>
        `).join('');
    }

    /**
     * Render alert rules table
     */
    function renderAlertRules() {
        const tbody = document.getElementById('alertRulesBody');
        if (!tbody) return;

        if (alertRules.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No alert rules configured</td></tr>';
            return;
        }

        tbody.innerHTML = alertRules.map(rule => `
            <tr>
                <td>${rule.name}</td>
                <td><code>${rule.metric} ${rule.operator} ${rule.threshold}</code></td>
                <td><span class="badge badge-${getSeverityBadgeClass(rule.severity)}">${rule.severity}</span></td>
                <td><span class="badge badge-${rule.status === 'active' ? 'success' : 'neutral'}">${rule.status}</span></td>
                <td>${rule.lastTriggered ? new Date(rule.lastTriggered).toLocaleString() : 'Never'}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="window.toggleAlertRule('${rule.id}')">
                        ${rule.status === 'active' ? 'Mute' : 'Unmute'}
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="window.deleteAlertRule('${rule.id}')">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * Toggle alert rule
     */
    window.toggleAlertRule = function(id) {
        const rule = alertRules.find(r => r.id === id);
        if (rule) {
            rule.status = rule.status === 'active' ? 'muted' : 'active';
            saveAlertRules();
            updateStats();
            renderAlertRules();
            notificationManager.success(`Alert rule ${rule.status === 'active' ? 'activated' : 'muted'}`);
        }
    };

    /**
     * Delete alert rule
     */
    window.deleteAlertRule = function(id) {
        if (!confirm('Are you sure you want to delete this alert rule?')) {
            return;
        }

        alertRules = alertRules.filter(r => r.id !== id);
        saveAlertRules();
        updateStats();
        renderAlertRules();
        renderActiveAlerts();
        notificationManager.success('Alert rule deleted');
    };

    /**
     * Get severity badge class
     */
    function getSeverityBadgeClass(severity) {
        const map = {
            'critical': 'error',
            'warning': 'warning',
            'info': 'info'
        };
        return map[severity] || 'neutral';
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

})();

