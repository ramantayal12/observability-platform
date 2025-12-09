/**
 * Topbar Component
 * Reusable topbar with title, time picker, and action buttons
 */
class Topbar {
    constructor(options = {}) {
        this.title = options.title || 'Page';
        this.container = options.container || null;
        this.showTimePicker = options.showTimePicker !== false; // Default true
        this.showAutoRefresh = options.showAutoRefresh !== false; // Default true
        this.customActions = options.customActions || []; // Array of custom action buttons
        this.onRefresh = options.onRefresh || null;
        
        this.timeRangePicker = null;
        this.autoRefreshInterval = null;
        
        this.init();
    }
    
    init() {
        this.render();
        this.setupComponents();
    }
    
    render() {
        const topbarHTML = `
            <header class="topbar" id="appTopbar">
                <div class="topbar-left">
                    <h1 class="page-title">${this.title}</h1>
                </div>
                <div class="topbar-right">
                    ${this.renderTimePicker()}
                    ${this.renderAutoRefresh()}
                    ${this.renderCustomActions()}
                </div>
            </header>
        `;
        
        if (this.container) {
            this.container.insertAdjacentHTML('afterbegin', topbarHTML);
        } else {
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.insertAdjacentHTML('afterbegin', topbarHTML);
            }
        }
    }
    
    renderTimePicker() {
        if (!this.showTimePicker) return '';
        
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
                    <!-- Populated by TimeRangePicker component -->
                </div>
            </div>
        `;
    }
    
    renderAutoRefresh() {
        if (!this.showAutoRefresh) return '';
        
        return `
            <!-- Auto Refresh -->
            <button class="btn btn-icon btn-sm" id="autoRefreshBtn" title="Auto Refresh">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 2a6 6 0 00-6 6h2a4 4 0 014-4V2zm0 12a6 6 0 006-6h-2a4 4 0 01-4 4v2z"/>
                </svg>
            </button>
        `;
    }
    
    renderCustomActions() {
        if (!this.customActions || this.customActions.length === 0) return '';
        
        return this.customActions.map(action => {
            const btnClass = action.className || 'btn btn-primary btn-sm';
            const icon = action.icon || '';
            const label = action.label || '';
            
            return `
                <button class="${btnClass}" id="${action.id}" title="${action.title || ''}">
                    ${icon}
                    ${label}
                </button>
            `;
        }).join('');
    }
    
    setupComponents() {
        // Setup TimeRangePicker if enabled
        if (this.showTimePicker && window.TimeRangePicker) {
            this.timeRangePicker = new TimeRangePicker({
                buttonId: 'timePickerBtn',
                dropdownId: 'timePickerDropdown',
                labelId: 'timePickerLabel'
            });
        }
        
        // Setup Auto Refresh if enabled
        if (this.showAutoRefresh) {
            this.setupAutoRefresh();
        }
        
        // Attach custom action listeners
        this.attachCustomActionListeners();
    }
    
    setupAutoRefresh() {
        const autoRefreshBtn = document.getElementById('autoRefreshBtn');
        if (!autoRefreshBtn) return;
        
        const isEnabled = localStorage.getItem('observability_auto_refresh') === 'true';
        
        if (isEnabled) {
            autoRefreshBtn.classList.add('active');
            this.startAutoRefresh();
        }

        autoRefreshBtn.addEventListener('click', () => {
            const enabled = autoRefreshBtn.classList.toggle('active');
            localStorage.setItem('observability_auto_refresh', enabled);
            
            if (enabled) {
                this.startAutoRefresh();
                if (window.notificationManager) {
                    notificationManager.success('Auto-refresh enabled');
                }
            } else {
                this.stopAutoRefresh();
                if (window.notificationManager) {
                    notificationManager.info('Auto-refresh disabled');
                }
            }
        });
    }
    
    startAutoRefresh() {
        this.stopAutoRefresh();
        this.autoRefreshInterval = setInterval(() => {
            if (this.onRefresh) {
                this.onRefresh();
            }
        }, 30000); // 30 seconds
    }
    
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    }
    
    attachCustomActionListeners() {
        this.customActions.forEach(action => {
            const btn = document.getElementById(action.id);
            if (btn && action.onClick) {
                btn.addEventListener('click', action.onClick);
            }
        });
    }
    
    setTitle(newTitle) {
        this.title = newTitle;
        const titleElement = document.querySelector('.page-title');
        if (titleElement) {
            titleElement.textContent = newTitle;
        }
    }
    
    getTimeRangePicker() {
        return this.timeRangePicker;
    }
    
    destroy() {
        this.stopAutoRefresh();
        const topbar = document.getElementById('appTopbar');
        if (topbar) {
            topbar.remove();
        }
    }
}

// Make it globally available
window.Topbar = Topbar;

