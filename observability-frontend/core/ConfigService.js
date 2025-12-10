/**
 * ConfigService - Centralized configuration management
 * Provides type-safe access to configuration with defaults and validation
 * @module core/ConfigService
 */

/**
 * @typedef {Object} ConfigSchema
 * @property {*} default - Default value
 * @property {string} [type] - Expected type (string, number, boolean, object, array)
 * @property {boolean} [required] - Whether the config is required
 * @property {Function} [validate] - Custom validation function
 */

class ConfigService {
    constructor() {
        /** @type {Object} */
        this.config = {};
        /** @type {Map<string, ConfigSchema>} */
        this.schema = new Map();
        /** @type {Set<string>} */
        this.frozen = new Set();
    }

    /**
     * Define configuration schema
     * @param {Object<string, ConfigSchema>} schema - Configuration schema
     */
    defineSchema(schema) {
        for (const [key, definition] of Object.entries(schema)) {
            this.schema.set(key, definition);
            if (definition.default !== undefined) {
                this.set(key, definition.default);
            }
        }
    }

    /**
     * Load configuration from an object
     * @param {Object} config - Configuration object
     * @param {boolean} [merge=true] - Whether to merge with existing config
     */
    load(config, merge = true) {
        if (merge) {
            this.config = this.deepMerge(this.config, config);
        } else {
            this.config = { ...config };
        }
    }

    /**
     * Get a configuration value
     * @param {string} key - Configuration key (supports dot notation)
     * @param {*} [defaultValue] - Default value if not found
     * @returns {*} Configuration value
     */
    get(key, defaultValue) {
        const value = this.getNestedValue(this.config, key);
        if (value === undefined) {
            const schema = this.schema.get(key);
            return schema?.default ?? defaultValue;
        }
        return value;
    }

    /**
     * Set a configuration value
     * @param {string} key - Configuration key (supports dot notation)
     * @param {*} value - Value to set
     * @throws {Error} If key is frozen
     */
    set(key, value) {
        if (this.frozen.has(key)) {
            throw new Error(`Configuration key "${key}" is frozen and cannot be modified`);
        }

        // Validate against schema
        const schema = this.schema.get(key);
        if (schema) {
            this.validateValue(key, value, schema);
        }

        this.setNestedValue(this.config, key, value);
    }

    /**
     * Freeze a configuration key (prevent further modifications)
     * @param {string} key - Configuration key
     */
    freeze(key) {
        this.frozen.add(key);
    }

    /**
     * Check if a configuration key exists
     * @param {string} key - Configuration key
     * @returns {boolean}
     */
    has(key) {
        return this.getNestedValue(this.config, key) !== undefined;
    }

    /**
     * Get all configuration as an object
     * @returns {Object}
     */
    getAll() {
        return JSON.parse(JSON.stringify(this.config));
    }

    /**
     * Validate a value against schema
     */
    validateValue(key, value, schema) {
        if (schema.required && (value === undefined || value === null)) {
            throw new Error(`Configuration "${key}" is required`);
        }

        if (schema.type && value !== undefined && value !== null) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== schema.type) {
                throw new Error(`Configuration "${key}" must be of type ${schema.type}, got ${actualType}`);
            }
        }

        if (schema.validate && !schema.validate(value)) {
            throw new Error(`Configuration "${key}" failed validation`);
        }
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((o, k) => (o || {})[k], obj);
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((o, k) => {
            if (!(k in o)) o[k] = {};
            return o[k];
        }, obj);
        target[lastKey] = value;
    }

    deepMerge(target, source) {
        const result = { ...target };
        for (const key of Object.keys(source)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }

    static getInstance() {
        if (!ConfigService.instance) {
            ConfigService.instance = new ConfigService();
        }
        return ConfigService.instance;
    }
}

// Create singleton
const configService = ConfigService.getInstance();

