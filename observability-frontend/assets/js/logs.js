/**
 * Logs Page - New Relic Style
 * Enterprise-level log exploration and analysis
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
    let currentFilters = {
        query: '',
        levels: [],
        services: [],
        loggers: [],
        pods: [],
        containers: [],
        timeRange: 3600000 // 1 hour
    };
    let autoRefreshInterval = null;
    let liveTailInterval = null;
    let allLogs = [];
    let filteredLogs = [];
    let timeRangePicker = null;
    let isLiveTailActive = false;

    // FacetFilter instances
    let levelFacet = null;
    let serviceFacet = null;
    let loggerFacet = null;
    let podFacet = null;
    let containerFacet = null;
    let teamSelector = null;

    // Column configuration
    const allColumns = [
        { id: 'timestamp', label: 'Timestamp', default: true, width: '160px' },
        { id: 'level', label: 'Level', default: true, width: '80px' },
        { id: 'service', label: 'Service', default: true, width: '140px' },
        { id: 'logger', label: 'Logger', default: false, width: '180px' },
        { id: 'traceId', label: 'Trace ID', default: false, width: '160px' },
        { id: 'spanId', label: 'Span ID', default: false, width: '140px' },
        { id: 'host', label: 'Host', default: false, width: '120px' },
        { id: 'pod', label: 'Pod', default: false, width: '180px' },
        { id: 'container', label: 'Container', default: false, width: '120px' },
        { id: 'thread', label: 'Thread', default: false, width: '100px' },
        { id: 'duration', label: 'Duration', default: false, width: '80px' },
        { id: 'message', label: 'Message', default: true, width: 'auto' }
    ];
    let visibleColumns = [];
    const COLUMN_STORAGE_KEY = 'observability_logs_columns';

    /**
     * Initialize the page
     */
    async function init() {
        console.log('Initializing Logs page (New Relic style)...');

        // Load column preferences
        loadColumnPreferences();

        // Setup UI
        setupTeamSelector();
        setupTimePicker();
        setupAutoRefresh();
        setupQueryBar();
        setupLiveTail();
        setupExport();
        setupFacetFilters();
        setupColumnSelector();

        // Listen for time range changes
        eventBus.on(Events.TIME_RANGE_CHANGED, handleTimeRangeChange);

        // Listen for team changes
        eventBus.on('team:changed', handleTeamChange);

        // Load initial data
        await loadLogs();

        // Setup auto-refresh if enabled
        const autoRefreshEnabled = localStorage.getItem('observability_auto_refresh') === 'true';
        if (autoRefreshEnabled) {
            startAutoRefresh();
        }
    }

    /**
     * Load column preferences from localStorage
     */
    function loadColumnPreferences() {
        const saved = localStorage.getItem(COLUMN_STORAGE_KEY);
        if (saved) {
            try {
                visibleColumns = JSON.parse(saved);
            } catch (e) {
                visibleColumns = allColumns.filter(c => c.default).map(c => c.id);
            }
        } else {
            visibleColumns = allColumns.filter(c => c.default).map(c => c.id);
        }
    }

    /**
     * Save column preferences to localStorage
     */
    function saveColumnPreferences() {
        localStorage.setItem(COLUMN_STORAGE_KEY, JSON.stringify(visibleColumns));
    }

    /**
     * Setup column selector dropdown
     */
    function setupColumnSelector() {
        const btn = document.getElementById('columnSelectorBtn');
        const dropdown = document.getElementById('columnSelectorDropdown');
        const list = document.getElementById('columnSelectorList');
        const resetBtn = document.getElementById('resetColumnsBtn');

        if (!btn || !dropdown || !list) return;

        // Render column checkboxes
        renderColumnSelector();

        // Toggle dropdown
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });

        // Close on outside click
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });

        // Reset columns
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                visibleColumns = allColumns.filter(c => c.default).map(c => c.id);
                saveColumnPreferences();
                renderColumnSelector();
                renderTableHeader();
                renderLogs();
            });
        }
    }

    /**
     * Render column selector checkboxes
     */
    function renderColumnSelector() {
        const list = document.getElementById('columnSelectorList');
        if (!list) return;

        list.innerHTML = allColumns.map(col => `
            <label class="column-selector-item">
                <input type="checkbox"
                       value="${col.id}"
                       ${visibleColumns.includes(col.id) ? 'checked' : ''}
                       onchange="window.toggleColumn('${col.id}', this.checked)">
                <span class="column-selector-label">${col.label}</span>
            </label>
        `).join('');
    }

    /**
     * Toggle column visibility
     */
    window.toggleColumn = function(columnId, visible) {
        if (visible && !visibleColumns.includes(columnId)) {
            // Add column in correct order
            const orderedColumns = allColumns.map(c => c.id);
            visibleColumns.push(columnId);
            visibleColumns.sort((a, b) => orderedColumns.indexOf(a) - orderedColumns.indexOf(b));
        } else if (!visible) {
            visibleColumns = visibleColumns.filter(c => c !== columnId);
        }
        saveColumnPreferences();
        renderTableHeader();
        renderLogs();
    };

    /**
     * Render table header based on visible columns
     */
    function renderTableHeader() {
        const header = document.getElementById('logsTableHeader');
        if (!header) return;

        const cols = allColumns.filter(c => visibleColumns.includes(c.id));
        header.innerHTML = cols.map(col =>
            `<div class="logs-table-col col-${col.id}" style="width: ${col.width}; ${col.width === 'auto' ? 'flex: 1;' : ''}">${col.label}</div>`
        ).join('');
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
        console.log('[Logs] Team changed:', team);
        loadLogs();
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
        currentFilters.timeRange = timeRangePicker.getRange();
    }

    /**
     * Handle time range change
     */
    function handleTimeRangeChange(data) {
        console.log('[Logs] Time range changed:', data);
        currentFilters.timeRange = data.range;
        loadLogs();
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
                await loadLogs();
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
     * Setup query bar
     */
    function setupQueryBar() {
        const queryInput = document.getElementById('queryInput');
        const runQueryBtn = document.getElementById('runQueryBtn');

        if (queryInput) {
            queryInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    runQuery();
                }
            });
        }

        if (runQueryBtn) {
            runQueryBtn.addEventListener('click', runQuery);
        }
    }

    /**
     * Run query
     */
    function runQuery() {
        const queryInput = document.getElementById('queryInput');
        currentFilters.query = queryInput.value.trim();
        applyFilters();
        notificationManager.info('Query applied');
    }

    /**
     * Setup live tail
     */
    function setupLiveTail() {
        const liveTailBtn = document.getElementById('liveTailBtn');
        if (!liveTailBtn) return;

        liveTailBtn.addEventListener('click', () => {
            isLiveTailActive = !isLiveTailActive;
            liveTailBtn.classList.toggle('active', isLiveTailActive);

            if (isLiveTailActive) {
                startLiveTail();
                notificationManager.success('Live tail started');
            } else {
                stopLiveTail();
                notificationManager.info('Live tail stopped');
            }
        });
    }

    /**
     * Start live tail
     */
    function startLiveTail() {
        stopLiveTail();
        liveTailInterval = setInterval(() => {
            addNewLogs();
        }, 2000); // Add new logs every 2 seconds
    }

    /**
     * Stop live tail
     */
    function stopLiveTail() {
        if (liveTailInterval) {
            clearInterval(liveTailInterval);
            liveTailInterval = null;
        }
    }

    /**
     * Add new logs for live tail
     */
    function addNewLogs() {
        const newLogs = generateMockLogs(3);
        allLogs = [...newLogs, ...allLogs].slice(0, 1000);
        applyFilters();
        updateStats();
        updateHistogram();
    }

    /**
     * Setup export
     */
    function setupExport() {
        const exportLogsBtn = document.getElementById('exportLogsBtn');
        if (exportLogsBtn) {
            exportLogsBtn.addEventListener('click', exportLogs);
        }
    }

    /**
     * Setup facet filters using FacetFilter component
     */
    function setupFacetFilters() {
        // Level facet with colors
        levelFacet = new FacetFilter({
            containerId: 'levelFacetContainer',
            title: 'Level',
            multiSelect: true,
            showSearch: false,
            items: [],
            onChange: (selected) => {
                currentFilters.levels = selected;
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

        // Logger facet
        loggerFacet = new FacetFilter({
            containerId: 'loggerFacetContainer',
            title: 'Logger',
            multiSelect: true,
            showSearch: true,
            items: [],
            onChange: (selected) => {
                currentFilters.loggers = selected;
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
        const clearFiltersBtn = document.getElementById('clearFiltersBtn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                currentFilters.levels = [];
                currentFilters.services = [];
                currentFilters.loggers = [];
                currentFilters.pods = [];
                currentFilters.containers = [];
                currentFilters.query = '';
                document.getElementById('queryInput').value = '';
                if (levelFacet) levelFacet.clearSelection();
                if (serviceFacet) serviceFacet.clearSelection();
                if (loggerFacet) loggerFacet.clearSelection();
                if (podFacet) podFacet.clearSelection();
                if (containerFacet) containerFacet.clearSelection();
                applyFilters();
                notificationManager.info('Filters cleared');
            });
        }
    }

    /**
     * Load logs data
     */
    async function loadLogs() {
        try {
            const endTime = Date.now();
            const startTime = endTime - currentFilters.timeRange;

            // Use team-specific endpoint
            const data = await apiService.fetchTeamLogs({
                startTime,
                endTime,
                limit: 1000
            });

            allLogs = data.logs || [];

            // Apply filters and render
            applyFilters();

            // Update facets
            updateFacets();

            // Update histogram
            updateHistogram();

        } catch (error) {
            console.error('Error loading logs:', error);
            notificationManager.error('Failed to load logs');
        }
    }

    /**
     * Apply filters to logs
     */
    function applyFilters() {
        filteredLogs = [...allLogs];

        // Apply level filters
        if (currentFilters.levels.length > 0) {
            filteredLogs = filteredLogs.filter(log => currentFilters.levels.includes(log.level));
        }

        // Apply service filters
        if (currentFilters.services.length > 0) {
            filteredLogs = filteredLogs.filter(log => currentFilters.services.includes(log.serviceName));
        }

        // Apply logger filters
        if (currentFilters.loggers.length > 0) {
            filteredLogs = filteredLogs.filter(log => currentFilters.loggers.includes(log.logger));
        }

        // Apply pod filters
        if (currentFilters.pods.length > 0) {
            filteredLogs = filteredLogs.filter(log => currentFilters.pods.includes(log.pod));
        }

        // Apply container filters
        if (currentFilters.containers.length > 0) {
            filteredLogs = filteredLogs.filter(log => currentFilters.containers.includes(log.container));
        }

        // Apply query filter
        if (currentFilters.query) {
            filteredLogs = filterByQuery(filteredLogs, currentFilters.query);
        }

        // Update stats, histogram, and render
        updateStats();
        updateHistogram();
        renderLogs();
        updateFacets();
    }

    /**
     * Filter logs by query string
     */
    function filterByQuery(logs, query) {
        const queryLower = query.toLowerCase();

        // Parse query for field:value patterns
        const fieldPatterns = query.match(/(\w+):(\S+)/g) || [];
        const textSearch = query.replace(/\w+:\S+/g, '').trim().toLowerCase();

        return logs.filter(log => {
            // Check field patterns
            for (const pattern of fieldPatterns) {
                const [field, value] = pattern.split(':');
                const valueLower = value.toLowerCase();

                if (field === 'level' && log.level.toLowerCase() !== valueLower) return false;
                if (field === 'service' && !log.serviceName?.toLowerCase().includes(valueLower)) return false;
                if (field === 'logger' && !log.logger?.toLowerCase().includes(valueLower)) return false;
                if (field === 'message' && !log.message?.toLowerCase().includes(valueLower)) return false;
            }

            // Check text search
            if (textSearch) {
                const searchable = `${log.message} ${log.serviceName} ${log.logger}`.toLowerCase();
                if (!searchable.includes(textSearch)) return false;
            }

            return true;
        });
    }

    /**
     * Update stats
     */
    function updateStats() {
        const levelCounts = { ERROR: 0, WARN: 0, INFO: 0, DEBUG: 0 };
        filteredLogs.forEach(log => {
            if (levelCounts[log.level] !== undefined) {
                levelCounts[log.level]++;
            }
        });

        document.getElementById('totalLogs').textContent = filteredLogs.length;
        document.getElementById('errorCount').textContent = levelCounts.ERROR;
        document.getElementById('warnCount').textContent = levelCounts.WARN;
    }

    /**
     * Update facets using FacetFilter components
     */
    function updateFacets() {
        const colors = { ERROR: '#f04438', WARN: '#f59e0b', INFO: '#3b82f6', DEBUG: '#6b7280' };

        // Level facet
        if (levelFacet) {
            const levelCounts = { ERROR: 0, WARN: 0, INFO: 0, DEBUG: 0 };
            allLogs.forEach(log => {
                if (levelCounts[log.level] !== undefined) levelCounts[log.level]++;
            });

            levelFacet.setItems(Object.entries(levelCounts).map(([level, count]) => ({
                value: level,
                label: level,
                count: count,
                color: colors[level]
            })));
            levelFacet.setSelectedValues(currentFilters.levels);
        }

        // Service facet
        if (serviceFacet) {
            const serviceCounts = {};
            allLogs.forEach(log => {
                if (log.serviceName) {
                    serviceCounts[log.serviceName] = (serviceCounts[log.serviceName] || 0) + 1;
                }
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

        // Logger facet
        if (loggerFacet) {
            const loggerCounts = {};
            allLogs.forEach(log => {
                if (log.logger) {
                    loggerCounts[log.logger] = (loggerCounts[log.logger] || 0) + 1;
                }
            });

            const sortedLoggers = Object.entries(loggerCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 15)
                .map(([logger, count]) => ({
                    value: logger,
                    label: logger,
                    count: count
                }));

            loggerFacet.setItems(sortedLoggers);
            loggerFacet.setSelectedValues(currentFilters.loggers);
        }

        // Pod facet
        if (podFacet) {
            const podCounts = {};
            allLogs.forEach(log => {
                if (log.pod) {
                    podCounts[log.pod] = (podCounts[log.pod] || 0) + 1;
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
            allLogs.forEach(log => {
                if (log.container) {
                    containerCounts[log.container] = (containerCounts[log.container] || 0) + 1;
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
     * Update histogram
     */
    function updateHistogram() {
        const container = document.getElementById('logsHistogram');
        if (!container) return;

        const buckets = 60;
        const timeRange = currentFilters.timeRange;
        const bucketSize = timeRange / buckets;
        const now = Date.now();
        const startTime = now - timeRange;

        // Initialize buckets
        const bucketData = Array(buckets).fill(null).map(() => ({ total: 0, errors: 0 }));

        // Fill buckets
        filteredLogs.forEach(log => {
            const bucketIndex = Math.floor((log.timestamp - startTime) / bucketSize);
            if (bucketIndex >= 0 && bucketIndex < buckets) {
                bucketData[bucketIndex].total++;
                if (log.level === 'ERROR') bucketData[bucketIndex].errors++;
            }
        });

        // Find max for scaling
        const maxCount = Math.max(...bucketData.map(b => b.total), 1);

        // Render bars
        container.innerHTML = bucketData.map((bucket, i) => {
            const height = (bucket.total / maxCount) * 100;
            const hasErrors = bucket.errors > 0;
            const time = new Date(startTime + (i * bucketSize)).toLocaleTimeString();

            return `
                <div class="histogram-bar ${hasErrors ? 'has-errors' : ''}"
                     style="height: ${Math.max(height, 2)}%"
                     title="${bucket.total} logs at ${time}">
                    <div class="histogram-bar-tooltip">${bucket.total} logs<br>${time}</div>
                </div>
            `;
        }).join('');
    }

    /**
     * Render logs
     */
    function renderLogs() {
        const container = document.getElementById('logsTableBody');
        if (!container) return;

        // Render table header first
        renderTableHeader();

        // Update counts
        const displayCountEl = document.getElementById('logsDisplayCount');
        const totalCountEl = document.getElementById('logsTotalCount');
        if (totalCountEl) totalCountEl.textContent = allLogs.length;

        if (filteredLogs.length === 0) {
            container.innerHTML = '<div class="logs-loading">No logs found</div>';
            if (displayCountEl) displayCountEl.textContent = '0';
            return;
        }

        // Sort by timestamp (most recent first)
        const sorted = [...filteredLogs].sort((a, b) => b.timestamp - a.timestamp);
        const limited = sorted.slice(0, 500);

        if (displayCountEl) displayCountEl.textContent = limited.length;

        container.innerHTML = limited.map((log, index) => renderLogRow(log, index)).join('');

        // Add click handlers for expanding
        container.querySelectorAll('.log-row').forEach(row => {
            row.addEventListener('click', () => {
                row.classList.toggle('expanded');
            });
        });
    }

    /**
     * Get cell value for a column
     */
    function getCellValue(log, columnId) {
        switch (columnId) {
            case 'timestamp':
                return new Date(log.timestamp).toLocaleString();
            case 'level':
                return `<span class="log-level-badge level-${log.level.toLowerCase()}">${log.level}</span>`;
            case 'service':
                return escapeHtml(log.serviceName || '-');
            case 'logger':
                return escapeHtml(log.logger || '-');
            case 'traceId':
                return log.traceId ? `<span class="log-trace-id" title="${log.traceId}">${log.traceId.substring(0, 12)}...</span>` : '-';
            case 'spanId':
                return log.spanId ? `<span class="log-span-id">${log.spanId.substring(0, 10)}...</span>` : '-';
            case 'host':
                return escapeHtml(log.host || log.hostname || '-');
            case 'pod':
                return log.pod ? `<span title="${log.pod}">${truncate(log.pod, 20)}</span>` : '-';
            case 'container':
                return escapeHtml(log.container || '-');
            case 'thread':
                return escapeHtml(log.thread || log.threadName || '-');
            case 'duration':
                return log.duration ? `${log.duration}ms` : '-';
            case 'message':
                return escapeHtml(truncate(log.message, 120));
            default:
                return '-';
        }
    }

    /**
     * Render single log row with dynamic columns
     */
    function renderLogRow(log, index) {
        const cols = allColumns.filter(c => visibleColumns.includes(c.id));

        const cells = cols.map(col => {
            const width = col.width === 'auto' ? 'flex: 1;' : `width: ${col.width};`;
            return `<div class="log-cell cell-${col.id}" style="${width}">${getCellValue(log, col.id)}</div>`;
        }).join('');

        return `
            <div class="log-row" data-index="${index}">
                <div class="log-row-main">${cells}</div>
                <div class="log-details">
                    <div class="log-details-grid">
                        <div class="log-detail-item">
                            <span class="log-detail-label">Timestamp</span>
                            <span class="log-detail-value">${new Date(log.timestamp).toISOString()}</span>
                        </div>
                        <div class="log-detail-item">
                            <span class="log-detail-label">Level</span>
                            <span class="log-detail-value">${log.level}</span>
                        </div>
                        <div class="log-detail-item">
                            <span class="log-detail-label">Service</span>
                            <span class="log-detail-value">${log.serviceName || 'N/A'}</span>
                        </div>
                        <div class="log-detail-item">
                            <span class="log-detail-label">Logger</span>
                            <span class="log-detail-value">${log.logger || 'N/A'}</span>
                        </div>
                        ${log.traceId ? `
                        <div class="log-detail-item">
                            <span class="log-detail-label">Trace ID</span>
                            <span class="log-detail-value">${log.traceId}</span>
                        </div>
                        ` : ''}
                        ${log.spanId ? `
                        <div class="log-detail-item">
                            <span class="log-detail-label">Span ID</span>
                            <span class="log-detail-value">${log.spanId}</span>
                        </div>
                        ` : ''}
                        ${log.host || log.hostname ? `
                        <div class="log-detail-item">
                            <span class="log-detail-label">Host</span>
                            <span class="log-detail-value">${log.host || log.hostname}</span>
                        </div>
                        ` : ''}
                        ${log.pod ? `
                        <div class="log-detail-item">
                            <span class="log-detail-label">Pod</span>
                            <span class="log-detail-value">${log.pod}</span>
                        </div>
                        ` : ''}
                    </div>
                    <div class="log-full-message">${escapeHtml(log.message)}</div>
                </div>
            </div>
        `;
    }

    /**
     * Truncate text
     */
    function truncate(text, maxLength) {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    }

    /**
     * Generate mock logs for live tail
     */
    function generateMockLogs(count) {
        const levels = ['INFO', 'INFO', 'INFO', 'WARN', 'ERROR', 'DEBUG'];
        const services = ['api-gateway', 'auth-service', 'metrics-service', 'logs-service'];
        const messages = [
            'Request processed successfully',
            'User authentication completed',
            'Database query executed in 45ms',
            'Cache hit for key: user_session',
            'Connection timeout after 30s',
            'Failed to parse JSON payload',
            'Rate limit exceeded for client',
            'Health check passed'
        ];

        const logs = [];
        const now = Date.now();

        for (let i = 0; i < count; i++) {
            logs.push({
                timestamp: now - (i * 100),
                level: levels[Math.floor(Math.random() * levels.length)],
                serviceName: services[Math.floor(Math.random() * services.length)],
                message: messages[Math.floor(Math.random() * messages.length)],
                logger: 'com.observex.service.Handler',
                traceId: `trace-${Math.random().toString(36).substr(2, 16)}`
            });
        }

        return logs;
    }

    /**
     * Export logs to JSON
     */
    function exportLogs() {
        const dataStr = JSON.stringify(filteredLogs, null, 2);
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
        if (!text) return '';
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
        stopLiveTail();
    });

})();

