/**
 * Repository Pattern - Abstract data access layer
 * Provides consistent interface for data operations regardless of source
 * @module core/Repository
 */

/**
 * @typedef {Object} QueryOptions
 * @property {number} [limit] - Maximum number of results
 * @property {number} [offset] - Offset for pagination
 * @property {string} [sortBy] - Field to sort by
 * @property {'asc'|'desc'} [sortOrder] - Sort order
 * @property {Object} [filters] - Filter criteria
 */

/**
 * @typedef {Object} PagedResult
 * @property {Array} data - Result data
 * @property {number} total - Total count
 * @property {number} page - Current page
 * @property {number} pageSize - Page size
 * @property {boolean} hasMore - Has more pages
 */

/**
 * Base Repository class - extend for specific data types
 * @abstract
 */
class BaseRepository {
    /**
     * @param {HttpClient} httpClient - HTTP client instance
     * @param {string} endpoint - API endpoint
     */
    constructor(httpClient, endpoint) {
        this.http = httpClient;
        this.endpoint = endpoint;
    }

    /**
     * Find all entities
     * @param {QueryOptions} [options={}] - Query options
     * @returns {Promise<PagedResult>}
     */
    async findAll(options = {}) {
        const params = this.buildQueryParams(options);
        const response = await this.http.get(this.endpoint, { params });
        return this.transformResponse(response.data);
    }

    /**
     * Find entity by ID
     * @param {string|number} id - Entity ID
     * @returns {Promise<Object>}
     */
    async findById(id) {
        const response = await this.http.get(`${this.endpoint}/${id}`);
        return response.data;
    }

    /**
     * Create new entity
     * @param {Object} data - Entity data
     * @returns {Promise<Object>}
     */
    async create(data) {
        const response = await this.http.post(this.endpoint, data);
        return response.data;
    }

    /**
     * Update entity
     * @param {string|number} id - Entity ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>}
     */
    async update(id, data) {
        const response = await this.http.put(`${this.endpoint}/${id}`, data);
        return response.data;
    }

    /**
     * Delete entity
     * @param {string|number} id - Entity ID
     * @returns {Promise<void>}
     */
    async delete(id) {
        await this.http.delete(`${this.endpoint}/${id}`);
    }

    /**
     * Build query parameters from options
     * @protected
     * @param {QueryOptions} options
     * @returns {Object}
     */
    buildQueryParams(options) {
        const params = {};
        if (options.limit) params.limit = options.limit;
        if (options.offset) params.offset = options.offset;
        if (options.sortBy) params.sortBy = options.sortBy;
        if (options.sortOrder) params.sortOrder = options.sortOrder;
        if (options.filters) {
            Object.entries(options.filters).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '' && value !== 'all') {
                    params[key] = value;
                }
            });
        }
        return params;
    }

    /**
     * Transform API response to standard format
     * @protected
     * @param {Object} data - Raw response data
     * @returns {PagedResult}
     */
    transformResponse(data) {
        // Override in subclass for custom transformation
        return data;
    }
}

/**
 * Metrics Repository
 */
class MetricsRepository extends BaseRepository {
    constructor(httpClient) {
        const mode = AppConfig?.API?.MODE || 'mock';
        const endpoint = mode === 'real' 
            ? AppConfig.API.ENDPOINTS.REAL.METRICS 
            : AppConfig.API.ENDPOINTS.MOCK.METRICS;
        super(httpClient, endpoint);
    }

    /**
     * Get metrics with time range
     * @param {Object} options
     * @param {number} options.startTime - Start time in epoch ms
     * @param {number} options.endTime - End time in epoch ms
     * @param {string} [options.serviceName] - Filter by service
     * @param {string} [options.metricName] - Filter by metric name
     * @returns {Promise<Object>}
     */
    async getMetrics({ startTime, endTime, serviceName, metricName, limit = 100 }) {
        const params = { startTime, endTime, limit };
        if (serviceName && serviceName !== 'all') params.serviceName = serviceName;
        if (metricName) params.metricName = metricName;
        
        const response = await this.http.get(this.endpoint, { params });
        return response.data;
    }
}

/**
 * Logs Repository
 */
class LogsRepository extends BaseRepository {
    constructor(httpClient) {
        const mode = AppConfig?.API?.MODE || 'mock';
        const endpoint = mode === 'real' 
            ? AppConfig.API.ENDPOINTS.REAL.LOGS 
            : AppConfig.API.ENDPOINTS.MOCK.LOGS;
        super(httpClient, endpoint);
    }

    /**
     * Get logs with filters
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    async getLogs({ startTime, endTime, serviceName, level, query, limit = 500 }) {
        const params = { startTime, endTime, limit };
        if (serviceName && serviceName !== 'all') params.serviceName = serviceName;
        if (level && level !== 'all') params.level = level;
        if (query) params.query = query;
        
        const response = await this.http.get(this.endpoint, { params });
        return response.data;
    }

    /**
     * Search logs
     * @param {string} query - Search query
     * @param {Object} options - Additional options
     * @returns {Promise<Object>}
     */
    async search(query, options = {}) {
        return this.getLogs({ ...options, query });
    }
}

/**
 * Traces Repository
 */
class TracesRepository extends BaseRepository {
    constructor(httpClient) {
        const mode = AppConfig?.API?.MODE || 'mock';
        const endpoint = mode === 'real' 
            ? AppConfig.API.ENDPOINTS.REAL.TRACES 
            : AppConfig.API.ENDPOINTS.MOCK.TRACES;
        super(httpClient, endpoint);
    }

    /**
     * Get traces with filters
     * @param {Object} options
     * @returns {Promise<Object>}
     */
    async getTraces({ startTime, endTime, serviceName, status, minDuration, maxDuration, limit = 100 }) {
        const params = { startTime, endTime, limit };
        if (serviceName && serviceName !== 'all') params.serviceName = serviceName;
        if (status) params.status = status;
        if (minDuration) params.minDuration = minDuration;
        if (maxDuration) params.maxDuration = maxDuration;
        
        const response = await this.http.get(this.endpoint, { params });
        return response.data;
    }

    /**
     * Get trace by ID with all spans
     * @param {string} traceId
     * @returns {Promise<Object>}
     */
    async getTrace(traceId) {
        const response = await this.http.get(`${this.endpoint}/${traceId}`);
        return response.data;
    }
}

/**
 * Services Repository
 */
class ServicesRepository extends BaseRepository {
    constructor(httpClient) {
        const mode = AppConfig?.API?.MODE || 'mock';
        const endpoint = mode === 'real' 
            ? AppConfig.API.ENDPOINTS.REAL.SERVICES 
            : AppConfig.API.ENDPOINTS.MOCK.SERVICES;
        super(httpClient, endpoint);
    }

    /**
     * Get all services with health status
     * @returns {Promise<Object>}
     */
    async getServices() {
        const response = await this.http.get(this.endpoint);
        return response.data;
    }

    /**
     * Get service details
     * @param {string} serviceName
     * @returns {Promise<Object>}
     */
    async getServiceDetails(serviceName) {
        const response = await this.http.get(`${this.endpoint}/${serviceName}`);
        return response.data;
    }
}

/**
 * Repository Factory - Creates and caches repository instances
 */
class RepositoryFactory {
    constructor() {
        this.repositories = new Map();
        this.httpClient = HttpClient.getInstance();
    }

    /**
     * Get repository instance
     * @param {'metrics'|'logs'|'traces'|'services'} type
     * @returns {BaseRepository}
     */
    get(type) {
        if (!this.repositories.has(type)) {
            switch (type) {
                case 'metrics':
                    this.repositories.set(type, new MetricsRepository(this.httpClient));
                    break;
                case 'logs':
                    this.repositories.set(type, new LogsRepository(this.httpClient));
                    break;
                case 'traces':
                    this.repositories.set(type, new TracesRepository(this.httpClient));
                    break;
                case 'services':
                    this.repositories.set(type, new ServicesRepository(this.httpClient));
                    break;
                default:
                    throw new Error(`Unknown repository type: ${type}`);
            }
        }
        return this.repositories.get(type);
    }

    /** @returns {RepositoryFactory} */
    static getInstance() {
        if (!RepositoryFactory.instance) {
            RepositoryFactory.instance = new RepositoryFactory();
        }
        return RepositoryFactory.instance;
    }
}

// Create singleton
const repositoryFactory = RepositoryFactory.getInstance();

