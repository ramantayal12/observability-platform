/**
 * Sidebar Template
 * Reusable function to generate consistent sidebar HTML across all pages
 */
window.SidebarTemplate = {
    /**
     * Generate sidebar HTML
     * @param {string} activePage - The currently active page (e.g., 'index', 'metrics', 'logs')
     * @returns {string} HTML string for the sidebar
     */
    generate: function(activePage = '') {
        return `
    <!-- Sidebar Navigation -->
    <aside class="sidebar">
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
            <a href="index.html" class="nav-link ${activePage === 'index' ? 'active' : ''}">
                <svg class="nav-icon" viewBox="0 0 20 20" fill="none">
                    <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="11" y="3" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="3" y="11" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="11" y="11" width="6" height="6" rx="1" stroke="currentColor" stroke-width="1.5"/>
                </svg>
                <span class="nav-text">Overview</span>
            </a>

            <a href="dashboards.html" class="nav-link ${activePage === 'dashboards' ? 'active' : ''}">
                <svg class="nav-icon" viewBox="0 0 20 20" fill="none">
                    <rect x="2" y="2" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="11" y="2" width="7" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="2" y="11" width="7" height="7" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="11" y="8" width="7" height="10" rx="1" stroke="currentColor" stroke-width="1.5"/>
                </svg>
                <span class="nav-text">Dashboards</span>
            </a>

            <a href="metrics.html" class="nav-link ${activePage === 'metrics' ? 'active' : ''}">
                <svg class="nav-icon" viewBox="0 0 20 20" fill="none">
                    <path d="M3 15l4-4 3 3 7-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M3 3v14h14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span class="nav-text">Metrics</span>
            </a>

            <a href="logs.html" class="nav-link ${activePage === 'logs' ? 'active' : ''}">
                <svg class="nav-icon" viewBox="0 0 20 20" fill="none">
                    <path d="M4 6h12M4 10h12M4 14h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span class="nav-text">Logs</span>
            </a>

            <a href="traces.html" class="nav-link ${activePage === 'traces' ? 'active' : ''}">
                <svg class="nav-icon" viewBox="0 0 20 20" fill="none">
                    <circle cx="5" cy="10" r="2" stroke="currentColor" stroke-width="1.5"/>
                    <circle cx="15" cy="10" r="2" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M7 10h6" stroke="currentColor" stroke-width="1.5"/>
                </svg>
                <span class="nav-text">Traces</span>
            </a>

            <div class="nav-divider"></div>

            <a href="services.html" class="nav-link ${activePage === 'services' ? 'active' : ''}">
                <svg class="nav-icon" viewBox="0 0 20 20" fill="none">
                    <rect x="3" y="3" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="12" y="3" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="3" y="12" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
                    <rect x="12" y="12" width="5" height="5" rx="1" stroke="currentColor" stroke-width="1.5"/>
                </svg>
                <span class="nav-text">Services</span>
            </a>

            <a href="alerts.html" class="nav-link ${activePage === 'alerts' ? 'active' : ''}">
                <svg class="nav-icon" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2a6 6 0 016 6c0 7 3 9 3 9H1s3-2 3-9a6 6 0 016-6z" stroke="currentColor" stroke-width="1.5"/>
                    <path d="M9 17v1a2 2 0 104 0v-1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span class="nav-text">Alerts</span>
            </a>
        </nav>

        <div class="sidebar-footer">
            <button class="btn btn-primary" id="loginBtn" style="width: 100%;">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 8px;">
                    <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 1c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
                Login
            </button>
        </div>
    </aside>
        `;
    }
};

