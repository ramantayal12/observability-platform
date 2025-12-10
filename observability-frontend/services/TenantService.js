/**
 * TenantService
 * Manages organization, team, and user context for multi-tenancy
 * Singleton pattern for global access
 */
class TenantService {
    static instance = null;

    constructor() {
        if (TenantService.instance) {
            return TenantService.instance;
        }

        this.organization = null;
        this.teams = [];
        this.currentTeam = null;
        this.user = null;
        this.initialized = false;
        this.baseUrl = window.API_CONFIG?.BASE_URL || '/api';

        TenantService.instance = this;
    }

    static getInstance() {
        if (!TenantService.instance) {
            TenantService.instance = new TenantService();
        }
        return TenantService.instance;
    }

    /**
     * Initialize tenant context from backend or auth session
     */
    async init() {
        if (this.initialized) return;

        try {
            // First try to get context from AuthService session
            const authService = window.AuthService?.getInstance();
            if (authService?.isAuthenticated()) {
                const session = authService.getSession();
                if (session) {
                    this.organization = session.organization || null;
                    this.teams = session.teams || [];
                    this.user = session.user || null;
                }
            }

            // If not authenticated or no session data, try to fetch from backend
            if (!this.user) {
                const response = await this.fetchContext();
                if (response) {
                    this.organization = response.organization || null;
                    this.teams = response.teams || [];
                    this.user = response.user || null;
                }
            }

            // Restore current team from localStorage or use first team
            const cached = localStorage.getItem('observability_current_team');
            if (cached) {
                const cachedTeam = JSON.parse(cached);
                this.currentTeam = this.teams.find(t => t.id === cachedTeam.id) || this.teams[0];
            } else {
                this.currentTeam = this.teams[0] || null;
            }

            // Update state manager
            if (window.stateManager) {
                stateManager.set('organization', this.organization);
                stateManager.set('teams', this.teams);
                stateManager.set('currentTeam', this.currentTeam);
                stateManager.set('user', this.user);
            }

            this.initialized = true;

            // Emit event
            if (window.eventBus) {
                eventBus.emit('tenant:initialized', {
                    organization: this.organization,
                    teams: this.teams,
                    currentTeam: this.currentTeam,
                    user: this.user
                });
            }

        } catch (error) {
            console.error('Failed to initialize tenant context:', error);
            this.loadFromCache();
        }
    }

    /**
     * Fetch context from backend API
     */
    async fetchContext() {
        try {
            const authService = window.AuthService?.getInstance();
            const headers = authService?.getAuthHeader() || {};

            // Try authenticated endpoint first
            let response = await fetch(`${this.baseUrl}/auth/context`, { headers });

            if (!response.ok) {
                // Fall back to mock endpoint for development
                response = await fetch(`${this.baseUrl}/mock/context`);
            }

            const data = await response.json();

            // Handle wrapped response format
            if (data.success && data.data) {
                return data.data;
            }

            return data;
        } catch (error) {
            console.error('Failed to fetch context:', error);
            return null;
        }
    }
    
    /**
     * Load from localStorage cache
     */
    loadFromCache() {
        const cached = localStorage.getItem('observability_current_team');
        if (cached) {
            this.currentTeam = JSON.parse(cached);
        }
        this.initialized = true;
    }
    
    /**
     * Get organization ID
     */
    getOrganizationId() {
        return this.organization?.id || null;
    }
    
    /**
     * Get current team ID
     */
    getTeamId() {
        return this.currentTeam?.id || null;
    }
    
    /**
     * Get user ID
     */
    getUserId() {
        return this.user?.id || null;
    }
    
    /**
     * Get current team
     */
    getCurrentTeam() {
        return this.currentTeam;
    }
    
    /**
     * Get all teams user has access to
     */
    getTeams() {
        return this.teams;
    }
    
    /**
     * Set current team
     */
    setCurrentTeam(team) {
        this.currentTeam = team;
        localStorage.setItem('observability_current_team', JSON.stringify(team));
        
        if (window.stateManager) {
            stateManager.set('currentTeam', team);
        }
        
        if (window.eventBus) {
            eventBus.emit('team:changed', team);
        }
    }
    
    /**
     * Get headers for API requests
     */
    getHeaders() {
        const headers = {};

        // Include Authorization header if authenticated
        const authService = window.AuthService?.getInstance();
        if (authService?.isAuthenticated()) {
            const authHeaders = authService.getAuthHeader();
            Object.assign(headers, authHeaders);
        }

        if (this.organization?.id) {
            headers['X-Organization-Id'] = String(this.organization.id);
        }
        if (this.currentTeam?.id) {
            headers['X-Team-Id'] = String(this.currentTeam.id);
        }
        if (this.user?.id) {
            headers['X-User-Id'] = String(this.user.id);
        }

        return headers;
    }
    
    /**
     * Check if user has access to a team
     */
    hasTeamAccess(teamId) {
        return this.teams.some(t => t.id === teamId);
    }
    
    /**
     * Check if user has role in current team
     */
    hasRole(role) {
        if (!this.currentTeam) return false;
        const teamRole = this.currentTeam.role;
        
        const roleHierarchy = ['viewer', 'member', 'admin', 'owner'];
        const userRoleIndex = roleHierarchy.indexOf(teamRole);
        const requiredRoleIndex = roleHierarchy.indexOf(role);
        
        return userRoleIndex >= requiredRoleIndex;
    }
}

// Make it globally available
window.TenantService = TenantService;

