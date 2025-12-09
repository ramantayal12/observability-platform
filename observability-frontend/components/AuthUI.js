/**
 * AuthUI Component
 * Handles authentication UI elements in the sidebar
 */
class AuthUI {
    constructor() {
        this.authService = AuthService.getInstance();
        this.init();
    }

    static getInstance() {
        if (!AuthUI.instance) {
            AuthUI.instance = new AuthUI();
        }
        return AuthUI.instance;
    }

    init() {
        this.renderSidebarFooter();
    }

    /**
     * Render the sidebar footer based on auth state
     */
    renderSidebarFooter() {
        const footer = document.getElementById('sidebarFooter');
        if (!footer) return;

        const isAuthenticated = this.authService.isAuthenticated();
        const user = this.authService.getCurrentUser();

        if (isAuthenticated && user) {
            footer.innerHTML = `
                <div class="user-profile">
                    <div class="user-avatar">
                        ${user.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="user-info">
                        <span class="user-name">${user.name}</span>
                        <span class="user-role">${user.role}</span>
                    </div>
                    <button class="logout-btn" id="logoutBtn" title="Logout">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                            <path d="M6 2v2H3v8h3v2H1V2h5zm4.293 2.293l3.414 3.414a.5.5 0 010 .707l-3.414 3.414-.707-.707L12.086 8.5H5v-1h7.086L9.586 4.707l.707-.707z"/>
                        </svg>
                    </button>
                </div>
            `;

            // Add logout handler
            const logoutBtn = document.getElementById('logoutBtn');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', () => this.handleLogout());
            }
        } else {
            footer.innerHTML = `
                <a href="login.html" class="btn btn-primary" style="width: 100%; text-decoration: none; display: flex; align-items: center; justify-content: center;">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style="margin-right: 8px;">
                        <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm0 1c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                    Login
                </a>
            `;
        }
    }

    /**
     * Handle logout
     */
    handleLogout() {
        this.authService.logout();
        window.location.href = 'login.html';
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AuthUI.getInstance());
} else {
    AuthUI.getInstance();
}

// Make globally available
window.AuthUI = AuthUI;

