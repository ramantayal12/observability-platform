/**
 * HttpClient - Enterprise-grade HTTP client with interceptors, retry, and error handling
 * @module core/HttpClient
 */

/**
 * @typedef {Object} HttpRequestConfig
 * @property {string} [method='GET'] - HTTP method
 * @property {Object} [headers={}] - Request headers
 * @property {Object} [params={}] - Query parameters
 * @property {Object|null} [body=null] - Request body
 * @property {number} [timeout=30000] - Request timeout in ms
 * @property {boolean} [retry=true] - Enable retry on failure
 * @property {number} [retryAttempts=3] - Number of retry attempts
 * @property {boolean} [cache=false] - Enable response caching
 * @property {number} [cacheTTL=30000] - Cache TTL in ms
 */

/**
 * @typedef {Object} HttpResponse
 * @property {*} data - Response data
 * @property {number} status - HTTP status code
 * @property {Object} headers - Response headers
 * @property {HttpRequestConfig} config - Original request config
 */

/**
 * @typedef {Object} HttpError
 * @property {string} message - Error message
 * @property {number} [status] - HTTP status code
 * @property {string} code - Error code
 * @property {*} [data] - Error response data
 * @property {HttpRequestConfig} config - Original request config
 */

class HttpClient {
    /**
     * @param {Object} config - Client configuration
     * @param {string} config.baseURL - Base URL for all requests
     * @param {number} [config.timeout=30000] - Default timeout
     * @param {Object} [config.headers={}] - Default headers
     */
    constructor(config = {}) {
        this.baseURL = config.baseURL || '';
        this.timeout = config.timeout || 30000;
        this.defaultHeaders = {
            'Content-Type': 'application/json',
            ...config.headers
        };
        
        /** @type {Array<Function>} */
        this.requestInterceptors = [];
        /** @type {Array<{onSuccess: Function, onError: Function}>} */
        this.responseInterceptors = [];
        
        /** @type {Map<string, {data: *, timestamp: number}>} */
        this.cache = new Map();
        
        /** @type {Map<string, Promise>} */
        this.pendingRequests = new Map();
    }

    /**
     * Add request interceptor
     * @param {Function} interceptor - Interceptor function (config) => config
     * @returns {number} Interceptor index for removal
     */
    addRequestInterceptor(interceptor) {
        return this.requestInterceptors.push(interceptor) - 1;
    }

    /**
     * Add response interceptor
     * @param {Function} onSuccess - Success handler (response) => response
     * @param {Function} [onError] - Error handler (error) => Promise.reject(error)
     * @returns {number} Interceptor index for removal
     */
    addResponseInterceptor(onSuccess, onError = null) {
        return this.responseInterceptors.push({ onSuccess, onError }) - 1;
    }

    /**
     * Remove request interceptor
     * @param {number} index - Interceptor index
     */
    removeRequestInterceptor(index) {
        this.requestInterceptors[index] = null;
    }

    /**
     * Remove response interceptor
     * @param {number} index - Interceptor index
     */
    removeResponseInterceptor(index) {
        this.responseInterceptors[index] = null;
    }

    /**
     * Make HTTP request
     * @param {string} url - Request URL (relative to baseURL)
     * @param {HttpRequestConfig} [config={}] - Request configuration
     * @returns {Promise<HttpResponse>}
     * @throws {HttpError}
     */
    async request(url, config = {}) {
        let requestConfig = {
            method: 'GET',
            headers: { ...this.defaultHeaders },
            params: {},
            body: null,
            timeout: this.timeout,
            retry: true,
            retryAttempts: 3,
            cache: false,
            cacheTTL: 30000,
            ...config,
            url
        };

        // Run request interceptors
        for (const interceptor of this.requestInterceptors) {
            if (interceptor) {
                requestConfig = await interceptor(requestConfig);
            }
        }

        const fullURL = this.buildURL(requestConfig.url, requestConfig.params);
        const cacheKey = `${requestConfig.method}:${fullURL}`;

        // Check cache
        if (requestConfig.cache && requestConfig.method === 'GET') {
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < requestConfig.cacheTTL) {
                return { data: cached.data, status: 200, headers: {}, config: requestConfig, fromCache: true };
            }
        }

        // Deduplicate identical pending requests
        if (requestConfig.method === 'GET' && this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }

        const requestPromise = this.executeRequest(fullURL, requestConfig);
        
        if (requestConfig.method === 'GET') {
            this.pendingRequests.set(cacheKey, requestPromise);
        }

        try {
            const response = await requestPromise;

            // Cache successful GET responses
            if (requestConfig.cache && requestConfig.method === 'GET') {
                this.cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
            }

            return response;
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }

    /**
     * Execute HTTP request with retry logic
     * @private
     */
    async executeRequest(url, config) {
        let lastError;
        const attempts = config.retry ? config.retryAttempts : 1;

        for (let attempt = 0; attempt < attempts; attempt++) {
            try {
                const response = await this.doFetch(url, config);
                return await this.processResponse(response, config);
            } catch (error) {
                lastError = error;

                // Don't retry on client errors (4xx)
                if (error.status && error.status >= 400 && error.status < 500) {
                    break;
                }

                // Exponential backoff
                if (attempt < attempts - 1) {
                    await this.delay(Math.pow(2, attempt) * 1000);
                }
            }
        }

        // Run error interceptors
        for (const interceptor of this.responseInterceptors) {
            if (interceptor?.onError) {
                try {
                    return await interceptor.onError(lastError);
                } catch (e) {
                    lastError = e;
                }
            }
        }

        throw lastError;
    }

    /**
     * Perform fetch with timeout
     * @private
     */
    async doFetch(url, config) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        try {
            return await fetch(url, {
                method: config.method,
                headers: config.headers,
                body: config.body ? JSON.stringify(config.body) : null,
                signal: controller.signal
            });
        } finally {
            clearTimeout(timeoutId);
        }
    }

    /**
     * Process response and run interceptors
     * @private
     */
    async processResponse(response, config) {
        let result = {
            data: null,
            status: response.status,
            headers: Object.fromEntries(response.headers.entries()),
            config
        };

        if (!response.ok) {
            const error = {
                message: `HTTP ${response.status}: ${response.statusText}`,
                status: response.status,
                code: `HTTP_${response.status}`,
                config
            };

            try {
                error.data = await response.json();
            } catch (e) {
                // Response is not JSON
            }

            throw error;
        }

        try {
            result.data = await response.json();
        } catch (e) {
            result.data = null;
        }

        // Run success interceptors
        for (const interceptor of this.responseInterceptors) {
            if (interceptor?.onSuccess) {
                result = await interceptor.onSuccess(result);
            }
        }

        return result;
    }

    /**
     * Build URL with query parameters
     * @private
     */
    buildURL(endpoint, params = {}) {
        const url = new URL(this.baseURL + endpoint, window.location.origin);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                url.searchParams.append(key, String(value));
            }
        });
        return url.toString();
    }

    /**
     * Delay helper
     * @private
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Convenience methods
    get(url, config = {}) { return this.request(url, { ...config, method: 'GET' }); }
    post(url, data, config = {}) { return this.request(url, { ...config, method: 'POST', body: data }); }
    put(url, data, config = {}) { return this.request(url, { ...config, method: 'PUT', body: data }); }
    patch(url, data, config = {}) { return this.request(url, { ...config, method: 'PATCH', body: data }); }
    delete(url, config = {}) { return this.request(url, { ...config, method: 'DELETE' }); }

    /**
     * Clear cache
     * @param {string} [pattern] - Optional regex pattern to match cache keys
     */
    clearCache(pattern = null) {
        if (pattern) {
            const regex = new RegExp(pattern);
            for (const key of this.cache.keys()) {
                if (regex.test(key)) this.cache.delete(key);
            }
        } else {
            this.cache.clear();
        }
    }

    /**
     * Create a new instance with merged config
     * @param {Object} config - Additional configuration
     * @returns {HttpClient}
     */
    create(config = {}) {
        return new HttpClient({
            baseURL: config.baseURL || this.baseURL,
            timeout: config.timeout || this.timeout,
            headers: { ...this.defaultHeaders, ...config.headers }
        });
    }

    /** @returns {HttpClient} */
    static getInstance() {
        if (!HttpClient.instance) {
            HttpClient.instance = new HttpClient({
                baseURL: AppConfig?.API?.BASE_URL || 'http://localhost:8080/api',
                timeout: AppConfig?.API?.TIMEOUT || 30000
            });
        }
        return HttpClient.instance;
    }
}

// Create singleton
const httpClient = HttpClient.getInstance();

