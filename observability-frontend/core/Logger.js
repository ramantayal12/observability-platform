/**
 * Logger - Enterprise-grade logging service
 * Provides structured logging with levels, context, and remote reporting
 * @module core/Logger
 */

/**
 * @typedef {'DEBUG'|'INFO'|'WARN'|'ERROR'} LogLevel
 */

/**
 * @typedef {Object} LogEntry
 * @property {string} level - Log level
 * @property {string} message - Log message
 * @property {number} timestamp - Unix timestamp
 * @property {string} [context] - Logger context/module name
 * @property {Object} [data] - Additional data
 * @property {Error} [error] - Error object if applicable
 */

const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

class Logger {
    /**
     * @param {string} context - Logger context (e.g., module name)
     * @param {Object} options - Logger options
     */
    constructor(context = 'App', options = {}) {
        this.context = context;
        this.minLevel = LOG_LEVELS[options.minLevel || 'DEBUG'];
        this.enableConsole = options.enableConsole !== false;
        this.enableRemote = options.enableRemote || false;
        this.remoteEndpoint = options.remoteEndpoint || null;
        
        /** @type {LogEntry[]} */
        this.history = [];
        this.maxHistory = options.maxHistory || 100;
        
        /** @type {Function[]} */
        this.handlers = [];
    }

    /**
     * Add a log handler
     * @param {Function} handler - Handler function (entry) => void
     */
    addHandler(handler) {
        this.handlers.push(handler);
    }

    /**
     * Create a child logger with a sub-context
     * @param {string} subContext - Sub-context name
     * @returns {Logger}
     */
    child(subContext) {
        return new Logger(`${this.context}:${subContext}`, {
            minLevel: Object.keys(LOG_LEVELS).find(k => LOG_LEVELS[k] === this.minLevel),
            enableConsole: this.enableConsole,
            enableRemote: this.enableRemote,
            remoteEndpoint: this.remoteEndpoint
        });
    }

    /**
     * Log at DEBUG level
     * @param {string} message - Log message
     * @param {Object} [data] - Additional data
     */
    debug(message, data) {
        this.log('DEBUG', message, data);
    }

    /**
     * Log at INFO level
     * @param {string} message - Log message
     * @param {Object} [data] - Additional data
     */
    info(message, data) {
        this.log('INFO', message, data);
    }

    /**
     * Log at WARN level
     * @param {string} message - Log message
     * @param {Object} [data] - Additional data
     */
    warn(message, data) {
        this.log('WARN', message, data);
    }

    /**
     * Log at ERROR level
     * @param {string} message - Log message
     * @param {Error|Object} [errorOrData] - Error or additional data
     */
    error(message, errorOrData) {
        const data = errorOrData instanceof Error 
            ? { error: { message: errorOrData.message, stack: errorOrData.stack } }
            : errorOrData;
        this.log('ERROR', message, data);
    }

    /**
     * Core logging method
     * @param {LogLevel} level - Log level
     * @param {string} message - Log message
     * @param {Object} [data] - Additional data
     */
    log(level, message, data) {
        if (LOG_LEVELS[level] < this.minLevel) return;

        /** @type {LogEntry} */
        const entry = {
            level,
            message,
            timestamp: Date.now(),
            context: this.context,
            data
        };

        // Add to history
        this.history.push(entry);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        // Console output
        if (this.enableConsole) {
            this.writeToConsole(entry);
        }

        // Call handlers
        this.handlers.forEach(handler => {
            try { handler(entry); } catch (e) { /* ignore */ }
        });

        // Remote logging
        if (this.enableRemote && LOG_LEVELS[level] >= LOG_LEVELS.WARN) {
            this.sendToRemote(entry);
        }
    }

    writeToConsole(entry) {
        const prefix = `[${entry.context}]`;
        const args = [prefix, entry.message];
        if (entry.data) args.push(entry.data);

        switch (entry.level) {
            case 'DEBUG': console.debug(...args); break;
            case 'INFO': console.info(...args); break;
            case 'WARN': console.warn(...args); break;
            case 'ERROR': console.error(...args); break;
        }
    }

    async sendToRemote(entry) {
        if (!this.remoteEndpoint) return;
        try {
            await fetch(this.remoteEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entry)
            });
        } catch (e) { /* ignore remote logging errors */ }
    }

    getHistory() { return [...this.history]; }
    clearHistory() { this.history = []; }

    static getInstance() {
        if (!Logger.rootInstance) {
            Logger.rootInstance = new Logger('App');
        }
        return Logger.rootInstance;
    }
}

// Create root logger
const logger = Logger.getInstance();

