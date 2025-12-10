/**
 * AuthService - Authentication Service
 * Handles user authentication with backend API
 */
class AuthService {
    constructor() {
        this.storageKey = 'observability_auth';
        this.sessionKey = 'observability_session';
        this.tokenKey = 'observability_token';
        this.baseUrl = window.API_CONFIG?.BASE_URL || '/api';
    }

    /**
     * Get singleton instance
     */
    static getInstance() {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }

    /**
     * Authenticate user with backend API
     * @param {string} email
     * @param {string} password
     * @returns {Promise<Object>} Authentication result
     */
    async authenticate(email, password) {
        console.log('[AuthService] Authenticating user:', email);

        try {
            const response = await fetch(`${this.baseUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                console.log('[AuthService] Authentication failed:', data.error?.message);
                return {
                    success: false,
                    error: data.error?.message || 'Invalid email or password'
                };
            }

            const authData = data.data;

            // Create session from response
            const session = {
                token: authData.token,
                tokenType: authData.tokenType,
                userId: authData.user.id,
                role: authData.user.role,
                createdAt: Date.now(),
                expiresAt: Date.now() + authData.expiresIn
            };

            console.log('[AuthService] Authentication successful for:', authData.user.email);

            return {
                success: true,
                user: authData.user,
                organization: authData.organization,
                teams: authData.teams,
                currentTeam: authData.currentTeam,
                session: session
            };
        } catch (error) {
            console.error('[AuthService] Authentication error:', error);
            return {
                success: false,
                error: 'Network error. Please try again.'
            };
        }
    }

    /**
     * Get JWT token
     */
    getToken() {
        const session = this.getSession();
        return session?.session?.token || null;
    }

    /**
     * Get authorization header
     */
    getAuthHeader() {
        const token = this.getToken();
        if (token) {
            return { 'Authorization': `Bearer ${token}` };
        }
        return {};
    }

    /**
     * Save session to storage
     */
    saveSession(session, user, authData, remember = false) {
        const data = {
            session: session,
            user: user,
            organization: authData?.organization,
            teams: authData?.teams,
            currentTeam: authData?.currentTeam
        };

        if (remember) {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } else {
            sessionStorage.setItem(this.sessionKey, JSON.stringify(data));
        }
    }

    /**
     * Get current session
     */
    getSession() {
        // Check sessionStorage first, then localStorage
        let authData = sessionStorage.getItem(this.sessionKey);
        if (!authData) {
            authData = localStorage.getItem(this.storageKey);
        }

        if (!authData) {
            return null;
        }

        try {
            const parsed = JSON.parse(authData);

            // Check if session is expired
            if (parsed.session && parsed.session.expiresAt < Date.now()) {
                this.logout();
                return null;
            }

            return parsed;
        } catch (e) {
            console.error('[AuthService] Error parsing session:', e);
            return null;
        }
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated() {
        const session = this.getSession();
        return session !== null && session.session && session.session.token;
    }

    /**
     * Get current user
     */
    getCurrentUser() {
        const session = this.getSession();
        return session ? session.user : null;
    }

    /**
     * Get organization info
     */
    getOrganization() {
        const session = this.getSession();
        return session ? session.organization : null;
    }

    /**
     * Get teams
     */
    getTeams() {
        const session = this.getSession();
        return session ? session.teams : [];
    }

    /**
     * Logout user
     */
    async logout() {
        console.log('[AuthService] Logging out user');

        try {
            // Call backend logout endpoint
            await fetch(`${this.baseUrl}/auth/logout`, {
                method: 'POST',
                headers: this.getAuthHeader()
            });
        } catch (error) {
            console.error('[AuthService] Logout error:', error);
        }

        localStorage.removeItem(this.storageKey);
        sessionStorage.removeItem(this.sessionKey);
    }

    /**
     * Check authentication and redirect to login if not authenticated
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            console.log('[AuthService] User not authenticated, redirecting to login');
            window.location.href = 'login.html';
            return false;
        }
        return true;
    }

    /**
     * Validate session with backend
     */
    async validateSession() {
        const session = this.getSession();
        if (!session) {
            return { valid: false };
        }

        try {
            const response = await fetch(`${this.baseUrl}/auth/validate`, {
                method: 'GET',
                headers: this.getAuthHeader()
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                return { valid: false };
            }

            return {
                valid: data.data.valid,
                user: session.user
            };
        } catch (error) {
            console.error('[AuthService] Session validation error:', error);
            // Fall back to local validation
            return {
                valid: session.session.expiresAt > Date.now(),
                user: session.user
            };
        }
    }

    /**
     * Fetch context from backend
     */
    async fetchContext() {
        try {
            const response = await fetch(`${this.baseUrl}/auth/context`, {
                method: 'GET',
                headers: this.getAuthHeader()
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                return null;
            }

            return data.data;
        } catch (error) {
            console.error('[AuthService] Context fetch error:', error);
            return null;
        }
    }
}

// Make globally available
window.AuthService = AuthService;

