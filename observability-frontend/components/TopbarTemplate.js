/**
 * Topbar Template
 * Reusable function to generate consistent topbar HTML across all pages
 */
window.TopbarTemplate = {
    /**
     * Generate topbar HTML
     * @param {Object} options - Configuration options
     * @param {boolean} options.showTimePicker - Show time range picker (default: true)
     * @param {boolean} options.showRefresh - Show refresh button (default: true)
     * @returns {string} HTML string for the topbar
     */
    generate: function(options = {}) {
        const showTimePicker = options.showTimePicker !== false;
        const showRefresh = options.showRefresh !== false;
        
        return `
        <!-- Top Bar -->
        <header class="topbar">
            <div class="topbar-left">
                <div class="logo">
                    <div class="logo-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                            <circle cx="12" cy="12" r="3" fill="currentColor"/>
                        </svg>
                    </div>
                    <span class="logo-text">ObserveX</span>
                </div>
            </div>

            <div class="topbar-right">
                ${showTimePicker ? this.renderTimePicker() : ''}
                ${showRefresh ? this.renderRefreshButton() : ''}
            </div>
        </header>
        `;
    },
    
    renderTimePicker: function() {
        return `
                <!-- Time Picker -->
                <div class="time-picker">
                    <button class="btn btn-secondary btn-sm" id="timePickerBtn">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M8 2a6 6 0 100 12A6 6 0 008 2zm0 11a5 5 0 110-10 5 5 0 010 10zm.5-8H7.5v4l3.5 2 .5-1-3-1.5V5z"/>
                        </svg>
                        <span id="timePickerLabel">Last 1 hour</span>
                    </button>
                    <div class="time-picker-dropdown" id="timePickerDropdown">
                        <!-- Populated by JS -->
                    </div>
                </div>
        `;
    },
    
    renderRefreshButton: function() {
        return `
                <!-- Auto Refresh -->
                <button class="btn btn-icon btn-sm" id="autoRefreshBtn" title="Auto Refresh">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 2a6 6 0 00-6 6h2a4 4 0 014-4V2zm0 12a6 6 0 006-6h-2a4 4 0 01-4 4v2z"/>
                    </svg>
                </button>
        `;
    }
};

