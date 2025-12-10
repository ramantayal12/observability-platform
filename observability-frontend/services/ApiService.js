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
     * Get tenant headers for multi-tenancy
     * @returns {Object} Tenant headers
     */
    getTenantHeaders() {
        const headers = {};

        // Try to get from TenantService
        if (window.TenantService) {
            const tenantService = TenantService.getInstance();
            const tenantHeaders = tenantService.getHeaders();
            Object.assign(headers, tenantHeaders);
        } else {
            // Fallback to localStorage
            const cached = localStorage.getItem('observability_current_team');
            if (cached) {
                try {
                    const team = JSON.parse(cached);
                    if (team.id) headers['X-Team-Id'] = String(team.id);
                    if (team.organizationId) headers['X-Organization-Id'] = String(team.organizationId);
                } catch (e) {
                    console.warn('Failed to parse cached team:', e);
                }
            }
        }

        return headers;
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

        // Get tenant headers for multi-tenancy
        const tenantHeaders = this.getTenantHeaders();

        // Create request promise
        const requestPromise = this.executeRequest(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...tenantHeaders,
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

        // Add team context
        if (window.TenantService) {
            const tenantService = TenantService.getInstance();
            const teamId = tenantService.getTeamId();
            const orgId = tenantService.getOrganizationId();
            if (teamId) params.teamId = teamId;
            if (orgId) params.organizationId = orgId;
        } else {
            // Fallback to state or localStorage
            const currentTeam = state.currentTeam || JSON.parse(localStorage.getItem('observability_current_team') || 'null');
            if (currentTeam?.id) params.teamId = currentTeam.id;
            if (currentTeam?.organizationId) params.organizationId = currentTeam.organizationId;
        }

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

    // ==================== Team-Specific API Methods ====================

    /**
     * Get current team ID from TenantService or localStorage
     * @returns {number|null} Team ID
     */
    getCurrentTeamId() {
        if (window.TenantService) {
            const tenantService = TenantService.getInstance();
            return tenantService.getTeamId();
        }
        const cached = localStorage.getItem('observability_current_team');
        if (cached) {
            try {
                return JSON.parse(cached).id;
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Fetch team-specific overview data
     * @param {Object} filters - Filter parameters
     * @returns {Promise} Team overview data
     */
    async fetchTeamOverview(filters = {}) {
        const teamId = this.getCurrentTeamId();
        if (!teamId) {
            console.warn('[ApiService] No team selected, falling back to mock overview');
            return this.fetchOverview(filters);
        }

        console.log('[ApiService] fetchTeamOverview for team:', teamId);
        stateManager.set('loading.metrics', true);
        stateManager.set('errors.metrics', null);

        try {
            const endTime = Date.now();
            const startTime = filters.timeRange ? endTime - filters.timeRange : endTime - 3600000;

            const params = { startTime, endTime };
            const data = await this.request(`/teams/${teamId}/data/overview`, {
                params,
                cache: false
            });

            // Extract data from ApiResponse wrapper if present
            const overviewData = data.success && data.data ? data.data : data;
            stateManager.set('cache.overview', overviewData);
            eventBus.emit(Events.DATA_LOADED, { type: 'overview', data: overviewData });
            return overviewData;

        } catch (error) {
            console.error('[ApiService] Error fetching team overview:', error);
            stateManager.set('errors.metrics', error.message);
            eventBus.emit(Events.DATA_ERROR, { type: 'overview', error });
            throw error;

        } finally {
            stateManager.set('loading.metrics', false);
        }
    }

    /**
     * Fetch team-specific metrics data
     * @param {Object} filters - Filter parameters
     * @returns {Promise} Team metrics data
     */
    async fetchTeamMetrics(filters = {}) {
        const teamId = this.getCurrentTeamId();
        if (!teamId) {
            return this.fetchMetrics(filters);
        }

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

            const data = await this.request(`/teams/${teamId}/data/metrics`, {
                params,
                cache: false
            });

            const metricsData = data.success && data.data ? data.data : data;
            stateManager.set('cache.metrics', metricsData);
            eventBus.emit(Events.DATA_LOADED, { type: 'metrics', data: metricsData });
            return metricsData;

        } catch (error) {
            stateManager.set('errors.metrics', error.message);
            eventBus.emit(Events.DATA_ERROR, { type: 'metrics', error });
            throw error;

        } finally {
            stateManager.set('loading.metrics', false);
        }
    }

    /**
     * Fetch team-specific logs data
     * @param {Object} filters - Filter parameters
     * @returns {Promise} Team logs data
     */
    async fetchTeamLogs(filters = {}) {
        const teamId = this.getCurrentTeamId();
        if (!teamId) {
            return this.fetchLogs(filters);
        }

        stateManager.set('loading.logs', true);
        stateManager.set('errors.logs', null);

        try {
            const endTime = Date.now();
            const startTime = filters.timeRange ? endTime - filters.timeRange : endTime - 3600000;

            const params = {
                startTime,
                endTime,
                limit: filters.limit || 100,
                ...this.buildFilterParams(filters)
            };

            const data = await this.request(`/teams/${teamId}/data/logs`, {
                params,
                cache: false
            });

            const logsData = data.success && data.data ? data.data : data;
            stateManager.set('cache.logs', logsData);
            eventBus.emit(Events.DATA_LOADED, { type: 'logs', data: logsData });
            return logsData;

        } catch (error) {
            stateManager.set('errors.logs', error.message);
            eventBus.emit(Events.DATA_ERROR, { type: 'logs', error });
            throw error;

        } finally {
            stateManager.set('loading.logs', false);
        }
    }

    /**
     * Fetch team-specific traces data
     * @param {Object} filters - Filter parameters
     * @returns {Promise} Team traces data
     */
    async fetchTeamTraces(filters = {}) {
        const teamId = this.getCurrentTeamId();
        if (!teamId) {
            return this.fetchTraces(filters);
        }

        stateManager.set('loading.traces', true);
        stateManager.set('errors.traces', null);

        try {
            const endTime = Date.now();
            const startTime = filters.timeRange ? endTime - filters.timeRange : endTime - 3600000;

            const params = {
                startTime,
                endTime,
                limit: filters.limit || 50,
                ...this.buildFilterParams(filters)
            };

            const data = await this.request(`/teams/${teamId}/data/traces`, {
                params,
                cache: false
            });

            const tracesData = data.success && data.data ? data.data : data;
            stateManager.set('cache.traces', tracesData);
            eventBus.emit(Events.DATA_LOADED, { type: 'traces', data: tracesData });
            return tracesData;

        } catch (error) {
            stateManager.set('errors.traces', error.message);
            eventBus.emit(Events.DATA_ERROR, { type: 'traces', error });
            throw error;

        } finally {
            stateManager.set('loading.traces', false);
        }
    }

    /**
     * Fetch team-specific services data
     * @returns {Promise} Team services data
     */
    async fetchTeamServices() {
        const teamId = this.getCurrentTeamId();
        if (!teamId) {
            return this.fetchServices();
        }

        stateManager.set('loading.services', true);
        stateManager.set('errors.services', null);

        try {
            const data = await this.request(`/teams/${teamId}/data/services`, {
                cache: false
            });

            const servicesData = data.success && data.data ? data.data : data;
            stateManager.set('cache.services', servicesData);
            eventBus.emit(Events.DATA_LOADED, { type: 'services', data: servicesData });
            return servicesData;

        } catch (error) {
            stateManager.set('errors.services', error.message);
            eventBus.emit(Events.DATA_ERROR, { type: 'services', error });
            throw error;

        } finally {
            stateManager.set('loading.services', false);
        }
    }

    /**
     * Fetch team-specific alerts data
     * @param {number} teamId - Team ID (optional, uses current team if not provided)
     * @param {Object} filters - Filter parameters (status, severity)
     * @returns {Promise} Team alerts data
     */
    async fetchTeamAlerts(teamId = null, filters = {}) {
        const resolvedTeamId = teamId || this.getCurrentTeamId();
        if (!resolvedTeamId) {
            console.warn('[ApiService] No team selected for alerts');
            return { alerts: [], total: 0 };
        }

        stateManager.set('loading.alerts', true);
        stateManager.set('errors.alerts', null);

        try {
            const params = new URLSearchParams();
            if (filters.status) params.set('status', filters.status);
            if (filters.severity) params.set('severity', filters.severity);

            const queryString = params.toString();
            const url = `/teams/${resolvedTeamId}/data/alerts${queryString ? '?' + queryString : ''}`;

            const data = await this.request(url, { cache: false });

            const alertsData = data.success && data.data ? data.data : data;
            stateManager.set('cache.alerts', alertsData);
            eventBus.emit(Events.DATA_LOADED, { type: 'alerts', data: alertsData });
            return alertsData;

        } catch (error) {
            stateManager.set('errors.alerts', error.message);
            eventBus.emit(Events.DATA_ERROR, { type: 'alerts', error });
            throw error;

        } finally {
            stateManager.set('loading.alerts', false);
        }
    }
}

// Create singleton instance
const apiService = ApiService.getInstance();

