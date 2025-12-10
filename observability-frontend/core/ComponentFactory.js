/**
 * ComponentFactory - Factory for creating reusable UI components
 * Provides consistent component creation with dependency injection
 * @module core/ComponentFactory
 */

/**
 * @typedef {Object} ComponentConfig
 * @property {string} [id] - Component ID
 * @property {string} [className] - CSS class name
 * @property {Object} [data] - Initial data
 * @property {Object} [options] - Component options
 * @property {Function} [onInit] - Init callback
 * @property {Function} [onDestroy] - Destroy callback
 */

/**
 * Component Registry - Stores component constructors
 */
class ComponentRegistry {
    constructor() {
        /** @type {Map<string, Function>} */
        this.components = new Map();
    }

    /**
     * Register a component
     * @param {string} name - Component name
     * @param {Function} constructor - Component constructor
     */
    register(name, constructor) {
        this.components.set(name, constructor);
    }

    /**
     * Get component constructor
     * @param {string} name - Component name
     * @returns {Function|undefined}
     */
    get(name) {
        return this.components.get(name);
    }

    /**
     * Check if component is registered
     * @param {string} name - Component name
     * @returns {boolean}
     */
    has(name) {
        return this.components.has(name);
    }

    /**
     * Get all registered component names
     * @returns {Array<string>}
     */
    getNames() {
        return Array.from(this.components.keys());
    }
}

/**
 * ComponentFactory - Creates and manages component instances
 */
class ComponentFactory {
    constructor() {
        this.registry = new ComponentRegistry();
        /** @type {Map<string, BaseComponent>} */
        this.instances = new Map();
        this.idCounter = 0;
    }

    /**
     * Register a component type
     * @param {string} name - Component name
     * @param {Function} constructor - Component constructor
     * @returns {ComponentFactory} For chaining
     */
    register(name, constructor) {
        this.registry.register(name, constructor);
        return this;
    }

    /**
     * Create a component instance
     * @param {string} name - Component name
     * @param {HTMLElement|string} container - Container element or selector
     * @param {ComponentConfig} [config={}] - Component configuration
     * @returns {BaseComponent}
     */
    create(name, container, config = {}) {
        const Constructor = this.registry.get(name);
        if (!Constructor) {
            throw new Error(`Component "${name}" is not registered`);
        }

        const element = typeof container === 'string' 
            ? document.querySelector(container) 
            : container;

        if (!element) {
            throw new Error(`Container not found: ${container}`);
        }

        const id = config.id || `${name}-${++this.idCounter}`;
        const component = new Constructor(element, { ...config, id });
        
        this.instances.set(id, component);

        if (config.onInit) {
            component.addEventListener(element, 'initialized', config.onInit);
        }
        if (config.onDestroy) {
            component.addEventListener(element, 'destroyed', config.onDestroy);
        }

        return component;
    }

    /**
     * Create and initialize a component
     * @param {string} name - Component name
     * @param {HTMLElement|string} container - Container
     * @param {ComponentConfig} [config={}] - Configuration
     * @returns {Promise<BaseComponent>}
     */
    async createAndInit(name, container, config = {}) {
        const component = this.create(name, container, config);
        await component.init();
        return component;
    }

    /**
     * Get component instance by ID
     * @param {string} id - Component ID
     * @returns {BaseComponent|undefined}
     */
    getInstance(id) {
        return this.instances.get(id);
    }

    /**
     * Destroy component by ID
     * @param {string} id - Component ID
     */
    destroy(id) {
        const component = this.instances.get(id);
        if (component) {
            component.destroy();
            this.instances.delete(id);
        }
    }

    /**
     * Destroy all component instances
     */
    destroyAll() {
        this.instances.forEach(component => component.destroy());
        this.instances.clear();
    }

    /**
     * Create multiple components from configuration
     * @param {Array<{name: string, container: string, config: ComponentConfig}>} configs
     * @returns {Promise<Array<BaseComponent>>}
     */
    async createMany(configs) {
        return Promise.all(
            configs.map(({ name, container, config }) => 
                this.createAndInit(name, container, config)
            )
        );
    }

    /** @returns {ComponentFactory} */
    static getInstance() {
        if (!ComponentFactory.instance) {
            ComponentFactory.instance = new ComponentFactory();
        }
        return ComponentFactory.instance;
    }
}

// Create singleton
const componentFactory = ComponentFactory.getInstance();

// Register built-in components when they're available
document.addEventListener('DOMContentLoaded', () => {
    if (typeof ChartWidget !== 'undefined') {
        componentFactory.register('chart', ChartWidget);
    }
    if (typeof FacetFilter !== 'undefined') {
        componentFactory.register('facetFilter', FacetFilter);
    }
    if (typeof TimeRangePicker !== 'undefined') {
        componentFactory.register('timeRangePicker', TimeRangePicker);
    }
});

