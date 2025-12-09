/**
 * StateManager - Centralized state management with reactive updates
 * Implements observer pattern for state changes
 */

class StateManager {
    constructor() {
        this.state = {
            // Current page/view
            currentPage: 'overview',
            
            // Filters
            filters: {
                service: 'all',
                timeRange: 60 * 60 * 1000, // 1 hour default
                customTimeRange: null,
                logLevel: 'all',
                searchQuery: ''
            },
            
            // Data cache
            cache: {
                metrics: null,
                logs: null,
                traces: null,
                services: null,
                overview: null
            },
            
            // UI state
            ui: {
                autoRefresh: false,
                sidebarCollapsed: false,
                theme: 'dark',
                notifications: []
            },
            
            // Dashboard state
            dashboards: {
                list: [],
                current: null,
                editing: false
            },
            
            // Loading states
            loading: {
                metrics: false,
                logs: false,
                traces: false,
                services: false
            },
            
            // Error states
            errors: {
                metrics: null,
                logs: null,
                traces: null,
                services: null
            }
        };

        this.observers = new Map();
        this.middleware = [];
        this.loadFromStorage();
    }

    /**
     * Get state value by path
     * @param {string} path - Dot-notation path (e.g., 'filters.service')
     * @returns {*} State value
     */
    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.state);
    }

    /**
     * Set state value by path
     * @param {string} path - Dot-notation path
     * @param {*} value - New value
     * @param {boolean} silent - Skip notifications if true
     */
    set(path, value, silent = false) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => obj[key], this.state);
        
        const oldValue = target[lastKey];
        
        // Run middleware
        const shouldUpdate = this.runMiddleware(path, value, oldValue);
        if (!shouldUpdate) return;
        
        target[lastKey] = value;
        
        if (!silent) {
            this.notify(path, value, oldValue);
            this.saveToStorage();
        }
    }

    /**
     * Update multiple state values
     * @param {Object} updates - Object with path-value pairs
     */
    update(updates) {
        Object.entries(updates).forEach(([path, value]) => {
            this.set(path, value, true);
        });
        
        // Notify all at once
        Object.entries(updates).forEach(([path, value]) => {
            this.notify(path, value);
        });
        
        this.saveToStorage();
    }

    /**
     * Subscribe to state changes
     * @param {string} path - Path to observe (supports wildcards)
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    observe(path, callback) {
        if (!this.observers.has(path)) {
            this.observers.set(path, []);
        }
        
        this.observers.get(path).push(callback);
        
        // Return unsubscribe function
        return () => {
            const callbacks = this.observers.get(path);
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
                callbacks.splice(index, 1);
            }
        };
    }

    /**
     * Notify observers of state change
     * @param {string} path - Changed path
     * @param {*} newValue - New value
     * @param {*} oldValue - Old value
     */
    notify(path, newValue, oldValue) {
        // Notify exact path observers
        if (this.observers.has(path)) {
            this.observers.get(path).forEach(callback => {
                try {
                    callback(newValue, oldValue, path);
                } catch (error) {
                    console.error(`Error in state observer for "${path}":`, error);
                }
            });
        }

        // Notify wildcard observers
        const pathParts = path.split('.');
        for (let i = 0; i < pathParts.length; i++) {
            const wildcardPath = pathParts.slice(0, i + 1).join('.') + '.*';
            if (this.observers.has(wildcardPath)) {
                this.observers.get(wildcardPath).forEach(callback => {
                    try {
                        callback(newValue, oldValue, path);
                    } catch (error) {
                        console.error(`Error in wildcard observer for "${wildcardPath}":`, error);
                    }
                });
            }
        }

        // Emit event
        eventBus.emit(Events.STATE_CHANGED, { path, newValue, oldValue });
    }

    /**
     * Add middleware for state changes
     * @param {Function} fn - Middleware function
     */
    use(fn) {
        this.middleware.push(fn);
    }

    /**
     * Run middleware
     * @param {string} path - State path
     * @param {*} newValue - New value
     * @param {*} oldValue - Old value
     * @returns {boolean} Whether to proceed with update
     */
    runMiddleware(path, newValue, oldValue) {
        for (const fn of this.middleware) {
            const result = fn(path, newValue, oldValue);
            if (result === false) return false;
        }
        return true;
    }

    /**
     * Reset state to initial values
     */
    reset() {
        this.state = {
            currentPage: 'overview',
            filters: {
                service: 'all',
                timeRange: 60 * 60 * 1000,
                customTimeRange: null,
                logLevel: 'all',
                searchQuery: ''
            },
            cache: {
                metrics: null,
                logs: null,
                traces: null,
                services: null,
                overview: null
            },
            ui: {
                autoRefresh: false,
                sidebarCollapsed: false,
                theme: 'dark',
                notifications: []
            },
            dashboards: {
                list: [],
                current: null,
                editing: false
            },
            loading: {
                metrics: false,
                logs: false,
                traces: false,
                services: false
            },
            errors: {
                metrics: null,
                logs: null,
                traces: null,
                services: null
            }
        };
        this.saveToStorage();
    }

    /**
     * Save state to localStorage
     */
    saveToStorage() {
        try {
            const persistentState = {
                filters: this.state.filters,
                ui: {
                    autoRefresh: this.state.ui.autoRefresh,
                    theme: this.state.ui.theme
                },
                dashboards: this.state.dashboards
            };
            localStorage.setItem(AppConfig.STORAGE.PREFERENCES, JSON.stringify(persistentState));
        } catch (error) {
            console.error('Failed to save state to localStorage:', error);
        }
    }

    /**
     * Load state from localStorage
     */
    loadFromStorage() {
        try {
            const saved = localStorage.getItem(AppConfig.STORAGE.PREFERENCES);
            if (saved) {
                const persistentState = JSON.parse(saved);
                Object.assign(this.state.filters, persistentState.filters || {});
                Object.assign(this.state.ui, persistentState.ui || {});
                Object.assign(this.state.dashboards, persistentState.dashboards || {});
            }
        } catch (error) {
            console.error('Failed to load state from localStorage:', error);
        }
    }

    /**
     * Get entire state (for debugging)
     * @returns {Object} Current state
     */
    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    /**
     * Singleton accessor
     */
    static getInstance() {
        if (!StateManager.instance) {
            StateManager.instance = new StateManager();
        }
        return StateManager.instance;
    }
}

// Create singleton instance
const stateManager = StateManager.getInstance();

