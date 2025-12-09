/**
 * Traces Page
 * Enterprise-level distributed tracing
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
        traceId: '',
        service: '',
        minDuration: 0,
        timeRange: 3600000 // 1 hour
    };
    let autoRefreshInterval = null;
    let allTraces = [];

    /**
     * Initialize the page
     */
    async function init() {
        console.log('Initializing Traces page...');
        
        // Setup UI
        setupTimePicker();
        setupAutoRefresh();
        setupFilters();
        setupModal();
        
        // Load initial data
        await loadTraces();
        
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
                loadTraces();
            });
        });

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
            loadTraces();
        }, 30000);
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
        const traceIdInput = document.getElementById('traceIdInput');
        const serviceFilter = document.getElementById('serviceFilter');
        const minDurationInput = document.getElementById('minDurationInput');

        applyFiltersBtn.addEventListener('click', () => {
            currentFilters.traceId = traceIdInput.value;
            currentFilters.service = serviceFilter.value;
            currentFilters.minDuration = parseInt(minDurationInput.value) || 0;
            renderTraces();
        });
    }

    /**
     * Setup modal
     */
    function setupModal() {
        const modal = document.getElementById('traceDetailModal');
        const closeBtn = document.getElementById('closeTraceModal');
        const overlay = modal.querySelector('.modal-overlay');

        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });

        overlay.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    /**
     * Load traces data
     */
    async function loadTraces() {
        try {
            const endTime = Date.now();
            const startTime = endTime - currentFilters.timeRange;

            const data = await apiService.fetchTraces({
                serviceName: currentFilters.service || undefined,
                startTime,
                endTime,
                limit: 100
            });

            allTraces = data.traces || [];

            // Update stats
            updateStats();

            // Render traces
            renderTraces();

            // Update service filter
            updateServiceFilter();

        } catch (error) {
            console.error('Error loading traces:', error);
            notificationManager.error('Failed to load traces');
        }
    }

    /**
     * Update stats cards
     */
    function updateStats() {
        const durations = allTraces.map(t => t.duration || 0);
        
        document.getElementById('totalTraces').textContent = allTraces.length;
        
        if (durations.length > 0) {
            const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
            document.getElementById('avgDuration').textContent = `${avg.toFixed(2)} ms`;
            
            const p95 = calculatePercentile(durations, 95);
            document.getElementById('p95Duration').textContent = `${p95.toFixed(2)} ms`;
        } else {
            document.getElementById('avgDuration').textContent = '--';
            document.getElementById('p95Duration').textContent = '--';
        }

        const errorTraces = allTraces.filter(t => t.error).length;
        document.getElementById('errorTraces').textContent = errorTraces;
    }

    /**
     * Render traces table
     */
    function renderTraces() {
        const tbody = document.getElementById('tracesTableBody');
        if (!tbody) return;

        // Filter traces
        let filtered = allTraces;

        if (currentFilters.traceId) {
            filtered = filtered.filter(t => t.traceId.includes(currentFilters.traceId));
        }

        if (currentFilters.service) {
            filtered = filtered.filter(t => t.serviceName === currentFilters.service);
        }

        if (currentFilters.minDuration > 0) {
            filtered = filtered.filter(t => (t.duration || 0) >= currentFilters.minDuration);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No traces found</td></tr>';
            return;
        }

        // Sort by timestamp (most recent first)
        const sorted = filtered.sort((a, b) => b.timestamp - a.timestamp);

        tbody.innerHTML = sorted.map(trace => `
            <tr>
                <td><code>${trace.traceId.substring(0, 16)}...</code></td>
                <td>${trace.serviceName || 'N/A'}</td>
                <td>${trace.operationName || 'N/A'}</td>
                <td>${(trace.duration || 0).toFixed(2)} ms</td>
                <td>${trace.spans ? trace.spans.length : 0}</td>
                <td>${new Date(trace.timestamp).toLocaleString()}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="window.viewTrace('${trace.traceId}')">
                        View
                    </button>
                </td>
            </tr>
        `).join('');
    }

    /**
     * View trace details
     */
    window.viewTrace = async function(traceId) {
        try {
            const data = await apiService.fetchTrace(traceId);
            const trace = data.trace;

            if (!trace) {
                notificationManager.error('Trace not found');
                return;
            }

            showTraceDetails(trace);
        } catch (error) {
            console.error('Error loading trace:', error);
            notificationManager.error('Failed to load trace details');
        }
    };

    /**
     * Show trace details in modal
     */
    function showTraceDetails(trace) {
        const modal = document.getElementById('traceDetailModal');
        const body = document.getElementById('traceDetailBody');

        const spans = trace.spans || [];
        const duration = trace.duration || 0;

        body.innerHTML = `
            <div class="trace-detail">
                <div class="trace-info">
                    <div class="info-row">
                        <span class="info-label">Trace ID:</span>
                        <code>${trace.traceId}</code>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Service:</span>
                        <span>${trace.serviceName}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Operation:</span>
                        <span>${trace.operationName}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Duration:</span>
                        <span>${duration.toFixed(2)} ms</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Spans:</span>
                        <span>${spans.length}</span>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Timestamp:</span>
                        <span>${new Date(trace.timestamp).toLocaleString()}</span>
                    </div>
                </div>
                
                <h4 style="margin-top: 24px; margin-bottom: 16px;">Spans</h4>
                <div class="spans-list">
                    ${spans.map(span => `
                        <div class="span-item">
                            <div class="span-header">
                                <strong>${span.operationName || 'Unknown'}</strong>
                                <span>${(span.duration || 0).toFixed(2)} ms</span>
                            </div>
                            ${span.tags ? `
                                <div class="span-tags">
                                    ${Object.entries(span.tags).map(([key, value]) => 
                                        `<span class="tag">${key}: ${value}</span>`
                                    ).join('')}
                                </div>
                            ` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        modal.classList.add('active');
    }

    /**
     * Update service filter options
     */
    function updateServiceFilter() {
        const serviceFilter = document.getElementById('serviceFilter');
        if (!serviceFilter) return;

        const services = new Set();
        allTraces.forEach(trace => {
            if (trace.serviceName) {
                services.add(trace.serviceName);
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
     * Calculate percentile
     */
    function calculatePercentile(values, percentile) {
        if (values.length === 0) return 0;
        
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index] || 0;
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

