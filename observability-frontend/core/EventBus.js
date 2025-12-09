/**
 * EventBus - Centralized event management system
 * Enables loose coupling between modules through pub/sub pattern
 */

class EventBus {
    constructor() {
        this.events = new Map();
        this.eventHistory = [];
        this.maxHistorySize = 100;
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Callback function
     * @param {Object} context - Context for callback execution
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback, context = null) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }

        const listener = { callback, context };
        this.events.get(eventName).push(listener);

        // Return unsubscribe function
        return () => this.off(eventName, callback);
    }

    /**
     * Subscribe to an event (one-time)
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Callback function
     * @param {Object} context - Context for callback execution
     */
    once(eventName, callback, context = null) {
        const onceWrapper = (...args) => {
            callback.apply(context, args);
            this.off(eventName, onceWrapper);
        };
        this.on(eventName, onceWrapper, context);
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Callback function to remove
     */
    off(eventName, callback) {
        if (!this.events.has(eventName)) return;

        const listeners = this.events.get(eventName);
        const index = listeners.findIndex(listener => listener.callback === callback);
        
        if (index !== -1) {
            listeners.splice(index, 1);
        }

        if (listeners.length === 0) {
            this.events.delete(eventName);
        }
    }

    /**
     * Emit an event
     * @param {string} eventName - Name of the event
     * @param {*} data - Data to pass to listeners
     */
    emit(eventName, data = null) {
        // Add to history
        this.addToHistory(eventName, data);

        if (!this.events.has(eventName)) return;

        const listeners = this.events.get(eventName);
        listeners.forEach(listener => {
            try {
                listener.callback.call(listener.context, data);
            } catch (error) {
                console.error(`Error in event listener for "${eventName}":`, error);
            }
        });
    }

    /**
     * Add event to history
     * @param {string} eventName - Name of the event
     * @param {*} data - Event data
     */
    addToHistory(eventName, data) {
        this.eventHistory.push({
            eventName,
            data,
            timestamp: Date.now()
        });

        // Limit history size
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
    }

    /**
     * Get event history
     * @param {string} eventName - Optional filter by event name
     * @returns {Array} Event history
     */
    getHistory(eventName = null) {
        if (eventName) {
            return this.eventHistory.filter(event => event.eventName === eventName);
        }
        return [...this.eventHistory];
    }

    /**
     * Clear all event listeners
     */
    clear() {
        this.events.clear();
    }

    /**
     * Get all registered events
     * @returns {Array} List of event names
     */
    getRegisteredEvents() {
        return Array.from(this.events.keys());
    }

    /**
     * Get listener count for an event
     * @param {string} eventName - Name of the event
     * @returns {number} Number of listeners
     */
    getListenerCount(eventName) {
        return this.events.has(eventName) ? this.events.get(eventName).length : 0;
    }

    /**
     * Singleton accessor
     */
    static getInstance() {
        if (!EventBus.instance) {
            EventBus.instance = new EventBus();
        }
        return EventBus.instance;
    }
}

// Create singleton instance
const eventBus = EventBus.getInstance();

// Define standard events
const Events = {
    // Navigation events
    ROUTE_CHANGED: 'route:changed',
    PAGE_LOADED: 'page:loaded',
    
    // Data events
    DATA_LOADED: 'data:loaded',
    DATA_ERROR: 'data:error',
    DATA_REFRESH: 'data:refresh',
    
    // State events
    STATE_CHANGED: 'state:changed',
    FILTER_CHANGED: 'filter:changed',
    TIME_RANGE_CHANGED: 'timeRange:changed',
    SERVICE_CHANGED: 'service:changed',
    
    // Dashboard events
    DASHBOARD_CREATED: 'dashboard:created',
    DASHBOARD_UPDATED: 'dashboard:updated',
    DASHBOARD_DELETED: 'dashboard:deleted',
    DASHBOARD_OPENED: 'dashboard:opened',
    
    // Widget events
    WIDGET_ADDED: 'widget:added',
    WIDGET_UPDATED: 'widget:updated',
    WIDGET_DELETED: 'widget:deleted',
    WIDGET_MOVED: 'widget:moved',
    
    // UI events
    MODAL_OPENED: 'modal:opened',
    MODAL_CLOSED: 'modal:closed',
    NOTIFICATION_SHOW: 'notification:show',
    NOTIFICATION_HIDE: 'notification:hide',
    
    // Chart events
    CHART_RENDERED: 'chart:rendered',
    CHART_UPDATED: 'chart:updated',
    CHART_ERROR: 'chart:error',
    
    // Auto-refresh events
    AUTO_REFRESH_STARTED: 'autoRefresh:started',
    AUTO_REFRESH_STOPPED: 'autoRefresh:stopped',
    AUTO_REFRESH_TICK: 'autoRefresh:tick'
};

Object.freeze(Events);

