/**
 * ApiService - Centralized API communication layer
 * Handles all HTTP requests with retry logic, caching, and error handling
 */

class ApiService {
    constructor() {
        this.baseURL = AppConfig.API.BASE_URL;
        this.timeout = AppConfig.API.TIMEOUT;
        this.retryAttempts = AppConfig.API.RETRY_ATTEMPTS;
        this.cache = new Map();
        this.pendingRequests = new Map();
        // Determine which endpoints to use based on mode
        this.mode = AppConfig.API.MODE || 'mock';
        this.endpoints = this.mode === 'real'
            ? AppConfig.API.ENDPOINTS.REAL
            : AppConfig.API.ENDPOINTS.MOCK;
    }

    /**
     * Singleton accessor to align with other services
     */
    static getInstance() {
        if (!ApiService.instance) {
            ApiService.instance = new ApiService();
        }
        return ApiService.instance;
    }

    /**
     * Make HTTP request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Request options
     * @returns {Promise} Response data
     */
    async request(endpoint, options = {}) {
        const {
            method = 'GET',
            params = {},
            body = null,
            headers = {},
            cache = false,
            retry = true
        } = options;

        const url = this.buildURL(endpoint, params);
        const cacheKey = `${method}:${url}`;

        // Check cache
        if (cache && this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 30000) { // 30s cache
                return cached.data;
            }
        }

        // Check for pending identical request
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }

        // Create request promise
        const requestPromise = this.executeRequest(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            body: body ? JSON.stringify(body) : null
        }, retry);

        // Store pending request
        this.pendingRequests.set(cacheKey, requestPromise);

        try {
            const data = await requestPromise;
            
            // Cache successful response
            if (cache) {
                this.cache.set(cacheKey, {
                    data,
                    timestamp: Date.now()
                });
            }

            return data;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }

    /**
     * Execute HTTP request with timeout and retry
     * @param {string} url - Request URL
     * @param {Object} options - Fetch options
     * @param {boolean} retry - Enable retry
     * @returns {Promise} Response data
     */
    async executeRequest(url, options, retry = true) {
        let lastError;
        const attempts = retry ? this.retryAttempts : 1;

        for (let i = 0; i < attempts; i++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                return data;

            } catch (error) {
                lastError = error;
                
                // Don't retry on client errors (4xx)
                if (error.message.includes('HTTP 4')) {
                    break;
                }

                // Wait before retry (exponential backoff)
                if (i < attempts - 1) {
                    await this.delay(Math.pow(2, i) * 1000);
                }
            }
        }

        throw lastError;
    }

    /**
     * Build URL with query parameters
     * @param {string} endpoint - API endpoint
     * @param {Object} params - Query parameters
     * @returns {string} Complete URL
     */
    buildURL(endpoint, params = {}) {
        const url = new URL(this.baseURL + endpoint);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                url.searchParams.append(key, value);
            }
        });
        return url.toString();
    }

    /**
     * Delay helper for retry logic
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clear cache
     * @param {string} pattern - Optional pattern to match cache keys
     */
    clearCache(pattern = null) {
        if (pattern) {
            const regex = new RegExp(pattern);
            for (const key of this.cache.keys()) {
                if (regex.test(key)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }

    // ==================== API Methods ====================

    /**
     * Fetch overview dashboard data
     * @param {Object} filters - Filter parameters
     * @returns {Promise} Overview data
     */
    async fetchOverview(filters = {}) {
        console.log('[ApiService] fetchOverview called, mode:', this.mode, 'filters:', filters);
        stateManager.set('loading.metrics', true);
        stateManager.set('errors.metrics', null);

        try {
            // Convert timeRange to startTime/endTime for API
            const endTime = Date.now();
            const startTime = filters.timeRange ? endTime - filters.timeRange : endTime - 3600000;

            const params = {
                startTime,
                endTime,
                ...this.buildFilterParams(filters)
            };

            const data = await this.request(this.endpoints.OVERVIEW, {
                params,
                cache: false
            });

            stateManager.set('cache.overview', data);
            eventBus.emit(Events.DATA_LOADED, { type: 'overview', data });
            console.log('[ApiService] Overview data loaded successfully');
            return data;

        } catch (error) {
            console.error('[ApiService] Error fetching overview:', error);
            stateManager.set('errors.metrics', error.message);
            eventBus.emit(Events.DATA_ERROR, { type: 'overview', error });
            throw error;

        } finally {
            stateManager.set('loading.metrics', false);
        }
    }

    /**
     * Fetch metrics data
     * @param {Object} filters - Filter parameters
     * @returns {Promise} Metrics data
     */
    async fetchMetrics(filters = {}) {
        stateManager.set('loading.metrics', true);
        stateManager.set('errors.metrics', null);

        try {
            const endTime = Date.now();
            const startTime = filters.timeRange ? endTime - filters.timeRange : endTime - 3600000;

            const params = {
                startTime,
                endTime,
                ...this.buildFilterParams(filters)
            };

            const data = await this.request(this.endpoints.METRICS, {
                params,
                cache: false
            });

            stateManager.set('cache.metrics', data);
            eventBus.emit(Events.DATA_LOADED, { type: 'metrics', data });
            return data;

        } catch (error) {
            stateManager.set('errors.metrics', error.message);
            eventBus.emit(Events.DATA_ERROR, { type: 'metrics', error });
            throw error;

        } finally {
            stateManager.set('loading.metrics', false);
        }
    }

    /**
     * Fetch logs data
     * @param {Object} filters - Filter parameters
     * @returns {Promise} Logs data
     */
    async fetchLogs(filters = {}) {
        stateManager.set('loading.logs', true);
        stateManager.set('errors.logs', null);

        try {
            const endTime = Date.now();
            const startTime = filters.timeRange ? endTime - filters.timeRange : endTime - 3600000;

            const params = {
                startTime,
                endTime,
                limit: filters.limit || 50,
                ...this.buildFilterParams(filters)
            };

            const data = await this.request(this.endpoints.LOGS, {
                params,
                cache: false
            });

            stateManager.set('cache.logs', data);
            eventBus.emit(Events.DATA_LOADED, { type: 'logs', data });
            return data;

        } catch (error) {
            stateManager.set('errors.logs', error.message);
            eventBus.emit(Events.DATA_ERROR, { type: 'logs', error });
            throw error;

        } finally {
            stateManager.set('loading.logs', false);
        }
    }

    /**
     * Fetch traces data
     * @param {Object} filters - Filter parameters
     * @returns {Promise} Traces data
     */
    async fetchTraces(filters = {}) {
        stateManager.set('loading.traces', true);
        stateManager.set('errors.traces', null);

        try {
            const endTime = Date.now();
            const startTime = filters.timeRange ? endTime - filters.timeRange : endTime - 3600000;

            const params = {
                startTime,
                endTime,
                limit: filters.limit || 20,
                ...this.buildFilterParams(filters)
            };

            const data = await this.request(this.endpoints.TRACES, {
                params,
                cache: false
            });

            stateManager.set('cache.traces', data);
            eventBus.emit(Events.DATA_LOADED, { type: 'traces', data });
            return data;

        } catch (error) {
            stateManager.set('errors.traces', error.message);
            eventBus.emit(Events.DATA_ERROR, { type: 'traces', error });
            throw error;

        } finally {
            stateManager.set('loading.traces', false);
        }
    }

    /**
     * Fetch services data
     * @returns {Promise} Services data
     */
    async fetchServices() {
        stateManager.set('loading.services', true);
        stateManager.set('errors.services', null);

        try {
            const data = await this.request(this.endpoints.SERVICES, {
                cache: false
            });

            stateManager.set('cache.services', data);
            eventBus.emit(Events.DATA_LOADED, { type: 'services', data });
            return data;

        } catch (error) {
            stateManager.set('errors.services', error.message);
            eventBus.emit(Events.DATA_ERROR, { type: 'services', error });
            throw error;

        } finally {
            stateManager.set('loading.services', false);
        }
    }

    /**
     * Fetch single trace by ID
     * @param {string} traceId - Trace ID
     * @returns {Promise} Trace data
     */
    async fetchTrace(traceId) {
        try {
            const data = await this.request(`${this.endpoints.TRACES}/${traceId}`);
            return data;
        } catch (error) {
            console.error('Error fetching trace:', error);
            throw error;
        }
    }

    /**
     * Build filter parameters for API request
     * @param {Object} filters - Filter object
     * @returns {Object} Query parameters
     */
    buildFilterParams(filters = {}) {
        const state = stateManager.getState();
        const mergedFilters = { ...state.filters, ...filters };

        const params = {};

        if (mergedFilters.service && mergedFilters.service !== 'all') {
            params.service = mergedFilters.service;
        }

        if (mergedFilters.timeRange) {
            params.timeRange = mergedFilters.timeRange;
        }

        if (mergedFilters.logLevel && mergedFilters.logLevel !== 'all') {
            params.level = mergedFilters.logLevel;
        }

        if (mergedFilters.searchQuery) {
            params.search = mergedFilters.searchQuery;
        }

        return params;
    }

    /**
     * Delay helper for simulating network latency
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create singleton instance
const apiService = ApiService.getInstance();

