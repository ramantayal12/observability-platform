/**
 * TimeRangePicker Component - Enterprise Edition
 * New Relic-style time range picker with tabs, presets, and custom date range
 * Emits TIME_RANGE_CHANGED event when selection changes
 */

class TimeRangePicker {
    constructor(options = {}) {
        this.containerId = options.containerId || 'timeRangePicker';
        this.buttonId = options.buttonId || 'timePickerBtn';
        this.dropdownId = options.dropdownId || 'timePickerDropdown';
        this.labelId = options.labelId || 'timePickerLabel';
        this.onChange = options.onChange || null;

        // Get singleton instances
        this.eventBus = EventBus.getInstance();
        this.stateManager = StateManager.getInstance();

        // Current state
        this.currentRange = this.loadSavedRange();
        this.customStartTime = null;
        this.customEndTime = null;
        this.isCustomRange = false;
        this.isOpen = false;
        this.activeTab = 'relative'; // 'relative' or 'absolute'

        // Preset categories
        this.presetCategories = [
            {
                label: 'Quick',
                presets: [
                    { label: '5m', value: 5 * 60 * 1000, key: '5m' },
                    { label: '15m', value: 15 * 60 * 1000, key: '15m' },
                    { label: '30m', value: 30 * 60 * 1000, key: '30m' },
                    { label: '1h', value: 60 * 60 * 1000, key: '1h' },
                    { label: '3h', value: 3 * 60 * 60 * 1000, key: '3h' },
                    { label: '6h', value: 6 * 60 * 60 * 1000, key: '6h' }
                ]
            },
            {
                label: 'Extended',
                presets: [
                    { label: '12h', value: 12 * 60 * 60 * 1000, key: '12h' },
                    { label: '24h', value: 24 * 60 * 60 * 1000, key: '24h' },
                    { label: '2d', value: 2 * 24 * 60 * 60 * 1000, key: '2d' },
                    { label: '7d', value: 7 * 24 * 60 * 60 * 1000, key: '7d' },
                    { label: '14d', value: 14 * 24 * 60 * 60 * 1000, key: '14d' },
                    { label: '30d', value: 30 * 24 * 60 * 60 * 1000, key: '30d' }
                ]
            }
        ];

        // Bind methods
        this.handleButtonClick = this.handleButtonClick.bind(this);
        this.handleOutsideClick = this.handleOutsideClick.bind(this);

        this.init();
    }

    /**
     * Load saved time range from localStorage
     */
    loadSavedRange() {
        const saved = localStorage.getItem(AppConfig.STORAGE.TIME_RANGE);
        if (saved) {
            // Check if it's a custom range object
            try {
                const parsed = JSON.parse(saved);
                if (parsed.isCustom) {
                    this.isCustomRange = true;
                    this.customStartTime = parsed.startTime;
                    this.customEndTime = parsed.endTime;
                    return parsed.endTime - parsed.startTime;
                }
            } catch (e) {
                // Not JSON, treat as number
            }
            const range = parseInt(saved, 10);
            if (!isNaN(range)) {
                return range;
            }
        }
        return 60 * 60 * 1000;
    }

    /**
     * Initialize the component
     */
    init() {
        this.button = document.getElementById(this.buttonId);
        this.dropdown = document.getElementById(this.dropdownId);
        this.label = document.getElementById(this.labelId);

        if (!this.button || !this.dropdown) {
            console.warn('TimeRangePicker: Required elements not found');
            return;
        }

        // Render enhanced dropdown
        this.renderDropdown();
        this.updateLabel();
        this.setupEventListeners();
        this.stateManager.set('filters.timeRange', this.currentRange);
    }

    /**
     * Render enhanced dropdown with tabs
     */
    renderDropdown() {
        this.dropdown.innerHTML = `
            <div class="time-picker-panel">
                <div class="time-picker-tabs">
                    <button class="time-picker-tab ${this.activeTab === 'relative' ? 'active' : ''}" data-tab="relative">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                            <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/>
                        </svg>
                        Relative
                    </button>
                    <button class="time-picker-tab ${this.activeTab === 'absolute' ? 'active' : ''}" data-tab="absolute">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
                        </svg>
                        Absolute
                    </button>
                </div>

                <div class="time-picker-content">
                    <div class="time-picker-pane ${this.activeTab === 'relative' ? 'active' : ''}" data-pane="relative">
                        ${this.renderRelativePane()}
                    </div>
                    <div class="time-picker-pane ${this.activeTab === 'absolute' ? 'active' : ''}" data-pane="absolute">
                        ${this.renderAbsolutePane()}
                    </div>
                </div>

                <div class="time-picker-footer">
                    <div class="time-picker-current">
                        <span class="current-label">Current:</span>
                        <span class="current-value" id="timePickerCurrentValue">${this.getCurrentRangeDisplay()}</span>
                    </div>
                    <div class="time-picker-actions">
                        <button class="btn btn-sm btn-secondary" id="timePickerCancel">Cancel</button>
                        <button class="btn btn-sm btn-primary" id="timePickerApply">Apply</button>
                    </div>
                </div>
            </div>
        `;

        this.setupDropdownListeners();
    }

    /**
     * Render relative time pane
     */
    renderRelativePane() {
        return `
            <div class="time-presets-grid">
                ${this.presetCategories.map(cat => `
                    <div class="preset-category">
                        <div class="preset-category-label">${cat.label}</div>
                        <div class="preset-buttons">
                            ${cat.presets.map(p => `
                                <button class="preset-btn ${!this.isCustomRange && p.value === this.currentRange ? 'active' : ''}"
                                        data-range="${p.value}" data-label="Last ${p.label}">
                                    ${p.label}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="custom-relative">
                <div class="custom-relative-label">Custom relative time</div>
                <div class="custom-relative-inputs">
                    <span>Last</span>
                    <input type="number" class="custom-relative-value" id="customRelativeValue" value="1" min="1" max="999">
                    <select class="custom-relative-unit" id="customRelativeUnit">
                        <option value="60000">minutes</option>
                        <option value="3600000" selected>hours</option>
                        <option value="86400000">days</option>
                        <option value="604800000">weeks</option>
                    </select>
                    <button class="btn btn-sm btn-secondary" id="applyCustomRelative">Apply</button>
                </div>
            </div>
        `;
    }

    /**
     * Render absolute time pane
     */
    renderAbsolutePane() {
        const now = new Date();
        const startDefault = this.customStartTime ? new Date(this.customStartTime) : new Date(now - this.currentRange);
        const endDefault = this.customEndTime ? new Date(this.customEndTime) : now;

        const formatDateTime = (d) => {
            return d.toISOString().slice(0, 16);
        };

        return `
            <div class="absolute-time-inputs">
                <div class="absolute-time-group">
                    <label class="absolute-time-label">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                        </svg>
                        Start Time
                    </label>
                    <input type="datetime-local" class="absolute-time-input" id="absoluteStartTime" value="${formatDateTime(startDefault)}">
                </div>
                <div class="absolute-time-separator">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path fill-rule="evenodd" d="M1 8a.5.5 0 0 1 .5-.5h11.793l-3.147-3.146a.5.5 0 0 1 .708-.708l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 0 1-.708-.708L13.293 8.5H1.5A.5.5 0 0 1 1 8z"/>
                    </svg>
                </div>
                <div class="absolute-time-group">
                    <label class="absolute-time-label">
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/>
                        </svg>
                        End Time
                    </label>
                    <input type="datetime-local" class="absolute-time-input" id="absoluteEndTime" value="${formatDateTime(endDefault)}">
                </div>
            </div>
            <div class="absolute-quick-ranges">
                <div class="quick-ranges-label">Quick ranges</div>
                <div class="quick-ranges-buttons">
                    <button class="quick-range-btn" data-quick="today">Today</button>
                    <button class="quick-range-btn" data-quick="yesterday">Yesterday</button>
                    <button class="quick-range-btn" data-quick="thisWeek">This Week</button>
                    <button class="quick-range-btn" data-quick="lastWeek">Last Week</button>
                    <button class="quick-range-btn" data-quick="thisMonth">This Month</button>
                </div>
            </div>
        `;
    }

    /**
     * Get current range display text
     */
    getCurrentRangeDisplay() {
        if (this.isCustomRange && this.customStartTime && this.customEndTime) {
            const start = new Date(this.customStartTime);
            const end = new Date(this.customEndTime);
            return `${start.toLocaleDateString()} ${start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${end.toLocaleDateString()} ${end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        }

        const allPresets = this.presetCategories.flatMap(c => c.presets);
        const preset = allPresets.find(p => p.value === this.currentRange);
        if (preset) {
            return `Last ${preset.label}`;
        }

        // Format custom relative
        const hours = this.currentRange / 3600000;
        if (hours < 1) return `Last ${Math.round(this.currentRange / 60000)} minutes`;
        if (hours < 24) return `Last ${Math.round(hours)} hours`;
        return `Last ${Math.round(hours / 24)} days`;
    }

    /**
     * Setup dropdown event listeners
     */
    setupDropdownListeners() {
        // Tab switching
        this.dropdown.querySelectorAll('.time-picker-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.activeTab = e.target.closest('.time-picker-tab').dataset.tab;
                this.dropdown.querySelectorAll('.time-picker-tab').forEach(t => t.classList.remove('active'));
                e.target.closest('.time-picker-tab').classList.add('active');
                this.dropdown.querySelectorAll('.time-picker-pane').forEach(p => p.classList.remove('active'));
                this.dropdown.querySelector(`[data-pane="${this.activeTab}"]`).classList.add('active');
            });
        });

        // Preset buttons
        this.dropdown.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const range = parseInt(e.target.dataset.range, 10);
                const label = e.target.dataset.label;
                this.selectPreset(range, label);
            });
        });

        // Custom relative apply
        const applyCustomRelative = this.dropdown.querySelector('#applyCustomRelative');
        if (applyCustomRelative) {
            applyCustomRelative.addEventListener('click', () => {
                const value = parseInt(this.dropdown.querySelector('#customRelativeValue').value, 10);
                const unit = parseInt(this.dropdown.querySelector('#customRelativeUnit').value, 10);
                const range = value * unit;
                this.selectPreset(range, `Last ${value} ${this.getUnitLabel(unit, value)}`);
            });
        }

        // Quick range buttons
        this.dropdown.querySelectorAll('.quick-range-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const quick = e.target.dataset.quick;
                this.applyQuickRange(quick);
            });
        });

        // Cancel button
        const cancelBtn = this.dropdown.querySelector('#timePickerCancel');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.close());
        }

        // Apply button
        const applyBtn = this.dropdown.querySelector('#timePickerApply');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyAbsoluteRange());
        }
    }

    /**
     * Get unit label
     */
    getUnitLabel(unit, value) {
        const labels = {
            60000: value === 1 ? 'minute' : 'minutes',
            3600000: value === 1 ? 'hour' : 'hours',
            86400000: value === 1 ? 'day' : 'days',
            604800000: value === 1 ? 'week' : 'weeks'
        };
        return labels[unit] || 'units';
    }

    /**
     * Select a preset
     */
    selectPreset(range, label) {
        this.isCustomRange = false;
        this.customStartTime = null;
        this.customEndTime = null;
        this.setRange(range, label);
        this.close();
    }

    /**
     * Apply quick range
     */
    applyQuickRange(quick) {
        const now = new Date();
        let start, end;

        switch (quick) {
            case 'today':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                end = now;
                break;
            case 'yesterday':
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'thisWeek':
                const dayOfWeek = now.getDay();
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
                end = now;
                break;
            case 'lastWeek':
                const lastWeekDay = now.getDay();
                start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - lastWeekDay - 7);
                end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - lastWeekDay);
                break;
            case 'thisMonth':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = now;
                break;
            default:
                return;
        }

        // Update the datetime inputs
        const startInput = this.dropdown.querySelector('#absoluteStartTime');
        const endInput = this.dropdown.querySelector('#absoluteEndTime');
        if (startInput) startInput.value = start.toISOString().slice(0, 16);
        if (endInput) endInput.value = end.toISOString().slice(0, 16);
    }

    /**
     * Apply absolute range
     */
    applyAbsoluteRange() {
        const startInput = this.dropdown.querySelector('#absoluteStartTime');
        const endInput = this.dropdown.querySelector('#absoluteEndTime');

        if (!startInput || !endInput) return;

        const startTime = new Date(startInput.value).getTime();
        const endTime = new Date(endInput.value).getTime();

        if (isNaN(startTime) || isNaN(endTime) || startTime >= endTime) {
            console.warn('Invalid time range');
            return;
        }

        this.isCustomRange = true;
        this.customStartTime = startTime;
        this.customEndTime = endTime;
        this.currentRange = endTime - startTime;

        const label = this.getCurrentRangeDisplay();

        // Save custom range
        localStorage.setItem(AppConfig.STORAGE.TIME_RANGE, JSON.stringify({
            isCustom: true,
            startTime,
            endTime
        }));

        this.updateLabel();
        this.stateManager.set('filters.timeRange', this.currentRange);

        this.eventBus.emit(Events.TIME_RANGE_CHANGED, {
            range: this.currentRange,
            label,
            startTime,
            endTime,
            isCustom: true
        });

        if (this.onChange) this.onChange(this.currentRange, label);

        this.close();
    }

    /**
     * Update label text
     */
    updateLabel() {
        if (!this.label) return;
        this.label.textContent = this.getCurrentRangeDisplay();
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.button.addEventListener('click', this.handleButtonClick);
        document.addEventListener('click', this.handleOutsideClick);
    }

    handleButtonClick(e) {
        e.stopPropagation();
        this.toggle();
    }

    handleOutsideClick(e) {
        if (!this.button.contains(e.target) && !this.dropdown.contains(e.target)) {
            this.close();
        }
    }

    /**
     * Set time range
     */
    setRange(range, label) {
        this.currentRange = range;
        this.updateLabel();
        localStorage.setItem(AppConfig.STORAGE.TIME_RANGE, range);
        this.stateManager.set('filters.timeRange', range);

        this.eventBus.emit(Events.TIME_RANGE_CHANGED, {
            range,
            label,
            startTime: Date.now() - range,
            endTime: Date.now()
        });

        if (this.onChange) this.onChange(range, label);
        console.log(`[TimeRangePicker] Range changed to: ${label} (${range}ms)`);
    }

    getRange() { return this.currentRange; }

    getTimeBounds() {
        if (this.isCustomRange && this.customStartTime && this.customEndTime) {
            return { startTime: this.customStartTime, endTime: this.customEndTime };
        }
        return { startTime: Date.now() - this.currentRange, endTime: Date.now() };
    }

    toggle() { this.isOpen ? this.close() : this.open(); }

    open() {
        this.renderDropdown();
        this.dropdown.classList.add('active');
        this.button.classList.add('active');
        this.isOpen = true;
    }

    close() {
        this.dropdown.classList.remove('active');
        this.button.classList.remove('active');
        this.isOpen = false;
    }

    destroy() {
        this.button.removeEventListener('click', this.handleButtonClick);
        document.removeEventListener('click', this.handleOutsideClick);
    }
}

// Make available globally
window.TimeRangePicker = TimeRangePicker;

