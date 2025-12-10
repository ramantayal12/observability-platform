/**
 * ValidationService - Enterprise-grade input validation
 * Provides reusable validation rules and form validation
 * @module core/ValidationService
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid - Whether validation passed
 * @property {string[]} errors - Array of error messages
 */

/**
 * @typedef {Object} ValidationRule
 * @property {string} type - Rule type (required, minLength, maxLength, pattern, custom)
 * @property {*} value - Rule value (e.g., min length number)
 * @property {string} message - Error message
 */

class ValidationService {
    constructor() {
        /** @type {Map<string, Function>} */
        this.validators = new Map();
        this.registerBuiltInValidators();
    }

    /**
     * Register built-in validators
     */
    registerBuiltInValidators() {
        this.register('required', (value) => {
            if (value === null || value === undefined) return false;
            if (typeof value === 'string') return value.trim().length > 0;
            if (Array.isArray(value)) return value.length > 0;
            return true;
        });

        this.register('minLength', (value, min) => {
            if (!value) return true; // Let required handle empty
            return String(value).length >= min;
        });

        this.register('maxLength', (value, max) => {
            if (!value) return true;
            return String(value).length <= max;
        });

        this.register('min', (value, min) => {
            if (value === null || value === undefined) return true;
            return Number(value) >= min;
        });

        this.register('max', (value, max) => {
            if (value === null || value === undefined) return true;
            return Number(value) <= max;
        });

        this.register('pattern', (value, pattern) => {
            if (!value) return true;
            const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
            return regex.test(String(value));
        });

        this.register('email', (value) => {
            if (!value) return true;
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
        });

        this.register('url', (value) => {
            if (!value) return true;
            try {
                new URL(value);
                return true;
            } catch {
                return false;
            }
        });

        this.register('numeric', (value) => {
            if (!value) return true;
            return !isNaN(Number(value));
        });

        this.register('integer', (value) => {
            if (!value) return true;
            return Number.isInteger(Number(value));
        });

        this.register('oneOf', (value, options) => {
            if (!value) return true;
            return options.includes(value);
        });
    }

    /**
     * Register a custom validator
     * @param {string} name - Validator name
     * @param {Function} fn - Validator function (value, param) => boolean
     */
    register(name, fn) {
        this.validators.set(name, fn);
    }

    /**
     * Validate a single value against rules
     * @param {*} value - Value to validate
     * @param {ValidationRule[]} rules - Validation rules
     * @returns {ValidationResult}
     */
    validate(value, rules) {
        const errors = [];

        for (const rule of rules) {
            const validator = this.validators.get(rule.type);
            if (!validator) {
                console.warn(`Unknown validator: ${rule.type}`);
                continue;
            }

            const isValid = rule.type === 'custom' 
                ? rule.value(value) 
                : validator(value, rule.value);

            if (!isValid) {
                errors.push(rule.message || `Validation failed: ${rule.type}`);
            }
        }

        return { valid: errors.length === 0, errors };
    }

    /**
     * Validate an object against a schema
     * @param {Object} data - Data object to validate
     * @param {Object<string, ValidationRule[]>} schema - Validation schema
     * @returns {{valid: boolean, errors: Object<string, string[]>}}
     */
    validateObject(data, schema) {
        const errors = {};
        let valid = true;

        for (const [field, rules] of Object.entries(schema)) {
            const value = this.getNestedValue(data, field);
            const result = this.validate(value, rules);
            
            if (!result.valid) {
                valid = false;
                errors[field] = result.errors;
            }
        }

        return { valid, errors };
    }

    /**
     * Get nested value from object using dot notation
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((o, k) => (o || {})[k], obj);
    }

    /** @returns {ValidationService} */
    static getInstance() {
        if (!ValidationService.instance) {
            ValidationService.instance = new ValidationService();
        }
        return ValidationService.instance;
    }
}

// Create singleton
const validationService = ValidationService.getInstance();

