/**
 * Sidebar Component
 * Reusable sidebar navigation component
 */
class Sidebar {
    constructor(options = {}) {
        this.currentPage = options.currentPage || 'overview';
        this.container = options.container || document.body;
        this.onToggle = options.onToggle || null;
        
        this.navigationItems = [
            {
                id: 'overview',
                label: 'Overview',
                href: 'index.html',
                icon: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none">
                    <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                </svg>`
            },
            {
                id: 'dashboards',
                label: 'Dashboards',
                href: 'dashboards.html',
                icon: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none">
                    <rect x="2" y="2" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="11" y="2" width="7" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="2" y="11" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="11" y="8" width="7" height="10" rx="1" stroke="currentColor" stroke-width="1.5"/>
                </svg>`
            },
            {
                id: 'metrics',
                label: 'Metrics',
                href: 'metrics.html',
                icon: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none">
                    <path d="M3 15l4-4 3 3 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M3 3v14h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>`
            },
            {
                id: 'logs',
                label: 'Logs',
                href: 'logs.html',
                icon: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none">
                    <path d="M4 6h12M4 10h12M4 14h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>`
            },
            {
                id: 'traces',
                label: 'Traces',
                href: 'traces.html',
                icon: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none">
                    <circle cx="5" cy="10" r="2" stroke="currentColor" stroke-width="1.5"/>
                    <circle cx="15" cy="10" r="2" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M7 10h6" stroke="currentColor" stroke-width="1.5"/>
                </svg>`
            },
            { divider: true },
            {
                id: 'services',
                label: 'Services',
                href: 'services.html',
                icon: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none">
                    <rect x="3" y="3" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="12" y="3" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="3" y="12" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="12" y="12" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
                </svg>`
            },
            {
                id: 'alerts',
                label: 'Alerts',
                href: 'alerts.html',
                icon: `<svg class="nav-icon" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2a6 6 0 016 6c0 7 3 9 3 9H1s3-2 3-9a6 6 0 016-6z" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M9 17v1a2 2 0 104 0v-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>`
            }
        ];
        
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
        this.restoreState();
    }

    restoreState() {
        const isCollapsed = localStorage.getItem('sidebar_collapsed') === 'true';
        if (isCollapsed) {
            const sidebar = document.getElementById('appSidebar');
            if (sidebar) {
                sidebar.classList.add('collapsed');
            }
        }
    }
    
    render() {
        const sidebarHTML = `
            <aside class="sidebar" id="appSidebar">
                <div class="sidebar-header">
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

                <nav class="sidebar-nav">
                    ${this.renderNavigationItems()}
                </nav>

                <div class="sidebar-footer">
                    <button class="sidebar-toggle" id="sidebarToggle">
                        <svg viewBox="0 0 20 20" fill="currentColor">
                            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                        </svg>
                    </button>
                </div>
            </aside>
        `;
        
        // Insert at the beginning of the container
        this.container.insertAdjacentHTML('afterbegin', sidebarHTML);
    }
    
    renderNavigationItems() {
        return this.navigationItems.map(item => {
            if (item.divider) {
                return '<div class="nav-divider"></div>';
            }

            const isActive = item.id === this.currentPage ? 'active' : '';
            return `
                <a href="${item.href}" class="nav-link ${isActive}" data-tooltip="${item.label}">
                    ${item.icon}
                    <span class="nav-text">${item.label}</span>
                </a>
            `;
        }).join('');
    }
    
    attachEventListeners() {
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
    }
    
    toggle() {
        const sidebar = document.getElementById('appSidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
            
            // Save state to localStorage
            const isCollapsed = sidebar.classList.contains('collapsed');
            localStorage.setItem('sidebar_collapsed', isCollapsed);
            
            if (this.onToggle) {
                this.onToggle(isCollapsed);
            }
        }
    }
    
    setActivePage(pageId) {
        this.currentPage = pageId;
        
        // Update active state
        const links = document.querySelectorAll('.nav-link');
        links.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === this.navigationItems.find(item => item.id === pageId)?.href) {
                link.classList.add('active');
            }
        });
    }
}

// Make it globally available
window.Sidebar = Sidebar;

