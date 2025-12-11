/**
 * Logs Page - New Relic Style
 * Enterprise-level log exploration and analysis
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
        levels: [],
        services: [],
        loggers: [],
        pods: [],
        containers: [],
        timeRange: 3600000 // 1 hour
    };
    let liveTailInterval = null;
    let allLogs = [];
    let filteredLogs = [];
    let isLiveTailActive = false;
    let autoRefresh = null;

    // Pagination state
    const PAGE_SIZE = 100;
    let currentOffset = 0;
    let hasMoreLogs = true;
    let isLoadingMore = false;
    let currentTimeRange = { startTime: null, endTime: null };

    // FacetFilter instances
    let levelFacet = null;
    let serviceFacet = null;
    let loggerFacet = null;
    let podFacet = null;
    let containerFacet = null;

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

        // Setup UI using PageUtils
        PageUtils.setupTeamSelector();
        const timePicker = PageUtils.setupTimePicker();
        if (timePicker) {
            currentFilters.timeRange = timePicker.getRange();
        }

        // Setup auto-refresh using PageUtils
        autoRefresh = PageUtils.setupAutoRefresh({ onRefresh: loadLogs });

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
            autoRefresh.start();
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

    // Column widths state (persisted)
    const COLUMN_WIDTHS_KEY = 'observability_logs_column_widths';
    let columnWidths = loadColumnWidths();

    function loadColumnWidths() {
        try {
            const saved = localStorage.getItem(COLUMN_WIDTHS_KEY);
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            return {};
        }
    }

    function saveColumnWidths() {
        localStorage.setItem(COLUMN_WIDTHS_KEY, JSON.stringify(columnWidths));
    }

    /**
     * Render table header based on visible columns with resize handles
     */
    function renderTableHeader() {
        const header = document.getElementById('logsTableHeader');
        if (!header) return;

        const cols = allColumns.filter(c => visibleColumns.includes(c.id));
        header.innerHTML = cols.map((col, index) => {
            const width = columnWidths[col.id] || col.width;
            const isLast = index === cols.length - 1;
            const isAutoWidth = width === 'auto' || col.id === 'message';

            return `<div class="logs-table-col col-${col.id} resizable-col"
                         data-col-id="${col.id}"
                         style="width: ${isAutoWidth ? 'auto' : width}; ${isAutoWidth ? 'flex: 1; min-width: 150px;' : 'flex-shrink: 0;'}">
                <span class="col-label">${col.label}</span>
                ${!isLast ? '<div class="col-resize-handle" data-col-id="' + col.id + '"></div>' : ''}
            </div>`;
        }).join('');

        // Setup resize handlers
        setupColumnResizeHandlers();
    }

    /**
     * Setup column resize drag handlers
     */
    function setupColumnResizeHandlers() {
        const header = document.getElementById('logsTableHeader');
        if (!header) return;

        const handles = header.querySelectorAll('.col-resize-handle');

        handles.forEach(handle => {
            handle.addEventListener('mousedown', startResize);
        });
    }

    let resizeState = null;

    function startResize(e) {
        e.preventDefault();
        e.stopPropagation();

        const colId = e.target.dataset.colId;
        const colEl = document.querySelector(`.logs-table-col[data-col-id="${colId}"]`);
        if (!colEl) return;

        resizeState = {
            colId,
            colEl,
            startX: e.clientX,
            startWidth: colEl.offsetWidth
        };

        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }

    function doResize(e) {
        if (!resizeState) return;

        const diff = e.clientX - resizeState.startX;
        const newWidth = Math.max(50, resizeState.startWidth + diff);

        resizeState.colEl.style.width = newWidth + 'px';
        resizeState.colEl.style.flex = 'none';

        // Also update corresponding cells in the body
        const bodyCells = document.querySelectorAll(`.log-cell.cell-${resizeState.colId}`);
        bodyCells.forEach(cell => {
            cell.style.width = newWidth + 'px';
            cell.style.flex = 'none';
        });
    }

    function stopResize(e) {
        if (!resizeState) return;

        // Save the new width
        const finalWidth = resizeState.colEl.offsetWidth;
        columnWidths[resizeState.colId] = finalWidth + 'px';
        saveColumnWidths();

        resizeState = null;
        document.removeEventListener('mousemove', doResize);
        document.removeEventListener('mouseup', stopResize);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }

    // setupTeamSelector, setupTimePicker and setupAutoRefresh are now handled by PageUtils in init()

    /**
     * Handle team change
     */
    function handleTeamChange(team) {
        console.log('[Logs] Team changed:', team);
        loadLogs();
    }

    /**
     * Handle time range change
     */
    function handleTimeRangeChange(data) {
        console.log('[Logs] Time range changed:', data);
        currentFilters.timeRange = data.range;
        loadLogs();
    }

    // Query autocomplete configuration
    const queryFields = [
        { field: 'level', label: 'Level', description: 'Log level (ERROR, WARN, INFO, DEBUG)', values: ['ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE'] },
        { field: 'service', label: 'Service', description: 'Service name' },
        { field: 'trace-id', label: 'Trace ID', description: 'Distributed trace identifier' },
        { field: 'span-id', label: 'Span ID', description: 'Span identifier' },
        { field: 'logger', label: 'Logger', description: 'Logger class name' },
        { field: 'message', label: 'Message', description: 'Log message content' },
        { field: 'pod', label: 'Pod', description: 'Kubernetes pod name' },
        { field: 'container', label: 'Container', description: 'Container name' },
        { field: 'host', label: 'Host', description: 'Hostname' }
    ];

    const queryOperators = [
        { op: ':', label: 'equals', description: 'Exact match', example: 'level:ERROR' },
        { op: ':!', label: 'not equals', description: 'Does not equal', example: 'level:!DEBUG' },
        { op: ':~', label: 'contains', description: 'Contains substring', example: 'message:~timeout' },
        { op: ':>', label: 'greater than', description: 'Greater than (for numeric)', example: 'duration:>100' },
        { op: ':<', label: 'less than', description: 'Less than (for numeric)', example: 'duration:<50' }
    ];

    let autocompleteState = {
        visible: false,
        selectedIndex: 0,
        items: [],
        mode: 'field' // 'field', 'operator', 'value'
    };

    /**
     * Setup query bar with autocomplete
     */
    function setupQueryBar() {
        const queryInput = document.getElementById('queryInput');
        const runQueryBtn = document.getElementById('runQueryBtn');
        const autocomplete = document.getElementById('queryAutocomplete');

        if (queryInput) {
            queryInput.addEventListener('keydown', handleQueryKeydown);
            queryInput.addEventListener('input', handleQueryInput);
            queryInput.addEventListener('blur', () => {
                // Delay hide to allow click on autocomplete items
                setTimeout(() => hideAutocomplete(), 150);
            });
            queryInput.addEventListener('focus', () => {
                if (queryInput.value === '') {
                    showFieldSuggestions();
                }
            });
        }

        if (runQueryBtn) {
            runQueryBtn.addEventListener('click', runQuery);
        }
    }

    /**
     * Handle query input keydown for navigation
     */
    function handleQueryKeydown(e) {
        const autocomplete = document.getElementById('queryAutocomplete');

        if (!autocompleteState.visible) {
            if (e.key === 'Enter') {
                runQuery();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                autocompleteState.selectedIndex = Math.min(
                    autocompleteState.selectedIndex + 1,
                    autocompleteState.items.length - 1
                );
                renderAutocomplete();
                break;
            case 'ArrowUp':
                e.preventDefault();
                autocompleteState.selectedIndex = Math.max(autocompleteState.selectedIndex - 1, 0);
                renderAutocomplete();
                break;
            case 'Enter':
            case 'Tab':
                e.preventDefault();
                selectAutocompleteItem(autocompleteState.selectedIndex);
                break;
            case 'Escape':
                hideAutocomplete();
                break;
        }
    }

    /**
     * Handle query input changes
     */
    function handleQueryInput(e) {
        const value = e.target.value;
        const cursorPos = e.target.selectionStart;

        // Get the current token being typed
        const beforeCursor = value.substring(0, cursorPos);
        const tokens = beforeCursor.split(/\s+/);
        const currentToken = tokens[tokens.length - 1] || '';

        if (currentToken === '') {
            showFieldSuggestions();
            return;
        }

        // Check if we're typing a field name
        const colonIndex = currentToken.indexOf(':');

        if (colonIndex === -1) {
            // Still typing field name
            showFieldSuggestions(currentToken);
        } else {
            // After colon - show operators or values
            const fieldName = currentToken.substring(0, colonIndex);
            const afterColon = currentToken.substring(colonIndex + 1);

            // Check for operator prefix
            if (afterColon === '' || afterColon === '!' || afterColon === '~' || afterColon === '>' || afterColon === '<') {
                showOperatorSuggestions(fieldName, afterColon);
            } else {
                // Show value suggestions if available
                showValueSuggestions(fieldName, afterColon);
            }
        }
    }

    /**
     * Show field name suggestions
     */
    function showFieldSuggestions(filter = '') {
        const filterLower = filter.toLowerCase();
        autocompleteState.items = queryFields
            .filter(f => f.field.toLowerCase().includes(filterLower) || f.label.toLowerCase().includes(filterLower))
            .map(f => ({
                type: 'field',
                value: f.field,
                label: f.field,
                description: f.description,
                insert: f.field + ':'
            }));

        autocompleteState.mode = 'field';
        autocompleteState.selectedIndex = 0;

        if (autocompleteState.items.length > 0) {
            showAutocomplete();
        } else {
            hideAutocomplete();
        }
    }

    /**
     * Show operator suggestions
     */
    function showOperatorSuggestions(fieldName, currentOp) {
        autocompleteState.items = queryOperators
            .filter(o => o.op.startsWith(':' + currentOp) || currentOp === '')
            .map(o => ({
                type: 'operator',
                value: o.op,
                label: `${fieldName}${o.op}`,
                description: `${o.label} - ${o.description}`,
                insert: o.op.substring(1 + currentOp.length), // Insert remaining part
                example: o.example
            }));

        autocompleteState.mode = 'operator';
        autocompleteState.selectedIndex = 0;

        if (autocompleteState.items.length > 0) {
            showAutocomplete();
        } else {
            hideAutocomplete();
        }
    }

    /**
     * Show value suggestions for fields with predefined values
     */
    function showValueSuggestions(fieldName, currentValue) {
        const field = queryFields.find(f => f.field === fieldName);

        if (!field || !field.values) {
            hideAutocomplete();
            return;
        }

        const filterLower = currentValue.toLowerCase();
        autocompleteState.items = field.values
            .filter(v => v.toLowerCase().includes(filterLower))
            .map(v => ({
                type: 'value',
                value: v,
                label: v,
                description: `${fieldName} = ${v}`,
                insert: v.substring(currentValue.length)
            }));

        autocompleteState.mode = 'value';
        autocompleteState.selectedIndex = 0;

        if (autocompleteState.items.length > 0) {
            showAutocomplete();
        } else {
            hideAutocomplete();
        }
    }

    /**
     * Show autocomplete dropdown
     */
    function showAutocomplete() {
        autocompleteState.visible = true;
        renderAutocomplete();
    }

    /**
     * Hide autocomplete dropdown
     */
    function hideAutocomplete() {
        autocompleteState.visible = false;
        const autocomplete = document.getElementById('queryAutocomplete');
        if (autocomplete) {
            autocomplete.style.display = 'none';
        }
    }

    /**
     * Render autocomplete dropdown
     */
    function renderAutocomplete() {
        const autocomplete = document.getElementById('queryAutocomplete');
        if (!autocomplete) return;

        if (!autocompleteState.visible || autocompleteState.items.length === 0) {
            autocomplete.style.display = 'none';
            return;
        }

        autocomplete.style.display = 'block';
        autocomplete.innerHTML = `
            <div class="autocomplete-header">
                ${autocompleteState.mode === 'field' ? 'Fields' : autocompleteState.mode === 'operator' ? 'Operators' : 'Values'}
            </div>
            ${autocompleteState.items.map((item, index) => `
                <div class="autocomplete-item ${index === autocompleteState.selectedIndex ? 'selected' : ''}"
                     data-index="${index}"
                     onmousedown="window.selectQueryAutocomplete(${index})">
                    <div class="autocomplete-item-main">
                        <span class="autocomplete-item-label">${escapeHtml(item.label)}</span>
                        ${item.example ? `<span class="autocomplete-item-example">${escapeHtml(item.example)}</span>` : ''}
                    </div>
                    <div class="autocomplete-item-desc">${escapeHtml(item.description)}</div>
                </div>
            `).join('')}
        `;
    }

    /**
     * Select autocomplete item (exposed globally for onclick)
     */
    window.selectQueryAutocomplete = function(index) {
        selectAutocompleteItem(index);
    };

    /**
     * Select an autocomplete item
     */
    function selectAutocompleteItem(index) {
        const item = autocompleteState.items[index];
        if (!item) return;

        const queryInput = document.getElementById('queryInput');
        const value = queryInput.value;
        const cursorPos = queryInput.selectionStart;

        // Insert the completion
        const beforeCursor = value.substring(0, cursorPos);
        const afterCursor = value.substring(cursorPos);

        let newValue, newCursorPos;

        if (item.type === 'field') {
            // Replace current token with field:
            const tokens = beforeCursor.split(/\s+/);
            tokens[tokens.length - 1] = item.insert;
            newValue = tokens.join(' ') + afterCursor;
            newCursorPos = tokens.join(' ').length;
        } else {
            // Append the insert text
            newValue = beforeCursor + item.insert + afterCursor;
            newCursorPos = cursorPos + item.insert.length;
        }

        queryInput.value = newValue;
        queryInput.setSelectionRange(newCursorPos, newCursorPos);
        queryInput.focus();

        // Continue showing suggestions if we just inserted a field
        if (item.type === 'field') {
            showOperatorSuggestions(item.value, '');
        } else {
            hideAutocomplete();
        }
    }

    /**
     * Run query
     */
    function runQuery() {
        hideAutocomplete();
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
     * Load logs data (initial load)
     */
    async function loadLogs() {
        try {
            // Reset pagination state
            currentOffset = 0;
            hasMoreLogs = true;
            allLogs = [];

            const endTime = Date.now();
            const startTime = endTime - currentFilters.timeRange;

            // Store time range for subsequent loads
            currentTimeRange = { startTime, endTime };

            // Use team-specific endpoint with pagination
            const data = await apiService.fetchTeamLogs({
                startTime,
                endTime,
                limit: PAGE_SIZE,
                offset: 0
            });

            allLogs = data.logs || [];
            hasMoreLogs = data.hasMore !== false && allLogs.length >= PAGE_SIZE;
            currentOffset = allLogs.length;

            // Apply filters and render
            applyFilters();

            // Update facets
            updateFacets();

            // Update histogram
            updateHistogram();

            // Setup infinite scroll
            setupInfiniteScroll();

        } catch (error) {
            console.error('Error loading logs:', error);
            notificationManager.error('Failed to load logs');
        }
    }

    /**
     * Load more logs (pagination)
     */
    async function loadMoreLogs() {
        if (isLoadingMore || !hasMoreLogs) return;

        isLoadingMore = true;
        showLoadingIndicator();

        try {
            const data = await apiService.fetchTeamLogs({
                startTime: currentTimeRange.startTime,
                endTime: currentTimeRange.endTime,
                limit: PAGE_SIZE,
                offset: currentOffset
            });

            const newLogs = data.logs || [];

            if (newLogs.length > 0) {
                allLogs = [...allLogs, ...newLogs];
                currentOffset += newLogs.length;
                hasMoreLogs = data.hasMore !== false && newLogs.length >= PAGE_SIZE;

                // Re-apply filters and render
                applyFilters();
            } else {
                hasMoreLogs = false;
            }

        } catch (error) {
            console.error('Error loading more logs:', error);
            notificationManager.error('Failed to load more logs');
        } finally {
            isLoadingMore = false;
            hideLoadingIndicator();
        }
    }

    /**
     * Setup infinite scroll on logs table body
     */
    function setupInfiniteScroll() {
        const scrollWrapper = document.querySelector('.logs-table-scroll-wrapper');
        if (!scrollWrapper) return;

        // Remove existing listener if any
        scrollWrapper.removeEventListener('scroll', handleScroll);
        scrollWrapper.addEventListener('scroll', handleScroll);
    }

    /**
     * Handle scroll event for infinite scroll
     */
    function handleScroll(e) {
        const element = e.target;
        const scrollBottom = element.scrollHeight - element.scrollTop - element.clientHeight;

        // Load more when within 200px of bottom
        if (scrollBottom < 200 && hasMoreLogs && !isLoadingMore) {
            loadMoreLogs();
        }
    }

    /**
     * Show loading indicator at bottom of logs
     */
    function showLoadingIndicator() {
        const container = document.getElementById('logsTableBody');
        if (!container) return;

        // Remove existing indicator
        const existing = container.querySelector('.logs-loading-more');
        if (existing) existing.remove();

        const indicator = document.createElement('div');
        indicator.className = 'logs-loading-more';
        indicator.innerHTML = '<span class="loading-spinner"></span> Loading more logs...';
        container.appendChild(indicator);
    }

    /**
     * Hide loading indicator
     */
    function hideLoadingIndicator() {
        const indicator = document.querySelector('.logs-loading-more');
        if (indicator) indicator.remove();
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
     * Filter logs by query string with advanced operators
     * Supports: field:value (equals), field:!value (not equals), field:~value (contains)
     */
    function filterByQuery(logs, query) {
        // Parse query for field:operator:value patterns
        // Matches: field:value, field:!value, field:~value, field:>value, field:<value
        const fieldPatterns = query.match(/([\w-]+):([\!\~\>\<]?)(\S+)/g) || [];
        const textSearch = query.replace(/([\w-]+):([\!\~\>\<]?)(\S+)/g, '').trim().toLowerCase();

        return logs.filter(log => {
            // Check field patterns
            for (const pattern of fieldPatterns) {
                const match = pattern.match(/([\w-]+):([\!\~\>\<]?)(.+)/);
                if (!match) continue;

                const [, field, operator, value] = match;
                const valueLower = value.toLowerCase();

                // Get the log field value
                const logValue = getLogFieldValue(log, field);
                if (logValue === null || logValue === undefined) continue;

                const logValueLower = String(logValue).toLowerCase();

                // Apply operator
                let matches = false;
                switch (operator) {
                    case '!': // not equals
                        matches = !logValueLower.includes(valueLower);
                        break;
                    case '~': // contains
                        matches = logValueLower.includes(valueLower);
                        break;
                    case '>': // greater than
                        matches = parseFloat(logValue) > parseFloat(value);
                        break;
                    case '<': // less than
                        matches = parseFloat(logValue) < parseFloat(value);
                        break;
                    default: // equals (exact match for level, contains for others)
                        if (field === 'level') {
                            matches = logValueLower === valueLower;
                        } else {
                            matches = logValueLower.includes(valueLower);
                        }
                }

                if (!matches) return false;
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
     * Get log field value by field name
     */
    function getLogFieldValue(log, field) {
        const fieldMap = {
            'level': log.level,
            'service': log.serviceName,
            'logger': log.logger,
            'message': log.message,
            'trace-id': log.traceId,
            'span-id': log.spanId,
            'pod': log.pod,
            'container': log.container,
            'host': log.host || log.hostname,
            'duration': log.duration
        };
        return fieldMap[field] || log[field];
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
            const savedWidth = columnWidths[col.id];
            const isAutoWidth = col.id === 'message' || col.width === 'auto';
            let style;

            if (savedWidth) {
                style = `width: ${savedWidth}; flex-shrink: 0;`;
            } else if (isAutoWidth) {
                style = 'flex: 1; min-width: 150px;';
            } else {
                style = `width: ${col.width}; flex-shrink: 0;`;
            }

            return `<div class="log-cell cell-${col.id}" style="${style}">${getCellValue(log, col.id)}</div>`;
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

    // Use PageUtils for common helper functions
    const escapeHtml = PageUtils.escapeHtml;
    const formatTimestamp = PageUtils.formatTimestamp;
    const debounce = PageUtils.debounce;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (autoRefresh) autoRefresh.cleanup();
        stopLiveTail();
    });

})();

