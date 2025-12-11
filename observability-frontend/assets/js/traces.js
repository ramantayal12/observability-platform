/**
 * Traces Page - New Relic Style
 * Enterprise-level distributed tracing with waterfall view
 */

(function() {
    'use strict';

    // Use PageUtils for common initialization
    if (!PageUtils.requireAuth()) return;

    // Get singleton instances using PageUtils
    const { eventBus, stateManager, apiService, notificationManager } = PageUtils.getServices();

    // Page state
    let currentFilters = {
        query: '',
        services: [],
        operations: [],
        statuses: [],
        durations: [],
        pods: [],
        containers: [],
        timeRange: 3600000 // 1 hour
    };
    let allTraces = [];
    let filteredTraces = [];
    let selectedTraceId = null;
    let autoRefresh = null;

    // FacetFilter instances
    let durationFacet = null;
    let statusFacet = null;
    let serviceFacet = null;
    let operationFacet = null;
    let podFacet = null;
    let containerFacet = null;

    /**
     * Initialize the page
     */
    async function init() {
        console.log('Initializing Traces page (New Relic style)...');

        // Setup UI using PageUtils
        PageUtils.setupTeamSelector();
        const timePicker = PageUtils.setupTimePicker();
        if (timePicker) {
            currentFilters.timeRange = timePicker.getRange();
        }

        // Setup auto-refresh using PageUtils
        autoRefresh = PageUtils.setupAutoRefresh({ onRefresh: loadTraces });

        setupQueryBar();
        setupFacetFilters();
        setupTracePanel();

        // Listen for time range changes
        eventBus.on(Events.TIME_RANGE_CHANGED, handleTimeRangeChange);

        // Listen for team changes
        eventBus.on('team:changed', handleTeamChange);

        // Load initial data
        await loadTraces();

        // Setup auto-refresh if enabled
        const autoRefreshEnabled = localStorage.getItem('observability_auto_refresh') === 'true';
        if (autoRefreshEnabled) {
            autoRefresh.start();
        }
    }

    /**
     * Handle team change
     */
    function handleTeamChange(team) {
        console.log('[Traces] Team changed:', team);
        loadTraces();
    }

    /**
     * Handle time range change
     */
    function handleTimeRangeChange(data) {
        console.log('[Traces] Time range changed:', data);
        currentFilters.timeRange = data.range;
        loadTraces();
    }

    /**
     * Setup query bar
     */
    function setupQueryBar() {
        const queryInput = document.getElementById('traceQueryInput');
        const runBtn = document.getElementById('runTraceQueryBtn');

        if (runBtn) {
            runBtn.addEventListener('click', () => {
                currentFilters.query = queryInput.value;
                applyFilters();
            });
        }

        if (queryInput) {
            queryInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    currentFilters.query = queryInput.value;
                    applyFilters();
                }
            });
        }
    }

    /**
     * Setup facet filters using FacetFilter component
     */
    function setupFacetFilters() {
        // Duration facet
        durationFacet = new FacetFilter({
            containerId: 'durationFacetContainer',
            title: 'Duration',
            multiSelect: true,
            showSearch: false,
            items: [],
            onChange: (selected) => {
                currentFilters.durations = selected;
                applyFilters();
            }
        });

        // Status facet with colors
        statusFacet = new FacetFilter({
            containerId: 'statusFacetContainer',
            title: 'Status',
            multiSelect: true,
            showSearch: false,
            items: [],
            onChange: (selected) => {
                currentFilters.statuses = selected;
                applyFilters();
            }
        });

        // Service facet
        serviceFacet = new FacetFilter({
            containerId: 'serviceFacetContainer',
            title: 'Service',
            multiSelect: true,
            showSearch: true,
            items: [],
            onChange: (selected) => {
                currentFilters.services = selected;
                applyFilters();
            }
        });

        // Operation facet
        operationFacet = new FacetFilter({
            containerId: 'operationFacetContainer',
            title: 'Operation',
            multiSelect: true,
            showSearch: true,
            items: [],
            onChange: (selected) => {
                currentFilters.operations = selected;
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
        const clearBtn = document.getElementById('clearTraceFiltersBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                currentFilters.query = '';
                currentFilters.services = [];
                currentFilters.operations = [];
                currentFilters.statuses = [];
                currentFilters.durations = [];
                currentFilters.pods = [];
                currentFilters.containers = [];
                document.getElementById('traceQueryInput').value = '';
                if (durationFacet) durationFacet.clearSelection();
                if (statusFacet) statusFacet.clearSelection();
                if (serviceFacet) serviceFacet.clearSelection();
                if (operationFacet) operationFacet.clearSelection();
                if (podFacet) podFacet.clearSelection();
                if (containerFacet) containerFacet.clearSelection();
                applyFilters();
            });
        }
    }

    /**
     * Setup trace detail panel
     */
    function setupTracePanel() {
        const closeBtn = document.getElementById('closeTracePanel');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                document.getElementById('traceDetailPanel').classList.remove('active');
                selectedTraceId = null;
            });
        }
    }

    /**
     * Load traces data
     */
    async function loadTraces() {
        try {
            const endTime = Date.now();
            const startTime = endTime - currentFilters.timeRange;

            // Use team-specific endpoint
            const data = await apiService.fetchTeamTraces({
                serviceName: currentFilters.service || undefined,
                startTime,
                endTime,
                limit: 100
            });

            allTraces = data.traces || [];
            applyFilters();

        } catch (error) {
            console.error('Error loading traces:', error);
            notificationManager.error('Failed to load traces');
        }
    }

    /**
     * Apply filters and update UI
     */
    function applyFilters() {
        filteredTraces = [...allTraces];

        // Apply query filter
        if (currentFilters.query) {
            filteredTraces = filterByQuery(filteredTraces, currentFilters.query);
        }

        // Apply duration filter (multi-select)
        if (currentFilters.durations && currentFilters.durations.length > 0) {
            filteredTraces = filteredTraces.filter(t => {
                return currentFilters.durations.some(range => matchesDurationRange(t.duration || 0, range));
            });
        }

        // Apply status filter (multi-select)
        if (currentFilters.statuses && currentFilters.statuses.length > 0) {
            filteredTraces = filteredTraces.filter(t => {
                const status = t.error ? 'error' : 'success';
                return currentFilters.statuses.includes(status);
            });
        }

        // Apply service filter (multi-select)
        if (currentFilters.services && currentFilters.services.length > 0) {
            filteredTraces = filteredTraces.filter(t => currentFilters.services.includes(t.serviceName));
        }

        // Apply operation filter (multi-select)
        if (currentFilters.operations && currentFilters.operations.length > 0) {
            filteredTraces = filteredTraces.filter(t => currentFilters.operations.includes(t.operationName));
        }

        // Apply pod filter (multi-select)
        if (currentFilters.pods && currentFilters.pods.length > 0) {
            filteredTraces = filteredTraces.filter(t => currentFilters.pods.includes(t.pod));
        }

        // Apply container filter (multi-select)
        if (currentFilters.containers && currentFilters.containers.length > 0) {
            filteredTraces = filteredTraces.filter(t => currentFilters.containers.includes(t.container));
        }

        // Update all UI components
        updateStats();
        updateFacets();
        renderScatterPlot();
        renderTracesList();
    }

    /**
     * Check if duration matches a range
     */
    function matchesDurationRange(duration, range) {
        switch (range) {
            case '0-50': return duration < 50;
            case '50-100': return duration >= 50 && duration < 100;
            case '100-500': return duration >= 100 && duration < 500;
            case '500+': return duration >= 500;
            default: return true;
        }
    }

    /**
     * Filter by query string
     */
    function filterByQuery(traces, query) {
        const terms = query.toLowerCase().split(/\s+/);

        return traces.filter(trace => {
            return terms.every(term => {
                // Check for field:value pattern
                const match = term.match(/^(\w+):(.+)$/);
                if (match) {
                    const [, field, value] = match;
                    switch (field) {
                        case 'service':
                            return trace.serviceName?.toLowerCase().includes(value);
                        case 'operation':
                            return trace.operationName?.toLowerCase().includes(value);
                        case 'duration':
                            const durationMatch = value.match(/^([<>])(\d+)$/);
                            if (durationMatch) {
                                const [, op, num] = durationMatch;
                                const duration = trace.duration || 0;
                                return op === '>' ? duration > parseInt(num) : duration < parseInt(num);
                            }
                            return true;
                        case 'error':
                            return value === 'true' ? trace.error : !trace.error;
                        case 'traceid':
                            return trace.traceId?.toLowerCase().includes(value);
                        default:
                            return true;
                    }
                }
                // General search
                return trace.traceId?.toLowerCase().includes(term) ||
                       trace.serviceName?.toLowerCase().includes(term) ||
                       trace.operationName?.toLowerCase().includes(term);
            });
        });
    }

    /**
     * Update stats
     */
    function updateStats() {
        const durations = filteredTraces.map(t => t.duration || 0);

        document.getElementById('totalTraces').textContent = filteredTraces.length;

        if (durations.length > 0) {
            const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
            document.getElementById('avgDuration').textContent = `${avg.toFixed(0)}ms`;

            const p95 = calculatePercentile(durations, 95);
            document.getElementById('p95Duration').textContent = `${p95.toFixed(0)}ms`;
        } else {
            document.getElementById('avgDuration').textContent = '0ms';
            document.getElementById('p95Duration').textContent = '0ms';
        }

        const errorTraces = filteredTraces.filter(t => t.error).length;
        document.getElementById('errorTraces').textContent = errorTraces;
    }

    /**
     * Update facet counts using FacetFilter components
     */
    function updateFacets() {
        // Duration facets
        if (durationFacet) {
            const durationCounts = { '0-50': 0, '50-100': 0, '100-500': 0, '500+': 0 };
            allTraces.forEach(trace => {
                const d = trace.duration || 0;
                if (d < 50) durationCounts['0-50']++;
                else if (d < 100) durationCounts['50-100']++;
                else if (d < 500) durationCounts['100-500']++;
                else durationCounts['500+']++;
            });

            durationFacet.setItems([
                { value: '0-50', label: '< 50ms', count: durationCounts['0-50'] },
                { value: '50-100', label: '50-100ms', count: durationCounts['50-100'] },
                { value: '100-500', label: '100-500ms', count: durationCounts['100-500'] },
                { value: '500+', label: '> 500ms', count: durationCounts['500+'] }
            ]);
            durationFacet.setSelectedValues(currentFilters.durations);
        }

        // Status facets
        if (statusFacet) {
            const successCount = allTraces.filter(t => !t.error).length;
            const errorCount = allTraces.filter(t => t.error).length;

            statusFacet.setItems([
                { value: 'success', label: 'Success', count: successCount, color: '#12b76a' },
                { value: 'error', label: 'Error', count: errorCount, color: '#f04438' }
            ]);
            statusFacet.setSelectedValues(currentFilters.statuses);
        }

        // Service facets
        if (serviceFacet) {
            const serviceCounts = {};
            allTraces.forEach(trace => {
                const service = trace.serviceName || 'unknown';
                serviceCounts[service] = (serviceCounts[service] || 0) + 1;
            });

            const sortedServices = Object.entries(serviceCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 15)
                .map(([service, count]) => ({
                    value: service,
                    label: service,
                    count: count
                }));

            serviceFacet.setItems(sortedServices);
            serviceFacet.setSelectedValues(currentFilters.services);
        }

        // Operation facets
        if (operationFacet) {
            const operationCounts = {};
            allTraces.forEach(trace => {
                const op = trace.operationName || 'unknown';
                operationCounts[op] = (operationCounts[op] || 0) + 1;
            });

            const sortedOperations = Object.entries(operationCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 15)
                .map(([op, count]) => ({
                    value: op,
                    label: op,
                    count: count
                }));

            operationFacet.setItems(sortedOperations);
            operationFacet.setSelectedValues(currentFilters.operations);
        }

        // Pod facets
        if (podFacet) {
            const podCounts = {};
            allTraces.forEach(trace => {
                if (trace.pod) {
                    podCounts[trace.pod] = (podCounts[trace.pod] || 0) + 1;
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

        // Container facets
        if (containerFacet) {
            const containerCounts = {};
            allTraces.forEach(trace => {
                if (trace.container) {
                    containerCounts[trace.container] = (containerCounts[trace.container] || 0) + 1;
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
     * Render scatter plot
     */
    function renderScatterPlot() {
        const container = document.getElementById('tracesScatter');
        if (!container) return;

        if (filteredTraces.length === 0) {
            container.innerHTML = '<div class="scatter-empty">No traces to display</div>';
            return;
        }

        const maxDuration = Math.max(...filteredTraces.map(t => t.duration || 0), 100);
        const minTime = Math.min(...filteredTraces.map(t => t.timestamp));
        const maxTime = Math.max(...filteredTraces.map(t => t.timestamp));
        const timeRange = maxTime - minTime || 1;

        container.innerHTML = filteredTraces.slice(0, 200).map(trace => {
            const x = ((trace.timestamp - minTime) / timeRange) * 100;
            const y = 100 - ((trace.duration || 0) / maxDuration) * 80;
            const color = trace.error ? 'var(--error)' : getDurationColor(trace.duration || 0);

            return `<div class="scatter-point"
                        style="left: ${x}%; top: ${y}%; background: ${color};"
                        data-trace-id="${trace.traceId}"
                        title="${trace.serviceName}: ${(trace.duration || 0).toFixed(0)}ms">
                    </div>`;
        }).join('');

        // Add click handlers to scatter points
        container.querySelectorAll('.scatter-point').forEach(point => {
            point.addEventListener('click', () => {
                const traceId = point.dataset.traceId;
                viewTrace(traceId);
            });
        });
    }

    // getDurationColor is now imported from PageUtils at the bottom of the file

    /**
     * Render traces list
     */
    function renderTracesList() {
        const container = document.getElementById('tracesListBody');
        if (!container) return;

        if (filteredTraces.length === 0) {
            container.innerHTML = '<div class="traces-empty">No traces found matching your criteria</div>';
            return;
        }

        // Sort by timestamp (most recent first)
        const sorted = [...filteredTraces].sort((a, b) => b.timestamp - a.timestamp);

        container.innerHTML = sorted.slice(0, 100).map(trace => {
            const duration = trace.duration || 0;
            const maxDuration = 1000;
            const barWidth = Math.min((duration / maxDuration) * 100, 100);
            const barColor = trace.error ? 'var(--error)' : getDurationColor(duration);

            return `
                <div class="trace-row ${trace.error ? 'error' : ''} ${selectedTraceId === trace.traceId ? 'selected' : ''}"
                     data-trace-id="${trace.traceId}">
                    <div class="trace-row-main">
                        <div class="trace-col col-trace">
                            <div class="trace-service">${escapeHtml(trace.serviceName || 'unknown')}</div>
                            <div class="trace-operation">${escapeHtml(trace.operationName || 'unknown')}</div>
                            <div class="trace-id">${trace.traceId.substring(0, 16)}...</div>
                        </div>
                        <div class="trace-col col-duration">
                            <div class="duration-bar-container">
                                <div class="duration-bar" style="width: ${barWidth}%; background: ${barColor};"></div>
                            </div>
                            <span class="duration-value">${duration.toFixed(0)}ms</span>
                        </div>
                        <div class="trace-col col-spans">
                            <span class="spans-count">${trace.spans ? trace.spans.length : 0}</span>
                        </div>
                        <div class="trace-col col-timestamp">
                            ${formatTimestamp(trace.timestamp)}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers
        container.querySelectorAll('.trace-row').forEach(row => {
            row.addEventListener('click', () => {
                const traceId = row.dataset.traceId;
                viewTrace(traceId);
            });
        });
    }

    /**
     * View trace details - Navigate to dedicated trace detail page
     */
    function viewTrace(traceId) {
        // Navigate to the dedicated trace detail page
        window.location.href = `trace-detail.html?id=${encodeURIComponent(traceId)}`;
    }

    /**
     * View trace details in panel (legacy - kept for quick preview)
     */
    async function viewTraceInPanel(traceId) {
        try {
            selectedTraceId = traceId;

            // Highlight selected row
            document.querySelectorAll('.trace-row').forEach(row => {
                row.classList.toggle('selected', row.dataset.traceId === traceId);
            });

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
    }

    /**
     * Show trace details in panel
     */
    function showTraceDetails(trace) {
        const panel = document.getElementById('traceDetailPanel');
        const content = document.getElementById('traceDetailContent');

        const spans = trace.spans || [];
        const duration = trace.duration || 0;
        const traceStart = trace.timestamp;

        content.innerHTML = `
            <div class="trace-summary">
                <div class="trace-summary-row">
                    <span class="summary-label">Trace ID</span>
                    <code class="summary-value">${trace.traceId}</code>
                </div>
                <div class="trace-summary-row">
                    <span class="summary-label">Root Service</span>
                    <span class="summary-value">${escapeHtml(trace.serviceName)}</span>
                </div>
                <div class="trace-summary-row">
                    <span class="summary-label">Root Operation</span>
                    <span class="summary-value">${escapeHtml(trace.operationName)}</span>
                </div>
                <div class="trace-summary-row">
                    <span class="summary-label">Total Duration</span>
                    <span class="summary-value">${duration.toFixed(2)}ms</span>
                </div>
                <div class="trace-summary-row">
                    <span class="summary-label">Spans</span>
                    <span class="summary-value">${spans.length}</span>
                </div>
                <div class="trace-summary-row">
                    <span class="summary-label">Status</span>
                    <span class="summary-value ${trace.error ? 'error' : 'success'}">${trace.error ? 'Error' : 'Success'}</span>
                </div>
            </div>

            <div class="waterfall-header">
                <h4>Waterfall View</h4>
                <span class="waterfall-duration">${duration.toFixed(0)}ms total</span>
            </div>

            <div class="waterfall-container">
                ${spans.map((span, index) => {
                    const spanStart = span.startTime || traceStart;
                    const spanDuration = span.duration || 0;
                    const offset = ((spanStart - traceStart) / duration) * 100;
                    const width = Math.max((spanDuration / duration) * 100, 1);
                    const barColor = span.error ? 'var(--error)' : getDurationColor(spanDuration);

                    return `
                        <div class="waterfall-span" style="--depth: ${span.depth || 0}">
                            <div class="span-info">
                                <span class="span-service">${escapeHtml(span.serviceName || trace.serviceName)}</span>
                                <span class="span-operation">${escapeHtml(span.operationName || 'unknown')}</span>
                            </div>
                            <div class="span-timeline">
                                <div class="span-bar" style="left: ${offset}%; width: ${width}%; background: ${barColor};">
                                    <span class="span-duration">${spanDuration.toFixed(0)}ms</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            ${spans.length > 0 && spans[0].tags ? `
                <div class="span-attributes">
                    <h4>Root Span Attributes</h4>
                    <div class="attributes-grid">
                        ${Object.entries(spans[0].tags || {}).map(([key, value]) => `
                            <div class="attribute-row">
                                <span class="attribute-key">${escapeHtml(key)}</span>
                                <span class="attribute-value">${escapeHtml(String(value))}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        panel.classList.add('active');
    }

    // Use PageUtils for common helper functions
    const formatTimestamp = PageUtils.formatTimestamp;
    const escapeHtml = PageUtils.escapeHtml;
    const calculatePercentile = PageUtils.calculatePercentile;
    const getDurationColor = PageUtils.getDurationColor;

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

