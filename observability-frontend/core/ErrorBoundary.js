/**
 * ErrorBoundary - Centralized error handling for components
 * Catches errors, logs them, and provides fallback UI
 * @module core/ErrorBoundary
 */

/**
 * @typedef {Object} ErrorInfo
 * @property {string} message - Error message
 * @property {string} [stack] - Stack trace
 * @property {string} [componentName] - Component that threw the error
 * @property {number} timestamp - When the error occurred
 * @property {string} [code] - Error code
 * @property {boolean} [recoverable] - Whether error is recoverable
 */

/**
 * Error types for categorization
 */
const ErrorTypes = {
    NETWORK: 'NETWORK_ERROR',
    VALIDATION: 'VALIDATION_ERROR',
    AUTHENTICATION: 'AUTH_ERROR',
    AUTHORIZATION: 'AUTHZ_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    SERVER: 'SERVER_ERROR',
    TIMEOUT: 'TIMEOUT_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR'
};

Object.freeze(ErrorTypes);

/**
 * ErrorBoundary class for handling component errors
 */
class ErrorBoundary {
    constructor() {
        /** @type {Array<ErrorInfo>} */
        this.errors = [];
        this.maxErrors = 50;
        
        /** @type {Array<Function>} */
        this.errorHandlers = [];
        
        /** @type {Map<string, Function>} */
        this.fallbackRenderers = new Map();
        
        this.setupGlobalHandlers();
    }

    /**
     * Setup global error handlers
     * @private
     */
    setupGlobalHandlers() {
        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError(event.reason, 'UnhandledPromiseRejection');
            event.preventDefault();
        });

        // Catch global errors
        window.addEventListener('error', (event) => {
            this.handleError(event.error || event.message, 'GlobalError');
        });
    }

    /**
     * Handle an error
     * @param {Error|string} error - The error
     * @param {string} [componentName] - Component name
     * @returns {ErrorInfo}
     */
    handleError(error, componentName = 'Unknown') {
        const errorInfo = this.normalizeError(error, componentName);
        
        // Add to error log
        this.errors.push(errorInfo);
        if (this.errors.length > this.maxErrors) {
            this.errors.shift();
        }

        // Log to console
        console.error(`[ErrorBoundary] ${componentName}:`, error);

        // Notify handlers
        this.errorHandlers.forEach(handler => {
            try {
                handler(errorInfo);
            } catch (e) {
                console.error('[ErrorBoundary] Handler error:', e);
            }
        });

        // Emit event
        if (typeof eventBus !== 'undefined') {
            eventBus.emit('error:occurred', errorInfo);
        }

        // Show notification for user-facing errors
        if (errorInfo.recoverable && typeof notificationManager !== 'undefined') {
            notificationManager.show({
                type: 'error',
                title: 'Error',
                message: errorInfo.message,
                duration: 5000
            });
        }

        return errorInfo;
    }

    /**
     * Normalize error to ErrorInfo format
     * @private
     * @param {Error|string|Object} error
     * @param {string} componentName
     * @returns {ErrorInfo}
     */
    normalizeError(error, componentName) {
        const errorInfo = {
            timestamp: Date.now(),
            componentName,
            recoverable: true
        };

        if (error instanceof Error) {
            errorInfo.message = error.message;
            errorInfo.stack = error.stack;
            errorInfo.code = this.categorizeError(error);
        } else if (typeof error === 'string') {
            errorInfo.message = error;
            errorInfo.code = ErrorTypes.UNKNOWN;
        } else if (error && typeof error === 'object') {
            errorInfo.message = error.message || 'Unknown error';
            errorInfo.code = error.code || this.categorizeError(error);
            errorInfo.stack = error.stack;
            if (error.status) errorInfo.status = error.status;
        } else {
            errorInfo.message = 'Unknown error occurred';
            errorInfo.code = ErrorTypes.UNKNOWN;
        }

        return errorInfo;
    }

    /**
     * Categorize error by type
     * @private
     * @param {Error|Object} error
     * @returns {string}
     */
    categorizeError(error) {
        const message = (error.message || '').toLowerCase();
        const status = error.status;

        if (message.includes('network') || message.includes('fetch')) {
            return ErrorTypes.NETWORK;
        }
        if (message.includes('timeout') || message.includes('abort')) {
            return ErrorTypes.TIMEOUT;
        }
        if (status === 401) return ErrorTypes.AUTHENTICATION;
        if (status === 403) return ErrorTypes.AUTHORIZATION;
        if (status === 404) return ErrorTypes.NOT_FOUND;
        if (status >= 500) return ErrorTypes.SERVER;
        if (status >= 400) return ErrorTypes.VALIDATION;

        return ErrorTypes.UNKNOWN;
    }

    /**
     * Register error handler
     * @param {Function} handler - Handler function (errorInfo) => void
     * @returns {Function} Unsubscribe function
     */
    onError(handler) {
        this.errorHandlers.push(handler);
        return () => {
            const index = this.errorHandlers.indexOf(handler);
            if (index !== -1) this.errorHandlers.splice(index, 1);
        };
    }

    /**
     * Register fallback renderer for a component
     * @param {string} componentName - Component name
     * @param {Function} renderer - Renderer function (errorInfo, container) => void
     */
    registerFallback(componentName, renderer) {
        this.fallbackRenderers.set(componentName, renderer);
    }

    /**
     * Render fallback UI for a component
     * @param {string} componentName - Component name
     * @param {ErrorInfo} errorInfo - Error information
     * @param {HTMLElement} container - Container element
     */
    renderFallback(componentName, errorInfo, container) {
        const renderer = this.fallbackRenderers.get(componentName);
        
        if (renderer) {
            renderer(errorInfo, container);
        } else {
            // Default fallback UI
            container.innerHTML = `
                <div class="error-fallback">
                    <div class="error-fallback-icon">⚠️</div>
                    <div class="error-fallback-title">Something went wrong</div>
                    <div class="error-fallback-message">${this.escapeHtml(errorInfo.message)}</div>
                    <button class="error-fallback-retry" onclick="location.reload()">Retry</button>
                </div>
            `;
        }
    }

    /**
     * Escape HTML to prevent XSS
     * @private
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Get recent errors
     * @param {number} [count=10] - Number of errors to return
     * @returns {Array<ErrorInfo>}
     */
    getRecentErrors(count = 10) {
        return this.errors.slice(-count);
    }

    /**
     * Clear error log
     */
    clearErrors() {
        this.errors = [];
    }

    /**
     * Wrap async function with error handling
     * @param {Function} fn - Async function to wrap
     * @param {string} [componentName] - Component name for error context
     * @returns {Function} Wrapped function
     */
    wrap(fn, componentName = 'Unknown') {
        return async (...args) => {
            try {
                return await fn(...args);
            } catch (error) {
                this.handleError(error, componentName);
                throw error;
            }
        };
    }

    /**
     * Try-catch wrapper that returns result or null
     * @param {Function} fn - Function to execute
     * @param {string} [componentName] - Component name
     * @returns {Promise<*|null>}
     */
    async tryCatch(fn, componentName = 'Unknown') {
        try {
            return await fn();
        } catch (error) {
            this.handleError(error, componentName);
            return null;
        }
    }

    /** @returns {ErrorBoundary} */
    static getInstance() {
        if (!ErrorBoundary.instance) {
            ErrorBoundary.instance = new ErrorBoundary();
        }
        return ErrorBoundary.instance;
    }
}

// Create singleton
const errorBoundary = ErrorBoundary.getInstance();

