/**
 * TimeRangePicker Component
 * Reusable time range picker with event-driven architecture
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
        this.isOpen = false;
        
        // Bind methods
        this.handleButtonClick = this.handleButtonClick.bind(this);
        this.handleOptionClick = this.handleOptionClick.bind(this);
        this.handleOutsideClick = this.handleOutsideClick.bind(this);
        
        this.init();
    }
    
    /**
     * Load saved time range from localStorage
     */
    loadSavedRange() {
        const saved = localStorage.getItem(AppConfig.STORAGE.TIME_RANGE);
        if (saved) {
            const range = parseInt(saved, 10);
            if (!isNaN(range)) {
                return range;
            }
        }
        // Default to 1 hour
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
        
        // Render dropdown options
        this.renderOptions();
        
        // Update label
        this.updateLabel();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Store in state manager
        this.stateManager.set('filters.timeRange', this.currentRange);
    }
    
    /**
     * Render dropdown options
     */
    renderOptions() {
        this.dropdown.innerHTML = AppConfig.TIME_RANGES.map(range => `
            <button class="time-option ${range.value === this.currentRange ? 'active' : ''}" 
                    data-range="${range.value}" 
                    data-label="${range.label}">
                ${range.label}
            </button>
        `).join('');
    }
    
    /**
     * Update label text
     */
    updateLabel() {
        if (!this.label) return;
        
        const range = AppConfig.TIME_RANGES.find(r => r.value === this.currentRange);
        if (range) {
            this.label.textContent = range.label;
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Button click
        this.button.addEventListener('click', this.handleButtonClick);
        
        // Option clicks
        this.dropdown.addEventListener('click', this.handleOptionClick);
        
        // Outside clicks
        document.addEventListener('click', this.handleOutsideClick);
    }
    
    /**
     * Handle button click
     */
    handleButtonClick(e) {
        e.stopPropagation();
        this.toggle();
    }
    
    /**
     * Handle option click
     */
    handleOptionClick(e) {
        const option = e.target.closest('.time-option');
        if (!option) return;
        
        const range = parseInt(option.dataset.range, 10);
        const label = option.dataset.label;
        
        if (range === this.currentRange) {
            this.close();
            return;
        }
        
        this.setRange(range, label);
        this.close();
    }
    
    /**
     * Handle outside click
     */
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
        
        // Update UI
        this.updateLabel();
        this.renderOptions();
        
        // Save to localStorage
        localStorage.setItem(AppConfig.STORAGE.TIME_RANGE, range);
        
        // Update state manager
        this.stateManager.set('filters.timeRange', range);
        
        // Emit event
        this.eventBus.emit(Events.TIME_RANGE_CHANGED, { 
            range, 
            label,
            startTime: Date.now() - range,
            endTime: Date.now()
        });
        
        // Call onChange callback if provided
        if (this.onChange && typeof this.onChange === 'function') {
            this.onChange(range, label);
        }
        
        console.log(`[TimeRangePicker] Range changed to: ${label} (${range}ms)`);
    }
    
    /**
     * Get current range
     */
    getRange() {
        return this.currentRange;
    }
    
    /**
     * Get time bounds
     */
    getTimeBounds() {
        return {
            startTime: Date.now() - this.currentRange,
            endTime: Date.now()
        };
    }
    
    /**
     * Toggle dropdown
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    /**
     * Open dropdown
     */
    open() {
        this.dropdown.classList.add('active');
        this.button.classList.add('active');
        this.isOpen = true;
    }
    
    /**
     * Close dropdown
     */
    close() {
        this.dropdown.classList.remove('active');
        this.button.classList.remove('active');
        this.isOpen = false;
    }
    
    /**
     * Destroy component
     */
    destroy() {
        this.button.removeEventListener('click', this.handleButtonClick);
        this.dropdown.removeEventListener('click', this.handleOptionClick);
        document.removeEventListener('click', this.handleOutsideClick);
    }
}

// Make available globally
window.TimeRangePicker = TimeRangePicker;

