/**
 * AuthService - Mock Authentication Service
 * Handles user authentication with mock database calls
 */
class AuthService {
    constructor() {
        this.storageKey = 'observability_auth';
        this.sessionKey = 'observability_session';
        
        // Mock user database
        this.mockUsers = [
            {
                id: 1,
                username: 'admin',
                password: 'admin',
                email: 'admin@observex.io',
                role: 'admin',
                name: 'Administrator'
            },
            {
                id: 2,
                username: 'user',
                password: 'user123',
                email: 'user@observex.io',
                role: 'viewer',
                name: 'Demo User'
            }
        ];
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
     * Mock database call to authenticate user
     * @param {string} username 
     * @param {string} password 
     * @returns {Promise<Object>} Authentication result
     */
    async authenticate(username, password) {
        console.log('[AuthService] Authenticating user:', username);
        
        // Simulate network delay (mock database call)
        await this.simulateNetworkDelay(800);
        
        // Find user in mock database
        const user = this.mockUsers.find(
            u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
        );
        
        if (!user) {
            console.log('[AuthService] Authentication failed: Invalid credentials');
            return {
                success: false,
                error: 'Invalid username or password'
            };
        }
        
        // Generate mock session token
        const session = this.createSession(user);
        
        console.log('[AuthService] Authentication successful for:', user.username);
        
        return {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                name: user.name
            },
            session: session
        };
    }

    /**
     * Create a session for authenticated user
     */
    createSession(user) {
        const session = {
            token: this.generateToken(),
            userId: user.id,
            username: user.username,
            role: user.role,
            createdAt: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };
        
        return session;
    }

    /**
     * Generate a mock JWT-like token
     */
    generateToken() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 64; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    }

    /**
     * Save session to storage
     */
    saveSession(session, user, remember = false) {
        const authData = {
            session: session,
            user: user
        };
        
        if (remember) {
            localStorage.setItem(this.storageKey, JSON.stringify(authData));
        } else {
            sessionStorage.setItem(this.sessionKey, JSON.stringify(authData));
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
     * Logout user
     */
    logout() {
        console.log('[AuthService] Logging out user');
        localStorage.removeItem(this.storageKey);
        sessionStorage.removeItem(this.sessionKey);
    }

    /**
     * Simulate network delay for mock API calls
     */
    simulateNetworkDelay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
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
     * Mock API call to validate session with server
     */
    async validateSession() {
        const session = this.getSession();
        if (!session) {
            return { valid: false };
        }
        
        // Simulate network delay
        await this.simulateNetworkDelay(200);
        
        // Mock validation - in real app this would call the server
        return {
            valid: session.session.expiresAt > Date.now(),
            user: session.user
        };
    }
}

// Make globally available
window.AuthService = AuthService;

