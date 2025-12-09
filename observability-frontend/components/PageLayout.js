/**
 * PageLayout Component
 * Provides a consistent layout structure for all pages
 */
class PageLayout {
    constructor(options = {}) {
        this.currentPage = options.currentPage || 'overview';
        this.pageTitle = options.pageTitle || 'Page';
        this.showTimePicker = options.showTimePicker !== false;
        this.showAutoRefresh = options.showAutoRefresh !== false;
        this.customActions = options.customActions || [];
        this.onRefresh = options.onRefresh || null;
        this.onTimeRangeChange = options.onTimeRangeChange || null;
        
        this.sidebar = null;
        this.topbar = null;
        
        this.init();
    }
    
    init() {
        this.setupLayout();
        this.setupEventListeners();
    }
    
    setupLayout() {
        // Create sidebar
        this.sidebar = new Sidebar({
            currentPage: this.currentPage,
            container: document.body
        });
        
        // Create main content wrapper if it doesn't exist
        let mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            mainContent = document.createElement('main');
            mainContent.className = 'main-content';
            document.body.appendChild(mainContent);
        }
        
        // Create topbar
        this.topbar = new Topbar({
            title: this.pageTitle,
            container: mainContent,
            showTimePicker: this.showTimePicker,
            showAutoRefresh: this.showAutoRefresh,
            customActions: this.customActions,
            onRefresh: this.onRefresh
        });
        
        // Create page content wrapper if it doesn't exist
        let pageContent = document.querySelector('.page-content');
        if (!pageContent) {
            pageContent = document.createElement('div');
            pageContent.className = 'page-content';
            pageContent.id = 'pageContent';
            mainContent.appendChild(pageContent);
        }
    }
    
    setupEventListeners() {
        // Listen for time range changes
        if (this.showTimePicker && this.onTimeRangeChange) {
            const eventBus = window.eventBus || window.EventBus?.getInstance();
            if (eventBus) {
                eventBus.on(Events.TIME_RANGE_CHANGED, this.onTimeRangeChange);
            }
        }
    }
    
    getContentContainer() {
        return document.getElementById('pageContent');
    }
    
    getSidebar() {
        return this.sidebar;
    }
    
    getTopbar() {
        return this.topbar;
    }
    
    getTimeRangePicker() {
        return this.topbar ? this.topbar.getTimeRangePicker() : null;
    }
    
    setPageTitle(title) {
        this.pageTitle = title;
        if (this.topbar) {
            this.topbar.setTitle(title);
        }
    }
    
    destroy() {
        if (this.topbar) {
            this.topbar.destroy();
        }
        
        const sidebar = document.getElementById('appSidebar');
        if (sidebar) {
            sidebar.remove();
        }
    }
}

// Make it globally available
window.PageLayout = PageLayout;

