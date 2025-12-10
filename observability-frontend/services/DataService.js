/**
 * DataService - High-level data access service
 * Provides unified interface for fetching observability data
 * Uses Repository pattern internally
 * @module services/DataService
 */

/**
 * @typedef {Object} TimeRange
 * @property {number} startTime - Start time in epoch ms
 * @property {number} endTime - End time in epoch ms
 */

/**
 * @typedef {Object} DataFilters
 * @property {string} [service] - Service name filter
 * @property {string} [level] - Log level filter
 * @property {string} [status] - Trace status filter
 * @property {string} [query] - Search query
 * @property {number} [limit] - Result limit
 */

class DataService {
    constructor() {
        this.repositoryFactory = RepositoryFactory.getInstance();
        this.stateManager = stateManager;
        this.eventBus = eventBus;
    }

    /**
     * Get current time range from state or default
     * @returns {TimeRange}
     */
    getTimeRange() {
        const timeRangeMs = this.stateManager.get('filters.timeRange') || 3600000;
        const endTime = Date.now();
        const startTime = endTime - timeRangeMs;
        return { startTime, endTime };
    }

    /**
     * Get current filters from state
     * @returns {DataFilters}
     */
    getFilters() {
        const state = this.stateManager.getState();
        return {
            service: state.filters.service,
            level: state.filters.logLevel,
            query: state.filters.searchQuery
        };
    }

    /**
     * Fetch dashboard overview data
     * @param {DataFilters} [filters={}] - Additional filters
     * @returns {Promise<Object>}
     */
    async fetchOverview(filters = {}) {
        this.setLoading('metrics', true);
        this.clearError('metrics');

        try {
            const { startTime, endTime } = this.getTimeRange();
            const mergedFilters = { ...this.getFilters(), ...filters };

            const mode = AppConfig?.API?.MODE || 'mock';
            const endpoint = mode === 'real' 
                ? AppConfig.API.ENDPOINTS.REAL.OVERVIEW 
                : AppConfig.API.ENDPOINTS.MOCK.OVERVIEW;

            const response = await httpClient.get(endpoint, {
                params: { startTime, endTime, ...this.buildParams(mergedFilters) }
            });

            const data = response.data;
            this.stateManager.set('cache.overview', data);
            this.eventBus.emit(Events.DATA_LOADED, { type: 'overview', data });
            
            return data;
        } catch (error) {
            this.setError('metrics', error.message);
            this.eventBus.emit(Events.DATA_ERROR, { type: 'overview', error });
            throw error;
        } finally {
            this.setLoading('metrics', false);
        }
    }

    /**
     * Fetch metrics data
     * @param {DataFilters} [filters={}] - Additional filters
     * @returns {Promise<Object>}
     */
    async fetchMetrics(filters = {}) {
        this.setLoading('metrics', true);
        this.clearError('metrics');

        try {
            const { startTime, endTime } = this.getTimeRange();
            const mergedFilters = { ...this.getFilters(), ...filters };

            const repo = this.repositoryFactory.get('metrics');
            const data = await repo.getMetrics({
                startTime,
                endTime,
                serviceName: mergedFilters.service,
                limit: mergedFilters.limit || 100
            });

            this.stateManager.set('cache.metrics', data);
            this.eventBus.emit(Events.DATA_LOADED, { type: 'metrics', data });
            
            return data;
        } catch (error) {
            this.setError('metrics', error.message);
            this.eventBus.emit(Events.DATA_ERROR, { type: 'metrics', error });
            throw error;
        } finally {
            this.setLoading('metrics', false);
        }
    }

    /**
     * Fetch logs data
     * @param {DataFilters} [filters={}] - Additional filters
     * @returns {Promise<Object>}
     */
    async fetchLogs(filters = {}) {
        this.setLoading('logs', true);
        this.clearError('logs');

        try {
            const { startTime, endTime } = this.getTimeRange();
            const mergedFilters = { ...this.getFilters(), ...filters };

            const repo = this.repositoryFactory.get('logs');
            const data = await repo.getLogs({
                startTime,
                endTime,
                serviceName: mergedFilters.service,
                level: mergedFilters.level,
                query: mergedFilters.query,
                limit: mergedFilters.limit || 500
            });

            this.stateManager.set('cache.logs', data);
            this.eventBus.emit(Events.DATA_LOADED, { type: 'logs', data });
            
            return data;
        } catch (error) {
            this.setError('logs', error.message);
            this.eventBus.emit(Events.DATA_ERROR, { type: 'logs', error });
            throw error;
        } finally {
            this.setLoading('logs', false);
        }
    }

    /**
     * Fetch traces data
     * @param {DataFilters} [filters={}] - Additional filters
     * @returns {Promise<Object>}
     */
    async fetchTraces(filters = {}) {
        this.setLoading('traces', true);
        this.clearError('traces');

        try {
            const { startTime, endTime } = this.getTimeRange();
            const mergedFilters = { ...this.getFilters(), ...filters };

            const repo = this.repositoryFactory.get('traces');
            const data = await repo.getTraces({
                startTime,
                endTime,
                serviceName: mergedFilters.service,
                status: mergedFilters.status,
                limit: mergedFilters.limit || 100
            });

            this.stateManager.set('cache.traces', data);
            this.eventBus.emit(Events.DATA_LOADED, { type: 'traces', data });
            
            return data;
        } catch (error) {
            this.setError('traces', error.message);
            this.eventBus.emit(Events.DATA_ERROR, { type: 'traces', error });
            throw error;
        } finally {
            this.setLoading('traces', false);
        }
    }

    /**
     * Fetch single trace by ID
     * @param {string} traceId - Trace ID
     * @returns {Promise<Object>}
     */
    async fetchTrace(traceId) {
        try {
            const repo = this.repositoryFactory.get('traces');
            return await repo.getTrace(traceId);
        } catch (error) {
            errorBoundary.handleError(error, 'DataService.fetchTrace');
            throw error;
        }
    }

    /**
     * Fetch services data
     * @returns {Promise<Object>}
     */
    async fetchServices() {
        this.setLoading('services', true);
        this.clearError('services');

        try {
            const repo = this.repositoryFactory.get('services');
            const data = await repo.getServices();

            this.stateManager.set('cache.services', data);
            this.eventBus.emit(Events.DATA_LOADED, { type: 'services', data });
            
            return data;
        } catch (error) {
            this.setError('services', error.message);
            this.eventBus.emit(Events.DATA_ERROR, { type: 'services', error });
            throw error;
        } finally {
            this.setLoading('services', false);
        }
    }

    /**
     * Refresh all data
     * @returns {Promise<void>}
     */
    async refreshAll() {
        await Promise.allSettled([
            this.fetchOverview(),
            this.fetchMetrics(),
            this.fetchLogs(),
            this.fetchTraces(),
            this.fetchServices()
        ]);
    }

    // Helper methods
    setLoading(type, value) {
        this.stateManager.set(`loading.${type}`, value);
    }

    setError(type, message) {
        this.stateManager.set(`errors.${type}`, message);
    }

    clearError(type) {
        this.stateManager.set(`errors.${type}`, null);
    }

    buildParams(filters) {
        const params = {};
        if (filters.service && filters.service !== 'all') params.service = filters.service;
        if (filters.level && filters.level !== 'all') params.level = filters.level;
        if (filters.query) params.query = filters.query;
        return params;
    }

    /** @returns {DataService} */
    static getInstance() {
        if (!DataService.instance) {
            DataService.instance = new DataService();
        }
        return DataService.instance;
    }
}

// Create singleton
const dataService = DataService.getInstance();

