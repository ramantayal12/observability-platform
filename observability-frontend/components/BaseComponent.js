/**
 * BaseComponent - Base class for all UI components
 * Provides lifecycle methods, event handling, and state management
 */

class BaseComponent {
    constructor(selector, options = {}) {
        this.selector = selector;
        this.element = typeof selector === 'string' ? document.querySelector(selector) : selector;
        this.options = options;
        this.children = [];
        this.eventListeners = [];
        this.stateSubscriptions = [];
        this.isInitialized = false;
        this.isDestroyed = false;
    }

    /**
     * Initialize component
     */
    async init() {
        if (this.isInitialized) return;
        
        await this.beforeInit();
        await this.render();
        this.attachEvents();
        this.subscribeToState();
        await this.afterInit();
        
        this.isInitialized = true;
        this.emit('initialized');
    }

    /**
     * Lifecycle: Before initialization
     */
    async beforeInit() {
        // Override in subclass
    }

    /**
     * Lifecycle: After initialization
     */
    async afterInit() {
        // Override in subclass
    }

    /**
     * Render component
     */
    async render() {
        // Override in subclass
    }

    /**
     * Attach event listeners
     */
    attachEvents() {
        // Override in subclass
    }

    /**
     * Subscribe to state changes
     */
    subscribeToState() {
        // Override in subclass
    }

    /**
     * Add event listener with automatic cleanup
     * @param {Element} element - Target element
     * @param {string} event - Event name
     * @param {Function} handler - Event handler
     * @param {Object} options - Event options
     */
    addEventListener(element, event, handler, options = {}) {
        element.addEventListener(event, handler, options);
        this.eventListeners.push({ element, event, handler, options });
    }

    /**
     * Subscribe to state with automatic cleanup
     * @param {string} path - State path
     * @param {Function} callback - Callback function
     */
    subscribeState(path, callback) {
        const unsubscribe = stateManager.observe(path, callback.bind(this));
        this.stateSubscriptions.push(unsubscribe);
    }

    /**
     * Subscribe to event bus with automatic cleanup
     * @param {string} eventName - Event name
     * @param {Function} callback - Callback function
     */
    subscribeEvent(eventName, callback) {
        const unsubscribe = eventBus.on(eventName, callback.bind(this));
        this.stateSubscriptions.push(unsubscribe);
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {*} detail - Event detail
     */
    emit(eventName, detail = null) {
        if (this.element) {
            this.element.dispatchEvent(new CustomEvent(eventName, { detail }));
        }
    }

    /**
     * Update component
     * @param {Object} data - New data
     */
    async update(data) {
        await this.beforeUpdate(data);
        await this.render();
        await this.afterUpdate(data);
    }

    /**
     * Lifecycle: Before update
     */
    async beforeUpdate(data) {
        // Override in subclass
    }

    /**
     * Lifecycle: After update
     */
    async afterUpdate(data) {
        // Override in subclass
    }

    /**
     * Show component
     */
    show() {
        if (this.element) {
            this.element.style.display = '';
            this.element.classList.remove('hidden');
        }
    }

    /**
     * Hide component
     */
    hide() {
        if (this.element) {
            this.element.classList.add('hidden');
        }
    }

    /**
     * Toggle component visibility
     */
    toggle() {
        if (this.element) {
            this.element.classList.toggle('hidden');
        }
    }

    /**
     * Add child component
     * @param {BaseComponent} component - Child component
     */
    addChild(component) {
        this.children.push(component);
    }

    /**
     * Remove child component
     * @param {BaseComponent} component - Child component
     */
    removeChild(component) {
        const index = this.children.indexOf(component);
        if (index !== -1) {
            this.children.splice(index, 1);
            component.destroy();
        }
    }

    /**
     * Find element within component
     * @param {string} selector - CSS selector
     * @returns {Element} Found element
     */
    find(selector) {
        return this.element ? this.element.querySelector(selector) : null;
    }

    /**
     * Find all elements within component
     * @param {string} selector - CSS selector
     * @returns {NodeList} Found elements
     */
    findAll(selector) {
        return this.element ? this.element.querySelectorAll(selector) : [];
    }

    /**
     * Set HTML content
     * @param {string} html - HTML string
     */
    setHTML(html) {
        if (this.element) {
            this.element.innerHTML = html;
        }
    }

    /**
     * Append HTML content
     * @param {string} html - HTML string
     */
    appendHTML(html) {
        if (this.element) {
            this.element.insertAdjacentHTML('beforeend', html);
        }
    }

    /**
     * Add CSS class
     * @param {string} className - Class name
     */
    addClass(className) {
        if (this.element) {
            this.element.classList.add(className);
        }
    }

    /**
     * Remove CSS class
     * @param {string} className - Class name
     */
    removeClass(className) {
        if (this.element) {
            this.element.classList.remove(className);
        }
    }

    /**
     * Toggle CSS class
     * @param {string} className - Class name
     */
    toggleClass(className) {
        if (this.element) {
            this.element.classList.toggle(className);
        }
    }

    /**
     * Destroy component and cleanup
     */
    destroy() {
        if (this.isDestroyed) return;

        // Destroy children first
        this.children.forEach(child => child.destroy());
        this.children = [];

        // Remove event listeners
        this.eventListeners.forEach(({ element, event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });
        this.eventListeners = [];

        // Unsubscribe from state
        this.stateSubscriptions.forEach(unsubscribe => unsubscribe());
        this.stateSubscriptions = [];

        // Clear element
        if (this.element) {
            this.element.innerHTML = '';
        }

        this.isDestroyed = true;
        this.emit('destroyed');
    }

    /**
     * Get component state
     * @returns {Object} Component state
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            isDestroyed: this.isDestroyed,
            childrenCount: this.children.length
        };
    }
}

